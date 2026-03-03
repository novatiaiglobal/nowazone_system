const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');
const User = require('../../modules/auth/models/User');
const redisClient = require('../config/redis');

// ─── Authentication ────────────────────────────────────────────────────────────

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return next(new AppError('Not authorized — no token provided', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Reject temp 2FA tokens used against protected routes
    if (decoded.temp) {
      return next(new AppError('Complete 2FA verification first', 401));
    }

    // Check token blacklist (populated on logout)
    const blacklisted = await redisClient.get(`blacklist:${token}`);
    if (blacklisted) {
      return next(new AppError('Token has been revoked', 401));
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      return next(new AppError('User no longer exists or is inactive', 401));
    }
    if (user.tokenInvalidBefore && decoded.iat && decoded.iat * 1000 < user.tokenInvalidBefore.getTime()) {
      return next(new AppError('Session has been revoked. Please login again.', 401));
    }

    req.user  = user;
    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError')  return next(new AppError('Invalid token', 401));
    if (error.name === 'TokenExpiredError')  return next(new AppError('Token expired', 401));
    next(error);
  }
};

// ─── CSRF protection ──────────────────────────────────────────────────────────
//
// Applied globally to /api routes. The middleware is a no-op for:
//   • Safe HTTP methods (GET, HEAD, OPTIONS)
//   • Bearer-authenticated requests (API/mobile — token is the CSRF defense)
//   • Unauthenticated requests (no accessToken cookie — nothing to protect)
//
// For cookie-authenticated web requests it enforces the double-submit pattern:
// the browser-readable `csrf-token` cookie must match the `X-CSRF-Token` header.

const csrfProtection = (req, res, next) => {
  // Safe methods are CSRF-immune
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  // Bearer-authenticated clients (API / mobile) handle CSRF via token secrecy
  if (req.headers.authorization?.startsWith('Bearer ')) return next();

  // No auth cookie means the request is unauthenticated — no session to hijack
  if (!req.cookies?.accessToken) return next();

  const csrfCookie  = req.cookies['csrf-token'];
  const csrfHeader  = req.headers['x-csrf-token'];

  if (!csrfCookie || !csrfHeader) {
    return next(new AppError('CSRF token missing', 403));
  }

  // Constant-time comparison to prevent timing attacks
  const cookieBuf = Buffer.from(csrfCookie);
  const headerBuf = Buffer.from(csrfHeader);

  if (
    cookieBuf.length !== headerBuf.length ||
    !require('crypto').timingSafeEqual(cookieBuf, headerBuf)
  ) {
    return next(new AppError('CSRF token mismatch', 403));
  }

  next();
};

// ─── Authorisation ─────────────────────────────────────────────────────────────

/** Permission-based access control.
 *  super_admin is always granted. Pass individual permission strings. */
const authorize = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) return next(new AppError('Not authorized', 401));

    const userRoles = req.user.roles?.length ? req.user.roles : (req.user.role ? [req.user.role] : []);
    if (userRoles.includes('super_admin')) return next();

    const hasPermission = permissions.some((p) => req.user.permissions.includes(p));
    if (!hasPermission) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};

/** Role-based access control. super_admin always passes. */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return next(new AppError('Not authorized', 401));
    const userRoles = req.user.roles?.length ? req.user.roles : (req.user.role ? [req.user.role] : []);
    if (userRoles.includes('super_admin')) return next();

    const hasRole = roles.some((r) => userRoles.includes(r));
    if (!hasRole) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }

    next();
  };
};

module.exports = { protect, csrfProtection, authorize, restrictTo };
