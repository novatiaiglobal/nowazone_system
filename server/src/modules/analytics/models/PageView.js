const mongoose = require('mongoose');

const pageViewSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  page: { type: String, required: true },
  referrer: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  ipAddress: { type: String, default: '' },
  country: { type: String, default: '' },
  city: { type: String, default: '' },
  device: { type: String, enum: ['desktop', 'mobile', 'tablet', 'unknown'], default: 'unknown' },
  browser: { type: String, default: '' },
  os: { type: String, default: '' },
  duration: { type: Number, default: 0 },
  source: { type: String, enum: ['direct', 'organic', 'social', 'referral', 'email', 'paid', 'unknown'], default: 'unknown' },
  utmSource: { type: String },
  utmMedium: { type: String },
  utmCampaign: { type: String },
  isBounce: { type: Boolean, default: true },
  isNewVisitor: { type: Boolean, default: true },
}, { timestamps: true });

pageViewSchema.index({ createdAt: -1 });
pageViewSchema.index({ page: 1, createdAt: -1 });
pageViewSchema.index({ source: 1 });
pageViewSchema.index({ country: 1 });

module.exports = mongoose.model('PageView', pageViewSchema);
