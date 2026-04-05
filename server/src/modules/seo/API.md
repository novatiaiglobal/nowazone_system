# SEO Module — API Reference

Base path: `/api/seo`. All admin endpoints require `Authorization: Bearer <token>` and appropriate permission (`seo.read`, `seo.write`, `seo.publish`).

## Public (no auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | /public | Legacy: SEO by path. Query: `path`, `locale`, `region` |
| GET | /public/by-route | SEO payload for Next.js. Query: `path`, `locale`, `region` |
| GET | /public/by-entity | SEO by entity. Query: `type`, `id`, `locale`, `region` |
| GET | /sitemap/xml | Sitemap XML |
| GET | /robots.txt | Robots.txt |
| GET | /redirects/list | Active redirects (for middleware) |
| POST | /redirects/record-hit | Record redirect hit. Body: `fromPath` or `sourcePath` |

## Overview

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /overview | seo.read | KPIs, issue summary, recent activity, sitemap status |
| GET | /stats | seo.read | Alias for /overview |

## Pages

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /pages | seo.read | List (query: page, limit, search, sort, status, locale, region, pageType) |
| POST | /pages | seo.write | Create |
| GET | /pages/:id | seo.read | Get one |
| PUT | /pages/:id | seo.write | Update |
| PATCH | /pages/:id/status | seo.write | Set status (draft|review|approved|archived; use POST publish to publish) |
| POST | /pages/:id/publish | seo.publish | Publish (creates version) |
| POST | /pages/:id/archive | seo.write | Archive |
| GET | /pages/:id/versions | seo.read | List versions |
| POST | /pages/:id/duplicate | seo.write | Duplicate as draft |
| DELETE | /pages/:id | seo.write | Soft delete |
| POST | /pages/bulk-import | seo.write | Body: array of page objects |
| PATCH | /pages/bulk-update | seo.write | Body: array of { id, ...fields } |

## Keywords

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /keywords | seo.read | List (query: page, limit, search, sort, status, cluster) |
| POST | /keywords | seo.write | Create |
| GET | /keywords/:id | seo.read | Get one |
| PUT | /keywords/:id | seo.write | Update |
| DELETE | /keywords/:id | seo.write | Delete |
| POST | /keywords/bulk-import | seo.write | Body: array of keyword objects |
| GET | /keywords/clusters | seo.read | List clusters |
| GET | /keywords/opportunities | seo.read | Opportunities (query: limit) |

## Redirects

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /redirects | seo.read | List (query: page, limit, search, sort, isActive) |
| POST | /redirects | seo.write | Create |
| POST | /redirects/validate | seo.write | Validate body (loops, conflicts) |
| POST | /redirects/bulk-import | seo.write | Body: array of redirect objects |
| GET | /redirects/:id | seo.read | Get one |
| PUT | /redirects/:id | seo.write | Update |
| PATCH | /redirects/:id/toggle | seo.write | Toggle isActive |
| DELETE | /redirects/:id | seo.write | Delete |

## Audit

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | /audits/run | seo.read | Run audit (body: scope, targetPageId) |
| POST | /audits/schedule | seo.read | Placeholder for scheduled audit |
| GET | /audits | seo.read | List runs (query: page, limit, sort) |
| GET | /audits/:id | seo.read | Get run |
| GET | /audits/:id/issues | seo.read | List issues (query: severity) |
| PATCH | /audits/issues/:issueId/resolve | seo.write | Mark issue resolved |

## Sitemap

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /sitemap/config | seo.read | Get config |
| PUT | /sitemap/config | seo.write | Update config |
| POST | /sitemap/generate | seo.write | Regenerate entries |
| GET | /sitemap/entries | seo.read | List entries (query: page, limit, included, locale) |
| PATCH | /sitemap/entries/:id | seo.write | Update entry (included, priority, changefreq) |
| GET | /sitemap/status | seo.read | Last generated, count |
| GET | /sitemap.xml | — | Alias for /sitemap/xml |
| GET | /sitemap/preview | seo.read | Alias for /sitemap/entries |

## Response format

- Success: `{ status: 'success', data: ... }`
- Error: `{ status: 'fail'|'error', message: '...' }` with appropriate HTTP status.

## Permissions

- **seo.read**: View overview, pages, keywords, redirects, audits, sitemap.
- **seo.write**: Create, edit, delete (except publish).
- **seo.publish**: Publish and archive pages (SEO Manager, Super Admin).
