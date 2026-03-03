const express = require('express');
const ctrl = require('../controllers/subscriberController');
const { protect, restrictTo } = require('../../../shared/middleware/auth');
const { createRateLimiter } = require('../../../shared/middleware/rateLimiter');

const router = express.Router();
const subLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 5 });

// Public
router.post('/subscribe',   subLimiter, ctrl.subscribe);
router.post('/unsubscribe', ctrl.unsubscribe);

// Protected
router.use(protect);
router.get('/stats', ctrl.getStats);
router.get('/', ctrl.listSubscribers);
router.delete('/:id', restrictTo('admin', 'super_admin'), ctrl.deleteSubscriber);

module.exports = router;
