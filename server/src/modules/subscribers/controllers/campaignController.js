const Campaign = require('../models/Campaign');
const Subscriber = require('../models/Subscriber');
const { AppError } = require('../../../shared/middleware/errorHandler');
const { addEmailJob } = require('../../../shared/queues/emailQueue');

let OpenAI;
try {
  // Optional dependency, same pattern as resume parser
  OpenAI = require('openai');
} catch {
  OpenAI = null;
}

exports.createCampaign = async (req, res, next) => {
  try {
    const { name, subject, html, text, filters } = req.body;
    if (!name || !subject || !html) {
      return next(new AppError('name, subject and html are required', 400));
    }

    const campaign = await Campaign.create({
      name,
      subject,
      html,
      text: text || undefined,
      filters: {
        statuses: filters?.statuses || ['active'],
        tags: filters?.tags || [],
        countries: filters?.countries || [],
      },
      createdBy: req.user._id,
    });

    res.status(201).json({ status: 'success', data: { campaign } });
  } catch (err) {
    next(err);
  }
};

exports.listCampaigns = async (req, res, next) => {
  try {
    const campaigns = await Campaign.find().sort('-createdAt').limit(100);
    res.json({ status: 'success', data: { campaigns } });
  } catch (err) {
    next(err);
  }
};

exports.getCampaign = async (req, res, next) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return next(new AppError('Campaign not found', 404));
    res.json({ status: 'success', data: { campaign } });
  } catch (err) {
    next(err);
  }
};

exports.sendCampaign = async (req, res, next) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return next(new AppError('Campaign not found', 404));
    if (campaign.status === 'sent') {
      return next(new AppError('Campaign already sent', 400));
    }

    const filter = { status: 'active' };
    const { statuses, tags, countries } = campaign.filters || {};

    if (Array.isArray(statuses) && statuses.length) {
      filter.status = { $in: statuses };
    }
    if (Array.isArray(tags) && tags.length) {
      filter.tags = { $in: tags };
    }
    if (Array.isArray(countries) && countries.length) {
      filter.country = { $in: countries };
    }

    const subscribers = await Subscriber.find(filter).select('email name');
    if (!subscribers.length) {
      return next(new AppError('No subscribers match the campaign filters', 400));
    }

    const recipients = subscribers.map((s) => ({
      subscriber: s._id,
      email: s.email,
      status: 'queued',
    }));

    campaign.recipients = recipients;
    campaign.stats.totalRecipients = recipients.length;
    campaign.status = 'sending';
    campaign.sentAt = new Date();
    await campaign.save();

    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const apiBase = process.env.API_BASE_URL || 'http://localhost:5000/api';

    for (const r of campaign.recipients) {
      const openUrl = `${apiBase}/subscribers/campaigns/${campaign._id}/open.gif?rid=${r._id}`;
      const htmlWithTracking = `${campaign.html}
<img src="${openUrl}" width="1" height="1" style="display:none;opacity:0;" alt="" />`;

      await addEmailJob('newsletter', {
        to: r.email,
        subject: campaign.subject,
        html: htmlWithTracking,
        text: campaign.text || undefined,
      });
    }

    res.json({
      status: 'success',
      message: `Campaign queued for ${recipients.length} subscribers`,
      data: { campaignId: campaign._id, totalRecipients: recipients.length },
    });
  } catch (err) {
    next(err);
  }
};

exports.trackOpen = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rid } = req.query;
    const campaign = await Campaign.findById(id);
    if (!campaign || !rid) {
      return res.status(204).end();
    }

    const recipient = campaign.recipients.id(rid);
    if (recipient && !recipient.openedAt) {
      recipient.openedAt = new Date();
      campaign.stats.openCount += 1;
      await campaign.save({ validateBeforeSave: false });
    }

    const gif = Buffer.from(
      'R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
      'base64'
    );
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Content-Length', gif.length);
    return res.status(200).end(gif);
  } catch {
    return res.status(204).end();
  }
};

exports.generateWithAI = async (req, res, next) => {
  try {
    const { brief, tone, type } = req.body || {};

    if (!OpenAI || !process.env.OPENAI_API_KEY) {
      return next(new AppError('AI generation is not configured on the server', 503));
    }

    if (!brief || typeof brief !== 'string' || !brief.trim()) {
      return next(new AppError('brief is required', 400));
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `
You are helping generate a short marketing email campaign for NowAZone's B2B services.

Constraints:
- Audience: professional business users and decision makers.
- Write clear, concise copy in one language (no mixing).
- Return simple HTML that works well in most email clients (basic tables / divs, no external CSS).
- Avoid inline images. Use headings and paragraphs only.

Input:
- Brief / goal: ${brief}
- Tone: ${tone || 'professional and friendly'}
- Template type: ${type || 'general_newsletter'}

Output:
Return ONLY a valid JSON object with:
- subject: string
- html: string (email HTML body)
- text: string (plain-text version)
    `.trim();

    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 900,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    const subject = typeof parsed.subject === 'string' && parsed.subject.trim()
      ? parsed.subject.trim()
      : 'Your latest update from NowAZone';

    const html = typeof parsed.html === 'string' && parsed.html.trim()
      ? parsed.html
      : `<h1>${subject}</h1><p>${brief}</p>`;

    const text = typeof parsed.text === 'string' && parsed.text.trim()
      ? parsed.text
      : `${subject}\n\n${brief}`;

    res.json({
      status: 'success',
      data: { subject, html, text },
    });
  } catch (err) {
    next(err);
  }
};

