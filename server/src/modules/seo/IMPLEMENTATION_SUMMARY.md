# SEO Management Module — What Was Done & What's Next

## What Was Done

### 1. Architecture & Planning
- **ARCHITECTURE.md** created with:
  - Feature breakdown for SEO Overview, Pages, Audit, Redirects, Keywords, Sitemap
  - Entity/relationship design
  - RBAC (Super Admin, SEO Manager, Content Manager, Viewer) and permissions: `seo.read`, `seo.write`, `seo.publish`
  - Publishing workflow: draft → review → approved → published → archived
  - Full API design and folder structure

### 2. Data Models (Mongoose)
All in `server/src/modules/seo/models/`:

| Model | Purpose |
|-------|--------|
| **SeoPage** | Core SEO per page: routePath/pagePath, locale, region, title, meta, OG, Twitter, structuredData, status, soft delete |
| **SeoPageVersion** | Immutable snapshot on each publish |
| **SeoKeyword** | Keywords with normalization, intent, cluster, targetUrl, regions, status |
| **SeoRedirect** | sourcePath → targetPath, types 301/302/307/410, matchType exact/prefix/regex |
| **SeoAuditRun** | Audit run metadata and summary stats |
| **SeoAuditIssue** | Per-issue findings with severity and resolve tracking |
| **SitemapConfig** | Base URL, includes, locales, excluded paths, defaults |
| **SitemapEntry** | Per-URL sitemap entry with priority, changefreq, lastmod |
| **SeoTemplate** | Template fallbacks by entity type |
| **SeoChangeLog** | Audit trail: action, entity, before/after, changedBy |

Indexes and partial unique constraint for (routePath, locale, region) when status = published.

### 3. Repositories (Data Access)
In `server/src/modules/seo/repositories/`:
- **seoPageRepository** — create, findById, findOnePublished, findPaginated, updateById, softDelete, countByStatus, countMissing, version CRUD
- **seoKeywordRepository** — CRUD, findPaginated, getClusters, getOpportunities
- **seoRedirectRepository** — CRUD, findBySourceExact, listActiveForMiddleware, findAllTargetPaths
- **seoAuditRepository** — createRun, updateRun, findRunById, findRunsPaginated, createIssue, createIssuesBulk, findIssuesByRunId, resolveIssue
- **sitemapRepository** — getConfig, updateConfig, deleteAllEntries, upsertEntry(s), findEntriesPaginated, findIncludedEntries
- **seoChangeLogRepository** — create, logSeoAction, findRecent

### 4. Services (Business Logic)
In `server/src/modules/seo/services/`:
- **seoOverviewService** — getOverview (KPIs, missing metadata counts, latest audit, sitemap status, recent activity)
- **seoPageService** — create, getById, list, update, setStatus, publish, archive, getVersions, duplicate, remove, bulkImport, bulkUpdate (with payload mapping and validation)
- **seoKeywordService** — create, getById, list, update, remove, getClusters, getOpportunities, bulkImport
- **seoRedirectService** — create, getById, list, update, toggle, remove, validate (loop/conflict check), bulkImport
- **seoAuditService** — runAudit (creates run + issues), getRun, listRuns, getIssues, resolveIssue, scheduleAudit placeholder
- **sitemapService** — getConfig, updateConfig, generate (idempotent), getEntries, updateEntry, getXml, getStatus
- **seoPublicService** — getByRoute, getByEntity (normalized payload for Next.js), buildMetadataPayload

Utils: **seoSlug.js** (normalizeRoutePath), **seoValidation.js** (meta title/description length, structured data JSON, safe redirect regex).

### 5. Controllers & Routes
- **Controllers** in `server/src/modules/seo/controllers/`: thin layer calling services; legacy helpers (getPublicSeo, listPublic, recordHit, getRobotsTxt) kept for backward compatibility.
- **Routes** in `server/src/modules/seo/routes/seoRoutes.js`:
  - Public: `/public`, `/public/by-route`, `/public/by-entity`, `/sitemap/xml`, `/robots.txt`, `/redirects/list`, `/redirects/record-hit`
  - Overview: `/overview`, `/stats`
  - Pages: full CRUD, status, publish, archive, versions, duplicate, soft delete, bulk-import, bulk-update
  - Keywords: CRUD, bulk-import, clusters, opportunities
  - Redirects: CRUD, toggle, validate, bulk-import
  - Audit: run, schedule, list runs, get run, get issues, resolve issue
  - Sitemap: config, generate, entries, update entry, xml, status, preview

All admin routes use `protect` and `authorize('seo.read'|'seo.write'|'seo.publish')` as appropriate.

### 6. Validation & Schemas
- **schemas/seoSchemas.js** extended with Zod schemas for: create/update page (with legacy field names), page status, page query; redirect create/update; keyword create/update and query; run audit; sitemap config and entry patch; by-route and by-entity query.

### 7. Security & Governance
- **RBAC:** `seo.publish` permission added in auth module; assigned to `seo_manager` role.
- **SeoChangeLog** written on page create, update, status change, publish, archive, delete (and duplicate).
- Input validation via Zod; meta length and structured-data checks in services; safe regex for redirects.
- No internal details leaked in error responses; existing rate limit and CSRF on `/api` unchanged.

### 8. Backward Compatibility
- **SeoPage:** Supports both `pagePath` and `routePath`; pre-save syncs them; findOnePublished queries both; toJSON adds `pagePath` when needed.
- **SeoRedirect:** Response shape includes legacy `fromPath`, `toPath`, `type` where used.
- Legacy endpoints kept: `GET /api/seo/public`, `GET /api/seo/stats`, `GET /api/seo/sitemap.xml`, `GET /api/seo/sitemap/preview`, redirect list/hit.

### 9. Documentation
- **ARCHITECTURE.md** — full design, entities, RBAC, workflow, API plan, folder structure, Next.js integration notes, testing checklist.
- **API.md** — endpoint list with method, path, permission, and short description.
- **IMPLEMENTATION_SUMMARY.md** — this file (what was done, what’s next).

### 10. Migration Script
- **server/scripts/migrateSeoPages.js** — one-time migration for existing SeoPage documents: ensure routePath from pagePath and title from metaTitle.

---

## What Is Next

### Immediate (Before / When Using in Production)
1. **Run the migration** (if you have existing SeoPage data):
   ```bash
   cd server && node scripts/migrateSeoPages.js
   ```
2. **Ensure permissions for existing users:** If you use role/permission sync (e.g. from RolePermission or auth seed), ensure `seo.publish` is granted to SEO Manager (and optionally Content Manager) where desired.
3. **Old controller** — ✅ Archived as `server/src/modules/seo/controllers/seoController.legacy.js` (not loaded; routes use split controllers).

### Frontend (Admin Dashboard)
4. **SEO Overview** — ✅ Updated to use `GET /api/seo/overview`; KPIs and audit banner use new response shape; recent pages use `pagePath`/`routePath` and `status`/`isPublished`.
5. **SEO Pages** — ✅ Status filter, status in form, Publish button (POST …/publish), Duplicate (POST …/duplicate), Version history drawer (GET …/versions); table and form use routePath/title/status with fallbacks.
6. **SEO Audit** — ✅ Updated to use `POST /api/seo/audits/run` then `GET /api/seo/audits/:id/issues`; run-on-click only; issues grouped by page; summary from run.
7. **Redirects** — ✅ List and form accept both legacy (`fromPath`, `toPath`, `type`) and new (`sourcePath`, `targetPath`, `redirectType`) API fields.
8. **Keywords** — ✅ List and form use `targetUrl ?? pagePath`; backend `GET /api/seo/keywords/stats` added and wired.
9. **Sitemap** — ✅ Preview fixed (backend returns `urls`, `totalUrls`, `excludedNoindex`, `xml`); frontend defensive on missing `data.urls`.

### Public Website (Next.js)
10. **Metadata** — ✅ `frontend/src/lib/seo.ts`: `getSeoByRoute()`, `getSeoByEntity()`, `metadataFromSeo()`. Use in `generateMetadata()`; see `frontend/docs/SEO_METADATA.md`.
11. **Caching** — Helpers use `fetch(..., { next: { revalidate: 60 } })`; tune or add tag revalidation as needed.
12. **Sitemap / robots** — Documented in SEO_METADATA.md; point Sitemap to `{API_URL}/api/seo/sitemap/xml`.

### Optional / Later
13. **Scheduled audits** — Implement `POST /audits/schedule` (e.g. cron or queue job) to run audits on a schedule and store results.
14. **Keyword rank tracking** — Integrate an external API or script to update `currentRank` / `previousRank` on SeoKeyword and surface in admin.
15. **More audit checks** — Add checks for H1 placeholder, orphan pages, internal link mapping if the frontend or crawler can supply data.
16. **Rate limiting** — Add a stricter rate limit on admin mutation routes (e.g. bulk-import, generate sitemap) if needed.
17. **OpenAPI/Swagger** — Generate OpenAPI spec from routes/schemas for the SEO module if you want interactive API docs.
18. **Unit/integration tests** — Add tests for services (publish flow, redirect loop, audit run, sitemap generate) and critical API routes.

---

## Quick Reference

- **API base:** `/api/seo`
- **Permissions:** `seo.read` (view), `seo.write` (create/edit/delete), `seo.publish` (publish/archive pages)
- **Docs:** `server/src/modules/seo/ARCHITECTURE.md`, `server/src/modules/seo/API.md`
- **Migration:** `node server/scripts/migrateSeoPages.js` (from repo root or from `server/`)
