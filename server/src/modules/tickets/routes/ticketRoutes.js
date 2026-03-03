const express = require('express');
const ctrl = require('../controllers/ticketController');
const { protect, restrictTo } = require('../../../shared/middleware/auth');
const { createRateLimiter } = require('../../../shared/middleware/rateLimiter');

const router = express.Router();
const SUPPORT_ROLES = ['admin', 'super_admin', 'support_executive'];
const publicLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });

// Public: create ticket
router.post('/public', publicLimiter, ctrl.createTicket);

router.use(protect);

router.get('/stats', restrictTo(...SUPPORT_ROLES), ctrl.getStats);
router.get('/',      restrictTo(...SUPPORT_ROLES), ctrl.listTickets);
router.post('/',     ctrl.createTicket);
router.get('/:id',   restrictTo(...SUPPORT_ROLES), ctrl.getTicket);
router.patch('/:id', restrictTo(...SUPPORT_ROLES), ctrl.updateTicket);
router.delete('/:id', restrictTo('admin', 'super_admin'), ctrl.deleteTicket);
router.post('/:id/messages', restrictTo(...SUPPORT_ROLES), ctrl.addMessage);

module.exports = router;
