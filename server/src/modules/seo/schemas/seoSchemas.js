const { z } = require('zod');

// ─── Path / URL ─────────────────────────────────────────────────────────────
const pathSchema = z.string().min(1, 'Path is required').refine((v) => v.startsWith('/'), 'Path must start with /');
const urlSchema = z.string().url().optional().or(z.literal(''));

// ─── SEO Page (accept legacy and new field names) ───────────────────────────
const baseSeoPageFields = {
  pagePath: pathSchema.optional(),
  routePath: pathSchema.optional(),
  pageType: z.enum(['static', 'dynamic']).optional(),
  pageKey: z.string().max(100).optional(),
  pageName: z.string().max(200).optional(),
  locale: z.string().max(20).optional(),
  region: z.string().max(50).optional(),
  targetEntityType: z.string().max(50).optional(),
  targetEntityId: z.string().optional(),
  metaTitle: z.string().trim().max(120).optional(),
  title: z.string().trim().max(120).optional(),
  metaDescription: z.string().trim().max(320).optional(),
  metaKeywords: z.array(z.string().trim()).max(50).optional(),
  keywords: z.array(z.string().trim()).max(50).optional(),
  canonicalUrl: urlSchema,
  robotsDirectives: z.string().max(200).optional(),
  robots: z.string().max(200).optional(),
  openGraph: z.object({
    title: z.string().max(160).optional(),
    description: z.string().max(320).optional(),
    image: z.string().url().optional(),
    type: z.string().max(40).optional(),
  }).optional(),
  ogTitle: z.string().max(160).optional(),
  ogDescription: z.string().max(320).optional(),
  ogImage: z.string().url().optional(),
  ogType: z.string().max(40).optional(),
  twitter: z.object({
    card: z.string().max(50).optional(),
    title: z.string().max(160).optional(),
    description: z.string().max(320).optional(),
    image: z.string().url().optional(),
  }).optional(),
  structuredData: z.any().nullable().optional(),
  focusKeyword: z.string().max(200).optional(),
  secondaryKeywords: z.array(z.string().trim()).max(30).optional(),
  breadcrumbTitle: z.string().max(200).optional(),
  slugOverride: z.string().max(200).optional(),
  contentSummary: z.string().max(500).optional(),
  schemaType: z.string().max(100).optional(),
  customHeadTags: z.string().max(2000).optional(),
  status: z.enum(['draft', 'review', 'approved', 'published', 'archived']).optional(),
  isPublished: z.boolean().optional(),
};

const createSeoPageSchema = z.object(baseSeoPageFields).refine(
  (data) => data.routePath != null || data.pagePath != null,
  { message: 'routePath or pagePath is required' }
);
const updateSeoPageSchema = z.object(baseSeoPageFields).partial();

const seoPageStatusSchema = z.object({ status: z.enum(['draft', 'review', 'approved', 'published', 'archived']) });

const seoPageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  sort: z.string().max(100).default('-updatedAt'),
  status: z.string().optional(),
  locale: z.string().optional(),
  region: z.string().optional(),
  pageType: z.string().optional(),
  service: z.string().optional(),
});

// ─── Redirect (legacy fromPath/toPath/type + new sourcePath/targetPath/redirectType) ─────────────────
const redirectPathSchema = z.string().min(1).refine((v) => v.startsWith('/'), 'Path must start with /');

const baseRedirectFields = {
  fromPath: redirectPathSchema.optional(),
  sourcePath: redirectPathSchema.optional(),
  toPath: redirectPathSchema.optional(),
  targetPath: redirectPathSchema.optional(),
  type: z.union([z.literal(301), z.literal(302)]).optional(),
  redirectType: z.union([z.literal(301), z.literal(302), z.literal(307), z.literal(410)]).optional(),
  isActive: z.boolean().optional().default(true),
  matchType: z.enum(['exact', 'prefix', 'regex']).optional(),
  priority: z.number().int().min(0).optional(),
  note: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
};

const createRedirectSchema = z.object(baseRedirectFields).refine(
  (data) => (data.sourcePath ?? data.fromPath) !== (data.targetPath ?? data.toPath),
  { message: 'Source and target cannot be the same', path: ['targetPath'] }
);
const updateRedirectSchema = z.object(baseRedirectFields).partial();

// ─── Keyword ──────────────────────────────────────────────────────────────
const createKeywordSchema = z.object({
  keyword: z.string().min(2, 'Keyword at least 2 characters'),
  targetUrl: z.string().optional(),
  pagePath: z.string().optional().refine((v) => !v || v.startsWith('/'), 'Target path must start with /'),
  intent: z.enum(['informational', 'navigational', 'transactional', 'commercial']).optional(),
  cluster: z.string().max(100).optional(),
  priority: z.number().int().min(0).optional(),
  targetRegion: z.string().max(50).optional(),
  targetLocale: z.string().max(20).optional(),
  targetService: z.string().max(100).optional(),
  targetIndustry: z.string().max(100).optional(),
  searchVolume: z.number().int().min(0).nullable().optional(),
  difficulty: z.number().int().min(0).max(100).nullable().optional(),
  currentRank: z.number().int().min(1).nullable().optional(),
  impressions: z.number().int().min(0).nullable().optional(),
  clicks: z.number().int().min(0).nullable().optional(),
  ctr: z.number().min(0).max(100).nullable().optional(),
  avgPosition: z.number().min(0).nullable().optional(),
  status: z.enum(['new', 'tracking', 'ranked', 'lost', 'paused']).optional().default('new'),
  notes: z.string().max(1000).optional(),
});
const updateKeywordSchema = createKeywordSchema.partial();

const keywordQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sort: z.string().default('-updatedAt'),
  status: z.string().optional(),
  cluster: z.string().optional(),
});

// ─── Audit ───────────────────────────────────────────────────────────────
const runAuditSchema = z.object({
  scope: z.enum(['single-page', 'site-wide']).optional().default('site-wide'),
  targetPageId: z.string().optional(),
});
const resolveIssueSchema = z.object({ resolved: z.boolean().optional().default(true), note: z.string().optional() });

// ─── Sitemap ──────────────────────────────────────────────────────────────
const sitemapConfigSchema = z.object({
  baseUrl: z.string().url(),
  includeStaticPages: z.boolean().optional(),
  includeDynamicPages: z.boolean().optional(),
  includeImages: z.boolean().optional(),
  locales: z.array(z.string()).optional(),
  excludedPaths: z.array(z.string()).optional(),
  defaultChangefreq: z.string().optional(),
  defaultPriority: z.number().min(0).max(1).optional(),
  autoGenerate: z.boolean().optional(),
}).partial();

const sitemapEntryPatchSchema = z.object({
  included: z.boolean().optional(),
  priority: z.number().min(0).max(1).optional(),
  changefreq: z.enum(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']).optional(),
});

// ─── Public API query ─────────────────────────────────────────────────────
const byRouteQuerySchema = z.object({
  path: z.string().min(1, 'path is required'),
  locale: z.string().optional().default('en'),
  region: z.string().optional().default(''),
});
const byEntityQuerySchema = z.object({
  type: z.string().min(1, 'type is required'),
  id: z.string().min(1, 'id is required'),
  locale: z.string().optional().default('en'),
  region: z.string().optional().default(''),
});

module.exports = {
  createSeoPageSchema,
  updateSeoPageSchema,
  seoPageStatusSchema,
  seoPageQuerySchema,
  createRedirectSchema,
  updateRedirectSchema,
  createKeywordSchema,
  updateKeywordSchema,
  keywordQuerySchema,
  runAuditSchema,
  resolveIssueSchema,
  sitemapConfigSchema,
  sitemapEntryPatchSchema,
  byRouteQuerySchema,
  byEntityQuerySchema,
};
