const FormSubmission = require('../models/FormSubmission');
const Lead = require('../../crm/models/Lead');
const { AppError } = require('../../../shared/middleware/errorHandler');
const rateLimit = require('express-rate-limit');

// ─── In-memory rate limiters for public form endpoints ──────────────────────

const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { status: 'fail', message: 'Too many submissions. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { status: 'fail', message: 'Too many contact submissions. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Helpers ────────────────────────────────────────────────────────────────────

async function createLeadFromSubmission(submission, req) {
  const lead = await Lead.create({
    name: submission.name,
    email: submission.email,
    phone: submission.phone || '0000000000',
    company: submission.company || '',
    source: 'website',
    status: 'new',
    metadata: { formType: submission.type, formId: submission._id, page: submission.page },
  });

  submission.leadId = lead._id;
  await submission.save();

  const io = req.app.get('io');
  if (io) {
    io.to('crm').emit('notification:new', {
      type: 'new_lead',
      title: `New ${submission.type} submission`,
      message: `${submission.name} submitted a ${submission.type} form`,
      data: { formId: submission._id, leadId: lead._id },
    });
  }

  return lead;
}

// ─── Public form submission endpoints ───────────────────────────────────────────

exports.submitContact = [
  contactLimiter,
  async (req, res, next) => {
    try {
      const { name, email, phone, company, message, page } = req.body;
      if (!name || !email) {
        return next(new AppError('Name and email are required', 400));
      }

      const submission = await FormSubmission.create({
        type: 'contact',
        name,
        email,
        phone,
        company,
        message,
        page,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || '',
      });

      await createLeadFromSubmission(submission, req);

      res.status(201).json({
        status: 'success',
        message: 'Contact form submitted successfully',
        data: { id: submission._id },
      });
    } catch (err) { next(err); }
  },
];

exports.submitAssessment = [
  formLimiter,
  async (req, res, next) => {
    try {
      const { name, email, company, businessSize, industry, aiGoals, page, ...rest } = req.body;
      if (!name || !email) {
        return next(new AppError('Name and email are required', 400));
      }

      const submission = await FormSubmission.create({
        type: 'assessment',
        name,
        email,
        company,
        page,
        formData: { businessSize, industry, aiGoals, ...rest },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || '',
      });

      await createLeadFromSubmission(submission, req);

      res.status(201).json({
        status: 'success',
        message: 'Assessment form submitted successfully',
        data: { id: submission._id },
      });
    } catch (err) { next(err); }
  },
];

exports.submitAppointment = [
  formLimiter,
  async (req, res, next) => {
    try {
      const { name, email, phone, company, preferredDate, preferredTime,
              serviceType, message, page } = req.body;
      if (!name || !email) {
        return next(new AppError('Name and email are required', 400));
      }

      const submission = await FormSubmission.create({
        type: 'appointment',
        name,
        email,
        phone,
        company,
        message,
        page,
        formData: { preferredDate, preferredTime, serviceType },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || '',
      });

      await createLeadFromSubmission(submission, req);

      res.status(201).json({
        status: 'success',
        message: 'Appointment request submitted successfully',
        data: { id: submission._id },
      });
    } catch (err) { next(err); }
  },
];

exports.submitDownload = [
  formLimiter,
  async (req, res, next) => {
    try {
      const { name, email, company, phone, resourceName, page } = req.body;
      if (!name || !email) {
        return next(new AppError('Name and email are required', 400));
      }

      const submission = await FormSubmission.create({
        type: 'download',
        name,
        email,
        phone,
        company,
        page,
        formData: { resourceName },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || '',
      });

      await createLeadFromSubmission(submission, req);

      res.status(201).json({
        status: 'success',
        message: 'Download request submitted successfully',
        data: { id: submission._id },
      });
    } catch (err) { next(err); }
  },
];

// ─── Admin endpoints ────────────────────────────────────────────────────────────

exports.getSubmissions = async (req, res, next) => {
  try {
    const page  = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const filter = {};

    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate) filter.createdAt.$lte = new Date(req.query.endDate);
    }
    if (req.query.search) {
      filter.$or = [
        { name:  { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { company: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const [submissions, total] = await Promise.all([
      FormSubmission.find(filter)
        .populate('leadId', 'name email status')
        .populate('respondedBy', 'name email')
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(limit),
      FormSubmission.countDocuments(filter),
    ]);

    res.json({
      status: 'success',
      data: {
        submissions,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) { next(err); }
};

exports.getSubmission = async (req, res, next) => {
  try {
    const submission = await FormSubmission.findById(req.params.id)
      .populate('leadId', 'name email status score')
      .populate('respondedBy', 'name email');

    if (!submission) {
      return next(new AppError('Form submission not found', 404));
    }

    res.json({ status: 'success', data: { submission } });
  } catch (err) { next(err); }
};

exports.updateSubmissionStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status || !['new', 'read', 'responded', 'archived'].includes(status)) {
      return next(new AppError('Valid status is required (new, read, responded, archived)', 400));
    }

    const update = { status };
    if (status === 'responded') {
      update.respondedBy = req.user._id;
      update.respondedAt = new Date();
    }

    const submission = await FormSubmission.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true },
    );

    if (!submission) {
      return next(new AppError('Form submission not found', 404));
    }

    res.json({
      status: 'success',
      message: 'Submission status updated',
      data: { submission },
    });
  } catch (err) { next(err); }
};

exports.getStats = async (req, res, next) => {
  try {
    const [byType, byStatus] = await Promise.all([
      FormSubmission.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      FormSubmission.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    const total = byType.reduce((sum, t) => sum + t.count, 0);

    res.json({
      status: 'success',
      data: {
        total,
        byType: byType.map(t => ({ type: t._id, count: t.count })),
        byStatus: byStatus.map(s => ({ status: s._id, count: s.count })),
      },
    });
  } catch (err) { next(err); }
};
