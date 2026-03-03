import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const isBrowser = typeof window !== 'undefined';

// ─── CSRF helpers ─────────────────────────────────────────────────────────────
// The backend sets a non-httpOnly `csrf-token` cookie that JavaScript can read.
// We forward its value in the X-CSRF-Token header for every mutating request.

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const getCsrfCookie = (): string | null => {
  if (!isBrowser) return null;
  const match = document.cookie.match(/(^|;\s*)csrf-token=([^;]+)/);
  return match ? decodeURIComponent(match[2]) : null;
};

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
    if (!isBrowser) return config;

    const method = (config.method || 'GET').toUpperCase();
    if (!SAFE_METHODS.has(method)) {
      const csrfToken = getCsrfCookie();
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
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isUnauthorized  = error.response?.status === 401;
    const isRefreshRoute  = originalRequest?.url?.includes('/auth/refresh');
    const isAuthRoute     = originalRequest?.url?.includes('/auth/login') ||
                            originalRequest?.url?.includes('/auth/register') ||
                            originalRequest?.url?.includes('/auth/forgot-password') ||
                            originalRequest?.url?.includes('/auth/reset-password') ||
                            originalRequest?.url?.includes('/auth/2fa/verify-login');

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
        // Refresh token is in the httpOnly cookie — no body payload needed for web
        await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        notifyRefreshSubscribers(true);
        return api(originalRequest);
      } catch {
        notifyRefreshSubscribers(false);

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
