const SeoAuditRun = require('../models/SeoAuditRun');
const SeoAuditIssue = require('../models/SeoAuditIssue');

async function createRun(data) {
  return SeoAuditRun.create(data);
}

async function updateRun(id, updates) {
  return SeoAuditRun.findByIdAndUpdate(id, updates, { new: true });
}

async function findRunById(id) {
  return SeoAuditRun.findById(id).populate('triggeredBy', 'name email').lean();
}

async function findRunsPaginated(options = {}) {
  const { page = 1, limit = 20, sort = '-startedAt' } = options;
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    SeoAuditRun.find().sort(sort).skip(skip).limit(limit).populate('triggeredBy', 'name').lean(),
    SeoAuditRun.countDocuments(),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function createIssue(data) {
  return SeoAuditIssue.create(data);
}

async function createIssuesBulk(issues) {
  return SeoAuditIssue.insertMany(issues);
}

async function findIssuesByRunId(auditRunId, filter = {}) {
  return SeoAuditIssue.find({ auditRunId, ...filter }).sort({ severity: 1 }).lean();
}

async function resolveIssue(issueId, resolvedBy) {
  return SeoAuditIssue.findByIdAndUpdate(
    issueId,
    { resolved: true, resolvedBy, resolvedAt: new Date() },
    { new: true }
  );
}

async function findLatestRun() {
  return SeoAuditRun.findOne().sort({ startedAt: -1 }).lean();
}

module.exports = {
  createRun,
  updateRun,
  findRunById,
  findRunsPaginated,
  createIssue,
  createIssuesBulk,
  findIssuesByRunId,
  resolveIssue,
  findLatestRun,
};
