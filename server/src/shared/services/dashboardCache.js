const redisClient = require('../config/redis');

const EXEC_OVERVIEW_PREFIX = 'dashboard:executive:';
const FORM_STATS_KEY = 'dashboard:formStats';

async function invalidateDashboardCache() {
  try {
    if (!redisClient || typeof redisClient.keys !== 'function') return;

    const keys = await redisClient.keys(`${EXEC_OVERVIEW_PREFIX}*`);
    if (keys.length) {
      await redisClient.del(keys);
    }
    await redisClient.del(FORM_STATS_KEY);
  } catch {
    // Cache invalidation is best-effort; ignore errors.
  }
}

module.exports = {
  invalidateDashboardCache,
};

