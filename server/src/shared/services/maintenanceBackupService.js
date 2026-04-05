const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Settings = require('../../modules/settings/models/Settings');
const AuditLog = require('../models/AuditLog');

let lastBackupAt = null;

async function getSettings() {
  const doc = await Settings.findOne().lean();
  return doc?.system || {};
}

async function runBackupIfEnabled() {
  const system = await getSettings();
  if (!system.backupEnabled) {
    return;
  }

  const frequency = (system.backupFrequency || 'daily').toLowerCase();
  const now = new Date();

  if (lastBackupAt) {
    const diffMs = now - lastBackupAt;
    if (frequency === 'daily' && diffMs < 24 * 60 * 60 * 1000) return;
    if (frequency === 'weekly' && diffMs < 7 * 24 * 60 * 60 * 1000) return;
    if (frequency === 'monthly' && diffMs < 28 * 24 * 60 * 60 * 1000) return;
  }

  try {
    await performJsonBackup();
    console.log('[Backup] Completed JSON backup run.');
  } catch (err) {
    console.error('[Backup] Backup run failed:', err.message);
  }

  lastBackupAt = now;
}

async function performJsonBackup() {
  const conn = mongoose.connection;
  if (!conn || !conn.db) {
    throw new Error('No active MongoDB connection for backup');
  }

  const baseDir = process.env.BACKUP_DIR || path.join(__dirname, '../../../backups');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(baseDir, timestamp);

  await fs.promises.mkdir(backupDir, { recursive: true });

  const collections = await conn.db.collections();

  for (const collection of collections) {
    const name = collection.collectionName;
    // Skip internal/system collections
    if (name.startsWith('system.')) continue;

    try {
      const docs = await collection.find({}).toArray();
      const filePath = path.join(backupDir, `${name}.json`);
      await fs.promises.writeFile(filePath, JSON.stringify(docs));
    } catch (err) {
      console.error(`[Backup] Failed to export collection ${name}:`, err.message);
    }
  }
}

async function runBackupNow() {
  const system = await getSettings();
  if (!system.backupEnabled) {
    throw new Error('Backups are disabled in system settings');
  }
  await performJsonBackup();
  lastBackupAt = new Date();
}

async function applyLogRetention() {
  const system = await getSettings();
  const days = system.logRetentionDays || 30;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const result = await AuditLog.deleteMany({ timestamp: { $lt: cutoff } });
    if (result.deletedCount) {
      console.log(`[LogRetention] Deleted ${result.deletedCount} old audit log entries (older than ${days} days).`);
    }
  } catch (err) {
    console.error('[LogRetention] Failed to prune audit logs:', err.message);
  }
}

function startMaintenanceJobs() {
  // Run every hour; internal logic checks frequency and retention window.
  setInterval(() => {
    runBackupIfEnabled().catch((err) => console.error('[Backup] Error:', err.message));
    applyLogRetention().catch((err) => console.error('[LogRetention] Error:', err.message));
  }, 60 * 60 * 1000);
}

module.exports = {
  startMaintenanceJobs,
  runBackupNow,
};

