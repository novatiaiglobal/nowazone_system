const express = require('express');
const appCtrl = require('../controllers/applicationController');
const { protect, restrictTo } = require('../../../shared/middleware/auth');

const router = express.Router();
const HR_ROLES = ['admin', 'super_admin', 'hr'];

router.use(protect);
router.use(restrictTo(...HR_ROLES));

router.get('/',       appCtrl.listApplications);
router.get('/:id',    appCtrl.getApplication);
router.patch('/:id',  appCtrl.updateApplicationStatus);
router.delete('/:id', appCtrl.deleteApplication);

module.exports = router;
