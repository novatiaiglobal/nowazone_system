const Application = require('../models/Application');
const Job = require('../models/Job');
const { AppError } = require('../../../shared/middleware/errorHandler');
const { onHired } = require('../../../shared/services/jobHiringService');

exports.listApplications = async (req, res, next) => {
  try {
    const page   = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit  = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const filter = {};
    if (req.query.job)    filter.job    = req.query.job;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) filter.$or = [
      { applicantName:  { $regex: req.query.search, $options: 'i' } },
      { applicantEmail: { $regex: req.query.search, $options: 'i' } },
    ];

    const [applications, total] = await Promise.all([
      Application.find(filter).populate('job', 'title department').populate('reviewedBy', 'name').sort('-createdAt').skip((page - 1) * limit).limit(limit),
      Application.countDocuments(filter),
    ]);

    res.json({ status: 'success', data: { applications, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
  } catch (err) { next(err); }
};

exports.getApplication = async (req, res, next) => {
  try {
    const app = await Application.findById(req.params.id).populate('job', 'title department location').populate('reviewedBy', 'name');
    if (!app) return next(new AppError('Application not found', 404));
    res.json({ status: 'success', data: { application: app } });
  } catch (err) { next(err); }
};

exports.uploadResume = async (req, res, next) => {
  try {
    if (!req.file || !req.file.path) {
      return next(new AppError('No resume file uploaded', 400));
    }
    res.status(200).json({ status: 'success', data: { url: req.file.path } });
  } catch (err) { next(err); }
};

/** GET /jobs/applications/mine — list applications for the authenticated user. */
exports.listMyApplications = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    if (!userId) return next(new AppError('Not authenticated', 401));

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const filter = { applicant: userId };
    if (req.query.status) filter.status = req.query.status;

    const [applications, total] = await Promise.all([
      Application.find(filter).populate('job', 'title department location').sort('-createdAt').skip((page - 1) * limit).limit(limit),
      Application.countDocuments(filter),
    ]);

    res.json({ status: 'success', data: { applications, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
  } catch (err) { next(err); }
};

exports.submitApplication = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job || job.status !== 'active') return next(new AppError('Job not found or not accepting applications', 404));

    const user = req.user;
    const email = (req.body.applicantEmail || user.email || '').toLowerCase().trim();
    if (!email) return next(new AppError('Email is required', 400));

    const duplicate = await Application.findOne({ job: req.params.jobId, applicantEmail: email });
    if (duplicate) {
      return next(new AppError('You have already applied for this position with this email address.', 409));
    }

    const payload = {
      ...req.body,
      job: req.params.jobId,
      applicantName: req.body.applicantName || user.name,
      applicantEmail: email,
      applicant: user._id,
      ipAddress: req.ip,
    };

    const application = await Application.create(payload);

    await Job.findByIdAndUpdate(req.params.jobId, { $inc: { applicationCount: 1 } });
    res.status(201).json({ status: 'success', data: { application } });
  } catch (err) { next(err); }
};

exports.updateApplicationStatus = async (req, res, next) => {
  try {
    const existing = await Application.findById(req.params.id);
    if (!existing) return next(new AppError('Application not found', 404));
    if (existing.status === 'hired') {
      return next(new AppError('Hired applications cannot be modified', 400));
    }

    const { status, notes, rating, interviewDate, reviewedBy } = req.body;
    const newStatus = status || existing.status;
    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { status: newStatus, notes, rating, interviewDate, reviewedBy: req.user._id },
      { new: true, runValidators: true }
    ).populate('job', 'title department location');
    if (!application) return next(new AppError('Application not found', 404));

    // When moved to hired: send welcome email, reject others & close job (only when all positions filled)
    let hiring = null;
    if (newStatus === 'hired' && existing.status !== 'hired') {
      try {
        hiring = await onHired(application._id);
      } catch (err) {
        console.error('[Application] onHired:', err.message);
      }
    }

    res.json({ status: 'success', data: { application, hiring } });
  } catch (err) { next(err); }
};

exports.deleteApplication = async (req, res, next) => {
  try {
    const app = await Application.findById(req.params.id);
    if (!app) return next(new AppError('Application not found', 404));
    if (app.status === 'hired') {
      return next(new AppError('Hired applications cannot be deleted', 400));
    }
    await app.deleteOne();
    res.json({ status: 'success', message: 'Application deleted' });
  } catch (err) { next(err); }
};
