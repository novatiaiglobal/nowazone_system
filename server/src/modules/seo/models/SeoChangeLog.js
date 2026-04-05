const mongoose = require('mongoose');

const seoChangeLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, trim: true },
    entityType: { type: String, required: true, trim: true },
    entityId: { type: mongoose.Schema.Types.Mixed, required: true },
    before: { type: mongoose.Schema.Types.Mixed },
    after: { type: mongoose.Schema.Types.Mixed },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ip: { type: String, trim: true },
    userAgent: { type: String, trim: true },
  },
  { timestamps: true }
);

seoChangeLogSchema.index({ entityType: 1, entityId: 1 });
seoChangeLogSchema.index({ changedBy: 1, createdAt: -1 });
seoChangeLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SeoChangeLog', seoChangeLogSchema);
