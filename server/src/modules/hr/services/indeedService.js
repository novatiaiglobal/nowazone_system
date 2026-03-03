/**
 * Indeed Job Posting Integration
 *
 * OAuth 2.0 flow using Indeed's Publisher API.
 * Tokens stored per user in Redis: indeed:token:{userId}
 */

const https = require('https');
const querystring = require('querystring');
let redisClient;
try { redisClient = require('../../../shared/config/redis'); } catch { redisClient = null; }

const CLIENT_ID     = () => process.env.INDEED_CLIENT_ID;
const CLIENT_SECRET = () => process.env.INDEED_CLIENT_SECRET;
const REDIRECT_URI  = () => process.env.INDEED_REDIRECT_URI;

const getAuthUrl = (state) => {
  const params = querystring.stringify({
    response_type: 'code',
    client_id:     CLIENT_ID(),
    redirect_uri:  REDIRECT_URI(),
    state,
    scope:         'employer.jobs.write employer.jobs.read',
  });
  return `https://secure.indeed.com/oauth/v2/authorize?${params}`;
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
        hostname: 'apis.indeed.com',
        path:     '/oauth/v2/tokens',
        method:   'POST',
        headers:  { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end',  ()  => {
          try { resolve(JSON.parse(data)); } catch { reject(new Error('Failed to parse Indeed token response')); }
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
  await redisClient.setex(`indeed:token:${userId}`, ttl, JSON.stringify(token));
};

const getToken = async (userId) => {
  if (!redisClient) return null;
  const raw = await redisClient.get(`indeed:token:${userId}`);
  return raw ? JSON.parse(raw) : null;
};

const postJob = async (userId, jobData) => {
  const token = await getToken(userId);
  if (!token?.access_token) throw new Error('Indeed not connected for this user');

  const body = JSON.stringify({
    title:       jobData.title,
    description: jobData.description || '',
    location:    jobData.location    || '',
    jobType:     'FULLTIME',
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'apis.indeed.com',
        path:     '/v1/jobs',
        method:   'POST',
        headers:  {
          Authorization:  `Bearer ${token.access_token}`,
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

module.exports = { getAuthUrl, exchangeCode, storeToken, getToken, postJob };
