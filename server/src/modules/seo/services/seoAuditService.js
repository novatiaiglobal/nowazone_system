const { AppError } = require('../../../shared/middleware/errorHandler');
const SeoPage = require('../models/SeoPage');
const SeoRedirect = require('../models/SeoRedirect');
const seoAuditRepo = require('../repositories/seoAuditRepository');
const seoRedirectRepo = require('../repositories/seoRedirectRepository');

const ISSUE_TYPES = {
  MISSING_TITLE: 'missing_title',
  TITLE_TOO_SHORT: 'title_too_short',
  TITLE_TOO_LONG: 'title_too_long',
  MISSING_DESCRIPTION: 'missing_description',
  DESCRIPTION_TOO_SHORT: 'description_too_short',
  DESCRIPTION_TOO_LONG: 'description_too_long',
  DUPLICATE_TITLE: 'duplicate_title',
  DUPLICATE_DESCRIPTION: 'duplicate_description',
  MISSING_CANONICAL: 'missing_canonical',
  NOINDEX_ISSUE: 'noindex_issue',
  MISSING_OG: 'missing_og',
  MISSING_STRUCTURED_DATA: 'missing_structured_data',
  REDIRECT_CONFLICT: 'redirect_conflict',
  SITEMAP_EXCLUSION_MISMATCH: 'sitemap_exclusion_mismatch',
};

function severityFor(type) {
  if (['missing_title', 'missing_description'].includes(type)) return 'critical';
  if (['title_too_short', 'title_too_long', 'description_too_short', 'description_too_long', 'missing_og'].includes(type)) return 'warning';
  return 'info';
}

async function runAudit(options, userId) {
  const { scope = 'site-wide', targetPageId } = options;
  const run = await seoAuditRepo.createRun({
    runType: 'manual',
    scope,
    targetPageId: targetPageId || undefined,
    triggeredBy: userId,
    status: 'running',
    summary: { totalPages: 0, pagesWithIssues: 0, overallScore: 0, criticalCount: 0, warningCount: 0, infoCount: 0 },
  });

  try {
    const filter = { deletedAt: null };
    if (scope === 'single-page' && targetPageId) filter._id = targetPageId;
    const pages = await SeoPage.find(filter).lean();

    const titleCounts = {};
    const descCounts = {};
    const issues = [];
    let totalScore = 0;

    for (const page of pages) {
      let pageScore = 100;
      const pageUrl = page.routePath || page.pagePath || '';

      if (!page.title || !String(page.title).trim()) {
        issues.push({ auditRunId: run._id, pageUrl, pageId: page._id, issueType: ISSUE_TYPES.MISSING_TITLE, severity: 'critical', message: 'Missing meta title', recommendation: 'Add a unique title (20–60 chars)' });
        pageScore -= 15;
      } else {
        const len = String(page.title).length;
        if (len < 20) {
          issues.push({ auditRunId: run._id, pageUrl, pageId: page._id, issueType: ISSUE_TYPES.TITLE_TOO_SHORT, severity: 'warning', message: `Title too short (${len}/20 min)`, recommendation: 'Aim for 20–60 characters' });
          pageScore -= 8;
        } else if (len > 60) {
          issues.push({ auditRunId: run._id, pageUrl, pageId: page._id, issueType: ISSUE_TYPES.TITLE_TOO_LONG, severity: 'warning', message: `Title too long (${len}/60 max)`, recommendation: 'Keep under 60 characters' });
          pageScore -= 5;
        }
        titleCounts[page.title] = (titleCounts[page.title] || 0) + 1;
      }

      if (!page.metaDescription || !String(page.metaDescription).trim()) {
        issues.push({ auditRunId: run._id, pageUrl, pageId: page._id, issueType: ISSUE_TYPES.MISSING_DESCRIPTION, severity: 'critical', message: 'Missing meta description', recommendation: 'Add a description (50–160 chars)' });
        pageScore -= 15;
      } else {
        const len = String(page.metaDescription).length;
        if (len < 50) {
          issues.push({ auditRunId: run._id, pageUrl, pageId: page._id, issueType: ISSUE_TYPES.DESCRIPTION_TOO_SHORT, severity: 'warning', message: `Description too short (${len}/50 min)`, recommendation: 'Aim for 50–160 characters' });
          pageScore -= 8;
        } else if (len > 160) {
          issues.push({ auditRunId: run._id, pageUrl, pageId: page._id, issueType: ISSUE_TYPES.DESCRIPTION_TOO_LONG, severity: 'warning', message: `Description too long (${len}/160 max)`, recommendation: 'Keep under 160 characters' });
          pageScore -= 5;
        }
        descCounts[page.metaDescription] = (descCounts[page.metaDescription] || 0) + 1;
      }

      if (!page.canonicalUrl || !String(page.canonicalUrl).trim()) {
        issues.push({ auditRunId: run._id, pageUrl, pageId: page._id, issueType: ISSUE_TYPES.MISSING_CANONICAL, severity: 'info', message: 'No canonical URL set', recommendation: 'Set canonical to avoid duplicate content' });
        pageScore -= 5;
      }

      const robots = page.robotsDirectives || page.robots || '';
      if (robots.includes('noindex')) {
        issues.push({ auditRunId: run._id, pageUrl, pageId: page._id, issueType: ISSUE_TYPES.NOINDEX_ISSUE, severity: 'info', message: 'Page set to noindex', recommendation: 'Ensure this is intentional' });
      }

      if (!page.openGraph?.title && !page.ogTitle) {
        issues.push({ auditRunId: run._id, pageUrl, pageId: page._id, issueType: ISSUE_TYPES.MISSING_OG, severity: 'warning', message: 'Missing Open Graph title', recommendation: 'Add og:title for social sharing' });
        pageScore -= 5;
      }
      if (!page.structuredData || (typeof page.structuredData === 'object' && Object.keys(page.structuredData).length === 0)) {
        issues.push({ auditRunId: run._id, pageUrl, pageId: page._id, issueType: ISSUE_TYPES.MISSING_STRUCTURED_DATA, severity: 'info', message: 'No structured data (JSON-LD)', recommendation: 'Consider adding schema.org markup' });
        pageScore -= 3;
      }

      pageScore = Math.max(0, pageScore);
      totalScore += pageScore;
    }

    const dupTitles = Object.entries(titleCounts).filter(([, c]) => c > 1);
    const dupDescs = Object.entries(descCounts).filter(([, c]) => c > 1);
    for (const [title] of dupTitles) {
      issues.push({ auditRunId: run._id, pageUrl: '', issueType: ISSUE_TYPES.DUPLICATE_TITLE, severity: 'warning', message: `Duplicate title: "${title.slice(0, 40)}..."`, recommendation: 'Use unique titles per page' });
    }
    for (const [desc] of dupDescs) {
      issues.push({ auditRunId: run._id, pageUrl: '', issueType: ISSUE_TYPES.DUPLICATE_DESCRIPTION, severity: 'warning', message: 'Duplicate meta description', recommendation: 'Use unique descriptions per page' });
    }

    const criticalCount = issues.filter((i) => i.severity === 'critical').length;
    const warningCount = issues.filter((i) => i.severity === 'warning').length;
    const infoCount = issues.filter((i) => i.severity === 'info').length;
    const overallScore = pages.length > 0 ? Math.round(totalScore / pages.length) : 100;

    await seoAuditRepo.createIssuesBulk(issues);
    await seoAuditRepo.updateRun(run._id, {
      status: 'completed',
      finishedAt: new Date(),
      summary: {
        totalPages: pages.length,
        pagesWithIssues: new Set(issues.map((i) => i.pageId?.toString()).filter(Boolean)).size,
        overallScore,
        criticalCount,
        warningCount,
        infoCount,
      },
    });

    return seoAuditRepo.findRunById(run._id);
  } catch (err) {
    await seoAuditRepo.updateRun(run._id, { status: 'failed', finishedAt: new Date(), errorMessage: err.message });
    throw err;
  }
}

async function getRun(id) {
  const run = await seoAuditRepo.findRunById(id);
  if (!run) throw new AppError('Audit run not found', 404);
  return run;
}

async function listRuns(query) {
  return seoAuditRepo.findRunsPaginated({
    page: query.page,
    limit: query.limit,
    sort: query.sort || '-startedAt',
  });
}

async function getIssues(auditRunId, query) {
  const run = await seoAuditRepo.findRunById(auditRunId);
  if (!run) throw new AppError('Audit run not found', 404);
  const filter = query.severity ? { severity: query.severity } : {};
  return seoAuditRepo.findIssuesByRunId(auditRunId, filter);
}

async function resolveIssue(issueId, userId) {
  const updated = await seoAuditRepo.resolveIssue(issueId, userId);
  if (!updated) throw new AppError('Audit issue not found', 404);
  return updated;
}

async function scheduleAudit() {
  return { message: 'Scheduled audit not implemented; use POST /seo/audits/run for manual runs.' };
}

module.exports = {
  runAudit,
  getRun,
  listRuns,
  getIssues,
  resolveIssue,
  scheduleAudit,
};
