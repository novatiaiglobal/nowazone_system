const { z } = require('zod');

const categorySchemas = {
  create: z.object({
    name: z.string().min(1).max(100),
    slug: z.string().optional(),
    description: z.string().optional(),
    parent: z.string().optional(),
    image: z.string().url().optional(),
    seo: z.object({
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
    }).optional(),
    order: z.number().optional(),
  }),

  update: z.object({
    name: z.string().min(1).max(100).optional(),
    slug: z.string().optional(),
    description: z.string().optional(),
    parent: z.string().optional(),
    image: z.string().url().optional(),
    seo: z.object({
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
    }).optional(),
    order: z.number().optional(),
  }),
};

module.exports = { categorySchemas };
