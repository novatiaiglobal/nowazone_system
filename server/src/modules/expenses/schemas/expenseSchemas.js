const { z } = require('zod');

const categoryEnum = ['office', 'software', 'travel', 'marketing', 'utilities', 'payroll', 'supplies', 'other'];
const statusEnum = ['pending', 'approved', 'reimbursed', 'rejected'];

const createExpenseSchema = z.object({
  description: z.string().min(2, 'Description must be at least 2 characters'),
  amount: z.number().min(0, 'Amount cannot be negative'),
  category: z.enum(categoryEnum).optional().default('other'),
  vendor: z.string().max(200).optional(),
  date: z
    .string()
    .optional()
    .transform((value) => (value ? new Date(value) : new Date())),
  currency: z.string().max(10).optional(),
  status: z.enum(statusEnum).optional().default('pending'),
  receiptUrl: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

const updateExpenseSchema = createExpenseSchema.partial();

module.exports = {
  createExpenseSchema,
  updateExpenseSchema,
};
