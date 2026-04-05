const seoAuditService = require('../services/seoAuditService');

async function runAudit(req, res, next) {
  try {
    const payload = req.validated || req.body || {};
    const run = await seoAuditService.runAudit(payload, req.user._id);
    res.status(201).json({ status: 'success', data: run });
  } catch (err) {
    next(err);
  }
}

async function listRuns(req, res, next) {
  try {
    const query = req.query || {};
    const result = await seoAuditService.listRuns(query);
    res.json({
      status: 'success',
      data: {
        runs: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getRun(req, res, next) {
  try {
    const run = await seoAuditService.getRun(req.params.id);
    res.json({ status: 'success', data: run });
  } catch (err) {
    next(err);
  }
}

async function getIssues(req, res, next) {
  try {
    const issues = await seoAuditService.getIssues(req.params.id, req.query);
    res.json({ status: 'success', data: issues });
  } catch (err) {
    next(err);
  }
}

async function resolveIssue(req, res, next) {
  try {
    const issue = await seoAuditService.resolveIssue(req.params.issueId, req.user._id);
    res.json({ status: 'success', data: issue });
  } catch (err) {
    next(err);
  }
}

async function schedule(req, res, next) {
  try {
    const result = await seoAuditService.scheduleAudit();
    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  runAudit,
  listRuns,
  getRun,
  getIssues,
  resolveIssue,
  schedule,
};
