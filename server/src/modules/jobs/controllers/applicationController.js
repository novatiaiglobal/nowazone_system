const Application = require('../models/Application');
const Job = require('../models/Job');
const { AppError } = require('../../../shared/middleware/errorHandler');

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

exports.submitApplication = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job || job.status !== 'active') return next(new AppError('Job not found or not accepting applications', 404));

    const application = await Application.create({
      ...req.body,
      job: req.params.jobId,
      ipAddress: req.ip,
    });

    await Job.findByIdAndUpdate(req.params.jobId, { $inc: { applicationCount: 1 } });
    res.status(201).json({ status: 'success', data: { application } });
  } catch (err) { next(err); }
};

exports.updateApplicationStatus = async (req, res, next) => {
  try {
    const { status, notes, rating, interviewDate, reviewedBy } = req.body;
    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { status, notes, rating, interviewDate, reviewedBy: req.user._id },
      { new: true, runValidators: true }
    ).populate('job', 'title');
    if (!application) return next(new AppError('Application not found', 404));
    res.json({ status: 'success', data: { application } });
  } catch (err) { next(err); }
};

exports.deleteApplication = async (req, res, next) => {
  try {
    const app = await Application.findByIdAndDelete(req.params.id);
    if (!app) return next(new AppError('Application not found', 404));
    res.json({ status: 'success', message: 'Application deleted' });
  } catch (err) { next(err); }
};
