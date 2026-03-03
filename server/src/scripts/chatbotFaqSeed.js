/**
 * Seed script for Chatbot FAQs — real Nowazone content from the website.
 * Run: node src/scripts/chatbotFaqSeed.js
 * Options: --clear (clear existing FAQs before insert), default: upsert by question.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const ChatbotFaq = require('../modules/chatbot/models/ChatbotFaq');

const DEFAULT_FAQS = [
  // —— Company & general ——
  {
    question: 'What is Nowazone?',
    answer: 'Nowazone is a global technology and cloud services company that helps businesses modernize IT infrastructure and accelerate digital transformation. We operate across India, GCC (UAE, Saudi Arabia, Qatar), Malaysia, US and UK, offering cloud services, AI/ML, cybersecurity, FinOps, data analytics, managed services, and consulting.',
    tags: ['who', 'company', 'about', 'what do you do'],
    category: 'Company',
    order: 0,
  },
  {
    question: 'Where is Nowazone located?',
    answer: 'Nowazone operates globally with presence in India, GCC (UAE, Saudi Arabia, Qatar), Malaysia, US and UK. Our headquarters is in Asheville, NC, USA. You can reach us at hello@nowazone.com or +96 76867 8869.',
    tags: ['location', 'offices', 'countries', 'regions', 'contact'],
    category: 'Company',
    order: 1,
  },
  {
    question: 'How can I contact Nowazone?',
    answer: 'You can contact us by email at hello@nowazone.com or by phone at +96 76867 8869. For specific areas: security@nowazone.com (security), india@nowazone.com (India), gcc@nowazone.com (GCC), apac@nowazone.com (Malaysia/APAC), usuk@nowazone.com (US/UK). We also have contact forms on the website for consultations.',
    tags: ['contact', 'email', 'phone', 'support', 'reach'],
    category: 'Company',
    order: 2,
  },
  {
    question: 'Why choose Nowazone?',
    answer: 'Nowazone offers multi-cloud expertise, enterprise-grade security, FinOps and cost optimization, and a delivery framework tailored for startups, SMBs and global organizations. Visit our Why Nowazone page for our mission, platform and achievements.',
    tags: ['why nowazone', 'why us', 'benefits', 'advantages'],
    category: 'Company',
    order: 3,
  },
  // —— Cloud ——
  {
    question: 'What cloud services does Nowazone offer?',
    answer: 'We offer multi-cloud services across AWS, Azure, Google Cloud (GCP), Oracle Cloud (OCI) and Alibaba Cloud: cloud platform engineering, migration, security and compliance, FinOps and cost governance, and managed cloud operations. We support startups, SMBs and enterprises globally.',
    tags: ['cloud', 'aws', 'azure', 'gcp', 'oci', 'multi-cloud', 'cloud services'],
    category: 'Cloud',
    order: 10,
  },
  {
    question: 'Do you do cloud migration?',
    answer: 'Yes. Nowazone provides cloud migration services to move workloads to AWS, Azure, GCP, OCI or Alibaba Cloud, with platform engineering, security and FinOps. We support enterprises and SMBs across India, GCC, Malaysia, US and UK.',
    tags: ['migration', 'cloud migration', 'migrate to cloud'],
    category: 'Cloud',
    order: 11,
  },
  {
    question: 'What is FinOps and does Nowazone offer it?',
    answer: 'FinOps is cloud financial management: visibility, governance and optimization of cloud and IT spend. Nowazone offers enterprise FinOps with visibility, governance and up to 38% cost reduction across cloud, SaaS, AI and IT spend. We provide dashboards, forecasting, chargeback/showback and policy automation.',
    tags: ['finops', 'cloud cost', 'cost optimization', 'cloud spend', 'cloud financial management'],
    category: 'Cloud',
    order: 12,
  },
  // —— Cybersecurity ——
  {
    question: 'What cybersecurity services does Nowazone provide?',
    answer: 'We provide enterprise cybersecurity: managed security, SOC (Security Operations Center), cloud security, Zero Trust, compliance and threat detection/response (XDR). Services are available in India, GCC, Malaysia, US and UK for SMBs and enterprises.',
    tags: ['cybersecurity', 'security', 'soc', 'zero trust', 'managed security', 'xdr'],
    category: 'Security',
    order: 20,
  },
  // —— AI & ML ——
  {
    question: 'Does Nowazone offer AI and machine learning services?',
    answer: 'Yes. Nowazone delivers enterprise AI and machine learning solutions for real business challenges: automation, predictive analytics, MLOps and AI platforms. We serve SMBs, mid-market and enterprises across finance, healthcare, retail, manufacturing and SaaS.',
    tags: ['ai', 'machine learning', 'ml', 'artificial intelligence', 'automation', 'predictive'],
    category: 'AI & ML',
    order: 30,
  },
  // —— Development & apps ——
  {
    question: 'Do you build mobile apps?',
    answer: 'Yes. We build mobile apps for Android and iOS: enterprise mobile solutions, MVP and startup development, industry-specific solutions, and mobile modernization. We cover idea-to-MVP, scale and modernize, and cross-platform development.',
    tags: ['mobile', 'mobile app', 'android', 'ios', 'mvp', 'app development'],
    category: 'Development',
    order: 40,
  },
  {
    question: 'What application development services do you offer?',
    answer: 'We offer enterprise application development: custom software, APIs and integrations, AI/ML integration, ERP/CRM solutions, and AI bots/chatbots. We help with full-stack development, cloud-native apps and legacy modernization.',
    tags: ['application development', 'custom software', 'apis', 'erp', 'crm', 'software development'],
    category: 'Development',
    order: 41,
  },
  {
    question: 'Do you offer UI/UX design?',
    answer: 'Yes. Nowazone offers UI/UX and software design services to create user-centered interfaces and experiences for web and mobile applications.',
    tags: ['ui', 'ux', 'design', 'user interface', 'software design'],
    category: 'Development',
    order: 42,
  },
  // —— Operations ——
  {
    question: 'What are DevOps and DevSecOps services at Nowazone?',
    answer: 'We offer DevOps, DevSecOps, NetOps, SysOps and AIOps under Intelligent Operations: CI/CD, automation, security in the pipeline, network operations, system operations and AI-driven operations. This helps teams ship faster and more securely.',
    tags: ['devops', 'devsecops', 'netops', 'sysops', 'aiops', 'intelligent operations', 'cicd'],
    category: 'Operations',
    order: 50,
  },
  {
    question: 'What monitoring and observability services do you offer?',
    answer: 'We provide monitoring and observability: infrastructure monitoring, application monitoring, network monitoring and NOC, SOC monitoring, SRE and observability practices. Full-stack visibility and AIOps for proactive operations.',
    tags: ['monitoring', 'observability', 'sre', 'noc', 'soc', 'infrastructure monitoring'],
    category: 'Operations',
    order: 51,
  },
  {
    question: 'What are Nowazone managed services?',
    answer: 'Managed services include 24/7 NOC, SOC, SRE and IT operations. We take care of your cloud and infrastructure so you can focus on business. We support multi-cloud and hybrid environments.',
    tags: ['managed services', 'noc', 'soc', 'sre', '24/7', 'operations'],
    category: 'Operations',
    order: 52,
  },
  {
    question: 'Do you offer customer support or help desk services?',
    answer: 'Yes. We offer customer support services and help desk (ITSM) so you can deliver consistent support to your users and meet SLAs.',
    tags: ['customer support', 'help desk', 'itsm', 'support services'],
    category: 'Operations',
    order: 53,
  },
  {
    question: 'What network services does Nowazone provide?',
    answer: 'We provide network and infrastructure services: SD-WAN, zero-trust networking, hybrid and cloud connectivity, and managed NOC. We help with global connectivity and secure access.',
    tags: ['network', 'sd-wan', 'zero trust', 'hybrid', 'connectivity', 'noc'],
    category: 'Operations',
    order: 54,
  },
  // —— Transformation & data ——
  {
    question: 'What is digital transformation at Nowazone?',
    answer: 'We help with digital transformation: enterprise modernization, digital innovation, transformation PMO and operational excellence. We design roadmaps, modernize legacy systems and align IT with business goals.',
    tags: ['digital transformation', 'modernization', 'innovation', 'pmo', 'legacy'],
    category: 'Transformation',
    order: 60,
  },
  {
    question: 'Do you offer data analytics and data engineering?',
    answer: 'Yes. We offer data analytics and engineering: data platform engineering, business intelligence (BI), data integration and pipelines, and data governance and compliance. We help you get value from your data.',
    tags: ['data analytics', 'data engineering', 'bi', 'business intelligence', 'data platform', 'governance'],
    category: 'Transformation',
    order: 61,
  },
  {
    question: 'Do you do Microsoft 365 / M365 migration?',
    answer: 'Yes. Nowazone offers MS365 (Microsoft 365) migration services and MS365 managed support. We help organizations migrate to and operate M365 securely and efficiently.',
    tags: ['m365', 'microsoft 365', 'ms365', 'office 365', 'migration'],
    category: 'Transformation',
    order: 62,
  },
  // —— Consulting & people ——
  {
    question: 'What consulting and staff augmentation services do you offer?',
    answer: 'We offer IT consulting and staff augmentation: contract staffing, dedicated teams, managed delivery and transformation advisory. We help startups, SMBs and enterprises get the right talent and strategic guidance across India, GCC, Malaysia, US and UK.',
    tags: ['consulting', 'staff augmentation', 'contract', 'dedicated team', 'it consulting', 'talent'],
    category: 'Consulting',
    order: 70,
  },
  // —— Pricing & careers ——
  {
    question: 'How does Nowazone pricing work?',
    answer: 'We offer different engagement models: enterprise contracting, managed services pricing, FinOps and cloud pricing, and consulting/team pricing. Visit our Pricing & Engagement Models page for details, or request a consultation for a tailored quote.',
    tags: ['pricing', 'cost', 'engagement model', 'how much', 'quote'],
    category: 'Sales',
    order: 80,
  },
  {
    question: 'Is Nowazone hiring? Where can I see careers?',
    answer: 'Yes. Nowazone has career opportunities. Visit our Careers page to see open roles and apply. We look for talent in technology, cloud, security and consulting.',
    tags: ['careers', 'jobs', 'hiring', 'work', 'apply'],
    category: 'Company',
    order: 81,
  },
  {
    question: 'Does Nowazone have partners or alliances?',
    answer: 'Yes. We work with partners and alliances including channel partners. Visit our Partners & Alliances page for more on our ecosystem and partnership programs.',
    tags: ['partners', 'alliances', 'channel', 'partnership'],
    category: 'Company',
    order: 82,
  },
  {
    question: 'What industries does Nowazone serve?',
    answer: 'We serve multiple industries including finance, healthcare, retail, manufacturing, SaaS and more. Our solutions are tailored for SMBs, mid-market and enterprises. See our Industries page for industry-specific solutions.',
    tags: ['industries', 'sectors', 'vertical', 'finance', 'healthcare', 'retail'],
    category: 'Company',
    order: 83,
  },
];

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
}

async function seed() {
  await connectDB();
  const clearFirst = process.argv.includes('--clear');

  if (clearFirst) {
    const deleted = await ChatbotFaq.deleteMany({});
    console.log('Cleared existing FAQs:', deleted.deletedCount);
  }

  let inserted = 0;
  let updated = 0;
  for (const faq of DEFAULT_FAQS) {
    const existing = await ChatbotFaq.findOne({ question: faq.question }).lean();
    const doc = {
      question: faq.question,
      answer: faq.answer,
      tags: faq.tags || [],
      category: faq.category || 'General',
      order: faq.order != null ? faq.order : 0,
      isActive: true,
    };
    if (existing) {
      await ChatbotFaq.updateOne({ _id: existing._id }, { $set: doc });
      updated++;
    } else {
      await ChatbotFaq.create(doc);
      inserted++;
    }
  }

  console.log('Chatbot FAQ seed done. Inserted:', inserted, 'Updated:', updated);
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
