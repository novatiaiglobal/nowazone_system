const express = require('express');
const { protect, authorize } = require('../../../shared/middleware/auth');
const { validate, validateQuery } = require('../../../shared/middleware/validation');
const {
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
  sitemapConfigSchema,
  sitemapEntryPatchSchema,
  byRouteQuerySchema,
  byEntityQuerySchema,
} = require('../schemas/seoSchemas');

const overviewCtrl = require('../controllers/seoOverviewController');
const pageCtrl = require('../controllers/seoPageController');
const keywordCtrl = require('../controllers/seoKeywordController');
const redirectCtrl = require('../controllers/seoRedirectController');
const auditCtrl = require('../controllers/seoAuditController');
const sitemapCtrl = require('../controllers/sitemapController');
const publicCtrl = require('../controllers/seoPublicController');

const router = express.Router();

// ─── Public (no auth) ─────────────────────────────────────────────────────
router.get('/public', publicCtrl.getPublicSeo);
router.get('/public/by-route', validateQuery(byRouteQuerySchema), publicCtrl.getByRoute);
router.get('/public/by-entity', validateQuery(byEntityQuerySchema), publicCtrl.getByEntity);
router.get('/sitemap/xml', sitemapCtrl.getXml);
router.get('/robots.txt', sitemapCtrl.getRobotsTxt);
router.get('/redirects/list', redirectCtrl.listPublic);
router.post('/redirects/record-hit', redirectCtrl.recordHit);

// ─── SEO Overview ────────────────────────────────────────────────────────
router.get('/overview', protect, authorize('seo.read'), overviewCtrl.getOverview);

// ─── SEO Pages ───────────────────────────────────────────────────────────
router.get('/pages', protect, authorize('seo.read'), validateQuery(seoPageQuerySchema), pageCtrl.list);
router.post('/pages', protect, authorize('seo.write'), validate(createSeoPageSchema), pageCtrl.create);
router.post('/pages/bulk-import', protect, authorize('seo.write'), pageCtrl.bulkImport);
router.patch('/pages/bulk-update', protect, authorize('seo.write'), pageCtrl.bulkUpdate);
router.get('/pages/:id', protect, authorize('seo.read'), pageCtrl.getById);
router.put('/pages/:id', protect, authorize('seo.write'), validate(updateSeoPageSchema), pageCtrl.update);
router.patch('/pages/:id/status', protect, authorize('seo.write'), validate(seoPageStatusSchema), pageCtrl.setStatus);
router.post('/pages/:id/publish', protect, authorize('seo.publish'), pageCtrl.publish);
router.post('/pages/:id/archive', protect, authorize('seo.write'), pageCtrl.archive);
router.get('/pages/:id/versions', protect, authorize('seo.read'), pageCtrl.getVersions);
router.post('/pages/:id/duplicate', protect, authorize('seo.write'), pageCtrl.duplicate);
router.delete('/pages/:id', protect, authorize('seo.write'), pageCtrl.remove);

// ─── Keywords ─────────────────────────────────────────────────────────────
router.get('/keywords', protect, authorize('seo.read'), keywordCtrl.list);
router.get('/keywords/stats', protect, authorize('seo.read'), keywordCtrl.getStats);
router.post('/keywords', protect, authorize('seo.write'), validate(createKeywordSchema), keywordCtrl.create);
router.post('/keywords/bulk-import', protect, authorize('seo.write'), keywordCtrl.bulkImport);
router.get('/keywords/clusters', protect, authorize('seo.read'), keywordCtrl.getClusters);
router.get('/keywords/opportunities', protect, authorize('seo.read'), keywordCtrl.getOpportunities);
router.get('/keywords/:id', protect, authorize('seo.read'), keywordCtrl.getById);
router.put('/keywords/:id', protect, authorize('seo.write'), validate(createKeywordSchema.partial()), keywordCtrl.update);
router.delete('/keywords/:id', protect, authorize('seo.write'), keywordCtrl.remove);

// ─── Redirects ────────────────────────────────────────────────────────────
router.get('/redirects', protect, authorize('seo.read'), redirectCtrl.list);
router.post('/redirects', protect, authorize('seo.write'), validate(createRedirectSchema), redirectCtrl.create);
router.post('/redirects/validate', protect, authorize('seo.write'), redirectCtrl.validate);
router.post('/redirects/bulk-import', protect, authorize('seo.write'), redirectCtrl.bulkImport);
router.get('/redirects/:id', protect, authorize('seo.read'), redirectCtrl.getById);
router.put('/redirects/:id', protect, authorize('seo.write'), validate(updateRedirectSchema), redirectCtrl.update);
router.patch('/redirects/:id/toggle', protect, authorize('seo.write'), redirectCtrl.toggle);
router.delete('/redirects/:id', protect, authorize('seo.write'), redirectCtrl.remove);

// ─── Audit ───────────────────────────────────────────────────────────────
router.post('/audits/run', protect, authorize('seo.read'), validate(runAuditSchema), auditCtrl.runAudit);
router.post('/audits/schedule', protect, authorize('seo.read'), auditCtrl.schedule);
router.get('/audits', protect, authorize('seo.read'), auditCtrl.listRuns);
router.get('/audits/:id', protect, authorize('seo.read'), auditCtrl.getRun);
router.get('/audits/:id/issues', protect, authorize('seo.read'), auditCtrl.getIssues);
router.patch('/audits/issues/:issueId/resolve', protect, authorize('seo.write'), auditCtrl.resolveIssue);

// ─── Sitemap ──────────────────────────────────────────────────────────────
router.get('/sitemap/config', protect, authorize('seo.read'), sitemapCtrl.getConfig);
router.put('/sitemap/config', protect, authorize('seo.write'), validate(sitemapConfigSchema), sitemapCtrl.updateConfig);
router.post('/sitemap/generate', protect, authorize('seo.write'), sitemapCtrl.generate);
router.get('/sitemap/entries', protect, authorize('seo.read'), sitemapCtrl.getEntries);
router.patch('/sitemap/entries/:id', protect, authorize('seo.write'), validate(sitemapEntryPatchSchema), sitemapCtrl.updateEntry);
router.get('/sitemap/status', protect, authorize('seo.read'), sitemapCtrl.getStatus);

// ─── Legacy aliases (backward compatibility) ──────────────────────────────
router.get('/stats', protect, authorize('seo.read'), overviewCtrl.getOverview);
router.get('/sitemap.xml', sitemapCtrl.getXml);
router.get('/sitemap/preview', protect, authorize('seo.read'), sitemapCtrl.getPreview);

module.exports = router;
