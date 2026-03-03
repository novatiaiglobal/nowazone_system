const express = require('express');
const jobCtrl = require('../controllers/jobController');
const appCtrl = require('../controllers/applicationController');
const { protect, restrictTo } = require('../../../shared/middleware/auth');

const router = express.Router();

const HR_ROLES = ['admin', 'super_admin', 'hr'];

// Public: view active jobs + submit application
router.get('/public', jobCtrl.listJobs);
router.post('/:jobId/apply', appCtrl.submitApplication);

// Protected
router.use(protect);

router.get('/stats', restrictTo(...HR_ROLES), jobCtrl.getJobStats);
router.get('/', restrictTo(...HR_ROLES), jobCtrl.listJobs);
router.post('/', restrictTo(...HR_ROLES), jobCtrl.createJob);
router.get('/:id', restrictTo(...HR_ROLES), jobCtrl.getJob);
router.patch('/:id', restrictTo(...HR_ROLES), jobCtrl.updateJob);
router.delete('/:id', restrictTo(...HR_ROLES), jobCtrl.deleteJob);

// Applications under jobs
router.get('/:jobId/applications', restrictTo(...HR_ROLES), appCtrl.listApplications);

module.exports = router;
