const express = require('express');
const ctrl = require('../controllers/expenseController');
const { protect, restrictTo } = require('../../../shared/middleware/auth');
const { validate } = require('../../../shared/middleware/validation');
const { createExpenseSchema, updateExpenseSchema } = require('../schemas/expenseSchemas');

const router = express.Router();
const FINANCE_ROLES = ['admin', 'super_admin', 'finance_manager'];

router.use(protect);
router.use(restrictTo(...FINANCE_ROLES));

router.get('/stats', ctrl.getStats);
router.get('/', ctrl.listExpenses);
router.post('/', validate(createExpenseSchema), ctrl.createExpense);
router.get('/:id', ctrl.getExpense);
router.patch('/:id', validate(updateExpenseSchema), ctrl.updateExpense);
router.delete('/:id', ctrl.deleteExpense);

module.exports = router;
