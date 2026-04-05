const express = require('express');
const ctrl = require('../controllers/subscriberController');
const campaigns = require('../controllers/campaignController');
const { protect, restrictTo } = require('../../../shared/middleware/auth');
const { createRateLimiter } = require('../../../shared/middleware/rateLimiter');

const router = express.Router();
const subLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 5 });

// Public
router.post('/subscribe',   subLimiter, ctrl.subscribe);
router.post('/unsubscribe', ctrl.unsubscribe);
router.get('/campaigns/:id/open.gif', campaigns.trackOpen);

// Protected
router.use(protect);
router.get('/stats', ctrl.getStats);
router.get('/', ctrl.listSubscribers);

router.post(
  '/campaigns/ai-generate',
  restrictTo('admin', 'super_admin', 'sales'),
  campaigns.generateWithAI
);

router.get(
  '/campaigns',
  restrictTo('admin', 'super_admin', 'sales'),
  campaigns.listCampaigns
);
router.get(
  '/campaigns/:id',
  restrictTo('admin', 'super_admin', 'sales'),
  campaigns.getCampaign
);
router.post(
  '/campaigns',
  restrictTo('admin', 'super_admin', 'sales'),
  campaigns.createCampaign
);
router.post(
  '/campaigns/:id/send',
  restrictTo('admin', 'super_admin', 'sales'),
  campaigns.sendCampaign
);

router.delete('/:id', restrictTo('admin', 'super_admin', 'sales'), ctrl.deleteSubscriber);

module.exports = router;
