/**
 * Auth integration tests
 *
 * These tests cover the critical security paths:
 *   - Registration role restriction (privilege escalation prevention)
 *   - Login brute-force lockout
 *   - Refresh token rotation + reuse detection
 *   - CSRF enforcement for cookie-authenticated mutations
 *   - Logout and token revocation
 *   - Admin-only user creation
 *
 * Requires a running MongoDB and Redis (uses env vars from .env).
 * Run with: npm test
 */

require('dotenv').config();
const request  = require('supertest');
const mongoose = require('mongoose');
const crypto   = require('crypto');

// Point at a test DB to avoid touching production data
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/nowazone_test';

const { app } = require('../server');
const User    = require('../modules/auth/models/User');
const Session = require('../modules/auth/models/Session');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const validPassword = 'Test@1234';

const makeUser = (overrides = {}) => ({
  name:     'Test User',
  email:    `test_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
  password: validPassword,
  role:     'sales',
  ...overrides,
});

/**
 * Register + login a user; returns { cookies, csrfToken, user }.
 */
const loginUser = async (role = 'sales') => {
  const userData = makeUser({ role });
  await request(app).post('/api/auth/register').send(userData);

  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: userData.email, password: userData.password });

  const cookies    = res.headers['set-cookie'] || [];
  const csrfToken  = res.body.data?.csrfToken;

  return { cookies, csrfToken, user: res.body.data?.user, email: userData.email };
};

/**
 * Extract the value of a named cookie from a supertest set-cookie header array.
 */
const getCookieValue = (cookies, name) => {
  const entry = (Array.isArray(cookies) ? cookies : [cookies])
    .find((c) => c.startsWith(`${name}=`));
  if (!entry) return null;
  return entry.split('=')[1].split(';')[0];
};

// ─── Lifecycle ────────────────────────────────────────────────────────────────

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
});

afterAll(async () => {
  // Clean up test data and close connections
  await User.deleteMany({ email: /@example\.com$/ });
  await Session.deleteMany({});
  await mongoose.connection.close();
});

// ─── Registration ─────────────────────────────────────────────────────────────

describe('Registration — role restriction', () => {
  test('allows registration with a public role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(makeUser({ role: 'sales' }));

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
  });

  test('rejects registration with the "admin" role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(makeUser({ role: 'admin' }));

    expect(res.status).toBe(400); // Zod enum validation rejects it
  });

  test('rejects registration with the "super_admin" role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(makeUser({ role: 'super_admin' }));

    expect(res.status).toBe(400);
  });

  test('rejects weak passwords (fewer than 8 chars)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(makeUser({ password: 'short' }));

    expect(res.status).toBe(400);
  });

  test('prevents duplicate email registration', async () => {
    const userData = makeUser();
    await request(app).post('/api/auth/register').send(userData);
    const res = await request(app).post('/api/auth/register').send(userData);

    expect(res.status).toBe(409);
  });
});

// ─── Login ────────────────────────────────────────────────────────────────────

describe('Login', () => {
  test('returns httpOnly access+refresh cookies and a CSRF token', async () => {
    const userData = makeUser();
    await request(app).post('/api/auth/register').send(userData);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: userData.email, password: userData.password });

    expect(res.status).toBe(200);

    const cookies = res.headers['set-cookie'] || [];
    const names   = cookies.map((c) => c.split('=')[0]);

    expect(names).toContain('accessToken');
    expect(names).toContain('refreshToken');
    expect(names).toContain('csrf-token');

    // Cookies must be httpOnly (except csrf-token which must NOT be httpOnly)
    const accessCookie   = cookies.find((c) => c.startsWith('accessToken='));
    const refreshCookie  = cookies.find((c) => c.startsWith('refreshToken='));
    const csrfCookie     = cookies.find((c) => c.startsWith('csrf-token='));

    expect(accessCookie).toMatch(/HttpOnly/i);
    expect(refreshCookie).toMatch(/HttpOnly/i);
    expect(csrfCookie).not.toMatch(/HttpOnly/i);

    // Raw tokens must NOT appear in the response body for a standard web login
    expect(res.body.data.accessToken).toBeUndefined();
    expect(res.body.data.refreshToken).toBeUndefined();

    // CSRF token IS expected in the body (for SPA bootstrap)
    expect(typeof res.body.data.csrfToken).toBe('string');
  });

  test('returns raw tokens in body for API/mobile clients', async () => {
    const userData = makeUser();
    await request(app).post('/api/auth/register').send(userData);

    const res = await request(app)
      .post('/api/auth/login')
      .set('X-Client-Type', 'mobile')
      .send({ email: userData.email, password: userData.password });

    expect(res.status).toBe(200);
    expect(typeof res.body.data.accessToken).toBe('string');
    expect(typeof res.body.data.refreshToken).toBe('string');
  });

  test('rejects invalid credentials', async () => {
    const userData = makeUser();
    await request(app).post('/api/auth/register').send(userData);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: userData.email, password: 'WrongPass1' });

    expect(res.status).toBe(401);
    // No token in the error response
    expect(res.body.data).toBeUndefined();
  });
});

// ─── Brute-force lockout ──────────────────────────────────────────────────────

describe('Login — brute-force lockout', () => {
  test('locks the account after 5 failed attempts', async () => {
    const userData = makeUser();
    await request(app).post('/api/auth/register').send(userData);

    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: userData.email, password: 'WrongPass1' });
    }

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: userData.email, password: userData.password });

    // Should be locked (423) rather than 401 (wrong password)
    expect(res.status).toBe(423);
  });
});

// ─── Token refresh + rotation ────────────────────────────────────────────────

describe('Refresh token rotation', () => {
  test('issues new access + refresh tokens on each refresh', async () => {
    const { cookies, csrfToken } = await loginUser();

    const cookieHeader = cookies.join('; ');

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookieHeader)
      .set('X-CSRF-Token', csrfToken || '')
      .send({});

    expect(res.status).toBe(200);

    const newCookies = res.headers['set-cookie'] || [];
    const newAccess  = getCookieValue(newCookies, 'accessToken');
    const oldAccess  = getCookieValue(cookies,    'accessToken');

    expect(newAccess).toBeTruthy();
    expect(newAccess).not.toBe(oldAccess);
  });

  test('rejects reuse of a consumed refresh token (rotation reuse detection)', async () => {
    const { cookies } = await loginUser();
    const cookieHeader = cookies.join('; ');

    // First refresh — consumes the original token, issues a new one
    const res1 = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookieHeader)
      .send({});

    expect(res1.status).toBe(200);

    // Attempt to reuse the original (now consumed) refresh token
    const res2 = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookieHeader)
      .send({});

    expect(res2.status).toBe(401);
    expect(res2.body.message).toMatch(/already used/i);
  });
});

// ─── CSRF enforcement ─────────────────────────────────────────────────────────

describe('CSRF protection', () => {
  test('allows GET requests without a CSRF header', async () => {
    const { cookies } = await loginUser();

    const res = await request(app)
      .get('/api/auth/profile')
      .set('Cookie', cookies.join('; '));

    expect(res.status).toBe(200);
  });

  test('rejects cookie-authenticated POST without X-CSRF-Token header', async () => {
    const { cookies } = await loginUser();

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookies.join('; '))
      // Deliberately omit X-CSRF-Token
      .send({});

    expect(res.status).toBe(403);
  });

  test('allows cookie-authenticated POST with correct X-CSRF-Token header', async () => {
    const { cookies, csrfToken } = await loginUser();

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookies.join('; '))
      .set('X-CSRF-Token', csrfToken)
      .send({});

    expect(res.status).toBe(200);
  });

  test('allows Bearer-authenticated POST without CSRF header', async () => {
    // Bearer auth is used by API/mobile clients — they are exempt from CSRF
    const userData = makeUser();
    await request(app).post('/api/auth/register').send(userData);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .set('X-Client-Type', 'mobile')
      .send({ email: userData.email, password: userData.password });

    const accessToken = loginRes.body.data?.accessToken;
    expect(accessToken).toBeTruthy();

    // No CSRF header, but using Bearer — should be allowed
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
  });
});

// ─── Logout + token revocation ────────────────────────────────────────────────

describe('Logout', () => {
  test('clears auth cookies on logout', async () => {
    const { cookies, csrfToken } = await loginUser();

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookies.join('; '))
      .set('X-CSRF-Token', csrfToken)
      .send({});

    expect(res.status).toBe(200);

    const setCookies = res.headers['set-cookie'] || [];
    // Cookies should be cleared (Max-Age=0 or Expires in the past)
    const accessCleared = setCookies.some(
      (c) => c.startsWith('accessToken=') && (c.includes('Max-Age=0') || c.includes('Expires=Thu, 01 Jan 1970'))
    );
    expect(accessCleared).toBe(true);
  });

  test('rejects profile access with a revoked access token', async () => {
    const { cookies, csrfToken } = await loginUser();

    await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookies.join('; '))
      .set('X-CSRF-Token', csrfToken)
      .send({});

    // Attempt to use the same (now blacklisted) access token cookie
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Cookie', cookies.join('; '));

    expect(res.status).toBe(401);
  });
});

// ─── Admin user creation ──────────────────────────────────────────────────────

describe('Admin user creation', () => {
  test('non-admin users cannot access /auth/admin/users', async () => {
    const { cookies, csrfToken } = await loginUser('sales');

    const res = await request(app)
      .post('/api/auth/admin/users')
      .set('Cookie', cookies.join('; '))
      .set('X-CSRF-Token', csrfToken)
      .send(makeUser({ role: 'hr' }));

    expect(res.status).toBe(403);
  });

  test('forgot-password always returns 200 (prevents email enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nonexistent@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/if that email/i);
  });

  test('reset-password rejects invalid token', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password/invalid_token_value')
      .send({ password: 'NewPass@123' });

    expect(res.status).toBe(400);
  });
});
