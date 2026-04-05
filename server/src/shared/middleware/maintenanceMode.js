const jwt = require('jsonwebtoken');
const Settings = require('../../modules/settings/models/Settings');
const User = require('../../modules/auth/models/User');

let cachedSettings = null;
let lastLoadedAt = 0;
const SETTINGS_TTL_MS = 30 * 1000;

async function getSettingsCached() {
  const now = Date.now();
  if (cachedSettings && now - lastLoadedAt < SETTINGS_TTL_MS) {
    return cachedSettings;
  }
  const doc = await Settings.findOne().lean();
  cachedSettings = doc;
  lastLoadedAt = now;
  return cachedSettings;
}

async function getUserRoleFromRequest(req) {
  try {
    const token =
      req.cookies?.accessToken ||
      (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null);
    if (!token) return null;

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    if (!decoded?.id) return null;

    const user = await User.findById(decoded.id).select('role');
    return user?.role || null;
  } catch {
    return null;
  }
}

// Expose settings on req for other middleware/handlers
async function attachSettings(req, res, next) {
  try {
    req.settings = await getSettingsCached();
  } catch {
    // ignore settings load errors; proceed without req.settings
  }
  next();
}

async function maintenanceMode(req, res, next) {
  try {
    const doc = await getSettingsCached();
    const maintenanceEnabled = Boolean(doc?.system?.maintenanceMode);

    if (!maintenanceEnabled) {
      return next();
    }

    const path = req.path || '';

    // Always allow health checks, auth, and public maintenance-status (so frontend can know mode)
    if (
      path === '/health' ||
      path.startsWith('/auth') ||
      path.startsWith('/settings') ||
      path.startsWith('/maintenance-status') ||
      path.startsWith('/seo/public') ||
      path.startsWith('/seo/sitemap') ||
      path.startsWith('/seo/robots')
    ) {
      return next();
    }

    const role = await getUserRoleFromRequest(req);
    if (role === 'admin' || role === 'super_admin') {
      return next();
    }

    res.status(503).json({
      status: 'fail',
      message: 'The system is currently in maintenance mode. Please try again later.',
    });
  } catch (err) {
    // On error, fail-open rather than blocking the whole API.
    next();
  }
}

module.exports = {
  maintenanceMode,
  attachSettings,
};

