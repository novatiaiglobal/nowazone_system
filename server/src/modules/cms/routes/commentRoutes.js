const express = require('express');
const commentController = require('../controllers/commentController');
const { protect, restrictTo } = require('../../../shared/middleware/auth');
const { validate } = require('../../../shared/middleware/validation');
const { commentSchemas } = require('../schemas/commentSchemas');
const { createRateLimiter } = require('../../../shared/middleware/rateLimiter');

const router = express.Router();

// Moderate rate-limit for the public comment thread endpoint
const commentReadLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 60 });

// ─── Public read-only route ────────────────────────────────────────────────────
router.get('/post/:postId/thread', commentReadLimiter, commentController.getCommentThread);

// ─── All routes below require authentication ──────────────────────────────────
// Comment creation requires a logged-in user (prevents anonymous spam/abuse).
router.use(protect);

router.post(
  '/',
  validate(commentSchemas.create),
  commentController.createComment
);

// ─── Admin / content-creator moderation routes ───────────────────────────────
router.get(
  '/',
  restrictTo('super_admin', 'admin', 'content_creator'),
  commentController.listComments
);

router.get('/:id', commentController.getComment);

// Only admins and content creators may edit or moderate comments
router.put(
  '/:id',
  restrictTo('super_admin', 'admin', 'content_creator'),
  validate(commentSchemas.update),
  commentController.updateComment
);

router.delete(
  '/:id',
  restrictTo('super_admin', 'admin', 'content_creator'),
  commentController.deleteComment
);

router.post('/:id/approve', restrictTo('super_admin', 'admin', 'content_creator'), commentController.approveComment);
router.post('/:id/spam',    restrictTo('super_admin', 'admin', 'content_creator'), commentController.markAsSpam);

router.post('/bulk/approve', restrictTo('super_admin', 'admin', 'content_creator'), commentController.bulkApprove);
router.post('/bulk/delete',  restrictTo('super_admin', 'admin', 'content_creator'), commentController.bulkDelete);

module.exports = router;
