const Settings = require('../../modules/settings/models/Settings');

let cachedSystem = null;
let lastLoadedAt = 0;
const SETTINGS_TTL_MS = 30 * 1000;

async function getSystemSettings() {
  const now = Date.now();
  if (cachedSystem && now - lastLoadedAt < SETTINGS_TTL_MS) {
    return cachedSystem;
  }

  const doc = await Settings.findOne().lean();
  cachedSystem = doc?.system || {};
  lastLoadedAt = now;
  return cachedSystem;
}

function invalidateSystemSettingsCache() {
  cachedSystem = null;
  lastLoadedAt = 0;
}

module.exports = {
  getSystemSettings,
  invalidateSystemSettingsCache,
};


