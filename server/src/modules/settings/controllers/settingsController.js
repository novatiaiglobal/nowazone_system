const fs = require('fs');
const path = require('path');
const Settings = require('../models/Settings');
const { AppError } = require('../../../shared/middleware/errorHandler');
const { invalidateSystemSettingsCache } = require('../../../shared/services/systemSettings');
const { runBackupNow } = require('../../../shared/services/maintenanceBackupService');

const ensureSettings = async () => {
  let doc = await Settings.findOne();
  if (!doc) {
    doc = await Settings.create({});
  }
  return doc;
};

exports.getSettings = async (req, res, next) => {
  try {
    const doc = await ensureSettings();
    res.json({ status: 'success', data: doc });
  } catch (err) {
    next(err);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const payload = req.body || {};

    const update = {
      ...(payload.general || {}),
      ...(payload.security ? { security: payload.security } : {}),
      ...(payload.notifications ? { notifications: payload.notifications } : {}),
      ...(payload.seo ? { seo: payload.seo } : {}),
      ...(payload.system ? { system: payload.system } : {}),
      updatedBy: req.user?._id || null,
    };

    const doc = await Settings.findOneAndUpdate({}, update, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });

    invalidateSystemSettingsCache();

    res.json({ status: 'success', data: doc });
  } catch (err) {
    next(err);
  }
};

exports.downloadLatestBackup = async (req, res, next) => {
  console.log('[Backup] GET /settings/backups/latest requested');
  try {
    const baseDir = process.env.BACKUP_DIR || path.join(__dirname, '../../../../backups');
    let entries;
    try {
      entries = await fs.promises.readdir(baseDir, { withFileTypes: true });
    } catch (err) {
      if (err.code === 'ENOENT') {
        // No backups yet — attempt to create one on demand.
        try {
          await runBackupNow();
          entries = await fs.promises.readdir(baseDir, { withFileTypes: true });
        } catch (e) {
          return next(new AppError(e.message || 'No backups available', 404));
        }
      } else {
        throw err;
      }
    }

    let folders = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    if (!folders.length) {
      // Try a one-time on-demand backup if none exist yet.
      try {
        await runBackupNow();
        entries = await fs.promises.readdir(baseDir, { withFileTypes: true });
        folders = entries.filter((e) => e.isDirectory()).map((e) => e.name);
      } catch (e) {
        return next(new AppError(e.message || 'No backups available', 404));
      }

      if (!folders.length) {
        return next(new AppError('No backups available', 404));
      }
    }

    // Sort folder names descending (most recent first, assuming ISO timestamp-based names).
    folders.sort((a, b) => (a < b ? 1 : -1));
    const latest = folders[0];
    const latestDir = path.join(baseDir, latest);

    // Prevent path traversal (ensure we stay inside baseDir)
    const baseDirResolved = path.resolve(baseDir);
    const latestDirResolved = path.resolve(latestDir);
    if (!latestDirResolved.startsWith(baseDirResolved + path.sep) && latestDirResolved !== baseDirResolved) {
      return next(new AppError('Invalid backup path', 400));
    }

    const files = await fs.promises.readdir(latestDir);
    const snapshot = {};

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const collectionName = path.basename(file, '.json');
      try {
        const content = await fs.promises.readFile(path.join(latestDir, file), 'utf8');
        snapshot[collectionName] = JSON.parse(content);
      } catch {
        // Skip malformed file but continue with others
      }
    }

    if (!Object.keys(snapshot).length) {
      return next(new AppError('Latest backup folder is empty', 404));
    }

    // Safe filename for Content-Disposition (folder name is from our own readdir; sanitize for headers)
    const safeName = latest.replace(/[^\w\-.]/g, '_').slice(0, 200) || 'latest';
    const filename = `backup-${safeName}.json`;

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.status(200).send(JSON.stringify(snapshot));
    console.log('[Backup] Sent backup successfully:', filename);
  } catch (err) {
    console.error('[Backup] downloadLatestBackup error:', err.message);
    next(err);
  }
};

