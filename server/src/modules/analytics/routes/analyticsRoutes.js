const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/analyticsController');
const { protect, authorize } = require('../../../shared/middleware/auth');

// Public tracking endpoints (no auth)
router.post('/pageview', ctrl.trackPageView);
router.post('/event', ctrl.trackEvent);

// Admin analytics endpoints
router.get('/overview', protect, authorize('analytics.read'), ctrl.getOverview);
router.get('/top-pages', protect, authorize('analytics.read'), ctrl.getTopPages);
router.get('/traffic-sources', protect, authorize('analytics.read'), ctrl.getTrafficSources);
router.get('/traffic-country', protect, authorize('analytics.read'), ctrl.getTrafficByCountry);

module.exports = router;
