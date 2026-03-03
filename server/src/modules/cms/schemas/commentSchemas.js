const { z } = require('zod');

const commentSchemas = {
  create: z.object({
    post: z.string(),
    content: z.string().min(1).max(2000),
    authorName: z.string().optional(),
    authorEmail: z.string().email().optional(),
    parent: z.string().optional(),
  }),

  update: z.object({
    content: z.string().min(1).max(2000).optional(),
    status: z.enum(['pending', 'approved', 'spam', 'trash']).optional(),
  }),
};

module.exports = { commentSchemas };
