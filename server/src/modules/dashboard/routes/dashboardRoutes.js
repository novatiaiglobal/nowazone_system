const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { protect, restrictTo } = require('../../../shared/middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/overview', restrictTo('admin', 'super_admin'), dashboardController.getExecutiveOverview);
router.get('/traffic', restrictTo('admin', 'super_admin'), dashboardController.getTrafficData);
router.get('/forms', restrictTo('admin', 'super_admin'), dashboardController.getFormStats);

module.exports = router;
