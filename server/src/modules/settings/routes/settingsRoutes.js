const express = require('express');
const { protect, restrictTo } = require('../../../shared/middleware/auth');
const settingsController = require('../controllers/settingsController');

const router = express.Router();

// Only admins can read/update global settings
router.use(protect, restrictTo('admin', 'super_admin'));

router
  .route('/')
  .get(settingsController.getSettings)
  .patch(settingsController.updateSettings);

module.exports = router;
