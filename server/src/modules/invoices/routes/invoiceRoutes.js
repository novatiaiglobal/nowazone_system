const express = require('express');
const ctrl = require('../controllers/invoiceController');
const { protect, restrictTo } = require('../../../shared/middleware/auth');
const { validate, validateQuery } = require('../../../shared/middleware/validation');
const {
  createInvoiceSchema,
  updateInvoiceSchema,
  processRecurringQuerySchema,
} = require('../schemas/invoiceSchemas');

const router = express.Router();
const FINANCE_ROLES = ['admin', 'super_admin', 'finance_manager'];

router.use(protect);
router.use(restrictTo(...FINANCE_ROLES));

router.get('/stats', ctrl.getStats);
router.get('/', ctrl.listInvoices);
router.post('/', validate(createInvoiceSchema), ctrl.createInvoice);
router.patch('/:id', validate(updateInvoiceSchema), ctrl.updateInvoice);
router.get('/recurring/process', validateQuery(processRecurringQuerySchema), ctrl.processRecurring);
router.get('/:id', ctrl.getInvoice);
router.get('/:id/pdf', ctrl.downloadPdf);
router.patch('/:id/mark-paid', ctrl.markPaid);
router.delete('/:id', ctrl.deleteInvoice);

module.exports = router;
