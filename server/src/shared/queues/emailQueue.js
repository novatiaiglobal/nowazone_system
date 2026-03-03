const { Queue } = require('bullmq');
const { createBullConnection } = require('./connection');

const EMAIL_QUEUE_NAME = 'email';

const connection = createBullConnection();

const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 500 },
  },
});

/**
 * Add an email job to the queue (non-blocking).
 * @param {string} type - '2fa' | 'password_reset' | 'application_status' | 'welcome'
 * @param {object} payload - Data for the email template
 */
async function addEmailJob(type, payload) {
  await emailQueue.add(type, { type, ...payload }, { jobId: undefined });
}

module.exports = { emailQueue, addEmailJob };
