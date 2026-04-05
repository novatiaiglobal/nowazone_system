/**
 * LEGACY: Replaced by split controllers (seoOverview, seoPage, seoKeyword, seoRedirect, seoAudit, sitemap, seoPublic).
 * Kept for reference only. Routes use the new controllers in seoRoutes.js.
 */
const SeoPage = require('../models/SeoPage');
const SeoRedirect = require('../models/SeoRedirect');
const SeoKeyword = require('../models/SeoKeyword');
const Settings = require('../../settings/models/Settings');
const { AppError } = require('../../../shared/middleware/errorHandler');

// ─── Public ─────────────────────────────────────────────────────────────────────

/** GET /api/seo/public?path=/about  — no auth */
exports.getPublicSeo = async (req, res, next) => {
    try {
        const { path } = req.query;
        if (!path) return next(new AppError('Query parameter "path" is required', 400));

        const entry = await SeoPage.findOne({ pagePath: path.toLowerCase(), isPublished: true })
            .select('-lastModifiedBy -__v')
            .lean();

        res.json({ status: 'success', data: entry || null });
    } catch (err) { next(err); }
};

// ─── Admin CRUD ─────────────────────────────────────────────────────────────────

/** GET /api/seo/pages */
exports.listPages = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = '',
            sort = '-updatedAt',
            isPublished,
        } = req.query;

        const filter = {};
        if (search) {
            filter.$or = [
                { pagePath: { $regex: search, $options: 'i' } },
                { metaTitle: { $regex: search, $options: 'i' } },
            ];
        }
        if (isPublished !== undefined) {
            filter.isPublished = isPublished === 'true';
        }

        const skip = (Math.max(Number(page), 1) - 1) * Number(limit);
        const [pages, total] = await Promise.all([
            SeoPage.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(Number(limit))
                .populate('lastModifiedBy', 'name email')
                .lean(),
            SeoPage.countDocuments(filter),
        ]);

        res.json({
            status: 'success',
            data: {
                pages,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit)),
                },
            },
        });
    } catch (err) { next(err); }
};

/** GET /api/seo/pages/:id */
exports.getPage = async (req, res, next) => {
    try {
        const entry = await SeoPage.findById(req.params.id)
            .populate('lastModifiedBy', 'name email');
        if (!entry) return next(new AppError('SEO page entry not found', 404));

        res.json({ status: 'success', data: entry });
    } catch (err) { next(err); }
};

/** POST /api/seo/pages */
exports.createPage = async (req, res, next) => {
    try {
        const payload = req.validated || req.body;
        const {
            pagePath, metaTitle, metaDescription, keywords,
            ogTitle, ogDescription, ogImage, ogType,
            canonicalUrl, robots, structuredData, isPublished,
        } = payload;

        const existing = await SeoPage.findOne({ pagePath: pagePath.toLowerCase() });
        if (existing) return next(new AppError('An SEO entry for this path already exists', 409));

        const entry = await SeoPage.create({
            pagePath, metaTitle, metaDescription, keywords,
            ogTitle, ogDescription, ogImage, ogType,
            canonicalUrl, robots, structuredData, isPublished,
            lastModifiedBy: req.user._id,
        });

        res.status(201).json({ status: 'success', data: entry });
    } catch (err) { next(err); }
};

/** PUT /api/seo/pages/:id */
exports.updatePage = async (req, res, next) => {
    try {
        const allowedFields = [
            'pagePath', 'metaTitle', 'metaDescription', 'keywords',
            'ogTitle', 'ogDescription', 'ogImage', 'ogType',
            'canonicalUrl', 'robots', 'structuredData', 'isPublished',
        ];
        const updates = {};
        const source = req.validated || req.body;
        for (const key of allowedFields) {
            if (source[key] !== undefined) updates[key] = source[key];
        }
        updates.lastModifiedBy = req.user._id;

        const entry = await SeoPage.findByIdAndUpdate(req.params.id, updates, {
            new: true,
            runValidators: true,
        }).populate('lastModifiedBy', 'name email');

        if (!entry) return next(new AppError('SEO page entry not found', 404));

        res.json({ status: 'success', data: entry });
    } catch (err) { next(err); }
};

/** DELETE /api/seo/pages/:id */
exports.deletePage = async (req, res, next) => {
    try {
        const entry = await SeoPage.findByIdAndDelete(req.params.id);
        if (!entry) return next(new AppError('SEO page entry not found', 404));

        res.json({ status: 'success', message: 'SEO page entry deleted' });
    } catch (err) { next(err); }
};

// ─── Dashboard stats ────────────────────────────────────────────────────────────

/** GET /api/seo/stats */
exports.getStats = async (req, res, next) => {
    try {
        const [total, published, draft, recentlyUpdated, totalRedirects, totalKeywords] = await Promise.all([
            SeoPage.countDocuments(),
            SeoPage.countDocuments({ isPublished: true }),
            SeoPage.countDocuments({ isPublished: false }),
            SeoPage.countDocuments({
                updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            }),
            SeoRedirect.countDocuments(),
            SeoKeyword.countDocuments(),
        ]);

        res.json({
            status: 'success',
            data: { total, published, draft, recentlyUpdated, totalRedirects, totalKeywords },
        });
    } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════════════════════
// SEO AUDIT
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /api/seo/audit */
exports.runAudit = async (req, res, next) => {
    try {
        const pages = await SeoPage.find().lean();
        const issues = [];
        let totalScore = 0;

        for (const page of pages) {
            const pageIssues = [];
            let pageScore = 100;

            // Critical checks (-15 each)
            if (!page.metaTitle || page.metaTitle.trim().length === 0) {
                pageIssues.push({ severity: 'critical', field: 'metaTitle', message: 'Missing meta title' });
                pageScore -= 15;
            } else if (page.metaTitle.length < 20) {
                pageIssues.push({ severity: 'warning', field: 'metaTitle', message: `Meta title too short (${page.metaTitle.length}/20 min chars)` });
                pageScore -= 8;
            } else if (page.metaTitle.length > 60) {
                pageIssues.push({ severity: 'warning', field: 'metaTitle', message: `Meta title too long (${page.metaTitle.length}/60 max chars)` });
                pageScore -= 5;
            }

            if (!page.metaDescription || page.metaDescription.trim().length === 0) {
                pageIssues.push({ severity: 'critical', field: 'metaDescription', message: 'Missing meta description' });
                pageScore -= 15;
            } else if (page.metaDescription.length < 50) {
                pageIssues.push({ severity: 'warning', field: 'metaDescription', message: `Meta description too short (${page.metaDescription.length}/50 min chars)` });
                pageScore -= 8;
            } else if (page.metaDescription.length > 160) {
                pageIssues.push({ severity: 'warning', field: 'metaDescription', message: `Meta description too long (${page.metaDescription.length}/160 max chars)` });
                pageScore -= 5;
            }

            // Important checks (-10 each)
            if (!page.keywords || page.keywords.length === 0) {
                pageIssues.push({ severity: 'warning', field: 'keywords', message: 'No keywords defined' });
                pageScore -= 10;
            }
            if (!page.canonicalUrl) {
                pageIssues.push({ severity: 'info', field: 'canonicalUrl', message: 'No canonical URL set' });
                pageScore -= 5;
            }

            // OG checks (-8 each)
            if (!page.ogTitle) {
                pageIssues.push({ severity: 'warning', field: 'ogTitle', message: 'Missing Open Graph title' });
                pageScore -= 8;
            }
            if (!page.ogDescription) {
                pageIssues.push({ severity: 'warning', field: 'ogDescription', message: 'Missing Open Graph description' });
                pageScore -= 8;
            }
            if (!page.ogImage) {
                pageIssues.push({ severity: 'info', field: 'ogImage', message: 'No Open Graph image set' });
                pageScore -= 5;
            }

            // Structured data check
            if (!page.structuredData) {
                pageIssues.push({ severity: 'info', field: 'structuredData', message: 'No structured data (JSON-LD)' });
                pageScore -= 5;
            }

            // Robots check
            if (page.robots && page.robots.includes('noindex')) {
                pageIssues.push({ severity: 'info', field: 'robots', message: 'Page set to noindex' });
            }

            pageScore = Math.max(0, pageScore);
            totalScore += pageScore;

            if (pageIssues.length > 0) {
                issues.push({
                    pageId: page._id,
                    pagePath: page.pagePath,
                    score: pageScore,
                    issues: pageIssues,
                });
            }
        }

        const overallScore = pages.length > 0 ? Math.round(totalScore / pages.length) : 100;

        // Count by severity
        const allIssues = issues.flatMap(p => p.issues);
        const summary = {
            overallScore,
            totalPages: pages.length,
            pagesWithIssues: issues.length,
            critical: allIssues.filter(i => i.severity === 'critical').length,
            warnings: allIssues.filter(i => i.severity === 'warning').length,
            info: allIssues.filter(i => i.severity === 'info').length,
        };

        // Sort by score ascending (worst pages first)
        issues.sort((a, b) => a.score - b.score);

        res.json({ status: 'success', data: { summary, issues } });
    } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════════════════════
// REDIRECTS
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /api/seo/redirects/list — public, no auth. Returns active redirects for middleware. */
exports.listRedirectsPublic = async (req, res, next) => {
    try {
        const redirects = await SeoRedirect.find({ isActive: true })
            .select('fromPath toPath type')
            .lean();
        res.json({ status: 'success', data: redirects });
    } catch (err) { next(err); }
};

/** GET /api/seo/redirects */
exports.listRedirects = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, search = '', sort = '-updatedAt' } = req.query;
        const filter = {};
        if (search) {
            filter.$or = [
                { fromPath: { $regex: search, $options: 'i' } },
                { toPath: { $regex: search, $options: 'i' } },
            ];
        }
        const skip = (Math.max(Number(page), 1) - 1) * Number(limit);
        const [redirects, total] = await Promise.all([
            SeoRedirect.find(filter).sort(sort).skip(skip).limit(Number(limit))
                .populate('createdBy', 'name').lean(),
            SeoRedirect.countDocuments(filter),
        ]);
        res.json({
            status: 'success',
            data: {
                redirects,
                pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
            },
        });
    } catch (err) { next(err); }
};

/** POST /api/seo/redirects */
exports.createRedirect = async (req, res, next) => {
    try {
        const { fromPath, toPath, type, isActive, note } = req.validated || req.body;

        const existing = await SeoRedirect.findOne({ fromPath });
        if (existing) return next(new AppError('A redirect for this path already exists', 409));

        const entry = await SeoRedirect.create({ fromPath, toPath, type, isActive, note, createdBy: req.user._id });
        res.status(201).json({ status: 'success', data: entry });
    } catch (err) { next(err); }
};

/** PUT /api/seo/redirects/:id */
exports.updateRedirect = async (req, res, next) => {
    try {
        const allowedFields = ['fromPath', 'toPath', 'type', 'isActive', 'note'];
        const updates = {};
        const source = req.validated || req.body;
        for (const key of allowedFields) {
            if (source[key] !== undefined) updates[key] = source[key];
        }
        const entry = await SeoRedirect.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
        if (!entry) return next(new AppError('Redirect not found', 404));
        res.json({ status: 'success', data: entry });
    } catch (err) { next(err); }
};

/** DELETE /api/seo/redirects/:id */
exports.deleteRedirect = async (req, res, next) => {
    try {
        const entry = await SeoRedirect.findByIdAndDelete(req.params.id);
        if (!entry) return next(new AppError('Redirect not found', 404));
        res.json({ status: 'success', message: 'Redirect deleted' });
    } catch (err) { next(err); }
};

/** POST /api/seo/redirects/record-hit — public, no auth. Call when a redirect is applied (e.g. from middleware). */
exports.recordRedirectHit = async (req, res, next) => {
    try {
        const { fromPath } = req.body || {};
        if (!fromPath || typeof fromPath !== 'string') {
            return res.status(400).json({ status: 'fail', message: 'fromPath is required' });
        }
        const entry = await SeoRedirect.findOneAndUpdate(
            { fromPath: fromPath.trim(), isActive: true },
            { $inc: { hitCount: 1 }, $set: { lastHitAt: new Date() } },
            { new: true }
        );
        if (!entry) return res.status(404).json({ status: 'fail', message: 'Redirect not found' });
        res.json({ status: 'success', data: { hitCount: entry.hitCount } });
    } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════════════════════
// KEYWORDS
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /api/seo/keywords */
exports.listKeywords = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, search = '', sort = '-updatedAt', status } = req.query;
        const filter = {};
        if (search) {
            filter.$or = [
                { keyword: { $regex: search, $options: 'i' } },
                { pagePath: { $regex: search, $options: 'i' } },
            ];
        }
        if (status) filter.status = status;

        const skip = (Math.max(Number(page), 1) - 1) * Number(limit);
        const [keywords, total] = await Promise.all([
            SeoKeyword.find(filter).sort(sort).skip(skip).limit(Number(limit))
                .populate('createdBy', 'name').lean(),
            SeoKeyword.countDocuments(filter),
        ]);
        res.json({
            status: 'success',
            data: {
                keywords,
                pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
            },
        });
    } catch (err) { next(err); }
};

/** GET /api/seo/keywords/stats */
exports.getKeywordStats = async (req, res, next) => {
    try {
        const [total, tracking, ranked, lost, newKw] = await Promise.all([
            SeoKeyword.countDocuments(),
            SeoKeyword.countDocuments({ status: 'tracking' }),
            SeoKeyword.countDocuments({ status: 'ranked' }),
            SeoKeyword.countDocuments({ status: 'lost' }),
            SeoKeyword.countDocuments({ status: 'new' }),
        ]);
        const avgDifficulty = await SeoKeyword.aggregate([{ $group: { _id: null, avg: { $avg: '$difficulty' } } }]);
        res.json({
            status: 'success',
            data: { total, tracking, ranked, lost, new: newKw, avgDifficulty: Math.round(avgDifficulty[0]?.avg || 0) },
        });
    } catch (err) { next(err); }
};

/** POST /api/seo/keywords */
exports.createKeyword = async (req, res, next) => {
    try {
        const { keyword, pagePath, searchVolume, difficulty, currentRank, status, notes } = req.validated || req.body;

        const entry = await SeoKeyword.create({
            keyword, pagePath, searchVolume, difficulty, currentRank, status, notes, createdBy: req.user._id,
        });
        res.status(201).json({ status: 'success', data: entry });
    } catch (err) { next(err); }
};

/** PUT /api/seo/keywords/:id */
exports.updateKeyword = async (req, res, next) => {
    try {
        const allowedFields = ['keyword', 'pagePath', 'searchVolume', 'difficulty', 'currentRank', 'previousRank', 'status', 'notes'];
        const updates = {};
        const source = req.validated || req.body;
        for (const key of allowedFields) {
            if (source[key] !== undefined) updates[key] = source[key];
        }
        const entry = await SeoKeyword.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
        if (!entry) return next(new AppError('Keyword not found', 404));
        res.json({ status: 'success', data: entry });
    } catch (err) { next(err); }
};

/** DELETE /api/seo/keywords/:id */
exports.deleteKeyword = async (req, res, next) => {
    try {
        const entry = await SeoKeyword.findByIdAndDelete(req.params.id);
        if (!entry) return next(new AppError('Keyword not found', 404));
        res.json({ status: 'success', message: 'Keyword deleted' });
    } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ROBOTS.TXT
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /api/seo/robots.txt — returns robots.txt content for crawlers (public, no auth) */
exports.getRobotsTxt = async (req, res, next) => {
    try {
        const baseUrl = (process.env.CLIENT_URL || 'https://example.com').replace(/\/$/, '');
        const sitemapUrl = `${baseUrl}/api/seo/sitemap.xml`;

        const settings = await Settings.findOne().select('seo').lean();
        const seo = settings?.seo || {};
        const allowIndexing = seo.allowIndexing !== false;

        let body = 'User-agent: *\n';
        body += allowIndexing ? 'Allow: /\n' : 'Disallow: /\n';
        body += `\nSitemap: ${sitemapUrl}\n`;

        res.set('Content-Type', 'text/plain');
        res.send(body);
    } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════════════════════════
// SITEMAP
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /api/seo/sitemap/preview — generate sitemap XML preview from published pages */
exports.getSitemapPreview = async (req, res, next) => {
    try {
        const baseUrl = req.query.baseUrl || process.env.CLIENT_URL || 'https://example.com';
        const pages = await SeoPage.find({ isPublished: true }).select('pagePath updatedAt robots').lean();

        const urls = pages
            .filter(p => !p.robots || !p.robots.includes('noindex'))
            .map(p => ({
                loc: `${baseUrl.replace(/\/$/, '')}${p.pagePath}`,
                lastmod: p.updatedAt ? new Date(p.updatedAt).toISOString().split('T')[0] : undefined,
                changefreq: 'weekly',
                priority: p.pagePath === '/' ? '1.0' : '0.8',
            }));

        // Build XML
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
        for (const url of urls) {
            xml += '  <url>\n';
            xml += `    <loc>${url.loc}</loc>\n`;
            if (url.lastmod) xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
            xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
            xml += `    <priority>${url.priority}</priority>\n`;
            xml += '  </url>\n';
        }
        xml += '</urlset>';

        res.json({
            status: 'success',
            data: {
                totalUrls: urls.length,
                excludedNoindex: pages.length - urls.length,
                xml,
                urls,
            },
        });
    } catch (err) { next(err); }
};

/** GET /api/seo/sitemap.xml — returns actual XML for crawler consumption */
exports.getSitemapXml = async (req, res, next) => {
    try {
        const baseUrl = process.env.CLIENT_URL || 'https://example.com';
        const pages = await SeoPage.find({ isPublished: true }).select('pagePath updatedAt robots').lean();

        const urls = pages.filter(p => !p.robots || !p.robots.includes('noindex'));

        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
        for (const p of urls) {
            xml += '  <url>\n';
            xml += `    <loc>${baseUrl.replace(/\/$/, '')}${p.pagePath}</loc>\n`;
            if (p.updatedAt) xml += `    <lastmod>${new Date(p.updatedAt).toISOString().split('T')[0]}</lastmod>\n`;
            xml += '    <changefreq>weekly</changefreq>\n';
            xml += `    <priority>${p.pagePath === '/' ? '1.0' : '0.8'}</priority>\n`;
            xml += '  </url>\n';
        }
        xml += '</urlset>';

        res.set('Content-Type', 'application/xml');
        res.send(xml);
    } catch (err) { next(err); }
};

