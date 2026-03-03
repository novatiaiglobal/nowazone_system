const { z } = require('zod');

const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid user id');

const createTaskSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(180, 'Title is too long'),
  description: z.string().max(5000, 'Description is too long').optional().default(''),
  status: z.enum(['todo', 'in_progress', 'done', 'blocked']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().datetime().optional(),
  reminderAt: z.string().datetime().optional(),
  assignedTo: objectIdSchema.optional(),
  tags: z.array(z.string().min(1).max(40)).max(10).optional(),
});

const updateTaskSchema = createTaskSchema.partial();

const assignTaskSchema = z.object({
  assignedTo: objectIdSchema,
});

module.exports = { createTaskSchema, updateTaskSchema, assignTaskSchema };
