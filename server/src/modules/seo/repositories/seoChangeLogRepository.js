const SeoChangeLog = require('../models/SeoChangeLog');

async function create(data) {
  return SeoChangeLog.create(data);
}

async function logSeoAction(action, entityType, entityId, options = {}) {
  const { before, after, changedBy, ip, userAgent } = options;
  return create({ action, entityType, entityId, before, after, changedBy, ip, userAgent });
}

async function findRecent(limit = 20, entityType = null) {
  const q = entityType ? { entityType } : {};
  return SeoChangeLog.find(q).sort({ createdAt: -1 }).limit(limit).populate('changedBy', 'name email').lean();
}

module.exports = { create, logSeoAction, findRecent };
