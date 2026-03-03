/**
 * Naukri B2B Job Posting Integration
 *
 * Uses API key + secret (HMAC-SHA256) authentication.
 * No OAuth required — direct API call.
 *
 * Env vars:  NAUKRI_API_KEY, NAUKRI_API_SECRET
 */

const https  = require('https');
const crypto = require('crypto');

const API_KEY    = () => process.env.NAUKRI_API_KEY;
const API_SECRET = () => process.env.NAUKRI_API_SECRET;
const BASE_HOST  = 'recruit.naukri.com';

const buildSignature = (body) => {
  return crypto
    .createHmac('sha256', API_SECRET())
    .update(body)
    .digest('hex');
};

const postJob = async (jobData) => {
  if (!API_KEY() || !API_SECRET()) {
    throw new Error('Naukri API credentials not configured (NAUKRI_API_KEY, NAUKRI_API_SECRET)');
  }

  const payload = {
    jobTitle:    jobData.title,
    jobDesc:     jobData.description || '',
    cityName:    jobData.location    || '',
    jobType:     jobData.type        || 'Permanent',
    experience:  { min: 0, max: 10 },
  };

  const body      = JSON.stringify(payload);
  const signature = buildSignature(body);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: BASE_HOST,
        path:     '/api/v1/jobs',
        method:   'POST',
        headers:  {
          'X-Api-Key':    API_KEY(),
          'X-Signature':  signature,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end',  ()  => {
          try { resolve({ statusCode: res.statusCode, data: JSON.parse(data || '{}') }); }
          catch { resolve({ statusCode: res.statusCode, data: {} }); }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
};

module.exports = { postJob };
