const { z } = require('zod');

const postSchemas = {
  create: z.object({
    title: z.string().min(1).max(200),
    slug: z.string().optional(),
    content: z.string().min(1),
    excerpt: z.string().max(300).optional(),
    status: z.enum(['draft', 'pending_review', 'published', 'scheduled', 'archived']).optional(),
    categories: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    coAuthors: z.array(z.string()).optional(),
    featuredImage: z.object({
      url: z.string().min(1, 'Featured image URL is required'),
      alt: z.string().optional(),
      caption: z.string().optional(),
    }),
    seo: z.object({
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      canonicalUrl: z.string().url().optional(),
      ogImage: z.string().optional(),
      ogTitle: z.string().optional(),
      ogDescription: z.string().optional(),
      keywords: z.array(z.string()).optional(),
      focusKeyword: z.string().optional(),
    }).optional(),
    faqs: z.array(z.object({
      question: z.string(),
      answer: z.string(),
    })).optional(),
    relatedPosts: z.array(z.string()).optional(),
    commentsEnabled: z.boolean().optional(),
    commentsModeration: z.boolean().optional(),
    visibility: z.enum(['public', 'private', 'password_protected']).optional(),
    password: z.string().optional(),
    allowedRoles: z.array(z.string()).optional(),
  }),

  update: z.object({
    title: z.string().min(1).max(200).optional(),
    slug: z.string().optional(),
    content: z.string().min(1).optional(),
    excerpt: z.string().max(300).optional(),
    status: z.enum(['draft', 'pending_review', 'published', 'scheduled', 'archived']).optional(),
    categories: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    coAuthors: z.array(z.string()).optional(),
    featuredImage: z.object({
      url: z.string(),
      alt: z.string().optional(),
      caption: z.string().optional(),
    }).optional(),
    seo: z.object({
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      canonicalUrl: z.string().url().optional(),
      ogImage: z.string().optional(),
      ogTitle: z.string().optional(),
      ogDescription: z.string().optional(),
      keywords: z.array(z.string()).optional(),
      focusKeyword: z.string().optional(),
    }).optional(),
    faqs: z.array(z.object({
      question: z.string(),
      answer: z.string(),
    })).optional(),
    relatedPosts: z.array(z.string()).optional(),
    commentsEnabled: z.boolean().optional(),
    commentsModeration: z.boolean().optional(),
    visibility: z.enum(['public', 'private', 'password_protected']).optional(),
    password: z.string().optional(),
    allowedRoles: z.array(z.string()).optional(),
    changeNote: z.string().optional(),
    createVersion: z.boolean().optional(),
  }),

  schedule: z.object({
    scheduledAt: z.string().datetime(),
  }),
};

module.exports = { postSchemas };
