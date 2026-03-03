const express = require('express');
const ctrl = require('../controllers/notificationController');
const { protect } = require('../../../shared/middleware/auth');

const router = express.Router();

router.use(protect);
router.get('/',             ctrl.getMyNotifications);
router.patch('/mark-read',  ctrl.markRead);
router.delete('/:id',       ctrl.deleteNotification);

module.exports = router;
