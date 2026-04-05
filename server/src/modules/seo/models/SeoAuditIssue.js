const mongoose = require('mongoose');

const ISSUE_SEVERITY = ['critical', 'warning', 'info'];

const seoAuditIssueSchema = new mongoose.Schema(
  {
    auditRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'SeoAuditRun', required: true },
    pageUrl: { type: String, trim: true },
    pageId: { type: mongoose.Schema.Types.ObjectId, ref: 'SeoPage' },
    issueType: { type: String, trim: true, required: true },
    severity: { type: String, enum: ISSUE_SEVERITY, default: 'warning' },
    message: { type: String, trim: true, required: true },
    recommendation: { type: String, trim: true },
    resolved: { type: Boolean, default: false },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

seoAuditIssueSchema.index({ auditRunId: 1 });
seoAuditIssueSchema.index({ pageId: 1, resolved: 1 });
seoAuditIssueSchema.index({ severity: 1 });

module.exports = mongoose.model('SeoAuditIssue', seoAuditIssueSchema);
module.exports.ISSUE_SEVERITY = ISSUE_SEVERITY;
