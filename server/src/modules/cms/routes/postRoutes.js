const express = require('express');
const postController = require('../controllers/postController');
const { protect, restrictTo } = require('../../../shared/middleware/auth');
const { validate } = require('../../../shared/middleware/validation');
const { postSchemas } = require('../schemas/postSchemas');

const router = express.Router();

// Roles that map to CMS write access
const CMS_WRITE_ROLES   = ['super_admin', 'admin', 'content_creator'];
const CMS_PUBLISH_ROLES = ['super_admin', 'admin', 'content_creator'];

// ─── Public routes ─────────────────────────────────────────────────────────────
router.get('/public', postController.listPublicPosts);
router.get('/slug/:slug', postController.getPostBySlug);

// ─── Protected routes ──────────────────────────────────────────────────────────
router.use(protect);

router.get('/', postController.listPosts);
router.get('/:id', postController.getPost);
router.get('/:id/versions',   postController.getVersionHistory);
router.get('/:id/analytics',  postController.getAnalytics);
router.get('/:id/faq-schema', postController.generateFAQSchema);

router.post(
  '/',
  restrictTo(...CMS_WRITE_ROLES),
  validate(postSchemas.create),
  postController.createPost
);

router.put(
  '/:id',
  restrictTo(...CMS_WRITE_ROLES),
  validate(postSchemas.update),
  postController.updatePost
);

router.delete('/:id', restrictTo(...CMS_PUBLISH_ROLES), postController.deletePost);

// Publishing workflow
router.post(
  '/:id/publish',
  restrictTo(...CMS_PUBLISH_ROLES),
  postController.publishPost
);

router.post(
  '/:id/schedule',
  restrictTo(...CMS_PUBLISH_ROLES),
  validate(postSchemas.schedule),
  postController.schedulePost
);

router.post(
  '/:id/versions/:versionIndex/restore',
  restrictTo(...CMS_PUBLISH_ROLES),
  postController.restoreVersion
);

// Bulk operations
router.post(
  '/bulk/status',
  restrictTo(...CMS_PUBLISH_ROLES),
  postController.bulkUpdateStatus
);

// Engagement
router.post('/:id/like', postController.togglePostLike);

module.exports = router;
