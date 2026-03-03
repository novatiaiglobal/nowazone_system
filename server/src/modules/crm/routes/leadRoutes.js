const express = require('express');
const leadController = require('../controllers/leadController');
const { validate } = require('../../../shared/middleware/validation');
const { protect, authorize } = require('../../../shared/middleware/auth');
const auditLogger = require('../../../shared/middleware/auditLog');
const { createLeadSchema, updateLeadSchema } = require('../schemas/leadSchemas');

const router = express.Router();

router.use(protect);

router.get('/', authorize('leads.read', '*'), leadController.getLeads);
router.post('/', authorize('leads.create', '*'), validate(createLeadSchema), auditLogger('CREATE'), leadController.createLead);
router.get('/:id', authorize('leads.read', '*'), leadController.getLeadById);
router.patch('/:id', authorize('leads.update', '*'), validate(updateLeadSchema), auditLogger('UPDATE'), leadController.updateLead);
router.delete('/:id', authorize('leads.delete', '*'), auditLogger('DELETE'), leadController.deleteLead);

module.exports = router;
