const express = require('express');
const contentController = require('../controllers/contentController');
const { protect, authorize } = require('../../../shared/middleware/auth');
const auditLogger = require('../../../shared/middleware/auditLog');

const router = express.Router();

router.use(protect);

router.get('/dashboard', authorize('cms.read', '*'), contentController.getDashboard);
router.get('/', authorize('cms.read', '*'), contentController.getContents);
router.post('/', authorize('cms.create', '*'), auditLogger('CREATE'), contentController.createContent);
router.get('/:id', authorize('cms.read', '*'), contentController.getContentById);
router.patch('/:id', authorize('cms.update', '*'), auditLogger('UPDATE'), contentController.updateContent);
router.delete('/:id', authorize('cms.delete', '*'), auditLogger('DELETE'), contentController.deleteContent);

module.exports = router;
