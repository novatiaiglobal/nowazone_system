import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const isBrowser = typeof window !== 'undefined';
const CSRF_STORAGE_KEY = 'nowazone.csrfToken';
let csrfTokenMemory: string | null = null;

// ─── CSRF helpers ─────────────────────────────────────────────────────────────
// The backend sets a non-httpOnly `csrf-token` cookie that JavaScript can read.
// We forward its value in the X-CSRF-Token header for every mutating request.

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const getCsrfCookie = (): string | null => {
  if (!isBrowser) return null;
  const match = document.cookie.match(/(^|;\s*)csrf-token=([^;]+)/);
  return match ? decodeURIComponent(match[2]) : null;
};

const readStoredCsrfToken = (): string | null => {
  if (!isBrowser) return null;
  if (csrfTokenMemory) return csrfTokenMemory;
  try {
    csrfTokenMemory = window.localStorage.getItem(CSRF_STORAGE_KEY);
  } catch {
    csrfTokenMemory = null;
  }
  return csrfTokenMemory;
};

const storeCsrfToken = (token: unknown) => {
  if (!isBrowser || typeof token !== 'string' || !token.trim()) return;
  csrfTokenMemory = token;
  try {
    window.localStorage.setItem(CSRF_STORAGE_KEY, token);
  } catch {
    // Ignore storage errors (private mode / disabled storage).
  }
};

const clearStoredCsrfToken = () => {
  if (!isBrowser) return;
  csrfTokenMemory = null;
  try {
    window.localStorage.removeItem(CSRF_STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
};

const extractCsrfTokenFromResponse = (responseData: unknown): string | null => {
  if (!responseData || typeof responseData !== 'object') return null;
  const root = responseData as Record<string, unknown>;
  if (typeof root.csrfToken === 'string' && root.csrfToken) return root.csrfToken;
  const data = root.data;
  if (data && typeof data === 'object') {
    const nested = data as Record<string, unknown>;
    if (typeof nested.csrfToken === 'string' && nested.csrfToken) return nested.csrfToken;
  }
  return null;
};

const getCsrfTokenForRequest = (): string | null => getCsrfCookie() || readStoredCsrfToken();

// ─── Axios instance ───────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // always send/receive httpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request interceptor: attach CSRF token ───────────────────────────────────

api.interceptors.request.use(
  (config) => {
    const isFormDataPayload =
      typeof FormData !== 'undefined' && config.data instanceof FormData;
    if (isFormDataPayload && config.headers) {
      const headers = config.headers as Record<string, unknown> & { delete?: (key: string) => void };
      if (typeof headers.delete === 'function') {
        headers.delete('Content-Type');
        headers.delete('content-type');
      } else {
        delete headers['Content-Type'];
        delete headers['content-type'];
      }
    }

    if (!isBrowser) return config;

    const method = (config.method || 'GET').toUpperCase();
    if (!SAFE_METHODS.has(method)) {
      const csrfToken = getCsrfTokenForRequest();
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor: transparent token refresh ─────────────────────────
// The access token lives in a httpOnly cookie — no JS token storage needed.
// On 401, call /auth/refresh which reads the httpOnly refresh-token cookie
// and sets a new access-token cookie, then retry the original request.

let isRefreshing = false;
let refreshSubscribers: Array<(ok: boolean) => void> = [];

const subscribeToRefresh = (cb: (ok: boolean) => void) => {
  refreshSubscribers.push(cb);
};

const notifyRefreshSubscribers = (ok: boolean) => {
  refreshSubscribers.forEach((cb) => cb(ok));
  refreshSubscribers = [];
};

api.interceptors.response.use(
  (response) => {
    const csrfToken = extractCsrfTokenFromResponse(response.data);
    if (csrfToken) storeCsrfToken(csrfToken);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const isUnauthorized  = error.response?.status === 401;
    const responseStatus  = error.response?.status;
    const responseMessage = String(error.response?.data?.message || '').toLowerCase();
    const isCsrfError     = responseStatus === 403 && responseMessage.includes('csrf token');
    const isRefreshRoute  = originalRequest?.url?.includes('/auth/refresh');
    const isAuthRoute     = originalRequest?.url?.includes('/auth/login') ||
                            originalRequest?.url?.includes('/auth/register') ||
                            originalRequest?.url?.includes('/auth/forgot-password') ||
                            originalRequest?.url?.includes('/auth/reset-password') ||
                            originalRequest?.url?.includes('/auth/2fa/verify-login');

    if (isCsrfError && originalRequest && !originalRequest._csrfRetry) {
      originalRequest._csrfRetry = true;
      try {
        const profileResponse = await axios.get(`${API_BASE_URL}/auth/profile`, {
          withCredentials: true,
        });
        const nextCsrfToken = extractCsrfTokenFromResponse(profileResponse.data);
        if (nextCsrfToken) {
          storeCsrfToken(nextCsrfToken);
          return api(originalRequest);
        }
      } catch {
        // If profile refresh fails, continue with normal error handling.
      }
    }

    // Redirect to maintenance page when API returns 503 maintenance message (skip for auth so admins can log in / load profile)
    const requestUrl = originalRequest?.url ?? '';
    const isAuthRequest = requestUrl.includes('/auth/');
    const isMaintenance =
      error.response?.status === 503 &&
      (error.response?.data?.message || '').toLowerCase().includes('maintenance');
    if (isBrowser && isMaintenance && !isAuthRequest) {
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      if (path !== '/maintenance') {
        window.location.href = '/maintenance';
      }
      return Promise.reject(error);
    }

    if (isUnauthorized && !originalRequest._retry && !isRefreshRoute && !isAuthRoute) {
      if (isRefreshing) {
        // Queue requests while a refresh is already in-flight
        return new Promise((resolve, reject) => {
          subscribeToRefresh((ok) => {
            if (ok) resolve(api(originalRequest));
            else reject(error);
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const csrfToken = getCsrfTokenForRequest();
        // Refresh token is in the httpOnly cookie — no body payload needed for web
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined,
          }
        );
        const refreshedCsrfToken = extractCsrfTokenFromResponse(refreshResponse.data);
        if (refreshedCsrfToken) storeCsrfToken(refreshedCsrfToken);

        notifyRefreshSubscribers(true);
        return api(originalRequest);
      } catch {
        notifyRefreshSubscribers(false);
        clearStoredCsrfToken();

        if (isBrowser && window.location.pathname !== '/auth/login') {
          window.location.href = '/auth/login';
        }

        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export { api };
export default api;
