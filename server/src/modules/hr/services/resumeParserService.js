/**
 * AI Resume Parser Service
 *
 * Flow:
 *  1. Fetch PDF from Cloudinary URL
 *  2. Extract text with pdf-parse
 *  3. Send text to OpenAI GPT-4o with a structured prompt
 *  4. Return parsed JSON: { skills, experience, education, name, email, phone }
 */

const https = require('https');
const http  = require('http');

let pdfParse;
try {
  pdfParse = require('pdf-parse');
} catch {
  pdfParse = null;
}

let OpenAI;
try {
  OpenAI = require('openai');
} catch {
  OpenAI = null;
}

/**
 * Fetch a remote URL as a Buffer.
 */
const fetchBuffer = (url) =>
  new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end',  ()  => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });

/**
 * Parse a resume PDF from a URL and extract structured data via OpenAI.
 *
 * @param {string} fileUrl  - Public URL of the PDF (Cloudinary)
 * @returns {Promise<Object>} Parsed data object
 */
const parseFromUrl = async (fileUrl) => {
  if (!pdfParse) {
    throw new Error('pdf-parse is not installed. Run: npm install pdf-parse');
  }

  // 1. Download PDF
  const buffer = await fetchBuffer(fileUrl);

  // 2. Extract text
  const { text: rawText } = await pdfParse(buffer);

  if (!rawText || rawText.trim().length < 50) {
    return { skills: [], experience: null, education: null, _meta: { method: 'empty' } };
  }

  // 3. If OpenAI not available, fall back to basic extraction
  if (!OpenAI || !process.env.OPENAI_API_KEY) {
    console.warn('[ResumeParser] OpenAI not configured, using basic extraction');
    return basicExtract(rawText);
  }

  // 4. OpenAI extraction
  return openAIExtract(rawText);
};

/**
 * Call OpenAI to extract structured info from resume text.
 */
const openAIExtract = async (text) => {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = `
You are an expert resume parser. Extract the following fields from the resume text below.
Return ONLY a valid JSON object with these keys:
- name: string (full name)
- email: string
- phone: string
- skills: string[] (technical and soft skills)
- experience: string (total years and most recent role/company, e.g. "5 years, Senior Engineer at Acme Corp")
- education: string (highest degree and institution, e.g. "B.Tech Computer Science, MIT")

Resume text:
"""
${text.slice(0, 4000)}
"""

Return only the JSON object, no explanation.
`.trim();

  const response = await client.chat.completions.create({
    model:       'gpt-4o',
    messages:    [{ role: 'user', content: prompt }],
    temperature: 0,
    max_tokens:  800,
    response_format: { type: 'json_object' },
  });

  const raw = response.choices[0]?.message?.content || '{}';
  try {
    const parsed = JSON.parse(raw);
    return { ...parsed, _meta: { method: 'openai', model: 'gpt-4o' } };
  } catch {
    return { skills: [], experience: null, education: null, _meta: { method: 'openai_parse_error', model: 'gpt-4o' } };
  }
};

/**
 * Basic rule-based extraction as fallback (no AI).
 */
const basicExtract = (text) => {
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = text.match(/(\+?\d[\d\s\-().]{7,14}\d)/);

  // Common tech skills
  const TECH_KEYWORDS = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust',
    'React', 'Next.js', 'Vue', 'Angular', 'Node.js', 'Express', 'Django', 'Flask',
    'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'AWS', 'Azure', 'GCP', 'Docker',
    'Kubernetes', 'Git', 'REST', 'GraphQL', 'HTML', 'CSS', 'Tailwind',
    'SQL', 'Linux', 'Agile', 'Scrum', 'Leadership', 'Communication',
  ];

  const skills = TECH_KEYWORDS.filter((kw) =>
    new RegExp(`\\b${kw}\\b`, 'i').test(text)
  );

  return {
    name:       null,
    email:      emailMatch?.[0] || null,
    phone:      phoneMatch?.[0] || null,
    skills,
    experience: null,
    education:  null,
    _meta: { method: 'basic' },
  };
};

module.exports = { parseFromUrl };
