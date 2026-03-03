const { z } = require('zod');

const createLeadSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^[\d\s\-\+\(\)]+$/, 'Invalid phone number'),
  company: z.string().optional(),
  source: z.enum(['website', 'referral', 'social', 'email', 'other']).optional(),
});

const updateLeadSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().regex(/^[\d\s\-\+\(\)]+$/).optional(),
  company: z.string().optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'converted', 'lost']).optional(),
  assignedTo: z.string().optional(),
  followUpAt: z.union([z.string(), z.date()]).optional().transform((v) => (v ? new Date(v) : undefined)),
  followUpNote: z.string().optional(),
});

module.exports = {
  createLeadSchema,
  updateLeadSchema,
};
