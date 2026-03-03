require('dotenv').config();
const mongoose = require('mongoose');
const Analytics = require('../modules/dashboard/models/Analytics');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const seedDashboard = async () => {
  try {
    await connectDB();

    // Clear existing data
    await Analytics.deleteMany({});
    console.log('Cleared existing analytics data');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create today's analytics
    const todayAnalytics = new Analytics({
      date: today,
      visitors: {
        today: 1250,
        month: 35000,
        unique: 980,
      },
      topPages: [
        { path: '/home', views: 450 },
        { path: '/about', views: 320 },
        { path: '/services', views: 280 },
        { path: '/contact', views: 200 },
        { path: '/blog', views: 150 },
      ],
      bounceRate: 42.5,
      trafficByCountry: [
        { country: 'United States', visitors: 520 },
        { country: 'United Kingdom', visitors: 280 },
        { country: 'Canada', visitors: 180 },
        { country: 'Germany', visitors: 120 },
        { country: 'Australia', visitors: 90 },
      ],
      leads: {
        formsSubmittedToday: 45,
        assessmentsRequested: 28,
        appointmentsBooked: 15,
        downloads: 67,
        newSubscribers: 32,
        total: 187,
        converted: 23,
        conversionRate: 12.3,
      },
      hiring: {
        activeJobs: 12,
        applicationsToday: 34,
        totalResumes: 456,
        shortlistedCandidates: 28,
      },
      content: {
        publishedBlogs: 145,
        drafts: 23,
        pendingReviews: 8,
        commentsPendingApproval: 15,
      },
      revenue: {
        invoicesGeneratedMonth: 89,
        invoicesPaid: 67,
        invoicesPending: 22,
        totalRevenueMonth: 125000,
        today: 4500,
        month: 125000,
        year: 1450000,
      },
      systemHealth: {
        loggedInUsers: 45,
        activeSessions: 78,
        apiErrors: 3,
        serverHealth: 'healthy',
        dbPerformance: 12,
        uptime: 99.98,
        responseTime: 145,
        errorRate: 0.02,
      },
    });

    await todayAnalytics.save();
    console.log('✅ Dashboard data seeded successfully!');
    console.log('Sample data created for today:', today.toDateString());

    process.exit(0);
  } catch (error) {
    console.error('Error seeding dashboard:', error);
    process.exit(1);
  }
};

seedDashboard();
