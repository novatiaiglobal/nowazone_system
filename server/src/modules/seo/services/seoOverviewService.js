const SeoPage = require('../models/SeoPage');
const SeoRedirect = require('../models/SeoRedirect');
const SeoKeyword = require('../models/SeoKeyword');
const seoPageRepo = require('../repositories/seoPageRepository');
const seoAuditRepo = require('../repositories/seoAuditRepository');
const sitemapRepo = require('../repositories/sitemapRepository');
const seoChangeLogRepo = require('../repositories/seoChangeLogRepository');

async function getOverview() {
  const [
    totalPages,
    publishedCount,
    draftCount,
    missingTitle,
    missingDescription,
    missingCanonical,
    missingStructuredData,
    redirectCount,
    keywordCount,
    latestAudit,
    changeLogRecent,
    sitemapConfig,
  ] = await Promise.all([
    SeoPage.countDocuments({ deletedAt: null }),
    seoPageRepo.countByStatus('published'),
    seoPageRepo.countByStatus('draft'),
    seoPageRepo.countMissing('title'),
    seoPageRepo.countMissing('metaDescription'),
    seoPageRepo.countMissing('canonicalUrl'),
    SeoPage.countDocuments({
      deletedAt: null,
      status: 'published',
      $or: [{ structuredData: null }, { structuredData: {} }],
    }),
    SeoRedirect.countDocuments(),
    SeoKeyword.countDocuments(),
    seoAuditRepo.findLatestRun(),
    seoChangeLogRepo.findRecent(15),
    sitemapRepo.getConfig(),
  ]);

  const inReview = await SeoPage.countDocuments({ deletedAt: null, status: 'review' });
  const approved = await SeoPage.countDocuments({ deletedAt: null, status: 'approved' });

  let topIssuesSummary = { critical: 0, warning: 0, info: 0 };
  if (latestAudit && latestAudit.summary) {
    topIssuesSummary = {
      critical: latestAudit.summary.criticalCount || 0,
      warning: latestAudit.summary.warningCount || 0,
      info: latestAudit.summary.infoCount || 0,
    };
  }

  return {
    totalManagedPages: totalPages,
    publishedPages: publishedCount,
    draftPages: draftCount,
    pagesInReview: inReview,
    pagesApproved: approved,
    pagesMissingMetadata: missingTitle + missingDescription,
    pagesMissingTitle: missingTitle,
    pagesMissingDescription: missingDescription,
    pagesMissingCanonical: missingCanonical,
    pagesMissingStructuredData: missingStructuredData,
    redirectStats: { total: redirectCount },
    keywordStats: { total: keywordCount },
    latestAuditSummary: latestAudit
      ? {
          id: latestAudit._id,
          startedAt: latestAudit.startedAt,
          status: latestAudit.status,
          overallScore: latestAudit.summary?.overallScore,
          criticalCount: latestAudit.summary?.criticalCount,
          warningCount: latestAudit.summary?.warningCount,
        }
      : null,
    topIssuesSummary,
    sitemapStatus: {
      lastGeneratedAt: sitemapConfig?.lastGeneratedAt || null,
      autoGenerate: sitemapConfig?.autoGenerate || false,
    },
    recentActivity: changeLogRecent,
  };
}

module.exports = { getOverview };
