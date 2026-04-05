const Analytics = require('../models/Analytics');
const Lead = require('../../crm/models/Lead');
const redisClient = require('../../../shared/config/redis');
const Post = require('../../cms/models/Post');
const Comment = require('../../cms/models/Comment');
const Session = require('../../auth/models/Session');
const FormSubmission = require('../../forms/models/FormSubmission');
const { getSystemSettings } = require('../../../shared/services/systemSettings');

class DashboardService {
  async isCacheEnabled() {
    try {
      const system = await getSystemSettings();
      // Default to enabled if setting is missing; only disable when explicitly false.
      return system.cacheEnabled !== false;
    } catch {
      // Fail-open on settings errors so dashboard still works.
      return true;
    }
  }

  async getExecutiveOverview(period = 'today') {
    const allowedPeriods = new Set(['today', 'week', 'month']);
    const effectivePeriod = allowedPeriods.has(period) ? period : 'today';

    const cacheKey = `dashboard:executive:${effectivePeriod}`;
    const useCache = await this.isCacheEnabled();
    if (useCache) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch {
        // Ignore Redis errors and fall back to live computation.
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);

    const rangeStart = effectivePeriod === 'month'
      ? monthStart
      : effectivePeriod === 'week'
        ? weekStart
        : today;

    // Optional: pre-aggregated analytics (when populated)
    let todayAnalytics = null;
    let monthData = {};
    let rangeData = {};
    try {
      todayAnalytics = await Analytics.findOne({ date: { $gte: today } }).sort({ date: -1 }).lean();
      const monthAnalytics = await Analytics.aggregate([
        { $match: { date: { $gte: monthStart } } },
        {
          $group: {
            _id: null,
            visitorsMonth: { $sum: '$visitors.today' },
            formsSubmitted: { $sum: '$leads.formsSubmittedToday' },
            assessments: { $sum: '$leads.assessmentsRequested' },
            appointments: { $sum: '$leads.appointmentsBooked' },
            downloads: { $sum: '$leads.downloads' },
            subscribers: { $sum: '$leads.newSubscribers' },
            applicationsMonth: { $sum: '$hiring.applicationsToday' },
            invoicesGenerated: { $sum: '$revenue.invoicesGeneratedMonth' },
            revenueMonth: { $sum: '$revenue.totalRevenueMonth' },
          },
        },
      ]);
      monthData = monthAnalytics[0] || {};

      const aggregateRange = await Analytics.aggregate([
        { $match: { date: { $gte: rangeStart } } },
        {
          $group: {
            _id: null,
            visitorsRange: { $sum: '$visitors.today' },
            formsSubmitted: { $sum: '$leads.formsSubmittedToday' },
            assessments: { $sum: '$leads.assessmentsRequested' },
            appointments: { $sum: '$leads.appointmentsBooked' },
            downloads: { $sum: '$leads.downloads' },
            subscribers: { $sum: '$leads.newSubscribers' },
            applicationsRange: { $sum: '$hiring.applicationsToday' },
            invoicesGenerated: { $sum: '$revenue.invoicesGeneratedMonth' },
            revenueRange: { $sum: '$revenue.totalRevenueMonth' },
          },
        },
      ]);
      rangeData = aggregateRange[0] || {};
    } catch (e) {
      // Analytics collection may be empty or missing
    }

    const analytics = todayAnalytics || {};

    // Live DB counts (always from source collections)
    const [
      activeSessions,
      loggedInUsersToday,
      totalLeads,
      newLeadsToday,
      postsPublished,
      postsDraft,
      postsPendingReview,
      commentsPending,
      hiringCounts,
      revenueCounts,
      subscribersCount,
      formsSubmittedToday,
      formAssessments,
      formAppointments,
      formDownloads,
    ] = await Promise.all([
      Session.countDocuments({ expiresAt: { $gt: new Date() } }),
      Session.distinct('user', { createdAt: { $gte: today } }).then((arr) => arr.length),
      Lead.countDocuments(),
      Lead.countDocuments({ createdAt: { $gte: today } }),
      Post.countDocuments({ status: 'published' }),
      Post.countDocuments({ status: 'draft' }),
      Post.countDocuments({ status: 'pending_review' }),
      Comment.countDocuments({ status: 'pending' }),
      this.getHiringCounts(),
      this.getRevenueCounts(),
      require('../../subscribers/models/Subscriber').countDocuments().catch(() => 0),
      FormSubmission.countDocuments({ createdAt: { $gte: today } }).catch(() => 0),
      FormSubmission.countDocuments({ type: 'assessment', createdAt: { $gte: rangeStart } }).catch(() => 0),
      FormSubmission.countDocuments({ type: 'appointment', createdAt: { $gte: rangeStart } }).catch(() => 0),
      FormSubmission.countDocuments({ type: 'download', createdAt: { $gte: rangeStart } }).catch(() => 0),
    ]);

    const overview = {
      traffic: {
        visitorsToday:
          effectivePeriod === 'today'
            ? analytics.visitors?.today ?? 0
            : rangeData.visitorsRange ?? 0,
        visitorsMonth: rangeData.visitorsRange ?? monthData.visitorsMonth ?? 0,
        topPages: analytics.topPages || [],
        bounceRate: analytics.bounceRate ?? 0,
        trafficByCountry: analytics.trafficByCountry || [],
      },
      leads: {
        formsSubmittedToday:
          formsSubmittedToday || analytics.leads?.formsSubmittedToday || rangeData.formsSubmitted || newLeadsToday,
        assessmentsRequested: formAssessments || rangeData.assessments || 0,
        appointmentsBooked: formAppointments || rangeData.appointments || 0,
        downloads: formDownloads || rangeData.downloads || 0,
        newSubscribers: rangeData.subscribers ?? subscribersCount,
      },
      hiring: {
        activeJobs: analytics.hiring?.activeJobs ?? hiringCounts.activeJobs,
        applicationsToday:
          analytics.hiring?.applicationsToday ??
          (rangeData.applicationsRange ?? hiringCounts.applicationsToday),
        totalResumes: analytics.hiring?.totalResumes ?? hiringCounts.totalResumes,
        shortlistedCandidates:
          analytics.hiring?.shortlistedCandidates ?? hiringCounts.shortlistedCandidates,
      },
      content: {
        publishedBlogs: analytics.content?.publishedBlogs ?? postsPublished,
        drafts: analytics.content?.drafts ?? postsDraft,
        pendingReviews: analytics.content?.pendingReviews ?? postsPendingReview,
        commentsPendingApproval: analytics.content?.commentsPendingApproval ?? commentsPending,
      },
      revenue: {
        invoicesGeneratedMonth:
          rangeData.invoicesGenerated ?? revenueCounts.invoicesGeneratedMonth,
        invoicesPaid: analytics.revenue?.invoicesPaid ?? revenueCounts.invoicesPaid,
        invoicesPending: analytics.revenue?.invoicesPending ?? revenueCounts.invoicesPending,
        totalRevenueMonth:
          rangeData.revenueRange ?? monthData.revenueMonth ?? revenueCounts.totalRevenueMonth,
      },
      systemHealth: {
        loggedInUsers: analytics.systemHealth?.loggedInUsers ?? loggedInUsersToday,
        activeSessions,
        apiErrors: analytics.systemHealth?.apiErrors ?? 0,
        serverHealth: analytics.systemHealth?.serverHealth ?? 'healthy',
        dbPerformance: analytics.systemHealth?.dbPerformance ?? 0,
      },
    };

    if (useCache) {
      try {
        await redisClient.setex(cacheKey, 300, JSON.stringify(overview));
      } catch {
        // Ignore Redis write errors.
      }
    }
    return overview;
  }

  async getHiringCounts() {
    try {
      const Job = require('../../jobs/models/Job');
      const Application = require('../../jobs/models/Application');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [activeJobs, totalApplications, applicationsToday, shortlistedCandidates] = await Promise.all([
        Job.countDocuments({ status: 'active' }),
        Application.countDocuments(),
        Application.countDocuments({ createdAt: { $gte: today } }),
        Application.countDocuments({ status: { $in: ['interview', 'offer', 'hired'] } }),
      ]);
      return { activeJobs, totalResumes: totalApplications, applicationsToday, shortlistedCandidates };
    } catch (e) {
      return { activeJobs: 0, totalResumes: 0, applicationsToday: 0, shortlistedCandidates: 0 };
    }
  }

  async getRevenueCounts() {
    try {
      const Invoice = require('../../invoices/models/Invoice');
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const [byCreated, byPaid] = await Promise.all([
        Invoice.aggregate([
          { $match: { createdAt: { $gte: monthStart } } },
          {
            $group: {
              _id: null,
              invoicesGeneratedMonth: { $sum: 1 },
              invoicesPaid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
              invoicesPending: { $sum: { $cond: [{ $in: ['$status', ['draft', 'sent', 'overdue']] }, 1, 0] } },
            },
          },
        ]),
        Invoice.aggregate([
          { $match: { status: 'paid', paidAt: { $gte: monthStart } } },
          { $group: { _id: null, totalRevenueMonth: { $sum: '$total' } } },
        ]),
      ]);
      const r = byCreated[0] || {};
      const rev = byPaid[0] || {};
      return {
        invoicesGeneratedMonth: r.invoicesGeneratedMonth ?? 0,
        invoicesPaid: r.invoicesPaid ?? 0,
        invoicesPending: r.invoicesPending ?? 0,
        totalRevenueMonth: rev.totalRevenueMonth ?? 0,
      };
    } catch (e) {
      return { invoicesGeneratedMonth: 0, invoicesPaid: 0, invoicesPending: 0, totalRevenueMonth: 0 };
    }
  }

  async getTrafficData(period = '7d') {
    const days = parseInt(period) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const data = await Analytics.find({
      date: { $gte: startDate },
    }).sort({ date: 1 });

    return data.map(d => ({
      date: d.date,
      visitors: d.visitors.today,
      unique: d.visitors.unique,
    }));
  }

  async getFormStats() {
    const cacheKey = 'dashboard:formStats';
    const useCache = await this.isCacheEnabled();
    if (useCache) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) return JSON.parse(cached);
      } catch {
        // Ignore Redis errors and fall back to live computation.
      }
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const types = ['contact', 'assessment', 'appointment', 'download'];
    const statuses = ['new', 'read', 'responded', 'archived'];

    const buildTypeCounts = (filter) =>
      Promise.all(types.map((t) => FormSubmission.countDocuments({ ...filter, type: t }).catch(() => 0)));

    const [todayCounts, weekCounts, monthCounts, statusCounts, recent] = await Promise.all([
      buildTypeCounts({ createdAt: { $gte: today } }),
      buildTypeCounts({ createdAt: { $gte: weekStart } }),
      buildTypeCounts({ createdAt: { $gte: monthStart } }),
      Promise.all(statuses.map((s) => FormSubmission.countDocuments({ status: s }).catch(() => 0))),
      FormSubmission.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('type name email status page createdAt')
        .lean(),
    ]);

    const mapCounts = (counts) => {
      const obj = {};
      types.forEach((t, i) => { obj[t] = counts[i]; });
      obj.total = counts.reduce((a, b) => a + b, 0);
      return obj;
    };

    const byStatus = {};
    statuses.forEach((s, i) => { byStatus[s] = statusCounts[i]; });

    const data = {
      today: mapCounts(todayCounts),
      thisWeek: mapCounts(weekCounts),
      thisMonth: mapCounts(monthCounts),
      byStatus,
      recent,
    };

    if (useCache) {
      try {
        await redisClient.setex(cacheKey, 120, JSON.stringify(data));
      } catch {
        // Ignore Redis write errors.
      }
    }
    return data;
  }

  calculateTrend(current, previous) {
    if (!previous || previous === 0) return 0;
    return parseFloat((((current - previous) / previous) * 100).toFixed(1));
  }

  getHealthStatus(uptime) {
    if (!uptime || uptime === 0) return 'No Data';
    if (uptime >= 99.9) return 'System Optimal';
    if (uptime >= 99) return 'System Good';
    return 'System Degraded';
  }
}

module.exports = new DashboardService();
