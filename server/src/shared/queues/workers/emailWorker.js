const { Worker } = require('bullmq');
const { createBullConnection } = require('../connection');
const {
  send2FACodeEmail,
  sendPasswordResetEmail,
  sendApplicationStatusEmail,
  sendNewsletterEmail,
} = require('../../services/emailService');

const EMAIL_QUEUE_NAME = 'email';

const connection = createBullConnection();

async function processEmailJob(job) {
  const { type, ...payload } = job.data;

  switch (type) {
    case '2fa':
      return send2FACodeEmail({
        to: payload.to,
        name: payload.name,
        code: payload.code,
      });
    case 'password_reset':
      return sendPasswordResetEmail({
        to: payload.to,
        name: payload.name,
        resetUrl: payload.resetUrl,
      });
    case 'application_status':
      return sendApplicationStatusEmail({
        to: payload.to,
        name: payload.name,
        status: payload.status,
        jobTitle: payload.jobTitle,
      });
    case 'newsletter':
      return sendNewsletterEmail({
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });
    default:
      console.warn(`[EmailWorker] Unknown job type: ${type}`);
  }
}

function startEmailWorker() {
  const worker = new Worker(EMAIL_QUEUE_NAME, processEmailJob, {
    connection,
    concurrency: 5,
  });

  worker.on('completed', (job) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[EmailWorker] Job ${job.id} (${job.name}) completed`);
    }
  });

  worker.on('failed', (job, err) => {
    console.error(`[EmailWorker] Job ${job?.id} (${job?.name}) failed:`, err.message);
  });

  return worker;
}

module.exports = { startEmailWorker };
