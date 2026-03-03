const Subscriber = require('../models/Subscriber');
const { AppError } = require('../../../shared/middleware/errorHandler');

exports.subscribe = async (req, res, next) => {
  try {
    const { email, name } = req.body;
    const existing = await Subscriber.findOne({ email });
    if (existing) {
      if (existing.status === 'unsubscribed') {
        existing.status = 'active'; existing.unsubscribedAt = undefined;
        await existing.save();
        return res.json({ status: 'success', message: 'Resubscribed successfully' });
      }
      return res.json({ status: 'success', message: 'Already subscribed' });
    }

    await Subscriber.create({ email, name, ipAddress: req.ip, confirmedAt: new Date() });
    res.status(201).json({ status: 'success', message: 'Subscribed successfully' });
  } catch (err) { next(err); }
};

exports.unsubscribe = async (req, res, next) => {
  try {
    const subscriber = await Subscriber.findOneAndUpdate(
      { email: req.body.email },
      { status: 'unsubscribed', unsubscribedAt: new Date() },
      { new: true }
    );
    if (!subscriber) return next(new AppError('Email not found', 404));
    res.json({ status: 'success', message: 'Unsubscribed successfully' });
  } catch (err) { next(err); }
};

exports.listSubscribers = async (req, res, next) => {
  try {
    const page  = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) filter.$or = [
      { email: { $regex: req.query.search, $options: 'i' } },
      { name:  { $regex: req.query.search, $options: 'i' } },
    ];

    const [subscribers, total] = await Promise.all([
      Subscriber.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(limit),
      Subscriber.countDocuments(filter),
    ]);

    res.json({ status: 'success', data: { subscribers, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
  } catch (err) { next(err); }
};

exports.getStats = async (req, res, next) => {
  try {
    const [total, active, unsubscribed] = await Promise.all([
      Subscriber.countDocuments(),
      Subscriber.countDocuments({ status: 'active' }),
      Subscriber.countDocuments({ status: 'unsubscribed' }),
    ]);
    res.json({ status: 'success', data: { total, active, unsubscribed } });
  } catch (err) { next(err); }
};

exports.deleteSubscriber = async (req, res, next) => {
  try {
    await Subscriber.findByIdAndDelete(req.params.id);
    res.json({ status: 'success', message: 'Subscriber deleted' });
  } catch (err) { next(err); }
};
