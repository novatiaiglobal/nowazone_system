const { z } = require('zod');

const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid user id');

const createCalendarEventSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(200, 'Title is too long'),
  description: z.string().max(3000, 'Description is too long').optional().default(''),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  isAllDay: z.boolean().optional(),
  location: z.string().max(300, 'Location is too long').optional(),
  participants: z.array(objectIdSchema).max(50).optional(),
  visibility: z.enum(['team', 'private']).optional(),
  color: z.string().min(4).max(16).optional(),
});

const updateCalendarEventSchema = createCalendarEventSchema.partial();

const googleSyncSchema = z.object({
  calendarId: z.string().optional().default('primary'),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

module.exports = { createCalendarEventSchema, updateCalendarEventSchema, googleSyncSchema };
