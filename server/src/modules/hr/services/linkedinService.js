/**
 * LinkedIn Job Posting Integration
 *
 * OAuth 2.0 3-legged flow using LinkedIn's Job Postings API.
 * Tokens are stored per user in Redis: linkedin:token:{userId}
 */

const https = require('https');
const querystring = require('querystring');
let redisClient;
try { redisClient = require('../../../shared/config/redis'); } catch { redisClient = null; }

const CLIENT_ID     = () => process.env.LINKEDIN_CLIENT_ID;
const CLIENT_SECRET = () => process.env.LINKEDIN_CLIENT_SECRET;
const REDIRECT_URI  = () => process.env.LINKEDIN_REDIRECT_URI;
const SCOPES        = ['r_liteprofile', 'r_emailaddress', 'w_member_social', 'w_job_postings'].join(' ');

const getAuthUrl = (state) => {
  const params = querystring.stringify({
    response_type: 'code',
    client_id:     CLIENT_ID(),
    redirect_uri:  REDIRECT_URI(),
    state,
    scope: SCOPES,
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
};

const exchangeCode = async (code) => {
  const body = querystring.stringify({
    grant_type:    'authorization_code',
    code,
    redirect_uri:  REDIRECT_URI(),
    client_id:     CLIENT_ID(),
    client_secret: CLIENT_SECRET(),
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'www.linkedin.com',
        path:     '/oauth/v2/accessToken',
        method:   'POST',
        headers:  { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end',  ()  => {
          try { resolve(JSON.parse(data)); } catch { reject(new Error('Failed to parse LinkedIn token response')); }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
};

const storeToken = async (userId, token) => {
  if (!redisClient) return;
  const ttl = token.expires_in || 3600;
  await redisClient.setex(`linkedin:token:${userId}`, ttl, JSON.stringify(token));
};

const getToken = async (userId) => {
  if (!redisClient) return null;
  const raw = await redisClient.get(`linkedin:token:${userId}`);
  return raw ? JSON.parse(raw) : null;
};

const postJob = async (userId, jobData) => {
  const token = await getToken(userId);
  if (!token?.access_token) throw new Error('LinkedIn not connected for this user');

  const body = JSON.stringify({
    title:       { localized: { en_US: jobData.title } },
    description: { localized: { en_US: jobData.description || '' } },
    employmentType: 'FULL_TIME',
    jobPostingOperationType: 'CREATE',
    listedAt: Date.now(),
    location: { country: 'US', city: jobData.location || '' },
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.linkedin.com',
        path:     '/v2/simpleJobPostings',
        method:   'POST',
        headers:  {
          Authorization:  `Bearer ${token.access_token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'X-Restli-Protocol-Version': '2.0.0',
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

module.exports = { getAuthUrl, exchangeCode, storeToken, getToken, postJob };
