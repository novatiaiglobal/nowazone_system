const express = require('express');
const pageController = require('../controllers/pageController');
const { protect, restrictTo } = require('../../../shared/middleware/auth');

const router = express.Router();

const CMS_WRITE_ROLES = ['super_admin', 'admin', 'content_creator'];

// ─── Public routes ─────────────────────────────────────────────────────────────
router.get('/slug/:slug', pageController.getPageBySlug);

// ─── Protected routes ──────────────────────────────────────────────────────────
router.use(protect);

router.get('/',    pageController.listPages);
router.get('/:id', pageController.getPage);

router.post('/',   restrictTo(...CMS_WRITE_ROLES), pageController.createPage);
router.put('/:id', restrictTo(...CMS_WRITE_ROLES), pageController.updatePage);
router.delete('/:id', restrictTo(...CMS_WRITE_ROLES), pageController.deletePage);

// Section management
router.post(   '/:id/sections',               restrictTo(...CMS_WRITE_ROLES), pageController.addSection);
router.put(    '/:id/sections/:sectionIndex', restrictTo(...CMS_WRITE_ROLES), pageController.updateSection);
router.delete( '/:id/sections/:sectionIndex', restrictTo(...CMS_WRITE_ROLES), pageController.deleteSection);
router.post(   '/:id/sections/reorder',       restrictTo(...CMS_WRITE_ROLES), pageController.reorderSections);

// Publishing
router.post('/:id/publish',   restrictTo(...CMS_WRITE_ROLES), pageController.publishPage);
router.post('/:id/duplicate', restrictTo(...CMS_WRITE_ROLES), pageController.duplicatePage);

module.exports = router;
