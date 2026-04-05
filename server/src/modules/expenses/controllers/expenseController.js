const Expense = require('../models/Expense');
const { AppError } = require('../../../shared/middleware/errorHandler');

exports.listExpenses = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.search) {
      filter.$or = [
        { description: { $regex: req.query.search, $options: 'i' } },
        { vendor: { $regex: req.query.search, $options: 'i' } },
      ];
    }
    if (req.query.startDate || req.query.endDate) {
      filter.date = {};
      if (req.query.startDate) filter.date.$gte = new Date(req.query.startDate);
      if (req.query.endDate) filter.date.$lte = new Date(req.query.endDate);
    }

    const [expenses, total] = await Promise.all([
      Expense.find(filter)
        .populate('createdBy', 'name')
        .sort('-date')
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Expense.countDocuments(filter),
    ]);

    res.json({
      status: 'success',
      data: {
        expenses,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id).populate('createdBy', 'name email');
    if (!expense) return next(new AppError('Expense not found', 404));
    res.json({ status: 'success', data: { expense } });
  } catch (err) {
    next(err);
  }
};

exports.createExpense = async (req, res, next) => {
  try {
    const payload = req.validated || req.body;
    const expense = await Expense.create({
      ...payload,
      createdBy: req.user._id,
    });
    res.status(201).json({ status: 'success', data: { expense } });
  } catch (err) {
    next(err);
  }
};

exports.updateExpense = async (req, res, next) => {
  try {
    const updates = req.validated || req.body;
    const expense = await Expense.findById(req.params.id);
    if (!expense) return next(new AppError('Expense not found', 404));
    Object.entries(updates).forEach(([key, value]) => {
      expense[key] = value;
    });
    await expense.save();
    res.json({ status: 'success', data: { expense } });
  } catch (err) {
    next(err);
  }
};

exports.deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return next(new AppError('Expense not found', 404));
    res.json({ status: 'success', message: 'Expense deleted' });
  } catch (err) {
    next(err);
  }
};

exports.getStats = async (req, res, next) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [total, byStatus, byCategory, monthlyTotal] = await Promise.all([
      Expense.countDocuments(),
      Expense.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } },
      ]),
      Expense.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 }, amount: { $sum: '$amount' } } },
      ]),
      Expense.aggregate([
        { $match: { date: { $gte: startOfMonth } } },
        { $group: { _id: null, amount: { $sum: '$amount' } } },
      ]),
    ]);

    const byStatusMap = {};
    byStatus.forEach((s) => (byStatusMap[s._id] = { count: s.count, amount: s.amount }));
    const byCategoryMap = {};
    byCategory.forEach((c) => (byCategoryMap[c._id] = { count: c.count, amount: c.amount }));

    res.json({
      status: 'success',
      data: {
        total,
        byStatus: byStatusMap,
        byCategory: byCategoryMap,
        monthlyTotal: monthlyTotal[0]?.amount || 0,
      },
    });
  } catch (err) {
    next(err);
  }
};
