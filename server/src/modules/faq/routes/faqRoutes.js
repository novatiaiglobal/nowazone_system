const express = require('express');
const ctrl = require('../controllers/faqController');
const { protect, restrictTo } = require('../../../shared/middleware/auth');

const router = express.Router();

// Public: read FAQs
router.get('/public', ctrl.listFAQs);

router.use(protect);
router.get('/', ctrl.listFAQs);
router.post('/', restrictTo('admin', 'super_admin', 'content_creator'), ctrl.createFAQ);
router.patch('/:id', restrictTo('admin', 'super_admin', 'content_creator'), ctrl.updateFAQ);
router.delete('/:id', restrictTo('admin', 'super_admin'), ctrl.deleteFAQ);
router.post('/reorder', restrictTo('admin', 'super_admin', 'content_creator'), ctrl.reorderFAQs);

module.exports = router;
