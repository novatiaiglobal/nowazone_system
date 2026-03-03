const { z } = require('zod');

const invoiceItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  taxRate: z.number().min(0, 'Tax rate cannot be negative').max(100, 'Tax rate cannot exceed 100').optional().default(0),
});

const baseInvoiceSchema = z.object({
  clientName: z.string().min(2, 'Client name must be at least 2 characters'),
  clientEmail: z.string().email('Invalid client email'),
  clientAddress: z.string().max(500).optional().default(''),
  clientPhone: z.string().max(100).optional(),
  dueDate: z
    .string()
    .optional()
    .transform((value) => (value ? new Date(value) : undefined)),
  notes: z.string().max(2000).optional().default(''),
  items: z.array(invoiceItemSchema).min(1, 'At least one line item is required'),
  currency: z.string().max(10).optional(),
  isRecurring: z.boolean().optional().default(false),
  recurrenceInterval: z
    .enum(['weekly', 'monthly', 'yearly'])
    .optional(),
  recurrenceCount: z
    .number()
    .int()
    .min(1, 'Recurrence count must be at least 1')
    .max(120, 'Recurrence count is too large')
    .optional(),
  firstIssueDate: z
    .string()
    .optional()
    .transform((value) => (value ? new Date(value) : undefined)),
});

const createInvoiceSchema = baseInvoiceSchema.superRefine((data, ctx) => {
  if (data.isRecurring) {
    if (!data.recurrenceInterval) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Recurrence interval is required when invoice is recurring',
        path: ['recurrenceInterval'],
      });
    }
    if (!data.firstIssueDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'First issue date is required when invoice is recurring',
        path: ['firstIssueDate'],
      });
    }
  }
});

const updateInvoiceSchema = baseInvoiceSchema.partial();

const processRecurringQuerySchema = z.object({
  dryRun: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
});

module.exports = {
  createInvoiceSchema,
  updateInvoiceSchema,
  processRecurringQuerySchema,
};

