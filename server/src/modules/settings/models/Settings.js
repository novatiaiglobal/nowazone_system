const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    siteName: { type: String, default: 'NowAZone' },
    tagline:  { type: String, default: 'Enterprise Console' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    language: { type: String, default: 'en' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    currency: { type: String, default: 'USD' },

    security: {
      sessionTimeout:   { type: Number, default: 60 },
      maxLoginAttempts: { type: Number, default: 5 },
      lockoutDuration:  { type: Number, default: 30 },
      requireMFA:       { type: Boolean, default: false },
      passwordExpiry:   { type: Number, default: 90 },
    },

    notifications: {
      emailOnNewLead:        { type: Boolean, default: true },
      emailOnNewTicket:      { type: Boolean, default: true },
      emailOnNewApplication: { type: Boolean, default: false },
      emailOnInvoicePaid:    { type: Boolean, default: true },
      browserPush:           { type: Boolean, default: false },
    },

    seo: {
      defaultMetaDescription: { type: String, default: '' },
      googleSiteVerification: { type: String, default: '' },
      generateSitemap:        { type: Boolean, default: true },
      allowIndexing:          { type: Boolean, default: true },
    },

    system: {
      maintenanceMode: { type: Boolean, default: false },
      maxFileSize: { type: Number, default: 10 }, // in MB
      allowedFileTypes: { type: [String], default: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'] },
      backupEnabled: { type: Boolean, default: true },
      backupFrequency: { type: String, default: 'daily' },
      logRetentionDays: { type: Number, default: 30 },
      cacheEnabled: { type: Boolean, default: true },
      sessionTimeout: { type: Number, default: 1440 }, // in minutes
    },

    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
