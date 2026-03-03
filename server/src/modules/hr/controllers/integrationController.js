const HRJobPosting = require('../models/HRJobPosting');
const linkedin = require('../services/linkedinService');
const indeed   = require('../services/indeedService');
const naukri   = require('../services/naukriService');
const { AppError } = require('../../../shared/middleware/errorHandler');

// ── LinkedIn ───────────────────────────────────────────────────────────────────

exports.linkedinConnect = (req, res, next) => {
  try {
    if (!process.env.LINKEDIN_CLIENT_ID) {
      return next(new AppError('LinkedIn credentials not configured', 503));
    }
    const state   = `${req.user._id}:${Date.now()}`;
    const authUrl = linkedin.getAuthUrl(state);
    res.redirect(authUrl);
  } catch (err) { next(err); }
};

exports.linkedinCallback = async (req, res, next) => {
  try {
    const { code, state, error } = req.query;
    if (error) return next(new AppError(`LinkedIn OAuth error: ${error}`, 400));
    if (!code)  return next(new AppError('No authorization code returned', 400));

    const token  = await linkedin.exchangeCode(code);
    const userId = state?.split(':')[0];
    await linkedin.storeToken(userId || req.user._id, token);

    // Redirect back to the jobs page
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/dashboard/hr/recruitment/jobs?linkedin=connected`);
  } catch (err) { next(err); }
};

exports.linkedinPostJob = async (req, res, next) => {
  try {
    const { jobId, publish } = req.body;
    const job = await HRJobPosting.findById(jobId);
    if (!job) return next(new AppError('Job not found', 404));

    if (publish === false) {
      job.publishedPlatforms.linkedin = false;
      await job.save();
      return res.json({ status: 'success', data: { synced: false } });
    }

    await linkedin.postJob(req.user._id, job);
    job.publishedPlatforms.linkedin = true;
    await job.save();

    res.json({ status: 'success', data: { synced: true } });
  } catch (err) { next(err); }
};

// ── Indeed ─────────────────────────────────────────────────────────────────────

exports.indeedConnect = (req, res, next) => {
  try {
    if (!process.env.INDEED_CLIENT_ID) {
      return next(new AppError('Indeed credentials not configured', 503));
    }
    const state   = `${req.user._id}:${Date.now()}`;
    const authUrl = indeed.getAuthUrl(state);
    res.redirect(authUrl);
  } catch (err) { next(err); }
};

exports.indeedCallback = async (req, res, next) => {
  try {
    const { code, state, error } = req.query;
    if (error) return next(new AppError(`Indeed OAuth error: ${error}`, 400));
    if (!code)  return next(new AppError('No authorization code returned', 400));

    const token  = await indeed.exchangeCode(code);
    const userId = state?.split(':')[0];
    await indeed.storeToken(userId || req.user._id, token);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/dashboard/hr/recruitment/jobs?indeed=connected`);
  } catch (err) { next(err); }
};

exports.indeedPostJob = async (req, res, next) => {
  try {
    const { jobId, publish } = req.body;
    const job = await HRJobPosting.findById(jobId);
    if (!job) return next(new AppError('Job not found', 404));

    if (publish === false) {
      job.publishedPlatforms.indeed = false;
      await job.save();
      return res.json({ status: 'success', data: { synced: false } });
    }

    await indeed.postJob(req.user._id, job);
    job.publishedPlatforms.indeed = true;
    await job.save();

    res.json({ status: 'success', data: { synced: true } });
  } catch (err) { next(err); }
};

// ── Naukri ─────────────────────────────────────────────────────────────────────

exports.naukriPostJob = async (req, res, next) => {
  try {
    const { jobId, publish } = req.body;
    const job = await HRJobPosting.findById(jobId);
    if (!job) return next(new AppError('Job not found', 404));

    if (publish === false) {
      job.publishedPlatforms.naukri = false;
      await job.save();
      return res.json({ status: 'success', data: { synced: false } });
    }

    await naukri.postJob(job);
    job.publishedPlatforms.naukri = true;
    await job.save();

    res.json({ status: 'success', data: { synced: true } });
  } catch (err) { next(err); }
};
