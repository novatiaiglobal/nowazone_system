/**
 * Redis connection config for BullMQ.
 * Workers require maxRetriesPerRequest: null (see BullMQ docs).
 */
const Redis = require('ioredis');

const connectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  retryStrategy: (times) => Math.min(times * 50, 2000),
};

function createBullConnection() {
  return new Redis(connectionOptions);
}

module.exports = { connectionOptions, createBullConnection };
