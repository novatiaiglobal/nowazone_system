/**
 * Job hiring flow: when someone is marked as hired:
 * 1. Send AI-generated welcome email to the hired candidate
 * 2. Send rejection emails to other applicants for that job
 * 3. Close the job posting
 */
const Application = require('../../modules/jobs/models/Application');
const Job = require('../../modules/jobs/models/Job');
const { addEmailJob } = require('../queues/emailQueue');
const emailService = require('./emailService');

let OpenAI;
try {
  OpenAI = require('openai');
} catch {
  OpenAI = null;
}

async function generateWelcomeEmailWithAI({ applicantName, jobTitle, department, location, coverLetter, skills, experience, currentCompany }) {
  if (!OpenAI || !process.env.OPENAI_API_KEY) return null;

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const context = [
    coverLetter && `Cover letter / proposal: ${coverLetter.slice(0, 800)}`,
    skills?.length && `Skills: ${skills.join(', ')}`,
    experience && `Experience: ${experience}`,
    currentCompany && `Current company: ${currentCompany}`,
  ].filter(Boolean).join('\n');

  const prompt = `You are writing a warm, professional welcome email for a new hire at NowAZone (a technology & AI company).

Write a personalized email that:
- Addresses the candidate by their first name (${applicantName?.split(' ')[0] || applicantName})
- Congratulates them on being hired for the position: ${jobTitle}${department ? ` (${department})` : ''}${location ? ` in ${location}` : ''}
- Briefly references something from their application to show it was read (their proposal, skills, or experience) - be natural, not robotic
- Welcomes them to the team and sets a positive tone
- Is 2-4 short paragraphs, human and warm, not corporate-speak
- Signs off from "The NowAZone Team"

Candidate context from their application:
${context || 'No additional context provided.'}

Return ONLY a valid JSON object:
{
  "subject": "string (e.g. Welcome to NowAZone - You're hired!)",
  "html": "string (simple HTML: <p> tags, <strong>, no external CSS)",
  "text": "string (plain text version)"
}`;

  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);
    if (parsed.subject && parsed.html) {
      return { subject: parsed.subject, html: parsed.html, text: parsed.text || parsed.html.replace(/<[^>]+>/g, '') };
    }
  } catch (err) {
    console.error('[JobHiring] AI welcome email generation failed:', err.message);
  }
  return null;
}

function getFallbackWelcomeEmail({ applicantName, jobTitle, department }) {
  const firstName = applicantName?.split(' ')[0] || applicantName || 'there';
  const subject = `Welcome to NowAZone — You're hired!`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color:#0f172a;">Congratulations, ${firstName}!</h2>
      <p>We are thrilled to welcome you to the NowAZone team.</p>
      <p>Your application for the <strong>${jobTitle}</strong> position${department ? ` in our ${department} team` : ''} stood out, and we are excited to have you on board.</p>
      <p>Our HR team will reach out shortly with your offer letter, onboarding details, and next steps. We look forward to working with you.</p>
      <p>Welcome aboard!</p>
      <p style="color:#64748b;font-size:12px;margin-top:24px;">— The NowAZone Team</p>
    </div>
  `;
  const text = `Congratulations ${firstName}! You've been hired for ${jobTitle}. Our HR team will reach out with next steps. Welcome to NowAZone!`;
  return { subject, html, text };
}

async function queueOrSendEmail(type, payload) {
  try {
    await addEmailJob(type, payload);
  } catch (err) {
    if (type === 'newsletter' && payload.html) {
      emailService.sendNewsletterEmail?.(payload).catch(() => {});
    } else if (type === 'application_status') {
      emailService.sendApplicationStatusEmail?.(payload).catch(() => {});
    }
  }
}

/**
 * Called when an application is moved to 'hired'.
 * Sends welcome email. Rejects others and closes job only when all positions are filled.
 * @returns {{ jobClosed: boolean, positionsFilled: number, totalPositions: number }}
 */
async function onHired(applicationId) {
  const result = { jobClosed: false, positionsFilled: 0, totalPositions: 1 };
  try {
    const application = await Application.findById(applicationId)
      .populate('job', 'title department location positions');
    if (!application || application.status !== 'hired') return;

    const job = application.job;
    const jobId = application.job?._id || application.job;
    if (!jobId) return;

    const positions = Math.max(1, job?.positions ?? 1);

    const { applicantName, applicantEmail, coverLetter, skills, experience, currentCompany } = application;
    const jobTitle = job?.title || 'your position';
    const department = job?.department;
    const location = job?.location;

    // 1. Generate and send welcome email
    let welcome = await generateWelcomeEmailWithAI({
      applicantName,
      jobTitle,
      department,
      location,
      coverLetter,
      skills,
      experience,
      currentCompany,
    });
    if (!welcome) welcome = getFallbackWelcomeEmail({ applicantName, jobTitle, department });

    const welcomeHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
        ${welcome.html}
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
        <p style="color:#64748b;font-size:12px;">This is an automated email from NowAZone HR.</p>
      </div>
    `;

    await queueOrSendEmail('newsletter', {
      to: applicantEmail,
      subject: welcome.subject,
      html: welcomeHtml,
      text: welcome.text,
    });

    // 2 & 3. Only reject others and close job when all positions are filled
    const hiredCount = await Application.countDocuments({ job: jobId, status: 'hired' });
    const allPositionsFilled = hiredCount >= positions;
    result.positionsFilled = hiredCount;
    result.totalPositions = positions;
    result.jobClosed = allPositionsFilled;

    if (allPositionsFilled) {
      // Reject remaining applicants
      const others = await Application.find({
        job: jobId,
        status: { $nin: ['hired', 'rejected'] },
        _id: { $ne: applicationId },
      }).populate('job', 'title');

      for (const app of others) {
        await Application.findByIdAndUpdate(app._id, { status: 'rejected' });
        await queueOrSendEmail('application_status', {
          to: app.applicantEmail,
          name: app.applicantName,
          status: 'rejected',
          jobTitle: app.job?.title || jobTitle,
        });
      }

      // Close the job
      await Job.findByIdAndUpdate(jobId, { status: 'closed' });
    }
  } catch (err) {
    console.error('[JobHiring] onHired failed:', err.message);
  }
  return result;
}

module.exports = { onHired, generateWelcomeEmailWithAI, getFallbackWelcomeEmail };
