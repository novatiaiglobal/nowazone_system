const https = require('https');

/**
 * External CRM integration service.
 *
 * Currently supports HubSpot via private app token.
 *
 * Env vars:
 * - CRM_PROVIDER=hubspot
 * - HUBSPOT_PRIVATE_TOKEN=<hubspot private app access token>
 */

const PROVIDER = () => (process.env.CRM_PROVIDER || 'hubspot').toLowerCase();
const HUBSPOT_TOKEN = () => process.env.HUBSPOT_PRIVATE_TOKEN;

const isHubSpotEnabled = () => PROVIDER() === 'hubspot' && !!HUBSPOT_TOKEN();

/**
 * Sync a lead to the configured external CRM.
 * Returns { provider, externalId } on success, or null if disabled.
 *
 * This function is best-effort and should not break core lead creation.
 *
 * @param {import('../models/Lead')} leadDoc - Mongoose Lead document or plain object
 */
async function syncLead(leadDoc) {
  if (!isHubSpotEnabled()) {
    return null;
  }

  if (!leadDoc || !leadDoc.email) {
    return null;
  }

  if (PROVIDER() === 'hubspot') {
    return hubSpotSyncLead(leadDoc);
  }

  return null;
}

/**
 * Create or update a HubSpot contact from a Lead.
 * Uses /crm/v3/objects/contacts with a private app token.
 */
function hubSpotSyncLead(lead) {
  const payload = {
    properties: {
      email:     lead.email,
      firstname: lead.name || undefined,
      phone:     lead.phone || undefined,
      company:   lead.company || undefined,
      lead_source: lead.source || 'website',
      lead_status: lead.status || 'new',
    },
  };

  const body = JSON.stringify(payload);

  const options = {
    hostname: 'api.hubspot.com',
    path: '/crm/v3/objects/contacts',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HUBSPOT_TOKEN()}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          if (res.statusCode >= 200 && res.statusCode < 300 && parsed.id) {
            resolve({
              provider: 'hubspot',
              externalId: String(parsed.id),
            });
          } else {
            const message = parsed?.message || `HubSpot sync failed with status ${res.statusCode}`;
            const err = new Error(message);
            err.statusCode = res.statusCode;
            err.response = parsed;
            reject(err);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = {
  syncLead,
};

