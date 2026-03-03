const FAQ = require('../models/FAQ');
const { AppError } = require('../../../shared/middleware/errorHandler');

exports.listFAQs = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.service)  filter.service  = req.query.service;
    if (req.query.active !== undefined) filter.isActive = req.query.active === 'true';
    if (req.query.search) filter.$text = { $search: req.query.search };

    const faqs = await FAQ.find(filter).sort('order category').populate('createdBy', 'name');
    res.json({ status: 'success', data: { faqs } });
  } catch (err) { next(err); }
};

exports.createFAQ = async (req, res, next) => {
  try {
    const faq = await FAQ.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ status: 'success', data: { faq } });
  } catch (err) { next(err); }
};

exports.updateFAQ = async (req, res, next) => {
  try {
    const faq = await FAQ.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!faq) return next(new AppError('FAQ not found', 404));
    res.json({ status: 'success', data: { faq } });
  } catch (err) { next(err); }
};

exports.deleteFAQ = async (req, res, next) => {
  try {
    const faq = await FAQ.findByIdAndDelete(req.params.id);
    if (!faq) return next(new AppError('FAQ not found', 404));
    res.json({ status: 'success', message: 'FAQ deleted' });
  } catch (err) { next(err); }
};

exports.reorderFAQs = async (req, res, next) => {
  try {
    const { items } = req.body; // [{ id, order }]
    await Promise.all(items.map(({ id, order }) => FAQ.findByIdAndUpdate(id, { order })));
    res.json({ status: 'success', message: 'FAQs reordered' });
  } catch (err) { next(err); }
};
