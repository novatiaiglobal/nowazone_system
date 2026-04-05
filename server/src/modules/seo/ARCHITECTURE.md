# SEO Management Module — Architecture & Feature Planning

**Company:** Nowazone  
**Purpose:** Enterprise-grade SEO control for website and admin; governance-first, auditable, scalable.

---

## 1. Feature Breakdown by Submodule

### 1.1 SEO Overview
- **KPIs:** Total managed pages, published vs draft, pages missing metadata/canonical/structured data, redirect count, keyword count, latest audit score.
- **Summaries:** Top issues by severity, recent audit runs, sitemap last-generated, publish queue (items in review/approved not yet published).
- **Recent activity:** Last N changes from SeoChangeLog (publish, status change, edits).
- **Pages needing attention:** List of pages with critical/warning audit issues or missing required fields.

### 1.2 SEO Pages
- **CRUD:** Create, read, update, soft-delete SEO page records.
- **States:** draft → review → approved → published; optional archived.
- **Versioning:** Each publish creates an immutable SeoPageVersion snapshot; list versions per page.
- **Filtering:** By status, locale, region, pageType (static|dynamic), service, search (pageName, routePath, focusKeyword).
- **Actions:** Publish (with permission), archive, duplicate, bulk import, bulk update.
- **Validation:** Title/description length, canonical URL, structured data JSON, slug/route normalization.

### 1.3 SEO Audit
- **Run:** Manual or scheduled; scope single-page or site-wide.
- **Checks:** Missing/short/long title and description, duplicate title/description, missing canonical, noindex/nofollow, missing OG/structured data, redirect conflicts, sitemap exclusion mismatch, orphan placeholder.
- **Storage:** Each run = SeoAuditRun; each finding = SeoAuditIssue with severity, message, recommendation.
- **Workflow:** Resolve issue (resolvedBy, resolvedAt); filter by severity; history of runs.

### 1.4 Redirects
- **CRUD:** Create, read, update, delete (hard delete for redirects).
- **Types:** 301, 302, 307, 410 (gone).
- **Match:** exact, prefix, regex (with safe regex handling).
- **Rules:** Unique source for exact match; no self-redirect; loop detection; chain detection where possible.
- **Bulk:** Import CSV/JSON; validate endpoint to check for conflicts and loops.

### 1.5 Keywords
- **CRUD:** Create, read, update, delete.
- **Fields:** keyword (normalized), intent, cluster, priority, targetUrl, targetRegion/Locale/Service/Industry, searchVolume, difficulty, currentRank, notes, status.
- **Views:** Clusters (group by cluster), opportunities (e.g. high volume + low difficulty or unassigned).
- **Bulk import:** CSV/JSON.

### 1.6 Sitemap
- **Config:** Base URL, include static/dynamic/images, locales, excluded paths, changefreq/priority defaults, autoGenerate flag, lastGeneratedAt.
- **Entries:** SitemapEntry per URL (pageType, locale, changefreq, priority, lastmod, included, sourceModel/sourceId).
- **APIs:** Get/put config, generate (idempotent), list entries, patch entry (include/exclude, priority), get XML, get status.

---

## 2. Entity and Relationship Design

```
SeoPage 1 ──┬── * SeoPageVersion   (one version per publish)
            └── (targetEntityType/Id for dynamic pages)

SeoKeyword  (standalone; targetUrl points to page/route)
SeoRedirect (standalone; sourcePath → targetPath)

SeoAuditRun 1 ── * SeoAuditIssue

SitemapConfig 1 (singleton per env) ── * SitemapEntry

SeoTemplate (standalone; entityType for dynamic page fallback)

SeoChangeLog (audit trail: entityType, entityId, action, before, after, changedBy)
```

- **SeoPage** unique per (routePath + locale + region) for published; draft can coexist until publish.
- **SeoRedirect** unique per (sourcePath) for exact+active.
- **SeoKeyword** normalizedKeyword for dedup/cluster.

---

## 3. Role-Based Permissions

| Role            | seo.read | seo.write | seo.publish |
|-----------------|----------|-----------|-------------|
| Super Admin     | ✓        | ✓         | ✓           |
| SEO Manager     | ✓        | ✓         | ✓           |
| Content Manager | ✓        | ✓         | (optional)  |
| Viewer/Auditor  | ✓        | —         | —           |

- **seo.read:** View overview, pages, keywords, redirects, audits, sitemap config/entries.
- **seo.write:** Create/edit/delete drafts; create/edit redirects, keywords; run audit; edit sitemap config/entries.
- **seo.publish:** Change status to published; publish action; archive. Only holders can approve/publish.

---

## 4. Publishing Workflow

| Status    | Description |
|----------|-------------|
| draft    | Editable; not visible on site. |
| review   | Submitted for review; editable by approver. |
| approved | Approved; ready to publish. |
| published| Live on site; one published record per route+locale+region. |
| archived | No longer live; retained for history. |

- **Publish action:** Moves approved/draft → published; creates SeoPageVersion; writes SeoChangeLog; invalidates cache.
- **Only one published** per (routePath, locale, region); publishing another can un-publish previous or reject.

---

## 5. API Design Plan

### Overview
- `GET /api/seo/overview` — KPIs, issue summary, recent activity, sitemap status.

### Pages
- `POST /api/seo/pages` — create (draft).
- `GET /api/seo/pages` — list (paginate, filter, search, sort).
- `GET /api/seo/pages/:id` — get one.
- `PUT /api/seo/pages/:id` — update (draft/review/approved).
- `PATCH /api/seo/pages/:id/status` — set status (subject to RBAC).
- `POST /api/seo/pages/:id/publish` — publish (seo.publish).
- `POST /api/seo/pages/:id/archive` — archive.
- `GET /api/seo/pages/:id/versions` — list versions.
- `POST /api/seo/pages/:id/duplicate` — duplicate as draft.
- `DELETE /api/seo/pages/:id` — soft delete.
- `POST /api/seo/pages/bulk-import` — bulk create/update.
- `PATCH /api/seo/pages/bulk-update` — bulk status/field update.

### Keywords
- `POST /api/seo/keywords` — create.
- `GET /api/seo/keywords` — list (paginate, filter, search).
- `GET /api/seo/keywords/:id` — get one.
- `PUT /api/seo/keywords/:id` — update.
- `DELETE /api/seo/keywords/:id` — delete.
- `POST /api/seo/keywords/bulk-import` — bulk import.
- `GET /api/seo/keywords/clusters` — list clusters.
- `GET /api/seo/keywords/opportunities` — opportunities view.

### Redirects
- `POST /api/seo/redirects` — create.
- `GET /api/seo/redirects` — list (paginate, filter).
- `GET /api/seo/redirects/:id` — get one.
- `PUT /api/seo/redirects/:id` — update.
- `PATCH /api/seo/redirects/:id/toggle` — toggle isActive.
- `DELETE /api/seo/redirects/:id` — delete.
- `POST /api/seo/redirects/validate` — validate body for loops/conflicts.
- `POST /api/seo/redirects/bulk-import` — bulk import.

### Audit
- `POST /api/seo/audits/run` — run audit (store run + issues).
- `GET /api/seo/audits` — list runs (paginate).
- `GET /api/seo/audits/:id` — get run + summary.
- `GET /api/seo/audits/:id/issues` — list issues (filter by severity).
- `PATCH /api/seo/audits/issues/:issueId/resolve` — mark resolved.
- `POST /api/seo/audits/schedule` — (placeholder for future scheduler).

### Sitemap
- `GET /api/seo/sitemap/config` — get config.
- `PUT /api/seo/sitemap/config` — update config.
- `POST /api/seo/sitemap/generate` — generate entries + XML.
- `GET /api/seo/sitemap/entries` — list entries (paginate, filter).
- `PATCH /api/seo/sitemap/entries/:id` — update entry (included, priority, etc.).
- `GET /api/seo/sitemap/xml` — serve XML (public or admin).
- `GET /api/seo/sitemap/status` — last generated, count, etc.

### Public (Next.js consumption)
- `GET /api/seo/public/by-route?path=&locale=&region=` — SEO payload by route.
- `GET /api/seo/public/by-entity?type=&id=&locale=&region=` — SEO payload by entity (template + overrides).

---

## 6. Folder / Module Structure

```
server/src/modules/seo/
├── ARCHITECTURE.md          (this file)
├── controllers/
│   ├── seoOverviewController.js
│   ├── seoPageController.js
│   ├── seoKeywordController.js
│   ├── seoRedirectController.js
│   ├── seoAuditController.js
│   ├── sitemapController.js
│   └── seoPublicController.js
├── services/
│   ├── seoOverviewService.js
│   ├── seoPageService.js
│   ├── seoKeywordService.js
│   ├── seoRedirectService.js
│   ├── seoAuditService.js
│   ├── sitemapService.js
│   └── seoPublicService.js
├── repositories/
│   ├── seoPageRepository.js
│   ├── seoKeywordRepository.js
│   ├── seoRedirectRepository.js
│   ├── seoAuditRepository.js
│   ├── sitemapRepository.js
│   └── seoChangeLogRepository.js
├── models/
│   ├── SeoPage.js
│   ├── SeoPageVersion.js
│   ├── SeoKeyword.js
│   ├── SeoRedirect.js
│   ├── SeoAuditRun.js
│   ├── SeoAuditIssue.js
│   ├── SitemapConfig.js
│   ├── SitemapEntry.js
│   ├── SeoTemplate.js
│   └── SeoChangeLog.js
├── schemas/
│   └── seoSchemas.js
├── middlewares/
│   └── seoRbac.js          (optional wrapper around authorize)
├── utils/
│   ├── seoSlug.js
│   └── seoValidation.js
└── routes/
    └── seoRoutes.js
```

---

## 7. Caching and Invalidation (Next.js)

- **Public by-route / by-entity:** Cache TTL (e.g. 60s) or tag-based; invalidate on publish/archive.
- **Sitemap XML:** Cache until next generate or short TTL; invalidate on generate.

---

## 8. Next.js Integration

### Public API for metadata

- **By route:** `GET /api/seo/public/by-route?path=/cloud-services&locale=en&region=uae`  
  Returns: `{ title, description, canonical, robots, openGraph, twitter, jsonLd }`  
  Use in `generateMetadata()` for static or dynamic routes by resolving `path` from the current route.

- **By entity:** `GET /api/seo/public/by-entity?type=service&id=xyz&locale=en&region=uae`  
  Returns the same shape. Use for entity pages (e.g. service detail) when SEO is driven by entity type + id.  
  Fallback order: exact page config → template for entity type → default from settings.

### generateMetadata (App Router)

```ts
// app/[locale]/[slug]/page.tsx or layout
export async function generateMetadata({ params }) {
  const path = `/${params.locale}/${params.slug ?? ''}`.replace(/\/+/g, '/');
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/seo/public/by-route?path=${encodeURIComponent(path)}&locale=${params.locale}`
  );
  const { data } = await res.json();
  if (!data) return {};
  return {
    title: data.title,
    description: data.description,
    alternates: { canonical: data.canonical },
    robots: data.robots,
    openGraph: data.openGraph,
    twitter: data.twitter,
    other: data.jsonLd ? { 'application/ld+json': JSON.stringify(data.jsonLd) } : {},
  };
}
```

### Caching and invalidation

- Cache public SEO responses (e.g. 60s TTL or tag-based) in Next.js fetch or data cache.
- On publish/archive, call an invalidation endpoint or revalidate tag so the frontend drops cached metadata for that route.

### Sitemap (Next.js)

- Option A: Use backend XML: `GET /api/seo/sitemap/xml` and point `robots.txt` Sitemap to it.
- Option B: Next.js `app/sitemap.ts` can fetch entries from `GET /api/seo/sitemap/entries` (admin API, or expose a public read-only list) and build the sitemap.

---

## 9. Testing Checklist

- [ ] SeoPage: create draft, update, publish, version created, duplicate, soft delete, bulk import/update.
- [ ] Uniqueness: routePath+locale+region for published; redirect sourcePath exact.
- [ ] Redirect: self-redirect rejected; loop detection; validate endpoint.
- [ ] Audit: run creates SeoAuditRun + SeoAuditIssue; resolve updates issue.
- [ ] Sitemap: generate idempotent; XML excludes noindex/archived.
- [ ] RBAC: seo.read / seo.write / seo.publish enforced.
- [ ] SeoChangeLog: written on create/update/publish/status change.
- [ ] Public API: by-route and by-entity return correct payload; fallback to template/default.
