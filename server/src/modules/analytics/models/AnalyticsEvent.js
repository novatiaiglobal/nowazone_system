const mongoose = require('mongoose');

const analyticsEventSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  category: { type: String, required: true },
  action: { type: String, required: true },
  label: { type: String },
  value: { type: Number },
  page: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
  ipAddress: { type: String },
}, { timestamps: true });

analyticsEventSchema.index({ createdAt: -1 });
analyticsEventSchema.index({ category: 1, action: 1 });

module.exports = mongoose.model('AnalyticsEvent', analyticsEventSchema);
