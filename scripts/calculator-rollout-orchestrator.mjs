#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSeoArtifacts } from './build-seo-artifacts.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const DEFAULT_CONTEXT_FILES = [
  'docs/PEDS_GTM_PLAN_2026-02-17.md',
  'docs/PEDS_PRODUCT_ROADMAP_2026-02-17.md',
  'docs/PEDS_EXECUTION_BACKLOG_2026-02-17.md',
  'docs/PEDS_STRATEGY_REPORT_2026-02-17.md',
  'docs/QA_GOD_FIX_QUEUE_2026-02-17.md',
  'docs/WEBSITE_REVIEW_2026-02-17.md'
];

const CATEGORIES = [
  {
    slug: 'medication-safety-dosing',
    title: 'Medication Safety and Dosing',
    route: '/categories/medication-safety-dosing/',
    nav_label: 'Medication Safety',
    description: 'Weight-based medication dosing, safety rails, and age-guarded pediatric prescribing support.',
    keywords: ['pediatric dosing calculator', 'medication safety', 'weight based dosing', 'mg/kg calculator']
  },
  {
    slug: 'pediatric-infectious-disease',
    title: 'Pediatric Infectious Disease',
    route: '/categories/pediatric-infectious-disease/',
    nav_label: 'Infectious Disease',
    description: 'Common pediatric infectious disease calculators and treatment planning support for point-of-care use.',
    keywords: ['pediatric infection calculator', 'pediatric antibiotic dosing', 'otitis media treatment']
  },
  {
    slug: 'growth-preventive-care',
    title: 'Growth and Preventive Care',
    route: '/categories/growth-preventive-care/',
    nav_label: 'Growth and Prevention',
    description: 'Growth, preventive visit, and developmental workflow calculators for outpatient pediatrics.',
    keywords: ['well child checklist', 'growth pediatric calculator', 'preventive care pediatrics']
  },
  {
    slug: 'respiratory-asthma',
    title: 'Respiratory and Asthma',
    route: '/categories/respiratory-asthma/',
    nav_label: 'Respiratory and Asthma',
    description: 'Asthma and respiratory pediatric tools for triage and action-plan guidance.',
    keywords: ['pediatric asthma action plan', 'respiratory pediatric calculator', 'wheeze pathway']
  },
  {
    slug: 'emergency-acute-care',
    title: 'Emergency and Acute Care',
    route: '/categories/emergency-acute-care/',
    nav_label: 'Emergency and Acute',
    description: 'Rapid pediatric triage calculators for fever, sepsis risk, hydration, and urgent-care decisions.',
    keywords: ['pediatric sepsis risk', 'dehydration management', 'pediatric fever calculator']
  }
];

const CORE_TOOLS = [
  {
    id: 'core-schedule',
    slug: 'schedule',
    title: 'Immunization Schedule',
    route: '/',
    type: 'core',
    category_slug: 'growth-preventive-care',
    description: 'AAP-first child and adolescent immunization schedule by age.',
    keywords: ['aap immunization schedule', 'pediatric vaccines']
  },
  {
    id: 'core-catch-up',
    slug: 'catch-up-calculator',
    title: 'Catch-Up Vaccine Calculator',
    route: '/catch-up/',
    type: 'core',
    category_slug: 'growth-preventive-care',
    description: 'Catch-up immunization planning framework with age and dose guidance.',
    keywords: ['catch up immunization schedule', 'vaccine catch up calculator']
  },
  {
    id: 'core-growth',
    slug: 'growth-chart-calculator',
    title: 'Growth Chart Calculator',
    route: '/growth/',
    type: 'core',
    category_slug: 'growth-preventive-care',
    description: 'WHO, CDC, and Fenton pediatric growth percentiles and z-scores.',
    keywords: ['pediatric growth chart calculator', 'growth percentile']
  },
  {
    id: 'core-bilirubin',
    slug: 'bilirubin-calculator',
    title: 'Newborn Bilirubin Calculator',
    route: '/bili/',
    type: 'core',
    category_slug: 'emergency-acute-care',
    description: 'AAP 2022 phototherapy and exchange transfusion thresholds.',
    keywords: ['bilirubin calculator', 'newborn jaundice']
  },
  {
    id: 'core-ga',
    slug: 'gestational-age-calculator',
    title: 'Gestational Age Calculator',
    route: '/ga-calc/',
    type: 'core',
    category_slug: 'growth-preventive-care',
    description: 'GA, corrected age, and EDD support for neonatal and outpatient workflows.',
    keywords: ['gestational age calculator', 'corrected age']
  },
  {
    id: 'core-dosing',
    slug: 'pediatric-dosing-calculator',
    title: 'Pediatric Dosing Calculator',
    route: '/dosing/',
    type: 'core',
    category_slug: 'medication-safety-dosing',
    description: 'Weight-based pediatric dosing with common medications and safety limits.',
    keywords: ['pediatric dosing calculator', 'mg per kg']
  }
];

const CANDIDATE_CALCULATORS = [
  {
    id: 'pediatric-fever-calculator',
    slug: 'pediatric-fever-calculator',
    title: 'Pediatric Fever Calculator',
    route: '/calculators/pediatric-fever-calculator/',
    category_slug: 'emergency-acute-care',
    description: 'Fever severity, weight-based antipyretic dosing, and red-flag triage support.',
    base_score: 96,
    keywords: ['pediatric fever calculator', 'fever in child', 'tylenol motrin dose child'],
    terms: ['pediatric fever calculator', 'fever', 'antipyretic', 'acetaminophen', 'ibuprofen']
  },
  {
    id: 'pediatric-antibiotic-dosing',
    slug: 'pediatric-antibiotic-dosing',
    title: 'Pediatric Antibiotic Dosing Calculator',
    route: '/calculators/pediatric-antibiotic-dosing/',
    category_slug: 'pediatric-infectious-disease',
    description: 'Weight-based antibiotic dosing for common outpatient and urgent-care pediatric infections.',
    base_score: 95,
    keywords: ['pediatric antibiotic dosing', 'amoxicillin dose calculator', 'cefdinir dose child'],
    terms: ['pediatric antibiotic dosing', 'antibiotic', 'amoxicillin', 'infectious disease']
  },
  {
    id: 'pediatric-sepsis-risk-score',
    slug: 'pediatric-sepsis-risk-score',
    title: 'Pediatric Sepsis Risk Score',
    route: '/calculators/pediatric-sepsis-risk-score/',
    category_slug: 'emergency-acute-care',
    description: 'Rapid bedside sepsis risk stratification using vital-sign and perfusion danger signs.',
    base_score: 94,
    keywords: ['pediatric sepsis risk score', 'sepsis pediatric calculator', 'pediatric triage sepsis'],
    terms: ['pediatric sepsis risk score', 'sepsis', 'risk score', 'triage']
  },
  {
    id: 'pediatric-dehydration-management',
    slug: 'pediatric-dehydration-management',
    title: 'Pediatric Dehydration Management Calculator',
    route: '/calculators/pediatric-dehydration-management/',
    category_slug: 'emergency-acute-care',
    description: 'Maintenance fluids, dehydration deficit estimates, and acute rehydration planning support.',
    base_score: 93,
    keywords: ['pediatric dehydration management', 'rehydration calculator', 'fluid deficit child'],
    terms: ['pediatric dehydration management', 'dehydration', 'fluids', 'rehydration']
  },
  {
    id: 'pediatric-asthma-action-tool',
    slug: 'pediatric-asthma-action-tool',
    title: 'Pediatric Asthma Action Tool',
    route: '/calculators/pediatric-asthma-action-tool/',
    category_slug: 'respiratory-asthma',
    description: 'Symptom-based asthma control staging and treatment-step recommendations for children.',
    base_score: 92,
    keywords: ['pediatric asthma action tool', 'asthma control child', 'asthma step therapy pediatrics'],
    terms: ['pediatric asthma action tool', 'asthma', 'respiratory', 'wheezing']
  },
  {
    id: 'otitis-media-treatment-pediatric',
    slug: 'otitis-media-treatment-pediatric',
    title: 'Otitis Media Treatment Calculator',
    route: '/calculators/otitis-media-treatment-pediatric/',
    category_slug: 'pediatric-infectious-disease',
    description: 'AAP-aligned otitis media treatment decision support with age and severity branching.',
    base_score: 91,
    keywords: ['otitis media treatment pediatric', 'ear infection child treatment', 'aom dosing'],
    terms: ['otitis media treatment pediatric', 'otitis', 'aom', 'ear infection']
  },
  {
    id: 'well-child-visit-checklist',
    slug: 'well-child-visit-checklist',
    title: 'Well-Child Visit Checklist',
    route: '/calculators/well-child-visit-checklist/',
    category_slug: 'growth-preventive-care',
    description: 'Age-based pediatric preventive visit checklist with screening and vaccine prompts.',
    base_score: 90,
    keywords: ['well child visit checklist', 'pediatric preventive care checklist', 'well visit schedule'],
    terms: ['well child visit checklist', 'well child', 'preventive care', 'checklist']
  },
  {
    id: 'medication-safety-dosing-engine-v2',
    slug: 'medication-safety-dosing-engine-v2',
    title: 'Medication Safety Dosing Engine v2',
    route: '/calculators/medication-safety-dosing-engine-v2/',
    category_slug: 'medication-safety-dosing',
    description: 'Age-gated, weight-based pediatric medication dose engine with safety guardrails.',
    base_score: 89,
    keywords: ['medication safety dosing engine', 'pediatric medication calculator', 'age gated dosing'],
    terms: ['medication safety', 'dosing engine', 'weight/age dosing engine', 'dose safety']
  },
  {
    id: 'newborn-transition-risk-tool',
    slug: 'newborn-transition-risk-tool',
    title: 'Newborn Transition Risk Tool',
    route: '/calculators/newborn-transition-risk-tool/',
    category_slug: 'emergency-acute-care',
    description: 'Early newborn transition risk support for immediate post-delivery clinical checks.',
    base_score: 74,
    keywords: ['newborn transition risk', 'newborn delivery room checklist'],
    terms: ['newborn transition', 'delivery room']
  },
  {
    id: 'nicu-prematurity-visit-bundle',
    slug: 'nicu-prematurity-visit-bundle',
    title: 'NICU Prematurity Visit Bundle',
    route: '/calculators/nicu-prematurity-visit-bundle/',
    category_slug: 'growth-preventive-care',
    description: 'Prematurity follow-up bundle for post-NICU outpatient planning.',
    base_score: 72,
    keywords: ['nicu prematurity calculator', 'prematurity follow up'],
    terms: ['nicu', 'prematurity']
  }
];

const VERSION_TOKEN = process.env.CALC_ASSET_VERSION || '20260218-calc-orch';
const ROLLOUT_TARGET_IDS = new Set([
  'pediatric-fever-calculator',
  'pediatric-antibiotic-dosing',
  'pediatric-sepsis-risk-score',
  'pediatric-dehydration-management',
  'pediatric-asthma-action-tool',
  'otitis-media-treatment-pediatric',
  'well-child-visit-checklist',
  'medication-safety-dosing-engine-v2'
]);

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeSpace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function slugify(value) {
  return normalizeSpace(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeRoute(route) {
  let out = String(route || '/').trim();
  if (!out.startsWith('/')) out = `/${out}`;
  if (!out.endsWith('/')) out = `${out}/`;
  out = out.replace(/\/+/g, '/');
  return out;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escaped, 'gi');
  return (haystack.match(re) || []).length;
}

async function readContext(repoRoot, files) {
  const loaded = [];
  for (const relPath of files) {
    const absPath = path.join(repoRoot, relPath);
    try {
      const content = await fs.readFile(absPath, 'utf8');
      loaded.push({ path: relPath, exists: true, content });
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        loaded.push({ path: relPath, exists: false, content: '' });
      } else {
        throw error;
      }
    }
  }
  return loaded;
}

function buildSourceCorpus(sources) {
  const corpus = {
    all: '',
    byPath: {}
  };

  for (const source of sources) {
    const normalized = String(source.content || '').toLowerCase();
    corpus.byPath[source.path] = normalized;
    corpus.all += `\n${normalized}`;
  }

  return corpus;
}

export function rankCalculatorCandidates(corpus, topLimit = 8) {
  const gtm = corpus.byPath['docs/PEDS_GTM_PLAN_2026-02-17.md'] || '';
  const roadmap = corpus.byPath['docs/PEDS_PRODUCT_ROADMAP_2026-02-17.md'] || '';
  const backlog = corpus.byPath['docs/PEDS_EXECUTION_BACKLOG_2026-02-17.md'] || '';
  const strategy = corpus.byPath['docs/PEDS_STRATEGY_REPORT_2026-02-17.md'] || '';

  const scored = CANDIDATE_CALCULATORS.map((candidate) => {
    const termMentions = candidate.terms.reduce((acc, term) => acc + countOccurrences(corpus.all, term), 0);
    const gtmMentions = candidate.terms.reduce((acc, term) => acc + countOccurrences(gtm, term), 0);
    const roadmapMentions = candidate.terms.reduce((acc, term) => acc + countOccurrences(roadmap, term), 0);
    const backlogMentions = candidate.terms.reduce((acc, term) => acc + countOccurrences(backlog, term), 0);
    const strategyMentions = candidate.terms.reduce((acc, term) => acc + countOccurrences(strategy, term), 0);

    const score =
      candidate.base_score +
      termMentions * 1.5 +
      gtmMentions * 4 +
      roadmapMentions * 3 +
      backlogMentions * 2 +
      strategyMentions * 2.5;

    return {
      ...candidate,
      mentions: {
        all: termMentions,
        gtm: gtmMentions,
        roadmap: roadmapMentions,
        backlog: backlogMentions,
        strategy: strategyMentions
      },
      score: Number(score.toFixed(2))
    };
  }).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.slug.localeCompare(b.slug);
    });

  const preferred = scored.filter((candidate) => ROLLOUT_TARGET_IDS.has(candidate.id));
  const overflow = scored.filter((candidate) => !ROLLOUT_TARGET_IDS.has(candidate.id));
  const merged = preferred.concat(overflow).slice(0, topLimit);

  const ranked = merged.map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
      wave: index < 4 ? 'wave_1' : 'wave_2'
    }));

  return ranked;
}

function buildSeo(tool, outDate) {
  const route = normalizeRoute(tool.route);
  const canonical = `https://tinyhumanmd.com${route}`;
  return {
    title: `${tool.title} | TinyHumanMD`,
    description: tool.description,
    keywords: tool.keywords,
    canonical,
    date_modified: outDate
  };
}

export function buildRegistry(selectedCalculators, outDate = todayIsoDate()) {
  const categories = CATEGORIES.map((category) => ({
    ...category,
    type: 'category',
    lastmod: outDate,
    seo: {
      title: `${category.title} Calculators | TinyHumanMD`,
      description: category.description,
      keywords: category.keywords,
      canonical: `https://tinyhumanmd.com${normalizeRoute(category.route)}`,
      date_modified: outDate
    }
  }));

  const tools = [
    ...CORE_TOOLS.map((tool) => ({
      ...tool,
      route: normalizeRoute(tool.route),
      status: 'active',
      nav_exposed: true,
      lastmod: outDate,
      seo: buildSeo(tool, outDate),
      evidence: ['docs/PEDS_GTM_PLAN_2026-02-17.md', 'docs/PEDS_PRODUCT_ROADMAP_2026-02-17.md']
    })),
    ...selectedCalculators.map((tool) => ({
      id: tool.id,
      slug: tool.slug,
      title: tool.title,
      route: normalizeRoute(tool.route),
      type: 'calculator',
      category_slug: tool.category_slug,
      status: 'active',
      nav_exposed: true,
      priority_rank: tool.rank,
      rollout_wave: tool.wave,
      score: tool.score,
      description: tool.description,
      keywords: tool.keywords,
      lastmod: outDate,
      seo: buildSeo(tool, outDate),
      evidence: [
        'docs/PEDS_GTM_PLAN_2026-02-17.md',
        'docs/PEDS_PRODUCT_ROADMAP_2026-02-17.md',
        'docs/PEDS_EXECUTION_BACKLOG_2026-02-17.md'
      ]
    }))
  ];

  return {
    generated_at: new Date().toISOString(),
    out_date: outDate,
    version_token: VERSION_TOKEN,
    categories,
    tools
  };
}

export function generateInternalLinks(registry) {
  const tools = Array.isArray(registry.tools) ? registry.tools : [];
  const byCategory = new Map();

  for (const tool of tools) {
    const categoryKey = tool.category_slug || 'uncategorized';
    if (!byCategory.has(categoryKey)) byCategory.set(categoryKey, []);
    byCategory.get(categoryKey).push(tool);
  }

  const byToolId = {};
  const byRoute = {};

  for (const tool of tools) {
    const peers = (byCategory.get(tool.category_slug) || [])
      .filter((entry) => entry.id !== tool.id)
      .slice(0, 4);

    const coreLinks = CORE_TOOLS
      .filter((entry) => entry.id !== tool.id)
      .slice(0, 2)
      .map((entry) => entry.id);

    const relatedIds = Array.from(new Set([...peers.map((entry) => entry.id), ...coreLinks]));
    byToolId[tool.id] = relatedIds;

    const sourceRoute = normalizeRoute(tool.route);
    byRoute[sourceRoute] = relatedIds
      .map((id) => tools.find((entry) => entry.id === id))
      .filter(Boolean)
      .map((entry) => normalizeRoute(entry.route));
  }

  return {
    generated_at: new Date().toISOString(),
    by_tool_id: byToolId,
    by_route: byRoute
  };
}

function metricCard(label, value, tone) {
  const toneClass = tone ? ` is-${tone}` : '';
  return `<div class="result-item"><div class="result-value${toneClass}">${escapeHtml(value)}</div><div class="result-label">${escapeHtml(label)}</div></div>`;
}

function renderFaqBlock(tool) {
  const faqs = [
    {
      q: `When should I use the ${tool.title}?`,
      a: `Use this tool as bedside decision support to structure pediatric assessment and dosing checks. Always confirm with local policy and attending/clinical pharmacist guidance.`
    },
    {
      q: 'Does this replace clinician judgment?',
      a: 'No. This calculator is designed for decision support only and must be interpreted in clinical context.'
    }
  ];

  const rows = faqs
    .map(
      (faq) =>
        `<div class="faq-item"><button class="faq-question">${escapeHtml(faq.q)}<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button><div class="faq-answer"><p>${escapeHtml(faq.a)}</p></div></div>`
    )
    .join('');

  return `<section class="faq-section"><div class="container"><h2>FAQ</h2>${rows}</div></section>`;
}

function renderJsonLd(tool, outDate) {
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    name: tool.title,
    description: tool.description,
    url: `https://tinyhumanmd.com${normalizeRoute(tool.route)}`,
    inLanguage: 'en-US',
    isAccessibleForFree: true,
    dateModified: outDate,
    specialty: {
      '@type': 'MedicalSpecialty',
      name: 'Pediatrics'
    },
    mainEntity: {
      '@type': 'WebApplication',
      name: tool.title,
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Any',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD'
      }
    }
  };
  return JSON.stringify(payload);
}

function renderCalculatorPage(tool, outDate, versionToken) {
  const seo = tool.seo || {};

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(seo.title || tool.title)}</title>
  <meta name="description" content="${escapeHtml(seo.description || tool.description)}" />
  <meta name="keywords" content="${escapeHtml((seo.keywords || []).join(', '))}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapeHtml(seo.canonical || '')}" />
  <meta property="og:title" content="${escapeHtml(seo.title || tool.title)}" />
  <meta property="og:description" content="${escapeHtml(seo.description || tool.description)}" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${escapeHtml(seo.title || tool.title)}" />
  <meta name="twitter:description" content="${escapeHtml(seo.description || tool.description)}" />
  <meta name="theme-color" content="#2563eb" />
  <link rel="canonical" href="${escapeHtml(seo.canonical || '')}" />
  <link rel="stylesheet" href="/shared/design.css" />
  <link rel="stylesheet" href="/calculators/calculators.css" />
</head>
<body>
  <a href="#main" class="skip-link">Skip to content</a>
  <div id="tool-nav-placeholder"></div>

  <main id="main">
    <section class="tool-hero">
      <div class="tool-hero-inner container">
        <span class="badge badge-blue">Pediatric Calculator</span>
        <h1 class="tool-title">${escapeHtml(tool.title)}</h1>
        <p class="tool-subtitle">${escapeHtml(tool.description)}</p>
      </div>
    </section>

    <section class="container calc-layout">
      <div class="tool-card">
        <h3>Calculator Inputs</h3>
        <form id="calc-form" novalidate>
          <div id="calc-inputs"></div>
          <div class="form-row">
            <button type="submit" class="btn btn-primary" id="calc-submit">Run Calculator</button>
            <button type="button" class="btn btn-secondary" id="calc-reset">Reset</button>
          </div>
        </form>
      </div>

      <div class="tool-card" id="calc-result" hidden>
        <h3 id="calc-result-title">Result</h3>
        <p id="calc-summary" class="calc-summary"></p>
        <div id="calc-metrics" class="result-grid"></div>
        <div id="calc-guidance" class="calc-guidance"></div>
        <div id="calc-cautions" class="calc-cautions"></div>
      </div>

      <div class="tool-card calc-safety">
        <h3>Clinical Safety Notes</h3>
        <ul>
          <li>Decision support only. Confirm all outputs with local protocol and current guidelines.</li>
          <li>Escalate immediately for unstable vitals, altered mental status, respiratory distress, or poor perfusion.</li>
          <li>For emergency concerns, direct patients to urgent or emergency care.</li>
        </ul>
      </div>
    </section>

    ${renderFaqBlock(tool)}
    <div id="related-tools-placeholder"></div>
  </main>

  <footer class="tool-footer">
    <div class="tool-footer-inner container">
      <p>TinyHumanMD provides practical pediatric decision support for bedside and clinic workflows.</p>
      <p class="disclaimer">Not a substitute for clinical judgment. Verify final dosing and treatment decisions.</p>
      <p class="footer-legal-links"><a href="/privacy/">Privacy</a><span>|</span><a href="/terms/">Terms</a></p>
    </div>
  </footer>

  <script type="application/ld+json">${renderJsonLd(tool, outDate)}</script>
  <script src="/shared/nav.js?v=${escapeHtml(versionToken)}"></script>
  <script src="/shared/analytics-config.js"></script>
  <script src="/shared/analytics.js"></script>
  <script src="/shared/seo.js?v=${escapeHtml(versionToken)}"></script>
  <script src="/calculators/common-calculator.js?v=${escapeHtml(versionToken)}" data-calc-id="${escapeHtml(tool.id)}"></script>
  <script>if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js?v=${escapeHtml(versionToken)}').catch(function(){});</script>
</body>
</html>
`;
}

function renderCategoryPage(category, calculators, outDate, versionToken) {
  const cards = calculators
    .map((tool) => {
      return `<a class="tool-link-card" href="${escapeHtml(normalizeRoute(tool.route))}"><h3>${escapeHtml(
        tool.title
      )}</h3><p>${escapeHtml(tool.description)}</p></a>`;
    })
    .join('');

  const canonical = `https://tinyhumanmd.com${normalizeRoute(category.route)}`;
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${category.title} Calculators`,
    description: category.description,
    url: canonical,
    dateModified: outDate,
    inLanguage: 'en-US'
  });

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(category.title)} Calculators | TinyHumanMD</title>
  <meta name="description" content="${escapeHtml(category.description)}" />
  <meta name="keywords" content="${escapeHtml((category.keywords || []).join(', '))}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapeHtml(canonical)}" />
  <meta property="og:title" content="${escapeHtml(category.title)} Calculators | TinyHumanMD" />
  <meta property="og:description" content="${escapeHtml(category.description)}" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <link rel="stylesheet" href="/shared/design.css" />
  <link rel="stylesheet" href="/calculators/calculators.css" />
</head>
<body>
  <a href="#main" class="skip-link">Skip to content</a>
  <div id="tool-nav-placeholder"></div>

  <main id="main">
    <section class="tool-hero">
      <div class="tool-hero-inner container">
        <span class="badge badge-green">Calculator Category</span>
        <h1 class="tool-title">${escapeHtml(category.title)}</h1>
        <p class="tool-subtitle">${escapeHtml(category.description)}</p>
      </div>
    </section>

    <section class="related-tools container">
      <h2>Available Calculators</h2>
      <div class="tools-grid">${cards}</div>
    </section>

    <div id="related-tools-placeholder"></div>
  </main>

  <footer class="tool-footer">
    <div class="tool-footer-inner container">
      <p>TinyHumanMD category hub for pediatric workflow calculators and quick clinical references.</p>
      <p class="disclaimer">Decision support only. Confirm with local protocol and current references.</p>
      <p class="footer-legal-links"><a href="/privacy/">Privacy</a><span>|</span><a href="/terms/">Terms</a></p>
    </div>
  </footer>

  <script type="application/ld+json">${jsonLd}</script>
  <script src="/shared/nav.js?v=${escapeHtml(versionToken)}"></script>
  <script src="/shared/analytics-config.js"></script>
  <script src="/shared/analytics.js"></script>
  <script src="/shared/seo.js?v=${escapeHtml(versionToken)}"></script>
  <script>if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js?v=${escapeHtml(versionToken)}').catch(function(){});</script>
</body>
</html>
`;
}

async function ensureDirForFile(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

function buildPlanDoc(selected, outDate) {
  const lines = [
    '# Calculator Rollout Plan',
    '',
    `Date: ${outDate}`,
    '',
    '## Scope',
    '',
    '- Top 8 calculators from deep-research action-plan context',
    '- Clinical pillar URL taxonomy and nav categories',
    '- SEO-first page metadata and schema generation',
    '',
    '## Ranked Calculators',
    '',
    '| Rank | Calculator | Category | Score | Wave |',
    '|---:|---|---|---:|---|'
  ];

  for (const item of selected) {
    lines.push(`| ${item.rank} | ${item.title} | ${item.category_slug} | ${item.score} | ${item.wave} |`);
  }

  lines.push('');
  lines.push('## Generated Interfaces');
  lines.push('');
  lines.push('- `data/calculators/registry.json` as source of truth for routes, metadata, and categories.');
  lines.push('- `data/calculators/internal-links.json` for contextual calculator cross-linking.');
  lines.push('- Category hubs under `/categories/*` and calculator pages under `/calculators/*`.');

  return lines.join('\n') + '\n';
}

function buildWavesDoc(selected, outDate) {
  const wave1 = selected.filter((item) => item.wave === 'wave_1');
  const wave2 = selected.filter((item) => item.wave === 'wave_2');

  const lines = [
    '# Calculator Rollout Waves',
    '',
    `Date: ${outDate}`,
    '',
    '## Wave 1 (Immediate Build)',
    ''
  ];

  for (const item of wave1) {
    lines.push(`- ${item.title} (route: ${item.route}; category: ${item.category_slug}; score: ${item.score})`);
  }

  lines.push('');
  lines.push('## Wave 2 (Next Iteration)');
  lines.push('');

  for (const item of wave2) {
    lines.push(`- ${item.title} (route: ${item.route}; category: ${item.category_slug}; score: ${item.score})`);
  }

  lines.push('');
  lines.push('## Category Hubs');
  lines.push('');
  for (const category of CATEGORIES) {
    lines.push(`- ${category.title}: ${category.route}`);
  }

  return lines.join('\n') + '\n';
}

function buildEvidenceDoc(sources, selected, outDate) {
  const lines = [
    '# Calculator Rollout Evidence',
    '',
    `Date: ${outDate}`,
    '',
    '## Context Sources',
    ''
  ];

  for (const source of sources) {
    lines.push(`- ${source.path}: ${source.exists ? 'loaded' : 'missing'}`);
  }

  lines.push('');
  lines.push('## Ranking Inputs');
  lines.push('');

  for (const item of selected) {
    lines.push(`- ${item.title}: all=${item.mentions.all}, gtm=${item.mentions.gtm}, roadmap=${item.mentions.roadmap}, backlog=${item.mentions.backlog}, strategy=${item.mentions.strategy}`);
  }

  return lines.join('\n') + '\n';
}

async function writeGeneratedPages(repoRoot, registry, outDate, versionToken) {
  const categories = Array.isArray(registry.categories) ? registry.categories : [];
  const tools = Array.isArray(registry.tools) ? registry.tools : [];
  const calculators = tools.filter((tool) => tool.type === 'calculator');
  const calculatorRoot = path.join(repoRoot, 'calculators');
  const categoryRoot = path.join(repoRoot, 'categories');

  const toolsByCategory = new Map();
  for (const category of categories) {
    toolsByCategory.set(category.slug, calculators.filter((tool) => tool.category_slug === category.slug));
  }

  const expectedCalculatorDirs = new Set(calculators.map((tool) => normalizeRoute(tool.route).split('/').filter(Boolean).slice(-1)[0]));
  const expectedCategoryDirs = new Set(categories.map((category) => normalizeRoute(category.route).split('/').filter(Boolean).slice(-1)[0]));

  try {
    const existingCalculatorEntries = await fs.readdir(calculatorRoot, { withFileTypes: true });
    for (const entry of existingCalculatorEntries) {
      if (!entry.isDirectory()) continue;
      if (!expectedCalculatorDirs.has(entry.name)) {
        await fs.rm(path.join(calculatorRoot, entry.name), { recursive: true, force: true });
      }
    }
  } catch (error) {
    if (!(error && error.code === 'ENOENT')) throw error;
  }

  try {
    const existingCategoryEntries = await fs.readdir(categoryRoot, { withFileTypes: true });
    for (const entry of existingCategoryEntries) {
      if (!entry.isDirectory()) continue;
      if (!expectedCategoryDirs.has(entry.name)) {
        await fs.rm(path.join(categoryRoot, entry.name), { recursive: true, force: true });
      }
    }
  } catch (error) {
    if (!(error && error.code === 'ENOENT')) throw error;
  }

  for (const tool of calculators) {
    const filePath = path.join(repoRoot, normalizeRoute(tool.route), 'index.html');
    await ensureDirForFile(filePath);
    await fs.writeFile(filePath, renderCalculatorPage(tool, outDate, versionToken), 'utf8');
  }

  for (const category of categories) {
    const filePath = path.join(repoRoot, normalizeRoute(category.route), 'index.html');
    await ensureDirForFile(filePath);
    await fs.writeFile(filePath, renderCategoryPage(category, toolsByCategory.get(category.slug) || [], outDate, versionToken), 'utf8');
  }
}

export async function runCalculatorRollout(options = {}) {
  const repoRoot = options.repoRoot || REPO_ROOT;
  const outDate = options.outDate || todayIsoDate();
  const topLimit = Number(options.topLimit || 8);
  const apply = Boolean(options.apply);
  const contextFiles = Array.isArray(options.contextFiles) && options.contextFiles.length > 0
    ? options.contextFiles
    : DEFAULT_CONTEXT_FILES;

  const sources = await readContext(repoRoot, contextFiles);
  const missingRequired = sources.filter((source) => !source.exists);
  if (missingRequired.length > 0) {
    throw new Error(`Missing required context files: ${missingRequired.map((entry) => entry.path).join(', ')}`);
  }

  const corpus = buildSourceCorpus(sources);
  const selected = rankCalculatorCandidates(corpus, topLimit);
  const registry = buildRegistry(selected, outDate);
  const internalLinks = generateInternalLinks(registry);

  const planDoc = buildPlanDoc(selected, outDate);
  const wavesDoc = buildWavesDoc(selected, outDate);
  const evidenceDoc = buildEvidenceDoc(sources, selected, outDate);

  const outputs = {
    registry,
    internal_links: internalLinks,
    docs: {
      plan: planDoc,
      waves: wavesDoc,
      evidence: evidenceDoc
    }
  };

  if (apply) {
    const registryPath = path.join(repoRoot, 'data', 'calculators', 'registry.json');
    const linksPath = path.join(repoRoot, 'data', 'calculators', 'internal-links.json');
    const planPath = path.join(repoRoot, 'docs', `CALCULATOR_ROLLOUT_PLAN_${outDate}.md`);
    const wavesPath = path.join(repoRoot, 'docs', `CALCULATOR_ROLLOUT_WAVES_${outDate}.md`);
    const evidencePath = path.join(repoRoot, 'docs', `CALCULATOR_ROLLOUT_EVIDENCE_${outDate}.md`);

    await ensureDirForFile(registryPath);
    await ensureDirForFile(linksPath);
    await ensureDirForFile(planPath);
    await ensureDirForFile(wavesPath);
    await ensureDirForFile(evidencePath);

    await fs.writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
    await fs.writeFile(linksPath, `${JSON.stringify(internalLinks, null, 2)}\n`, 'utf8');
    await fs.writeFile(planPath, planDoc, 'utf8');
    await fs.writeFile(wavesPath, wavesDoc, 'utf8');
    await fs.writeFile(evidencePath, evidenceDoc, 'utf8');

    await writeGeneratedPages(repoRoot, registry, outDate, VERSION_TOKEN);
    await buildSeoArtifacts({ repoRoot, registry, outDate, writeOutputs: true });
  }

  return {
    out_date: outDate,
    sources,
    selected,
    registry,
    internal_links: internalLinks,
    apply
  };
}

function parseArgs(argv) {
  const args = {
    apply: false,
    topLimit: 8,
    outDate: todayIsoDate()
  };

  for (const token of argv) {
    if (token === '--apply') args.apply = true;
    if (token.startsWith('--top=')) args.topLimit = Number(token.slice('--top='.length));
    if (token.startsWith('--date=')) args.outDate = token.slice('--date='.length);
  }

  return args;
}

async function runCli() {
  const args = parseArgs(process.argv.slice(2));
  const result = await runCalculatorRollout({
    repoRoot: REPO_ROOT,
    apply: args.apply,
    topLimit: args.topLimit,
    outDate: args.outDate
  });

  process.stdout.write(
    JSON.stringify(
      {
        status: 'ok',
        apply: result.apply,
        out_date: result.out_date,
        selected: result.selected.map((entry) => ({
          rank: entry.rank,
          id: entry.id,
          score: entry.score,
          wave: entry.wave
        }))
      },
      null,
      2
    ) + '\n'
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().catch((error) => {
    console.error(error && error.stack ? error.stack : String(error));
    process.exit(1);
  });
}
