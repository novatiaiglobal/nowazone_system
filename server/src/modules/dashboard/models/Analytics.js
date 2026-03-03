const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true,
  },
  visitors: {
    today: { type: Number, default: 0 },
    month: { type: Number, default: 0 },
    unique: { type: Number, default: 0 },
  },
  topPages: [
    {
      path: String,
      views: Number,
    },
  ],
  bounceRate: { type: Number, default: 0 },
  trafficByCountry: [
    {
      country: String,
      visitors: Number,
    },
  ],
  leads: {
    formsSubmittedToday: { type: Number, default: 0 },
    assessmentsRequested: { type: Number, default: 0 },
    appointmentsBooked: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    newSubscribers: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    converted: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
  },
  hiring: {
    activeJobs: { type: Number, default: 0 },
    applicationsToday: { type: Number, default: 0 },
    totalResumes: { type: Number, default: 0 },
    shortlistedCandidates: { type: Number, default: 0 },
  },
  content: {
    publishedBlogs: { type: Number, default: 0 },
    drafts: { type: Number, default: 0 },
    pendingReviews: { type: Number, default: 0 },
    commentsPendingApproval: { type: Number, default: 0 },
  },
  revenue: {
    invoicesGeneratedMonth: { type: Number, default: 0 },
    invoicesPaid: { type: Number, default: 0 },
    invoicesPending: { type: Number, default: 0 },
    totalRevenueMonth: { type: Number, default: 0 },
    today: { type: Number, default: 0 },
    month: { type: Number, default: 0 },
    year: { type: Number, default: 0 },
  },
  systemHealth: {
    loggedInUsers: { type: Number, default: 0 },
    activeSessions: { type: Number, default: 0 },
    apiErrors: { type: Number, default: 0 },
    serverHealth: { type: String, default: 'healthy' },
    dbPerformance: { type: Number, default: 0 },
    uptime: { type: Number, default: 100 },
    responseTime: { type: Number, default: 0 },
    errorRate: { type: Number, default: 0 },
  },
}, {
  timestamps: true,
});

analyticsSchema.index({ date: -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);
