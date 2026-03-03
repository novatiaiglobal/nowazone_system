const express = require('express');
const ctrl = require('../controllers/chatbotController');
const { validate, validateQuery } = require('../../../shared/middleware/validation');
const { protect, authorize } = require('../../../shared/middleware/auth');
const auditLogger = require('../../../shared/middleware/auditLog');
const {
  createFaqSchema,
  updateFaqSchema,
  reorderFaqSchema,
  listFaqQuerySchema,
  updateConfigSchema,
  chatMessageSchema,
  listSessionQuerySchema,
} = require('../schemas/chatbotSchemas');

const rateLimit = require('express-rate-limit');

const router = express.Router();

// Public chat endpoint for website widget (no auth required)
const publicChatLimiter = rateLimit({ windowMs: 60000, max: 30 });
router.post('/public/chat', publicChatLimiter, ctrl.publicChat);
router.get('/public/session/:sessionId', ctrl.getPublicSession);

router.use(protect);

// Management config + FAQs
router.get('/config', authorize('chatbot.manage', '*'), ctrl.getConfig);
router.put('/config', authorize('chatbot.manage', '*'), validate(updateConfigSchema), auditLogger('UPDATE'), ctrl.updateConfig);

router.get(
  '/faqs',
  authorize('chatbot.manage', '*'),
  validateQuery(listFaqQuerySchema),
  ctrl.listFaqs
);
router.post(
  '/faqs',
  authorize('chatbot.manage', '*'),
  validate(createFaqSchema),
  auditLogger('CREATE'),
  ctrl.createFaq
);
router.patch(
  '/faqs/:id',
  authorize('chatbot.manage', '*'),
  validate(updateFaqSchema),
  auditLogger('UPDATE'),
  ctrl.updateFaq
);
router.delete(
  '/faqs/:id',
  authorize('chatbot.manage', '*'),
  auditLogger('DELETE'),
  ctrl.deleteFaq
);
router.post(
  '/faqs/reorder',
  authorize('chatbot.manage', '*'),
  validate(reorderFaqSchema),
  auditLogger('UPDATE'),
  ctrl.reorderFaqs
);

// Sessions
router.get(
  '/sessions',
  authorize('chatbot.manage', '*'),
  validateQuery(listSessionQuerySchema),
  ctrl.listSessions
);
router.get(
  '/sessions/:id',
  authorize('chatbot.manage', '*'),
  ctrl.getSession
);
router.post(
  '/sessions/:id/respond',
  authorize('chatbot.manage', '*'),
  ctrl.respondToSession
);

// Chat endpoint (dashboard users)
router.post('/chat', authorize('chatbot.chat', '*'), validate(chatMessageSchema), ctrl.chat);

module.exports = router;

