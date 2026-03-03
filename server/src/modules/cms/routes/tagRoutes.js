const express = require('express');
const tagController = require('../controllers/tagController');
const { protect, restrictTo } = require('../../../shared/middleware/auth');
const { validate } = require('../../../shared/middleware/validation');
const { tagSchemas } = require('../schemas/tagSchemas');

const router = express.Router();

// Public routes
router.get('/', tagController.listTags);
router.get('/:id', tagController.getTag);

// Protected routes
router.use(protect);
router.use(restrictTo('super_admin', 'admin', 'content_creator'));

router.post('/', validate(tagSchemas.create), tagController.createTag);
router.put('/:id', validate(tagSchemas.update), tagController.updateTag);
router.delete('/:id', tagController.deleteTag);
router.post('/bulk', validate(tagSchemas.bulkCreate), tagController.bulkCreateTags);

module.exports = router;
