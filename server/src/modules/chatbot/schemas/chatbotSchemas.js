const { z } = require('zod');

const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

const baseFaqSchema = z.object({
  question: z.string().min(5, 'Question must be at least 5 characters').max(500, 'Question is too long'),
  answer: z.string().min(1, 'Answer is required').max(4000, 'Answer is too long'),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
  category: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
});

const createFaqSchema = baseFaqSchema;
const updateFaqSchema = baseFaqSchema.partial();

const reorderFaqSchema = z.object({
  items: z
    .array(
      z.object({
        id: objectIdSchema,
        order: z.number().int().min(0).max(100000),
      })
    )
    .min(1),
});

const listFaqQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((value) => (value ? parseInt(value, 10) : undefined))
    .refine((value) => value === undefined || Number.isFinite(value), {
      message: 'Invalid page number',
    }),
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? parseInt(value, 10) : undefined))
    .refine((value) => value === undefined || Number.isFinite(value), {
      message: 'Invalid limit',
    }),
  search: z.string().optional(),
  category: z.string().optional(),
  isActive: z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (value === 'true') return true;
      if (value === 'false') return false;
      return undefined;
    }),
});

const updateConfigSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  greetingMessage: z.string().max(500).optional(),
  fallbackMessage: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
  escalationEnabled: z.boolean().optional(),
  escalationTicketCategory: z
    .enum(['technical', 'billing', 'general', 'feature_request', 'bug'])
    .optional(),
  escalationPriority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  minConfidence: z.number().min(0).max(1).optional(),
  temperature: z.number().min(0).max(1).optional(),
  tone: z.enum(['neutral', 'friendly', 'formal']).optional(),
});

const chatMessageSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000, 'Message is too long'),
  sessionId: objectIdSchema.optional(),
});

const listSessionQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((value) => (value ? parseInt(value, 10) : undefined)),
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? parseInt(value, 10) : undefined)),
  status: z.enum(['open', 'escalated', 'resolved', 'closed']).optional(),
  // Badge: count sessions updated after this timestamp (so badge clears when admin visits page)
  updatedAfter: z.string().optional().transform((v) => (v ? parseInt(v, 10) : undefined)),
});

module.exports = {
  createFaqSchema,
  updateFaqSchema,
  reorderFaqSchema,
  listFaqQuerySchema,
  updateConfigSchema,
  chatMessageSchema,
  listSessionQuerySchema,
};

