const PageView = require('../models/PageView');
const AnalyticsEvent = require('../models/AnalyticsEvent');
const { AppError } = require('../../../shared/middleware/errorHandler');
const rateLimit = require('express-rate-limit');

// ─── In-memory rate limiter for public tracking endpoints ───────────────────

const trackingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: { status: 'fail', message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Helpers ────────────────────────────────────────────────────────────────────

function parseUserAgent(ua) {
  if (!ua) return { device: 'unknown', browser: '', os: '' };

  const device = /mobile/i.test(ua) ? 'mobile'
    : /tablet|ipad/i.test(ua) ? 'tablet'
    : 'desktop';

  let browser = 'Other';
  if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua)) browser = 'Safari';

  let os = 'Other';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/mac/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad/i.test(ua)) os = 'iOS';

  return { device, browser, os };
}

function classifySource(referrer, utmSource) {
  if (utmSource) {
    const s = utmSource.toLowerCase();
    if (['google', 'bing', 'yahoo', 'duckduckgo'].some(e => s.includes(e))) return 'organic';
    if (['facebook', 'twitter', 'linkedin', 'instagram', 'tiktok'].some(e => s.includes(e))) return 'social';
    if (s.includes('email') || s.includes('newsletter')) return 'email';
    if (s.includes('cpc') || s.includes('paid') || s.includes('ads')) return 'paid';
    return 'referral';
  }
  if (!referrer) return 'direct';
  const r = referrer.toLowerCase();
  if (['google', 'bing', 'yahoo', 'duckduckgo'].some(e => r.includes(e))) return 'organic';
  if (['facebook', 'twitter', 'linkedin', 'instagram', 'tiktok', 't.co'].some(e => r.includes(e))) return 'social';
  return 'referral';
}

function getDateRange(period) {
  const now = new Date();
  const start = new Date();
  switch (period) {
    case '7d':  start.setDate(now.getDate() - 7); break;
    case '30d': start.setDate(now.getDate() - 30); break;
    case '90d': start.setDate(now.getDate() - 90); break;
    case 'today':
    default:
      start.setHours(0, 0, 0, 0);
      break;
  }
  return { $gte: start, $lte: now };
}

// ─── Public endpoints ───────────────────────────────────────────────────────────

exports.trackPageView = [
  trackingLimiter,
  async (req, res, next) => {
    try {
      const { sessionId, page, referrer, duration, isBounce, isNewVisitor,
              utmSource, utmMedium, utmCampaign, country, city } = req.body;

      if (!sessionId || !page) {
        return next(new AppError('sessionId and page are required', 400));
      }

      const ua = req.headers['user-agent'] || '';
      const { device, browser, os } = parseUserAgent(ua);
      const source = classifySource(referrer, utmSource);

      await PageView.create({
        sessionId,
        page,
        referrer: referrer || '',
        userAgent: ua,
        ipAddress: req.ip,
        country: country || '',
        city: city || '',
        device,
        browser,
        os,
        duration: duration || 0,
        source,
        utmSource,
        utmMedium,
        utmCampaign,
        isBounce: isBounce !== undefined ? isBounce : true,
        isNewVisitor: isNewVisitor !== undefined ? isNewVisitor : true,
      });

      res.status(204).end();
    } catch (err) { next(err); }
  },
];

exports.trackEvent = [
  trackingLimiter,
  async (req, res, next) => {
    try {
      const { sessionId, category, action, label, value, page, metadata } = req.body;

      if (!sessionId || !category || !action) {
        return next(new AppError('sessionId, category, and action are required', 400));
      }

      await AnalyticsEvent.create({
        sessionId,
        category,
        action,
        label,
        value,
        page,
        metadata,
        ipAddress: req.ip,
      });

      res.status(204).end();
    } catch (err) { next(err); }
  },
];

// ─── Admin endpoints ────────────────────────────────────────────────────────────

exports.getOverview = async (req, res, next) => {
  try {
    const period = req.query.period || '7d';
    const dateRange = getDateRange(period);

    const [totals] = await PageView.aggregate([
      { $match: { createdAt: dateRange } },
      {
        $group: {
          _id: null,
          totalVisitors: { $sum: 1 },
          uniqueVisitors: { $addToSet: '$sessionId' },
          avgSessionDuration: { $avg: '$duration' },
          bounceCount: { $sum: { $cond: ['$isBounce', 1, 0] } },
          newUsers: { $sum: { $cond: ['$isNewVisitor', 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          totalVisitors: 1,
          uniqueVisitors: { $size: '$uniqueVisitors' },
          avgSessionDuration: { $round: ['$avgSessionDuration', 1] },
          bounceRate: {
            $round: [
              { $multiply: [{ $cond: [{ $eq: ['$totalVisitors', 0] }, 0, { $divide: ['$bounceCount', '$totalVisitors'] }] }, 100] },
              1,
            ],
          },
          newUsers: 1,
        },
      },
    ]);

    res.json({
      status: 'success',
      data: totals || { totalVisitors: 0, uniqueVisitors: 0, avgSessionDuration: 0, bounceRate: 0, newUsers: 0 },
    });
  } catch (err) { next(err); }
};

exports.getTopPages = async (req, res, next) => {
  try {
    const period = req.query.period || '7d';
    const dateRange = getDateRange(period);

    const pages = await PageView.aggregate([
      { $match: { createdAt: dateRange } },
      {
        $group: {
          _id: '$page',
          views: { $sum: 1 },
          uniqueSessions: { $addToSet: '$sessionId' },
          avgDuration: { $avg: '$duration' },
          bounceCount: { $sum: { $cond: ['$isBounce', 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          path: '$_id',
          views: 1,
          uniqueViews: { $size: '$uniqueSessions' },
          avgDuration: { $round: ['$avgDuration', 1] },
          bounceRate: {
            $round: [
              { $multiply: [{ $cond: [{ $eq: ['$views', 0] }, 0, { $divide: ['$bounceCount', '$views'] }] }, 100] },
              1,
            ],
          },
        },
      },
      { $sort: { views: -1 } },
      { $limit: 20 },
    ]);

    res.json({ status: 'success', data: { pages } });
  } catch (err) { next(err); }
};

exports.getTrafficSources = async (req, res, next) => {
  try {
    const period = req.query.period || '7d';
    const dateRange = getDateRange(period);

    const sources = await PageView.aggregate([
      { $match: { createdAt: dateRange } },
      {
        $group: {
          _id: '$source',
          visitors: { $sum: 1 },
          uniqueVisitors: { $addToSet: '$sessionId' },
        },
      },
      {
        $project: {
          _id: 0,
          source: '$_id',
          visitors: 1,
          uniqueVisitors: { $size: '$uniqueVisitors' },
        },
      },
      { $sort: { visitors: -1 } },
    ]);

    res.json({ status: 'success', data: { sources } });
  } catch (err) { next(err); }
};

exports.getTrafficByCountry = async (req, res, next) => {
  try {
    const period = req.query.period || '7d';
    const dateRange = getDateRange(period);

    const countries = await PageView.aggregate([
      { $match: { createdAt: dateRange, country: { $ne: '' } } },
      {
        $group: {
          _id: '$country',
          visitors: { $sum: 1 },
          uniqueVisitors: { $addToSet: '$sessionId' },
        },
      },
      {
        $project: {
          _id: 0,
          country: '$_id',
          visitors: 1,
          uniqueVisitors: { $size: '$uniqueVisitors' },
        },
      },
      { $sort: { visitors: -1 } },
    ]);

    res.json({ status: 'success', data: { countries } });
  } catch (err) { next(err); }
};
