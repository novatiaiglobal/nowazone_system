const GREETING_PHRASES = new Set([
  'hi', 'hello', 'hey', 'hola', 'hi there', 'hello there',
  'good morning', 'good afternoon', 'good evening', 'good night',
  'thanks', 'thank you', 'thx', 'ok', 'okay', 'yes', 'no',
]);

/** Returns true if the message is a short greeting/courtesy (do not escalate). */
function isGreeting(text) {
  if (!text || typeof text !== 'string') return false;
  const normalized = text.toLowerCase().trim().replace(/\s+/g, ' ');
  if (normalized.length > 50) return false;
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length > 4) return false;
  return GREETING_PHRASES.has(normalized) || GREETING_PHRASES.has(words[0]);
}

/** Default reply for greetings when AI is unavailable or said ESCALATE. */
function getGreetingReply() {
  return "Hi! How can I help you today?";
}

/** Ollama native API is served under /api by default. */
const OLLAMA_DEFAULT_BASE = 'http://127.0.0.1:11434';
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 90000);
const MAX_FAQS_IN_PROMPT = Number(process.env.OLLAMA_MAX_FAQS || 4);
const MAX_HISTORY_MESSAGES = Number(process.env.OLLAMA_HISTORY_MESSAGES || 6);
const MAX_MESSAGE_CHARS = Number(process.env.OLLAMA_MAX_MESSAGE_CHARS || 400);
const MAX_PAGE_LINKS_IN_PROMPT = Number(process.env.OLLAMA_MAX_PAGE_LINKS || 6);
let _warmupStarted = false;

function getOllamaApiBaseUrl() {
  const raw = (process.env.OLLAMA_BASE_URL || OLLAMA_DEFAULT_BASE).replace(/\/+$/, '');
  // Accept host, /v1, or /api and normalize to /api for native Ollama endpoints.
  const baseWithoutSuffix = raw.replace(/\/(api|v1)\/?$/, '');
  return `${baseWithoutSuffix}/api`;
}

function startOllamaWarmup() {
  if (_warmupStarted) return;
  const useOllama = process.env.USE_OLLAMA === 'true' || process.env.USE_OLLAMA === '1';
  if (!useOllama) return;
  _warmupStarted = true;
  const model = process.env.OLLAMA_CHAT_MODEL || 'gemma2:2b';
  setTimeout(async () => {
    try {
      await fetch(`${getOllamaApiBaseUrl()}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          stream: false,
          keep_alive: '30m',
          messages: [{ role: 'user', content: 'ok' }],
          options: { num_predict: 1, temperature: 0 },
        }),
      });
    } catch {
      // Ignore warmup errors; real requests handle failures explicitly.
    }
  }, 1500);
}

/** Base URL for the Nowazone client site (used when suggesting page links). */
const DEFAULT_SITE_BASE = 'https://www.nowazone.com';

/** Topic-to-URL map for suggesting "learn more" links in answers. */
const PAGE_LINKS = [
  { topics: ['cloud', 'aws', 'azure', 'gcp', 'multi-cloud', 'cloud migration', 'cloud services'], path: '/cloud-services' },
  { topics: ['migration', 'cloud migration', 'migrate'], path: '/migration-services' },
  { topics: ['finops', 'cloud cost', 'cost optimization', 'cloud spend', 'cloud financial'], path: '/finops' },
  { topics: ['cybersecurity', 'security', 'soc', 'zero trust', 'managed security', 'xdr'], path: '/cybersecurity' },
  { topics: ['ai', 'machine learning', 'ml', 'artificial intelligence', 'ai/ml'], path: '/ai-machine-learning' },
  { topics: ['mobile app', 'mobile apps', 'android', 'ios', 'mvp'], path: '/mobile-apps' },
  { topics: ['application development', 'enterprise app', 'custom software', 'apis', 'erp', 'crm'], path: '/application-development' },
  { topics: ['ui', 'ux', 'design', 'software design'], path: '/ui-ux-software-design' },
  { topics: ['devops', 'devsecops', 'netops', 'sysops', 'aiops', 'intelligent operations'], path: '/intelligent-operations' },
  { topics: ['monitoring', 'observability', 'sre', 'noc', 'soc monitoring'], path: '/monitoring-observability' },
  { topics: ['managed services', 'managed service'], path: '/managed-services' },
  { topics: ['customer support', 'help desk', 'itsm'], path: '/customer-support-services' },
  { topics: ['network', 'sd-wan', 'zero trust network', 'hybrid connectivity', 'noc'], path: '/network-services' },
  { topics: ['digital transformation', 'modernization', 'enterprise transformation'], path: '/digital-transformation' },
  { topics: ['data analytics', 'data engineering', 'bi', 'business intelligence', 'data platform', 'data governance'], path: '/data-analytics-engineering' },
  { topics: ['m365', 'microsoft 365', 'ms365', 'office 365'], path: '/ms365-migration-services' },
  { topics: ['consulting', 'staff augmentation', 'it consulting', 'dedicated team', 'contract staffing'], path: '/consulting-staff-augmentation' },
  { topics: ['cloud migration', 'cloud migration service'], path: '/cloud-migration' },
  { topics: ['why nowazone', 'why choose', 'why us'], path: '/why-nowazone' },
  { topics: ['pricing', 'engagement model', 'cost', 'enterprise contracting'], path: '/pricing-engagement-models' },
  { topics: ['careers', 'jobs', 'hiring', 'work with us'], path: '/careers' },
  { topics: ['about', 'about us', 'company'], path: '/company/about-us' },
  { topics: ['partners', 'alliances', 'channel'], path: '/company/partners-alliances' },
  { topics: ['industry', 'industries'], path: '/company/industries' },
  { topics: ['vision', 'mission', 'our mission'], path: '/company/vision-mission' },
  { topics: ['leadership', 'team'], path: '/company/leadership' },
  { topics: ['culture', 'company culture'], path: '/company/culture' },
  { topics: ['solutions'], path: '/solutions' },
];

function getPageLinksBlock(userMessage) {
  const base = (process.env.CLIENT_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || DEFAULT_SITE_BASE).replace(/\/$/, '');
  const links = PAGE_LINKS
    .map((item) => ({
      ...item,
      score: computeSimilarity(userMessage, item.topics.join(' ')),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, MAX_PAGE_LINKS_IN_PROMPT));
  const lines = links.map(({ topics, path }) => `• ${topics.join(', ')} → ${base}${path}`).join('\n');
  return `═══ PAGE LINKS (suggest "Learn more: [URL]" when relevant) ═══\n${lines}\n`;
}

function buildSystemPrompt(faqs, userMessage) {
  const faqBlock =
    faqs.length > 0
      ? faqs
          .map((f) => `- ${f.question}\n  ${f.answer}`)
          .join('\n\n')
      : '';

  return `You are Nowa, a customer support assistant for Nowazone. Be warm, concise, and natural.

═══ YOUR ROLE ═══
• Reply like a human support agent, not a bot.
• Use the knowledge base facts in your own words.
• Keep most replies to 1-4 short sentences.
• If user asks "short", keep it to 1-2 sentences.
• Ask a short clarifying question when needed.

═══ HOW TO ANSWER ═══
1. Use relevant FAQ + service context.
2. Add one relevant URL when helpful: "Learn more: [URL]".
3. Do not invent Nowazone-specific pricing/details.

═══ WHEN TO ESCALATE ═══
Reply with exactly the word ESCALATE (nothing else) only when:
• The question needs account-specific or confidential data you don't have, OR
• The user clearly asks to talk to a human, OR
• After trying to help, you truly can't answer.

Do NOT escalate for: general questions, greetings, unclear questions (ask to clarify), or when you can give a partial but useful answer.

═══ FORMATTING ═══
• Keep replies short and clear.
• Use bullet points only for 3+ items.
• No markdown headers (#).

${getPageLinksBlock(userMessage)}
${faqBlock ? `═══ KNOWLEDGE BASE (use this + general context to build human, friendly answers) ═══\n${faqBlock}` : ''}`;
}

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function computeSimilarity(query, candidate) {
  const qT = new Set(normalize(query).split(/\s+/).filter(Boolean));
  const cT = new Set(normalize(candidate).split(/\s+/).filter(Boolean));
  if (!qT.size || !cT.size) return 0;
  let inter = 0;
  qT.forEach((t) => {
    if (cT.has(t)) inter += 1;
  });
  return inter / Math.sqrt(qT.size * cT.size);
}

function getRelevantFaqs(userMessage, faqs) {
  if (!Array.isArray(faqs) || faqs.length === 0) return [];
  const scored = faqs.map((faq) => {
    const target = [faq.question, ...(faq.tags || []), faq.category || ''].join(' ');
    return { faq, score: computeSimilarity(userMessage, target) };
  });
  const top = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, MAX_FAQS_IN_PROMPT))
    .map((x) => x.faq);
  return top;
}

/**
 * @param {string} userMessage
 * @param {Array}  faqs
 * @param {Array}  conversationHistory
 * @param {number} [temperature=0.5]
 * @returns {Promise<string|null>} AI reply, "ESCALATE", or null if Ollama is disabled/unavailable.
 */
async function getAIResponse(userMessage, faqs, conversationHistory = [], temperature = 0.5) {
  const useOllama = process.env.USE_OLLAMA === 'true' || process.env.USE_OLLAMA === '1';
  if (!useOllama) return null;

  const model = process.env.OLLAMA_CHAT_MODEL || 'gemma2:2b';

  const relevantFaqs = getRelevantFaqs(userMessage, faqs);

  const historyMessages = conversationHistory
    .filter((m) => m.role === 'user' || m.role === 'bot' || m.role === 'agent')
    .slice(-Math.max(1, MAX_HISTORY_MESSAGES))
    .map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: String(m.content || '').slice(0, Math.max(100, MAX_MESSAGE_CHARS)),
    }));

  const messages = [
    { role: 'system', content: buildSystemPrompt(relevantFaqs, userMessage) },
    ...historyMessages,
    { role: 'user', content: String(userMessage || '').slice(0, Math.max(100, MAX_MESSAGE_CHARS)) },
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${getOllamaApiBaseUrl()}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        keep_alive: '30m',
        options: {
          temperature: Math.min(1, Math.max(0, temperature)),
          num_predict: 128,
          num_ctx: 2048,
        },
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`OLLAMA_TIMEOUT after ${OLLAMA_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`${response.status} ${errText || response.statusText}`);
  }

  const data = await response.json();
  const content = data?.message?.content;
  const reply = typeof content === 'string' ? content.trim() : null;
  return reply || null;
}

module.exports = { getAIResponse, isGreeting, getGreetingReply };
startOllamaWarmup();
