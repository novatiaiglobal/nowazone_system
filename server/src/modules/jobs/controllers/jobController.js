const Job = require('../models/Job');
const Application = require('../models/Application');
const { AppError } = require('../../../shared/middleware/errorHandler');

let OpenAI;
try { OpenAI = require('openai'); } catch { OpenAI = null; }

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

/** Public: get single active job by ID (for apply page / job detail) */
exports.getPublicJob = async (req, res, next) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, status: 'active' })
      .select('title department location type experience description requirements responsibilities skills salaryMin salaryMax currency');
    if (!job) return next(new AppError('Job not found or not accepting applications', 404));
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

const AI_ACTIONS = {
  grammar: 'Fix grammar and spelling. Return only the corrected text, no explanations.',
  improve: 'Improve clarity and professionalism. Keep the same length roughly. Return only the improved text.',
  expand: 'Expand with more detail while staying professional. Return only the expanded text.',
  shorten: 'Make it more concise while keeping key points. Return only the shortened text.',
  continue: 'Continue the text naturally in the same style. Add 1-3 more sentences. Return only the continuation (do not repeat the input).',
};

exports.aiRefineDescription = async (req, res, next) => {
  try {
    const { action, text } = req.body || {};
    if (!OpenAI || !process.env.OPENAI_API_KEY) {
      return next(new AppError('AI is not configured', 503));
    }
    if (!text || typeof text !== 'string' || !text.trim()) {
      return next(new AppError('Text is required', 400));
    }
    const instruction = AI_ACTIONS[action] || AI_ACTIONS.improve;

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a professional HR copywriter. Output only the requested text, no markdown or extra formatting.' },
        { role: 'user', content: `${instruction}\n\nInput:\n${text.trim()}` },
      ],
      temperature: 0.4,
      max_tokens: 2000,
    });

    const result = completion.choices[0]?.message?.content?.trim() || text;
    res.json({ status: 'success', data: { text: result } });
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
