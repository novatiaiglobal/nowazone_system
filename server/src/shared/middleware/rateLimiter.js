const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redisClient = require('../config/redis');

// Rate limiting is always enabled regardless of NODE_ENV.
// Use higher limits in non-production environments by setting env vars.

const createRateLimiter = (options = {}) => {
  const baseConfig = {
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    message: options.message || {
      status: 'fail',
      message: 'Too many requests, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    // Allow requests through when the Redis store is unreachable.
    passOnStoreError: true,
    ...options,
  };

  const shouldUseRedisStore =
    redisClient &&
    typeof redisClient.call === 'function' &&
    // ioredis exposes a `status` field: 'connecting' | 'ready' | 'end' | 'reconnecting'
    (redisClient.status === 'ready' || redisClient.status === 'connecting');

  const storeConfig = shouldUseRedisStore
    ? {
        store: new RedisStore({
          sendCommand: (...args) => redisClient.call(...args),
          prefix: 'rl:',
        }),
      }
    : {};

  return rateLimit({
    ...baseConfig,
    ...storeConfig,
  });
};

/** Strict limiter for login and register — only 5 attempts per 15 min. */
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 5,
  message: {
    status:  'fail',
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
});

/** Dedicated limiter for the refresh endpoint — prevents token brute-force. */
const refreshLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.REFRESH_RATE_LIMIT_MAX, 10) || 20,
  message: {
    status:  'fail',
    message: 'Too many token refresh requests. Please try again later.',
  },
});

/** Strict limiter for password-reset request — prevents email enumeration abuse. */
const forgotPasswordLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1-hour window
  max: parseInt(process.env.FORGOT_RATE_LIMIT_MAX, 10) || 5,
  message: {
    status:  'fail',
    message: 'Too many password reset requests. Please try again in an hour.',
  },
});

/** General API limiter — applied to all /api routes. */
const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.API_RATE_LIMIT_MAX, 10) || 100,
});

module.exports = { createRateLimiter, authLimiter, refreshLimiter, forgotPasswordLimiter, apiLimiter };
