const express = require('express');
const categoryController = require('../controllers/categoryController');
const { protect, restrictTo } = require('../../../shared/middleware/auth');
const { validate } = require('../../../shared/middleware/validation');
const { categorySchemas } = require('../schemas/categorySchemas');

const router = express.Router();

// Public routes
router.get('/', categoryController.listCategories);
router.get('/tree', categoryController.getCategoryTree);
router.get('/:id', categoryController.getCategory);

// Protected routes
router.use(protect);
router.use(restrictTo('super_admin', 'admin', 'content_creator'));

router.post('/', validate(categorySchemas.create), categoryController.createCategory);
router.put('/:id', validate(categorySchemas.update), categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);
router.post('/reorder', categoryController.reorderCategories);

module.exports = router;
