const mongoose = require('mongoose');

const RUN_TYPE = ['manual', 'scheduled'];
const RUN_SCOPE = ['single-page', 'site-wide'];
const RUN_STATUS = ['pending', 'running', 'completed', 'failed'];

const seoAuditRunSchema = new mongoose.Schema(
  {
    runType: { type: String, enum: RUN_TYPE, default: 'manual' },
    scope: { type: String, enum: RUN_SCOPE, default: 'site-wide' },
    targetPageId: { type: mongoose.Schema.Types.ObjectId, ref: 'SeoPage' },
    triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date },
    status: { type: String, enum: RUN_STATUS, default: 'pending' },
    summary: {
      totalPages: { type: Number, default: 0 },
      pagesWithIssues: { type: Number, default: 0 },
      overallScore: { type: Number, default: 0 },
      criticalCount: { type: Number, default: 0 },
      warningCount: { type: Number, default: 0 },
      infoCount: { type: Number, default: 0 },
    },
    errorMessage: { type: String },
  },
  { timestamps: true }
);

seoAuditRunSchema.index({ triggeredBy: 1, startedAt: -1 });
seoAuditRunSchema.index({ status: 1 });
seoAuditRunSchema.index({ startedAt: -1 });

module.exports = mongoose.model('SeoAuditRun', seoAuditRunSchema);
module.exports.RUN_TYPE = RUN_TYPE;
module.exports.RUN_SCOPE = RUN_SCOPE;
module.exports.RUN_STATUS = RUN_STATUS;
