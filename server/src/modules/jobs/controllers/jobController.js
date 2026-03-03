const Job = require('../models/Job');
const Application = require('../models/Application');
const { AppError } = require('../../../shared/middleware/errorHandler');

const buildFilter = (query) => {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.department) filter.department = query.department;
  if (query.type) filter.type = query.type;
  if (query.experience) filter.experience = query.experience;
  if (query.search) filter.$text = { $search: query.search };
  return filter;
};

exports.listJobs = async (req, res, next) => {
  try {
    const page  = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const filter = buildFilter(req.query);

    const [jobs, total] = await Promise.all([
      Job.find(filter).populate('postedBy', 'name').sort('-createdAt').skip((page - 1) * limit).limit(limit),
      Job.countDocuments(filter),
    ]);

    res.json({ status: 'success', data: { jobs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
  } catch (err) { next(err); }
};

exports.getJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id).populate('postedBy', 'name email');
    if (!job) return next(new AppError('Job not found', 404));
    res.json({ status: 'success', data: { job } });
  } catch (err) { next(err); }
};

exports.createJob = async (req, res, next) => {
  try {
    const job = await Job.create({ ...req.body, postedBy: req.user._id });
    res.status(201).json({ status: 'success', data: { job } });
  } catch (err) { next(err); }
};

exports.updateJob = async (req, res, next) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!job) return next(new AppError('Job not found', 404));
    res.json({ status: 'success', data: { job } });
  } catch (err) { next(err); }
};

exports.deleteJob = async (req, res, next) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) return next(new AppError('Job not found', 404));
    await Application.deleteMany({ job: req.params.id });
    res.json({ status: 'success', message: 'Job deleted' });
  } catch (err) { next(err); }
};

exports.getJobStats = async (req, res, next) => {
  try {
    const [totalJobs, activeJobs, totalApplications, recentApplications] = await Promise.all([
      Job.countDocuments(),
      Job.countDocuments({ status: 'active' }),
      Application.countDocuments(),
      Application.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
    ]);
    res.json({ status: 'success', data: { totalJobs, activeJobs, totalApplications, recentApplications } });
  } catch (err) { next(err); }
};
