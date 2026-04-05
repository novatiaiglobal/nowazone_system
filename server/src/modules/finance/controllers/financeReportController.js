const Invoice = require('../../invoices/models/Invoice');
const Expense = require('../../expenses/models/Expense');
const { AppError } = require('../../../shared/middleware/errorHandler');

/**
 * Financial reports: revenue, expenses, profit/loss, time-series for charts
 */
exports.getReports = async (req, res, next) => {
  try {
    const period = req.query.period || '30d'; // 7d, 30d, 90d
    const days = parseInt(period, 10) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      revenueByDay,
      expensesByDay,
      invoiceStats,
      expenseStats,
      recentInvoices,
      recentExpenses,
    ] = await Promise.all([
      Invoice.aggregate([
        { $match: { status: 'paid', paidAt: { $gte: startDate } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } }, amount: { $sum: '$total' } } },
        { $sort: { _id: 1 } },
      ]),
      Expense.aggregate([
        { $match: { date: { $gte: startDate } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, amount: { $sum: '$amount' } } },
        { $sort: { _id: 1 } },
      ]),
      Invoice.aggregate([
        { $match: { status: 'paid', paidAt: { $gte: monthStart } } },
        { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      Expense.aggregate([
        { $match: { date: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Invoice.find({ status: { $in: ['sent', 'overdue'] } }).sort('-dueDate').limit(5).lean(),
      Expense.find({ status: 'pending' }).sort('-date').limit(5).lean(),
    ]);

    const revMap = {};
    revenueByDay.forEach((r) => (revMap[r._id] = r.amount));
    const expMap = {};
    expensesByDay.forEach((e) => (expMap[e._id] = e.amount));

    const allDates = new Set([...Object.keys(revMap), ...Object.keys(expMap)]);
    const sortedDates = [...allDates].sort();
    const timeSeries = sortedDates.map((d) => ({
      date: d,
      revenue: revMap[d] || 0,
      expenses: expMap[d] || 0,
      profit: (revMap[d] || 0) - (expMap[d] || 0),
    }));

    const invStat = invoiceStats[0] || { revenue: 0, count: 0 };
    const expStat = expenseStats[0] || { total: 0, count: 0 };
    const profit = invStat.revenue - expStat.total;

    res.json({
      status: 'success',
      data: {
        summary: {
          revenueThisMonth: invStat.revenue,
          invoicesPaidThisMonth: invStat.count,
          expensesThisMonth: expStat.total,
          expensesCountThisMonth: expStat.count,
          profitThisMonth: profit,
        },
        timeSeries,
        recentInvoices,
        recentExpenses,
      },
    });
  } catch (err) {
    next(err);
  }
};
