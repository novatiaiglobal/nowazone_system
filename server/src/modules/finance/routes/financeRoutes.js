const express = require('express');
const { protect, restrictTo } = require('../../../shared/middleware/auth');
const financeReportController = require('../controllers/financeReportController');

const router = express.Router();
const FINANCE_ROLES = ['admin', 'super_admin', 'finance_manager'];

router.use(protect);
router.use(restrictTo(...FINANCE_ROLES));

router.get('/reports', financeReportController.getReports);

module.exports = router;
