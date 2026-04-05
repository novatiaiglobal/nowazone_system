const nodemailer = require('nodemailer');

let transporter = null;

const hasSmtpConfig = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS);

const getTransporter = () => {
  if (transporter) return transporter;
  if (!hasSmtpConfig()) return null;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
};

const getFromAddress = () =>
  process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@nowazone.local';

const sendMail = async ({ to, subject, html, text }) => {
  const tx = getTransporter();
  if (!tx) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[EmailService] SMTP not configured. Skipping email send.');
    }
    return { sent: false };
  }

  await tx.sendMail({
    from: getFromAddress(),
    to,
    subject,
    html,
    text,
  });

  return { sent: true };
};

const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  const subject = 'Reset your NowAZone password';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color:#0f172a;">Password Reset Request</h2>
      <p>Hello ${name || 'there'},</p>
      <p>We received a request to reset your password. Click the button below to continue:</p>
      <p style="margin:24px 0;">
        <a href="${resetUrl}" style="background:#22d3ee;color:#0f172a;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700;">
          Reset Password
        </a>
      </p>
      <p>If the button doesn't work, copy this link:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p style="color:#64748b;">This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
    </div>
  `;
  const text = `Reset your password using this link: ${resetUrl}`;
  return sendMail({ to, subject, html, text });
};

const send2FACodeEmail = async ({ to, name, code }) => {
  const subject = 'Your NowAZone verification code';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color:#0f172a;">Two-Factor Verification</h2>
      <p>Hello ${name || 'there'},</p>
      <p>Your verification code is:</p>
      <p style="font-size:28px;font-weight:800;letter-spacing:6px;color:#0f172a;">${code}</p>
      <p style="color:#64748b;">This code expires in 10 minutes.</p>
    </div>
  `;
  const text = `Your verification code is ${code}. It expires in 10 minutes.`;
  return sendMail({ to, subject, html, text });
};

const STATUS_MESSAGES = {
  interview: {
    subject: 'You\'ve been shortlisted for an interview',
    body:    (name, jobTitle) =>
      `<p>Congratulations ${name}! We are pleased to inform you that your application for <strong>${jobTitle}</strong> has been moved to the interview stage. Our team will reach out shortly with further details.</p>`,
    text:    (name, jobTitle) =>
      `Congratulations ${name}! Your application for ${jobTitle} has been moved to the interview stage. Our team will reach out shortly.`,
  },
  selected: {
    subject: 'Offer: You have been selected!',
    body:    (name, jobTitle) =>
      `<p>Dear ${name},</p><p>We are delighted to inform you that you have been <strong>selected</strong> for the position of <strong>${jobTitle}</strong>. Welcome aboard! You will receive an offer letter and further instructions from our HR team soon.</p>`,
    text:    (name, jobTitle) =>
      `Dear ${name}, you have been selected for ${jobTitle}. Welcome aboard! You will receive an offer letter soon.`,
  },
  rejected: {
    subject: 'Update on your application',
    body:    (name, jobTitle) =>
      `<p>Dear ${name},</p><p>Thank you for your interest in the <strong>${jobTitle}</strong> position. After careful consideration, we have decided to move forward with other candidates. We appreciate your time and encourage you to apply for future openings that match your profile.</p>`,
    text:    (name, jobTitle) =>
      `Dear ${name}, thank you for applying for ${jobTitle}. Unfortunately, we have moved forward with other candidates. We wish you all the best.`,
  },
};

const sendApplicationStatusEmail = async ({ to, name, status, jobTitle }) => {
  const template = STATUS_MESSAGES[status];
  if (!template) return { sent: false };

  const subject = template.subject;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color:#0f172a;">${subject}</h2>
      ${template.body(name || 'Applicant', jobTitle)}
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
      <p style="color:#64748b;font-size:12px;">This is an automated email from NowAZone HR. Please do not reply directly to this message.</p>
    </div>
  `;
  const text = template.text(name || 'Applicant', jobTitle);
  return sendMail({ to, subject, html, text });
};

const sendNewsletterEmail = async ({ to, subject, html, text }) =>
  sendMail({ to, subject, html, text });

module.exports = {
  sendPasswordResetEmail,
  send2FACodeEmail,
  sendApplicationStatusEmail,
  sendNewsletterEmail,
};
