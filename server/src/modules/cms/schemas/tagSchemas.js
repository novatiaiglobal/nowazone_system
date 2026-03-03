const { z } = require('zod');

const tagSchemas = {
  create: z.object({
    name: z.string().min(1).max(50),
    slug: z.string().optional(),
    description: z.string().optional(),
    color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  }),

  update: z.object({
    name: z.string().min(1).max(50).optional(),
    slug: z.string().optional(),
    description: z.string().optional(),
    color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  }),

  bulkCreate: z.object({
    tagNames: z.array(z.string().min(1).max(50)),
  }),
};

module.exports = { tagSchemas };
