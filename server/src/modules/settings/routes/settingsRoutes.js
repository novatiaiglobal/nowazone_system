const express = require('express');
const { protect, restrictTo } = require('../../../shared/middleware/auth');
const settingsController = require('../controllers/settingsController');

const router = express.Router();

// Only admins can read/update global settings or download backups
router.use(protect, restrictTo('admin', 'super_admin'));

router
  .route('/')
  .get(settingsController.getSettings)
  .patch(settingsController.updateSettings);

router.get('/backups/latest', settingsController.downloadLatestBackup);

module.exports = router;
