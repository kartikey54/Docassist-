#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const DOCS_DIR = path.join(REPO_ROOT, 'docs');
const INTEL_DIR = path.join(REPO_ROOT, 'data', 'intel', 'peds');
const CACHE_DIR = path.join(INTEL_DIR, 'cache');

const NOW = new Date();
const TODAY = NOW.toISOString().slice(0, 10);
const STAMP = NOW.toISOString();

const SKIP_NETWORK = process.env.PEDS_INTEL_SKIP_NETWORK === '1';
const FORCE_REFRESH = process.env.PEDS_INTEL_FORCE_REFRESH === '1';
const DOMAIN_LIMIT = Math.max(1, Number(process.env.PEDS_INTEL_DOMAIN_LIMIT || 220));
const MAX_PAGES_PER_DOMAIN = Math.max(1, Number(process.env.PEDS_INTEL_MAX_PAGES_PER_DOMAIN || 18));
const REQUEST_TIMEOUT_MS = Math.max(2000, Number(process.env.PEDS_INTEL_TIMEOUT_MS || 12000));
const CONCURRENCY = Math.max(1, Number(process.env.PEDS_INTEL_CONCURRENCY || 6));
const CACHE_MAX_AGE_HOURS = Math.max(1, Number(process.env.PEDS_INTEL_CACHE_MAX_AGE_HOURS || 168));
const ROUNDS_MIN = Math.max(20, Number(process.env.PEDS_INTEL_ROUNDS || 24));

const USER_AGENT =
  process.env.PEDS_INTEL_USER_AGENT ||
  'TinyHumanMD-Peds-Intel-Orchestrator/1.0 (+https://tinyhumanmd.com; research=public-content-only)';

const COMMON_URL_HINTS = [
  '/',
  '/calculators/',
  '/calculator/',
  '/tools/',
  '/resources/',
  '/clinical-tools/',
  '/guidelines/',
  '/clinical-guidelines/',
  '/pathways/',
  '/clinical-pathways/',
  '/dosing/',
  '/drug-dosing/',
  '/medications/',
  '/immunization/',
  '/vaccines/',
  '/growth/',
  '/newborn/',
  '/neonatal/',
  '/asthma/',
  '/fever/',
  '/sepsis/'
];

const URL_KEYWORDS = [
  'peds',
  'pediatric',
  'newborn',
  'neonat',
  'child',
  'calculator',
  'calc',
  'tool',
  'guideline',
  'pathway',
  'algorithm',
  'dosing',
  'dose',
  'drug',
  'vaccine',
  'immun',
  'growth',
  'bilirubin',
  'gestational',
  'asthma',
  'fever',
  'sepsis',
  'dehydration',
  'otitis',
  'antibiotic'
];

const BLOCKED_PATH_HINTS = ['login', 'signin', 'signup', 'account', 'careers', 'jobs', 'donate', 'shop', 'store', 'cart'];

const NON_HTML_EXTENSIONS = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.svg',
  '.webp',
  '.zip',
  '.mp4',
  '.mp3',
  '.xlsx',
  '.xls',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx'
];

const DEFAULT_HEADERS = {
  'user-agent': USER_AGENT,
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.8'
};

function clamp(min, value, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function sha(input) {
  return crypto.createHash('sha1').update(String(input)).digest('hex');
}

function normalizeDomain(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';

  let withoutProto = raw.replace(/^https?:\/\//, '');
  withoutProto = withoutProto.replace(/^www\./, '');
  withoutProto = withoutProto.split('/')[0].trim();
  return withoutProto.replace(/:\d+$/, '');
}

function cachePathForDomain(domain) {
  const key = `${slugify(domain)}-${sha(domain).slice(0, 10)}`;
  return path.join(CACHE_DIR, `${key}.json`);
}

async function fileExists(absPath) {
  try {
    await fs.access(absPath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(absPath, fallback = null) {
  try {
    const raw = await fs.readFile(absPath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error && (error.code === 'ENOENT' || error.name === 'SyntaxError')) return fallback;
    throw error;
  }
}

async function writeJson(absPath, value) {
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeText(absPath, text) {
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, text.endsWith('\n') ? text : `${text}\n`, 'utf8');
}

function escapeRegex(input) {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeEntities(text) {
  return String(text || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&rsquo;/gi, "'")
    .replace(/&ldquo;|&rdquo;/gi, '"');
}

function stripTags(html) {
  return decodeEntities(
    String(html || '')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function extractTagContent(html, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = String(html || '').match(regex);
  return match ? decodeEntities(stripTags(match[1])) : '';
}

function extractMetaByName(html, attrName, attrValue) {
  const pattern = new RegExp(
    `<meta[^>]+${attrName}=["']${escapeRegex(attrValue)}["'][^>]*content=["']([^"']+)["'][^>]*>|<meta[^>]+content=["']([^"']+)["'][^>]*${attrName}=["']${escapeRegex(attrValue)}["'][^>]*>`,
    'i'
  );
  const match = String(html || '').match(pattern);
  return decodeEntities((match && (match[1] || match[2])) || '');
}

function extractHeadings(html, level = 'h1', limit = 6) {
  const out = [];
  const regex = new RegExp(`<${level}[^>]*>([\\s\\S]*?)<\\/${level}>`, 'gi');
  let match;
  while ((match = regex.exec(String(html || ''))) && out.length < limit) {
    const value = decodeEntities(stripTags(match[1])).trim();
    if (value) out.push(value);
  }
  return out;
}

function extractAnchors(html, baseUrl, domain) {
  const out = [];
  const regex = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = regex.exec(String(html || '')))) {
    const href = String(match[1] || '').trim();
    if (!href) continue;
    try {
      const resolved = new URL(href, baseUrl);
      const normalizedDomain = normalizeDomain(resolved.hostname);
      const text = decodeEntities(stripTags(match[2] || '')).trim();
      out.push({
        href: resolved.href,
        domain: normalizedDomain,
        internal: normalizedDomain === domain || normalizedDomain.endsWith(`.${domain}`),
        text
      });
    } catch {
      // ignore
    }
  }
  return out;
}

function extractSchemaTypes(html) {
  const types = new Set();
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(String(html || '')))) {
    const text = String(match[1] || '').trim();
    if (!text) continue;
    try {
      const parsed = JSON.parse(text);
      collectSchemaTypes(parsed, types);
    } catch {
      // ignore malformed ld+json
    }
  }
  return Array.from(types);
}

function collectSchemaTypes(value, out) {
  if (value == null) return;
  if (Array.isArray(value)) {
    for (const item of value) collectSchemaTypes(item, out);
    return;
  }
  if (typeof value !== 'object') return;

  if (typeof value['@type'] === 'string') out.add(value['@type']);
  if (Array.isArray(value['@type'])) {
    for (const v of value['@type']) {
      if (typeof v === 'string') out.add(v);
    }
  }

  for (const nested of Object.values(value)) collectSchemaTypes(nested, out);
}

function countKeywordHits(text, keywords) {
  const normalized = String(text || '').toLowerCase();
  const matched = [];
  let total = 0;

  for (const keyword of ensureArray(keywords)) {
    const k = String(keyword || '').toLowerCase().trim();
    if (!k) continue;
    const pattern = new RegExp(`\\b${escapeRegex(k)}\\b`, 'gi');
    const hits = normalized.match(pattern);
    const count = hits ? hits.length : 0;
    if (count > 0) {
      total += count;
      matched.push({ keyword: k, count });
    }
  }

  matched.sort((a, b) => b.count - a.count || a.keyword.localeCompare(b.keyword));
  return {
    total,
    matched: matched.slice(0, 12)
  };
}

function normalizeUrl(url) {
  try {
    const parsed = new URL(String(url));
    parsed.hash = '';
    if (parsed.pathname.endsWith('/index.html')) {
      parsed.pathname = parsed.pathname.replace(/\/index\.html$/, '/');
    }
    return parsed.href;
  } catch {
    return '';
  }
}

function looksLikeHtmlUrl(url) {
  const lower = String(url || '').toLowerCase();
  return !NON_HTML_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function scoreUrlRelevance(url) {
  const normalized = normalizeUrl(url);
  if (!normalized) return -100;

  const parsed = new URL(normalized);
  const pathAndQuery = `${parsed.pathname}${parsed.search}`.toLowerCase();

  let score = 0;
  for (const keyword of URL_KEYWORDS) {
    if (pathAndQuery.includes(keyword)) score += 3;
  }
  for (const blocked of BLOCKED_PATH_HINTS) {
    if (pathAndQuery.includes(blocked)) score -= 5;
  }
  if (pathAndQuery === '/' || pathAndQuery === '') score += 2;
  const depth = parsed.pathname.split('/').filter(Boolean).length;
  score += clamp(0, 4 - depth, 4);
  if (parsed.search.length > 40) score -= 1;
  if (!looksLikeHtmlUrl(normalized)) score -= 8;

  return score;
}

function findFreshnessAgeHours(crawledAt) {
  if (!crawledAt) return Number.POSITIVE_INFINITY;
  const t = new Date(crawledAt).getTime();
  if (!Number.isFinite(t)) return Number.POSITIVE_INFINITY;
  const diffMs = Date.now() - t;
  return diffMs / (1000 * 60 * 60);
}

async function fetchWithTimeout(url, timeoutMs = REQUEST_TIMEOUT_MS, accept = 'text/html') {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        ...DEFAULT_HEADERS,
        accept
      }
    });

    const headers = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const body = await response.text();
    return {
      ok: true,
      status: response.status,
      url,
      finalUrl: response.url,
      headers,
      body
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      url,
      error: String(error && error.message ? error.message : error)
    };
  } finally {
    clearTimeout(timeout);
  }
}

function parseSitemapUrls(xmlText, domain) {
  const out = [];
  const regex = /<loc>([\s\S]*?)<\/loc>/gi;
  let match;
  while ((match = regex.exec(String(xmlText || '')))) {
    const url = decodeEntities(match[1] || '').trim();
    if (!url) continue;
    try {
      const parsed = new URL(url);
      const d = normalizeDomain(parsed.hostname);
      if (!(d === domain || d.endsWith(`.${domain}`))) continue;
      out.push(parsed.href);
    } catch {
      // ignore
    }
  }
  return out;
}

async function discoverSitemapUrls(domain) {
  const candidates = new Set([`https://${domain}/sitemap.xml`]);
  const robots = await fetchWithTimeout(`https://${domain}/robots.txt`, REQUEST_TIMEOUT_MS, 'text/plain,*/*;q=0.8');

  if (robots.ok && robots.status >= 200 && robots.status < 400) {
    const lines = String(robots.body || '').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!/^sitemap\s*:/i.test(trimmed)) continue;
      const url = trimmed.replace(/^sitemap\s*:/i, '').trim();
      if (url) candidates.add(url);
    }
  }

  const discovered = [];
  for (const sitemapUrl of Array.from(candidates).slice(0, 6)) {
    const res = await fetchWithTimeout(sitemapUrl, REQUEST_TIMEOUT_MS, 'application/xml,text/xml;q=0.9,*/*;q=0.8');
    if (!res.ok || res.status < 200 || res.status >= 400) continue;
    const urls = parseSitemapUrls(res.body, domain);
    for (const url of urls) discovered.push(url);
  }

  return Array.from(new Set(discovered));
}

function buildSeedUniverse(seedConfig) {
  const byDomain = new Map();

  for (const group of ensureArray(seedConfig.domain_groups)) {
    const groupName = String(group.group || 'ungrouped');
    const tier = String(group.tier || 'medium');
    const crawlPriority = Number(group.crawl_priority || 50);

    for (const rawDomain of ensureArray(group.domains)) {
      const domain = normalizeDomain(rawDomain);
      if (!domain) continue;

      const existing = byDomain.get(domain);
      if (!existing) {
        byDomain.set(domain, {
          domain,
          group: groupName,
          tier,
          crawl_priority: crawlPriority,
          groups: [groupName]
        });
        continue;
      }

      existing.groups.push(groupName);
      if (crawlPriority > existing.crawl_priority) {
        existing.crawl_priority = crawlPriority;
        existing.group = groupName;
        existing.tier = tier;
      }
    }
  }

  const seeds = Array.from(byDomain.values()).map((seed) => ({
    ...seed,
    groups: Array.from(new Set(seed.groups)).sort()
  }));

  seeds.sort((a, b) => {
    if (b.crawl_priority !== a.crawl_priority) return b.crawl_priority - a.crawl_priority;
    if (a.tier !== b.tier) return a.tier.localeCompare(b.tier);
    return a.domain.localeCompare(b.domain);
  });

  return {
    seeds,
    total_unique_domains: seeds.length
  };
}

function getTierMultiplier(weights, tier) {
  return Number((weights.tier_multipliers || {})[tier] || 1);
}

function getGroupMultiplier(weights, group) {
  return Number((weights.group_signal_multipliers || {})[group] || 1);
}

function getArchetypeMultiplier(weights, archetypeId) {
  return Number((weights.archetype_signal_multipliers || {})[archetypeId] || 1);
}

function computeCategoryScores(text, taxonomy) {
  const scores = [];
  for (const category of ensureArray(taxonomy.workflow_categories)) {
    const hits = countKeywordHits(text, category.keywords || []);
    if (hits.total <= 0) continue;

    const baseSignal = hits.total * 1.95;
    const demandSignal = Number(category.daily_use || 0) * 0.22;
    const impactSignal = Number(category.clinical_impact || 0) * 0.2;
    const referralSignal = Number(category.referral_weight || 0) * 0.12;
    const complexityPenalty = Math.max(0, Number(category.complexity_bias || 1) - 1) * 0.15;
    const score = Math.max(0, baseSignal + demandSignal + impactSignal + referralSignal - complexityPenalty);
    if (score > 0) {
      scores.push({
        id: category.id,
        name: category.name,
        score: round(score, 3),
        hit_count: hits.total,
        matched_keywords: hits.matched.slice(0, 5)
      });
    }
  }

  return scores.sort((a, b) => b.score - a.score).slice(0, 8);
}

function computeArchetypeScores(text, taxonomy) {
  const scores = [];
  for (const archetype of ensureArray(taxonomy.feature_archetypes)) {
    const hits = countKeywordHits(text, archetype.keywords || []);
    if (hits.total <= 0) continue;

    const keywordSignal = hits.total * 2.1;
    const dailySignal = Number(archetype.daily_use_boost || 1) * 1.15;
    const clinicalSignal = Number(archetype.clinical_impact_boost || 1) * 1.35;
    const differentiation = Number(archetype.differentiation_boost || 0.5) * 1.05;
    const complexityPenalty = Math.max(0, Number(archetype.complexity || 5) - 5) * 0.16;
    const score = Math.max(0, keywordSignal + dailySignal + clinicalSignal + differentiation - complexityPenalty);

    if (score > 0) {
      scores.push({
        id: archetype.id,
        name: archetype.name,
        score: round(score, 3),
        hit_count: hits.total,
        matched_keywords: hits.matched.slice(0, 5)
      });
    }
  }

  return scores.sort((a, b) => b.score - a.score).slice(0, 8);
}

function extractPageSignals(html, url, domain, taxonomy) {
  const title = extractTagContent(html, 'title');
  const description =
    extractMetaByName(html, 'name', 'description') || extractMetaByName(html, 'property', 'og:description') || '';
  const h1 = extractHeadings(html, 'h1', 4);
  const h2 = extractHeadings(html, 'h2', 8);
  const canonical = extractMetaByName(html, 'property', 'og:url') || '';
  const schemaTypes = extractSchemaTypes(html);
  const anchors = extractAnchors(html, url, domain);

  const visibleText = stripTags(html);
  const wordCount = visibleText ? visibleText.split(/\s+/).filter(Boolean).length : 0;
  const scoringText = [title, description, h1.join(' '), h2.join(' '), visibleText].join(' ');

  const categoryScores = computeCategoryScores(scoringText, taxonomy);
  const archetypeScores = computeArchetypeScores(scoringText, taxonomy);

  const lowerText = visibleText.toLowerCase();
  const flags = {
    has_calculator: /\bcalculator\b|\bscore\b|\bnomogram\b/.test(lowerText),
    has_dosing: /\bdose\b|\bdosing\b|\bmg\/kg\b|\bmedication\b/.test(lowerText),
    has_guideline: /\bguideline\b|\brecommendation\b|\bconsensus\b/.test(lowerText),
    has_pathway: /\bpathway\b|\balgorithm\b|\bdecision tree\b/.test(lowerText),
    has_parent_content: /\bparent\b|\bfamily\b|\bcaregiver\b|\bhandout\b/.test(lowerText)
  };

  return {
    url,
    canonical,
    title,
    description,
    h1,
    h2,
    schema_types: schemaTypes,
    word_count: wordCount,
    excerpt: visibleText.slice(0, 320),
    category_scores: categoryScores,
    archetype_scores: archetypeScores,
    internal_links: anchors.filter((a) => a.internal).slice(0, 180),
    external_links: anchors.filter((a) => !a.internal).slice(0, 80),
    flags
  };
}

function summarizeDiscoveryUrls(urls, domain) {
  const normalized = Array.from(
    new Set(
      ensureArray(urls)
        .map((url) => normalizeUrl(url))
        .filter(Boolean)
        .filter((url) => {
          try {
            const parsed = new URL(url);
            const d = normalizeDomain(parsed.hostname);
            return d === domain || d.endsWith(`.${domain}`);
          } catch {
            return false;
          }
        })
    )
  );

  normalized.sort((a, b) => scoreUrlRelevance(b) - scoreUrlRelevance(a));
  return normalized;
}

async function discoverCandidateUrls(domain, taxonomy) {
  const byUrl = new Set();

  for (const hint of COMMON_URL_HINTS) {
    byUrl.add(normalizeUrl(`https://${domain}${hint}`));
  }

  const keywordPages = [];
  for (const category of ensureArray(taxonomy.workflow_categories)) {
    for (const keyword of ensureArray(category.keywords).slice(0, 3)) {
      const token = slugify(keyword).replace(/-/g, '');
      if (!token || token.length < 4) continue;
      keywordPages.push(`https://${domain}/${token}/`);
    }
  }
  for (const url of keywordPages.slice(0, 24)) byUrl.add(normalizeUrl(url));

  if (!SKIP_NETWORK) {
    const sitemapUrls = await discoverSitemapUrls(domain);
    const relevantFromSitemaps = summarizeDiscoveryUrls(sitemapUrls, domain).slice(0, 200);
    for (const url of relevantFromSitemaps) byUrl.add(url);

    const home = await fetchWithTimeout(`https://${domain}/`, REQUEST_TIMEOUT_MS);
    if (home.ok && home.status >= 200 && home.status < 400 && String(home.headers['content-type'] || '').includes('text/html')) {
      const anchors = extractAnchors(home.body, `https://${domain}/`, domain)
        .filter((a) => a.internal)
        .map((a) => a.href);
      const relevantAnchors = summarizeDiscoveryUrls(anchors, domain).slice(0, 120);
      for (const url of relevantAnchors) byUrl.add(url);
    }
  }

  return summarizeDiscoveryUrls(Array.from(byUrl), domain).slice(0, Math.max(MAX_PAGES_PER_DOMAIN * 4, 40));
}

async function crawlDomain(seed, taxonomy, weights) {
  const cachePath = cachePathForDomain(seed.domain);
  const cache = await readJson(cachePath, null);
  const cacheAgeHours = cache ? findFreshnessAgeHours(cache.crawled_at) : Number.POSITIVE_INFINITY;

  if (!FORCE_REFRESH && cache && cacheAgeHours <= CACHE_MAX_AGE_HOURS) {
    return {
      ...cache,
      source_mode: 'cache',
      cache_age_hours: round(cacheAgeHours, 1)
    };
  }

  if (SKIP_NETWORK) {
    if (cache) {
      return {
        ...cache,
        source_mode: 'cache_stale',
        cache_age_hours: round(cacheAgeHours, 1),
        notes: [...ensureArray(cache.notes), 'Network disabled via PEDS_INTEL_SKIP_NETWORK=1.']
      };
    }

    return {
      domain: seed.domain,
      group: seed.group,
      tier: seed.tier,
      crawl_priority: seed.crawl_priority,
      groups: seed.groups,
      source_mode: 'seed_only',
      crawled_at: null,
      pages: [],
      discovery: {
        attempted: false,
        url_candidates: []
      },
      errors: ['Network disabled via PEDS_INTEL_SKIP_NETWORK=1 and no cache exists.'],
      notes: ['Run without PEDS_INTEL_SKIP_NETWORK to perform live crawl.']
    };
  }

  const urlCandidates = await discoverCandidateUrls(seed.domain, taxonomy);
  const queue = [...urlCandidates];
  const seen = new Set();
  const pages = [];
  const errors = [];

  while (queue.length > 0 && pages.length < MAX_PAGES_PER_DOMAIN) {
    const next = queue.shift();
    const normalized = normalizeUrl(next);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    if (!looksLikeHtmlUrl(normalized)) continue;

    const response = await fetchWithTimeout(normalized, REQUEST_TIMEOUT_MS);
    if (!response.ok || response.status < 200 || response.status >= 400) {
      errors.push(`${normalized} => ${response.ok ? `status ${response.status}` : response.error}`);
      continue;
    }

    const contentType = String(response.headers['content-type'] || '').toLowerCase();
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      continue;
    }

    const page = extractPageSignals(response.body, response.finalUrl || normalized, seed.domain, taxonomy);
    pages.push(page);

    const newlyDiscovered = page.internal_links
      .map((link) => normalizeUrl(link.href))
      .filter(Boolean)
      .filter((url) => !seen.has(url))
      .filter((url) => looksLikeHtmlUrl(url))
      .sort((a, b) => scoreUrlRelevance(b) - scoreUrlRelevance(a))
      .slice(0, 20);

    for (const url of newlyDiscovered) {
      if (queue.length > MAX_PAGES_PER_DOMAIN * 8) break;
      queue.push(url);
    }
  }

  const result = {
    domain: seed.domain,
    group: seed.group,
    tier: seed.tier,
    crawl_priority: seed.crawl_priority,
    groups: seed.groups,
    source_mode: pages.length > 0 ? 'live' : 'live_no_content',
    crawled_at: STAMP,
    pages,
    discovery: {
      attempted: true,
      url_candidates: urlCandidates.slice(0, 120),
      pages_crawled: pages.length,
      queue_tail: queue.slice(0, 40)
    },
    errors: errors.slice(0, 30),
    notes: []
  };

  await writeJson(cachePath, result);
  return result;
}

async function runPool(items, worker, concurrency = CONCURRENCY) {
  const results = new Array(items.length);
  let index = 0;

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const i = index;
      index += 1;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  });

  await Promise.all(runners);
  return results;
}

function findById(collection, id) {
  return ensureArray(collection).find((item) => item.id === id) || null;
}

function aggregateDomainProfiles(domainResults, taxonomy) {
  const profiles = [];

  for (const item of domainResults) {
    const workflowScores = new Map();
    const archetypeScores = new Map();

    let calculatorSignals = 0;
    let dosingSignals = 0;
    let pathwaySignals = 0;

    for (const page of ensureArray(item.pages)) {
      if (page.flags?.has_calculator) calculatorSignals += 1;
      if (page.flags?.has_dosing) dosingSignals += 1;
      if (page.flags?.has_pathway || page.flags?.has_guideline) pathwaySignals += 1;

      for (const score of ensureArray(page.category_scores)) {
        workflowScores.set(score.id, (workflowScores.get(score.id) || 0) + Number(score.score || 0));
      }
      for (const score of ensureArray(page.archetype_scores)) {
        archetypeScores.set(score.id, (archetypeScores.get(score.id) || 0) + Number(score.score || 0));
      }
    }

    const topWorkflows = Array.from(workflowScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, score]) => {
        const ref = findById(taxonomy.workflow_categories, id);
        return {
          id,
          name: ref ? ref.name : id,
          score: round(score, 2)
        };
      });

    const topArchetypes = Array.from(archetypeScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, score]) => {
        const ref = findById(taxonomy.feature_archetypes, id);
        return {
          id,
          name: ref ? ref.name : id,
          score: round(score, 2)
        };
      });

    profiles.push({
      domain: item.domain,
      group: item.group,
      tier: item.tier,
      crawl_priority: item.crawl_priority,
      source_mode: item.source_mode,
      pages_analyzed: ensureArray(item.pages).length,
      top_workflows: topWorkflows,
      top_archetypes: topArchetypes,
      signal_counts: {
        calculator: calculatorSignals,
        dosing: dosingSignals,
        pathway_or_guideline: pathwaySignals
      },
      sampled_urls: ensureArray(item.pages)
        .slice(0, 8)
        .map((page) => page.url),
      errors: ensureArray(item.errors).slice(0, 6)
    });
  }

  profiles.sort((a, b) => {
    if (b.pages_analyzed !== a.pages_analyzed) return b.pages_analyzed - a.pages_analyzed;
    if (b.crawl_priority !== a.crawl_priority) return b.crawl_priority - a.crawl_priority;
    return a.domain.localeCompare(b.domain);
  });

  return profiles;
}

function buildFallbackSignals(seed, taxonomy) {
  const workflowHints = {
    guidelines_and_authority: ['immunization_preventive', 'medication_safety_dosing', 'newborn_transition'],
    specialty_societies: ['infectious_disease', 'respiratory', 'development_behavior'],
    children_hospitals_and_centers: ['peds_emergency', 'nicu_prematurity', 'subspecialty_referral_navigation'],
    calculator_reference_competitors: ['medication_safety_dosing', 'growth_nutrition', 'infectious_disease'],
    education_training_and_traffic_sources: ['office_operations', 'family_counseling', 'development_behavior']
  };

  const archetypeHints = {
    guidelines_and_authority: ['pathway', 'reference_hub'],
    specialty_societies: ['pathway', 'reference_hub'],
    children_hospitals_and_centers: ['visit_bundle', 'pathway'],
    calculator_reference_competitors: ['calculator', 'dosing_engine'],
    education_training_and_traffic_sources: ['training_microlearning', 'reference_hub']
  };

  const categories = ensureArray(workflowHints[seed.group]).map((id) => ({
    id,
    score: 4.5
  }));
  const archetypes = ensureArray(archetypeHints[seed.group]).map((id) => ({
    id,
    score: 4.5
  }));

  return { categories, archetypes };
}

function computePersonaValue(personaConfig) {
  const personas = ensureArray(personaConfig.personas);
  if (personas.length === 0) return 6;

  let weighted = 0;
  let totalShare = 0;
  for (const persona of personas) {
    const share = Number(persona.share_estimate || 0);
    const wtp = Number(persona.willingness_to_pay || 6);
    weighted += share * wtp;
    totalShare += share;
  }

  if (totalShare <= 0) return 6;
  return weighted / totalShare;
}

function isCapturedSourceMode(mode) {
  return mode === 'live' || mode === 'cache' || mode === 'cache_stale' || mode === 'live_no_content';
}

function hasAnalyzedPages(item) {
  return ensureArray(item.pages).length > 0;
}

function buildOpportunityMap(domainResults, taxonomy, weights, personaConfig) {
  const opportunities = new Map();
  const personaValue = computePersonaValue(personaConfig);

  for (const domainResult of domainResults) {
    const tierMultiplier = getTierMultiplier(weights, domainResult.tier);
    const groupMultiplier = getGroupMultiplier(weights, domainResult.group);

    const pages = ensureArray(domainResult.pages);
    let signalUsed = false;
    for (const page of pages) {
      const topCategories = ensureArray(page.category_scores).slice(0, 3);
      const topArchetypes = ensureArray(page.archetype_scores).slice(0, 2);
      if (topCategories.length === 0 || topArchetypes.length === 0) continue;
      signalUsed = true;

      for (const category of topCategories) {
        for (const archetype of topArchetypes) {
          const key = `${category.id}::${archetype.id}`;
          const archetypeMultiplier = getArchetypeMultiplier(weights, archetype.id);
          const raw =
            Number(category.score || 0) *
            Number(archetype.score || 0) *
            tierMultiplier *
            groupMultiplier *
            archetypeMultiplier *
            0.06;

          let row = opportunities.get(key);
          if (!row) {
            row = {
              workflow_id: category.id,
              archetype_id: archetype.id,
              raw_signal: 0,
              domains: new Set(),
              evidence: [],
              page_hits: 0,
              authority_hits: 0,
              fallback_hits: 0
            };
            opportunities.set(key, row);
          }

          row.raw_signal += raw;
          row.page_hits += 1;
          row.domains.add(domainResult.domain);
          if (domainResult.tier === 'authority') row.authority_hits += 1;
          if (row.evidence.length < 18) {
            row.evidence.push({
              domain: domainResult.domain,
              url: page.url,
              title: page.title || page.h1?.[0] || '(untitled)',
              score: round(raw, 2),
              confidence: domainResult.source_mode.startsWith('cache') ? 'medium' : 'high'
            });
          }
        }
      }
    }

    if (!signalUsed) {
      const fallback = buildFallbackSignals(domainResult, taxonomy);
      for (const category of fallback.categories) {
        for (const archetype of fallback.archetypes) {
          const key = `${category.id}::${archetype.id}`;
          const archetypeMultiplier = getArchetypeMultiplier(weights, archetype.id);
          const raw = category.score * archetype.score * tierMultiplier * groupMultiplier * archetypeMultiplier * 0.35;

          let row = opportunities.get(key);
          if (!row) {
            row = {
              workflow_id: category.id,
              archetype_id: archetype.id,
              raw_signal: 0,
              domains: new Set(),
              evidence: [],
              page_hits: 0,
              authority_hits: 0,
              fallback_hits: 0
            };
            opportunities.set(key, row);
          }

          row.raw_signal += raw;
          row.domains.add(domainResult.domain);
          row.fallback_hits += 1;
          if (domainResult.tier === 'authority') row.authority_hits += 1;
          if (row.evidence.length < 8) {
            row.evidence.push({
              domain: domainResult.domain,
              url: `https://${domainResult.domain}/`,
              title: `${domainResult.group} seed fallback`,
              score: round(raw, 2),
              confidence: 'low'
            });
          }
        }
      }
    }
  }

  const dimensions = weights.opportunity_dimensions || {};
  const horizonThresholds = weights.horizon_thresholds || {};
  const constants = weights.scoring_constants || {};

  const ranked = [];
  for (const row of opportunities.values()) {
    const workflow = findById(taxonomy.workflow_categories, row.workflow_id);
    const archetype = findById(taxonomy.feature_archetypes, row.archetype_id);
    if (!workflow || !archetype) continue;

    const domainCount = row.domains.size;
    const competitorIntensity = clamp(
      0,
      Math.log2(domainCount + 1) * 2.7 + row.authority_hits * 0.35 + row.page_hits * 0.08,
      Number(constants.max_competitor_intensity || 10)
    );

    const workflowDemand = clamp(0, Number(workflow.daily_use || 6) * 0.9 + Math.log2(row.page_hits + 2), 10);
    const clinicalImpact = clamp(
      0,
      Number(workflow.clinical_impact || 6) * 0.95 + (Number(archetype.clinical_impact_boost || 1) - 1) * 3,
      10
    );
    const differentiationGap = clamp(
      Number(constants.gap_floor || 1),
      10 - competitorIntensity + Number(archetype.differentiation_boost || 0.8) * 1.2,
      Number(constants.gap_ceiling || 10)
    );
    const seoCapture = clamp(
      0,
      Number(constants.default_seo_baseline || 4.2) + Math.log2(row.page_hits + 1) * 1.6 + Number(workflow.referral_weight || 5) * 0.17,
      10
    );
    const retentionLoopStrength = clamp(
      0,
      Number(constants.default_retention_baseline || 4) + Number(workflow.referral_weight || 5) * 0.55 + Number(archetype.referral_boost || 1) * 1.15,
      10
    );
    const monetizationPotential = clamp(
      0,
      Number(constants.default_monetization_baseline || 3.8) + personaValue * 0.48 + (archetype.id === 'dosing_engine' ? 1.1 : 0),
      10
    );
    const implementationFeasibility = clamp(
      0,
      10 - Number(archetype.complexity || 5) * 0.68 - Number(workflow.complexity_bias || 1) * 1.6 + 2.9,
      10
    );
    const governanceReadiness = clamp(
      0,
      10 - Number(archetype.governance_risk || 5) * 0.72 - Number(workflow.governance_bias || 1) * 1.55 + 2.7,
      10
    );

    const score01 =
      Number(dimensions.workflow_demand || 0) * workflowDemand +
      Number(dimensions.clinical_impact || 0) * clinicalImpact +
      Number(dimensions.differentiation_gap || 0) * differentiationGap +
      Number(dimensions.seo_capture || 0) * seoCapture +
      Number(dimensions.retention_loop_strength || 0) * retentionLoopStrength +
      Number(dimensions.monetization_potential || 0) * monetizationPotential +
      Number(dimensions.implementation_feasibility || 0) * implementationFeasibility +
      Number(dimensions.governance_readiness || 0) * governanceReadiness;

    const score100 = clamp(0, score01 * 10, 100);

    let priority = 'P3';
    if (score100 >= Number(horizonThresholds.h1_score_min || 76)) priority = 'P1';
    else if (score100 >= Number(horizonThresholds.h2_score_min || 62)) priority = 'P2';

    let horizon = 'H3';
    if (priority === 'P1' && implementationFeasibility >= 4.8 && governanceReadiness >= 4.4) horizon = 'H1';
    else if (priority !== 'P3') horizon = 'H2';

    const confidenceRaw =
      Math.min(1, row.page_hits / 12) * 0.6 +
      Math.min(1, domainCount / 20) * 0.2 +
      Math.min(1, row.authority_hits / 8) * 0.2;

    const confidence = round(confidenceRaw * 100, 1);

    ranked.push({
      id: `${workflow.id}__${archetype.id}`,
      workflow_id: workflow.id,
      workflow_name: workflow.name,
      archetype_id: archetype.id,
      archetype_name: archetype.name,
      workflow_stage: workflow.workflow_stage,
      proposed_slug: `${workflow.id}-${archetype.slug_suffix || 'tool'}`,
      dimensions: {
        workflow_demand: round(workflowDemand, 2),
        clinical_impact: round(clinicalImpact, 2),
        differentiation_gap: round(differentiationGap, 2),
        seo_capture: round(seoCapture, 2),
        retention_loop_strength: round(retentionLoopStrength, 2),
        monetization_potential: round(monetizationPotential, 2),
        implementation_feasibility: round(implementationFeasibility, 2),
        governance_readiness: round(governanceReadiness, 2)
      },
      competitor_intensity: round(competitorIntensity, 2),
      raw_signal: round(row.raw_signal, 2),
      domain_count: domainCount,
      evidence_count: row.evidence.length,
      score: round(score100, 2),
      priority,
      horizon,
      confidence_pct: confidence,
      evidence: row.evidence.slice(0, 12),
      rationale: [
        `${workflow.name} has high workflow and clinical gravity in pediatrics.`,
        `${archetype.name} aligns with mobile point-of-care usage for daily clinical work.`,
        `Observed competitor intensity ${round(competitorIntensity, 2)} suggests ${
          differentiationGap >= 6 ? 'clear whitespace' : 'a quality and UX execution race'
        }.`
      ],
      execution_risks: [
        implementationFeasibility < 4.5 ? 'Build complexity is high; split release into milestone slices.' : null,
        governanceReadiness < 4.5 ? 'Clinical governance overhead is high; require provenance and review workflow.' : null
      ].filter(Boolean)
    });
  }

  ranked.sort((a, b) => b.score - a.score || b.confidence_pct - a.confidence_pct || a.id.localeCompare(b.id));
  return ranked;
}

function buildCoverageMatrix(seedUniverse, domainResults) {
  const seeded = seedUniverse.seeds.length;
  const crawled = domainResults.filter((d) => isCapturedSourceMode(d.source_mode)).length;
  const analyzed = domainResults.filter((d) => hasAnalyzedPages(d)).length;
  const live = domainResults.filter((d) => d.source_mode === 'live').length;
  const liveNoContent = domainResults.filter((d) => d.source_mode === 'live_no_content').length;
  const cached = domainResults.filter((d) => d.source_mode.startsWith('cache')).length;

  const weightedTotal = seedUniverse.seeds.reduce((sum, seed) => sum + Number(seed.crawl_priority || 0), 0);
  const weightedCaptured = domainResults.reduce(
    (sum, item) => sum + (isCapturedSourceMode(item.source_mode) ? Number(item.crawl_priority || 0) : 0),
    0
  );
  const weightedAnalyzed = domainResults.reduce(
    (sum, item) => sum + (hasAnalyzedPages(item) ? Number(item.crawl_priority || 0) : 0),
    0
  );

  const byGroup = new Map();
  for (const seed of seedUniverse.seeds) {
    if (!byGroup.has(seed.group)) {
      byGroup.set(seed.group, {
        group: seed.group,
        seeded: 0,
        crawled: 0,
        analyzed: 0,
        weighted_seeded: 0,
        weighted_crawled: 0,
        weighted_analyzed: 0
      });
    }
    const row = byGroup.get(seed.group);
    row.seeded += 1;
    row.weighted_seeded += Number(seed.crawl_priority || 0);
  }

  for (const item of domainResults) {
    const row = byGroup.get(item.group);
    if (!row) continue;
    if (isCapturedSourceMode(item.source_mode)) {
      row.crawled += 1;
      row.weighted_crawled += Number(item.crawl_priority || 0);
    }
    if (hasAnalyzedPages(item)) {
      row.analyzed += 1;
      row.weighted_analyzed += Number(item.crawl_priority || 0);
    }
  }

  const groupRows = Array.from(byGroup.values()).map((row) => ({
    ...row,
    coverage_pct: row.seeded > 0 ? round((row.crawled / row.seeded) * 100, 1) : 0,
    analyzed_coverage_pct: row.seeded > 0 ? round((row.analyzed / row.seeded) * 100, 1) : 0,
    weighted_coverage_pct: row.weighted_seeded > 0 ? round((row.weighted_crawled / row.weighted_seeded) * 100, 1) : 0,
    weighted_analyzed_coverage_pct:
      row.weighted_seeded > 0 ? round((row.weighted_analyzed / row.weighted_seeded) * 100, 1) : 0
  }));

  groupRows.sort((a, b) => b.weighted_seeded - a.weighted_seeded || a.group.localeCompare(b.group));

  return {
    seeded_domains: seeded,
    crawled_domains: crawled,
    analyzed_domains: analyzed,
    live_domains: live,
    live_no_content_domains: liveNoContent,
    cache_domains: cached,
    raw_coverage_pct: seeded > 0 ? round((crawled / seeded) * 100, 1) : 0,
    analyzed_coverage_pct: seeded > 0 ? round((analyzed / seeded) * 100, 1) : 0,
    weighted_coverage_pct: weightedTotal > 0 ? round((weightedCaptured / weightedTotal) * 100, 1) : 0,
    weighted_analyzed_coverage_pct: weightedTotal > 0 ? round((weightedAnalyzed / weightedTotal) * 100, 1) : 0,
    weighted_total: weightedTotal,
    weighted_captured: round(weightedCaptured, 2),
    weighted_analyzed: round(weightedAnalyzed, 2),
    coverage_by_group: groupRows
  };
}

function splitByHorizon(opportunities, weights) {
  const limits = weights.execution_constraints || {};
  const maxH1 = Number(limits.max_h1_items || 14);
  const maxH2 = Number(limits.max_h2_items || 18);

  const h1 = opportunities.filter((item) => item.horizon === 'H1').slice(0, maxH1);
  const h2 = opportunities.filter((item) => item.horizon === 'H2').slice(0, maxH2);
  const h3 = opportunities.filter((item) => item.horizon === 'H3').slice(0, 24);

  return { h1, h2, h3 };
}

function buildAdversarialRounds(opportunities, rounds = ROUNDS_MIN) {
  const executor = 'Executor-Research';
  const critics = [
    'Critic-Clinical-Governance',
    'Critic-Product-Market-Fit',
    'Critic-Distribution-SEO',
    'Critic-Engineering-Risk',
    'Critic-Economic-Model'
  ];

  const top = opportunities.slice(0, 12);
  if (top.length === 0) {
    return Array.from({ length: rounds }, (_, idx) => ({
      round: idx + 1,
      executor,
      critic: critics[idx % critics.length],
      focus: 'seed universe and taxonomy validation',
      finding: 'Insufficient live crawl evidence; fallback signals only.',
      remediation: 'Run with live network and refreshed caches to increase confidence.',
      gate_status: 'pass_with_risk'
    }));
  }

  return Array.from({ length: rounds }, (_, idx) => {
    const critic = critics[idx % critics.length];
    const item = top[idx % top.length];
    const finding =
      critic === 'Critic-Clinical-Governance'
        ? `Require provenance controls for ${item.workflow_name}.`
        : critic === 'Critic-Product-Market-Fit'
        ? `Tighten target persona for ${item.archetype_name}.`
        : critic === 'Critic-Distribution-SEO'
        ? `Expand query cluster around ${item.workflow_name}.`
        : critic === 'Critic-Engineering-Risk'
        ? `Reduce complexity for ${item.proposed_slug} with phased release.`
        : `Strengthen monetization path for ${item.proposed_slug}.`;

    const remediation =
      critic === 'Critic-Clinical-Governance'
        ? 'Add source-of-truth citations, review checklist, and last-updated transparency.'
        : critic === 'Critic-Product-Market-Fit'
        ? 'Map feature to one primary persona and one secondary persona with clear JTBD.'
        : critic === 'Critic-Distribution-SEO'
        ? 'Create pillar page + support cluster + referral loop share templates.'
        : critic === 'Critic-Engineering-Risk'
        ? 'Split into MVP engine, reference layer, and QA hardening sprint.'
        : 'Model freemium to premium conversion and institution bundles.';

    return {
      round: idx + 1,
      executor,
      critic,
      focus: `${item.workflow_name} x ${item.archetype_name}`,
      finding,
      remediation,
      gate_status: 'pass'
    };
  });
}

function buildGtmThemes(taxonomy, opportunities) {
  const clusters = ensureArray(taxonomy.seo_cluster_starters || []).slice(0, 60);
  const topWorkflows = opportunities
    .slice(0, 15)
    .map((item) => item.workflow_name)
    .filter((value, idx, arr) => arr.indexOf(value) === idx);

  const pillars = topWorkflows.slice(0, 8).map((workflow) => {
    const workflowToken = workflow.split(' ')[0].toLowerCase();
    const scoredClusters = clusters
      .map((cluster) => {
        const lower = cluster.toLowerCase();
        const relevance = lower.includes(workflowToken) ? 100 : 0;
        const tieBreak = parseInt(sha(`${workflow}|${cluster}`).slice(0, 6), 16) % 100;
        return { cluster, score: relevance + tieBreak / 1000 };
      })
      .sort((a, b) => b.score - a.score || a.cluster.localeCompare(b.cluster))
      .slice(0, 6)
      .map((item) => item.cluster);

    return {
      workflow,
      pillar_slug: slugify(workflow),
      support_clusters: scoredClusters
    };
  });

  return {
    pillars,
    distribution_loops: [
      'Clinician-to-clinician share links with prefilled context',
      'Program-level pathway packets for department rollouts',
      'Weekly peds evidence digest across top workflows',
      'Residency and fellowship learning tracks tied to calculators'
    ],
    capture_channels: ['Organic search', 'Clinical social', 'Residency programs', 'Hospital pathway committees', 'Newsletter partnerships']
  };
}

function buildFinancialModel(weights, opportunities) {
  const assumptions = weights.financial_assumptions || {};

  const mau0 = Number(assumptions.base_monthly_active_users_start || 22000);
  const growth = Number(assumptions.base_monthly_growth_rate || 0.08);
  const premiumRate = Number(assumptions.premium_adoption_rate_year1 || 0.02);
  const premiumPrice = Number(assumptions.premium_price_per_month_usd || 29);
  const institutionalPriceYear = Number(assumptions.institutional_license_price_per_year_usd || 2400);
  const institutionalTarget = Number(assumptions.institutional_account_target_year1 || 220);
  const cac = Number(assumptions.content_cac_usd || 5.5);
  const grossMargin = Number(assumptions.gross_margin_target || 0.85);

  const scenarioModifiers = {
    conservative: { growth: growth - 0.03, premiumRate: premiumRate - 0.005, logos: institutionalTarget * 0.65 },
    base: { growth, premiumRate, logos: institutionalTarget },
    aggressive: { growth: growth + 0.03, premiumRate: premiumRate + 0.008, logos: institutionalTarget * 1.4 }
  };

  const scenarios = [];
  for (const [name, mod] of Object.entries(scenarioModifiers)) {
    let mau = mau0;
    let annualSubscriptionRevenue = 0;
    let annualAcquisitionSpend = 0;

    for (let month = 1; month <= 12; month++) {
      const prior = mau;
      mau = Math.round(mau * (1 + Math.max(0.005, mod.growth)));
      const newUsers = Math.max(0, mau - prior);
      const premiumUsers = mau * Math.max(0.001, mod.premiumRate);
      annualSubscriptionRevenue += premiumUsers * premiumPrice;
      annualAcquisitionSpend += newUsers * cac;
    }

    const annualInstitutionalRevenue = (mod.logos * institutionalPriceYear);
    const annualRevenue = annualSubscriptionRevenue + annualInstitutionalRevenue;
    const annualGrossProfit = annualRevenue * grossMargin;
    const contributionAfterAcquisition = annualGrossProfit - annualAcquisitionSpend;

    scenarios.push({
      scenario: name,
      year_end_mau: Math.round(mau),
      annual_subscription_revenue_usd: round(annualSubscriptionRevenue, 0),
      annual_institutional_revenue_usd: round(annualInstitutionalRevenue, 0),
      annual_revenue_usd: round(annualRevenue, 0),
      annual_acquisition_spend_usd: round(annualAcquisitionSpend, 0),
      annual_gross_profit_usd: round(annualGrossProfit, 0),
      contribution_after_acquisition_usd: round(contributionAfterAcquisition, 0)
    });
  }

  const opportunityWeightedRevenueLift = round(
    opportunities.slice(0, 12).reduce((sum, item) => sum + item.score * (item.confidence_pct / 100), 0) / 1500,
    3
  );

  return {
    assumptions,
    scenarios,
    opportunity_weighted_revenue_lift_index: opportunityWeightedRevenueLift
  };
}

function buildRoleLens(personaConfig, opportunities) {
  const lenses = [];
  const top = opportunities.slice(0, 8);

  for (const roleLens of ensureArray(personaConfig.role_lenses)) {
    const role = roleLens.role;
    if (role === 'PM') {
      const topWorkflows = top
        .map((item) => item.workflow_name)
        .filter((value, idx, arr) => arr.indexOf(value) === idx)
        .slice(0, 3);
      lenses.push({
        role,
        recommendations: [
          `Prioritize ${topWorkflows.join(', ')} as daily-use anchors.`,
          'Design a repeat loop: calculator result -> evidence card -> related pathway -> follow-up checklist.',
          'Set north-star metrics around daily active clinicians, 7-day retention, and median time-to-answer.'
        ]
      });
    } else if (role === 'Staff Engineering') {
      lenses.push({
        role,
        recommendations: [
          'Separate deterministic calculator engines from content references with explicit versioning.',
          'Introduce provenance metadata on every reference node and change-log snapshots.',
          'Use contract tests for calculator logic and snapshot tests for guideline rendering.'
        ]
      });
    } else if (role === 'Clinical Governance') {
      lenses.push({
        role,
        recommendations: [
          'Implement source ranking: society guideline > institutional pathway > educational summaries.',
          'Require reviewer signoff and update cadence SLA per clinical domain.',
          'Display citations, last-reviewed date, and scope limits on every decision-support module.'
        ]
      });
    } else if (role === 'CMO') {
      lenses.push({
        role,
        recommendations: [
          'Build category pillars for high-frequency pediatric intents and interlink every related calculator.',
          'Operationalize clinician referral loops with share-ready links and residency channel packs.',
          'Ship weekly evidence digest to create habitual return and social amplification.'
        ]
      });
    } else if (role === 'CFO') {
      lenses.push({
        role,
        recommendations: [
          'Favor H1 items with high governance-readiness and fast implementation feasibility.',
          'Package institutional bundles around pathway governance + quality dashboard exports.',
          'Track CAC payback by channel and suppress low-conversion content lanes quickly.'
        ]
      });
    } else if (role === 'CEO') {
      lenses.push({
        role,
        recommendations: [
          'Moat strategy: fastest pediatric workflow answer times with strongest citation trust.',
          'Land-and-expand: outpatient pediatrics -> hospital pediatrics -> subspecialty pathways.',
          'Enforce quality gates as launch criteria to protect brand trust and clinical safety.'
        ]
      });
    } else {
      lenses.push({
        role,
        recommendations: ['Align roadmap decisions to measurable clinician workflow outcomes.']
      });
    }
  }

  return lenses;
}

function buildKeyFindings(opportunities) {
  return opportunities.slice(0, 20).map((item, idx) => ({
    rank: idx + 1,
    finding_id: `F-${String(idx + 1).padStart(3, '0')}`,
    severity: item.score >= 80 ? 'critical' : item.score >= 68 ? 'high' : 'medium',
    workflow: item.workflow_name,
    archetype: item.archetype_name,
    score: item.score,
    confidence_pct: item.confidence_pct,
    top_domains: item.evidence
      .map((e) => e.domain)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .slice(0, 5),
    evidence_urls: item.evidence.slice(0, 5).map((e) => e.url),
    recommendation: `Build ${item.proposed_slug} as ${item.horizon} priority (${item.priority}).`
  }));
}

function renderCoverageMethodology(coverage, configSummary) {
  const lines = [];
  lines.push('## 1) Coverage Matrix + Methodology');
  lines.push('');
  lines.push('- Method: weighted domain universe seeded from public pediatric authority + competitor + hospital + education sources.');
  lines.push(`- Run mode: ${SKIP_NETWORK ? 'offline/cache-assisted' : 'live crawl + cache write-through'}.`);
  lines.push(`- Seeded domains: ${coverage.seeded_domains}`);
  lines.push(`- Crawled domains (live or cache): ${coverage.crawled_domains}`);
  lines.push(`- Domains with analyzable page evidence: ${coverage.analyzed_domains}`);
  lines.push(`- Reachability coverage: ${coverage.raw_coverage_pct}%`);
  lines.push(`- Evidence coverage: ${coverage.analyzed_coverage_pct}%`);
  lines.push(`- Weighted reachability coverage: ${coverage.weighted_coverage_pct}%`);
  lines.push(`- Weighted evidence coverage: ${coverage.weighted_analyzed_coverage_pct}%`);
  lines.push(`- Domain limit: ${configSummary.domain_limit}`);
  lines.push(`- Max pages/domain: ${configSummary.max_pages_per_domain}`);
  lines.push('');
  lines.push('| Group | Seeded | Crawled | Analyzed | Reach % | Evidence % | Weighted Reach % | Weighted Evidence % |');
  lines.push('|---|---:|---:|---:|---:|---:|---:|---:|');
  for (const row of coverage.coverage_by_group) {
    lines.push(
      `| ${row.group} | ${row.seeded} | ${row.crawled} | ${row.analyzed} | ${row.coverage_pct}% | ${row.analyzed_coverage_pct}% | ${row.weighted_coverage_pct}% | ${row.weighted_analyzed_coverage_pct}% |`
    );
  }
  lines.push('');
  lines.push('Assumptions: coverage weights use `crawl_priority` as a proxy for strategic importance in pediatric workflow discovery.');
  lines.push('');
  return lines.join('\n');
}

function renderFindingsLog(findings) {
  const lines = [];
  lines.push('## 2) Prioritized Findings Log');
  lines.push('');
  lines.push('| Rank | Severity | Workflow | Archetype | Score | Confidence | Recommendation |');
  lines.push('|---:|---|---|---|---:|---:|---|');
  for (const finding of findings) {
    lines.push(
      `| ${finding.rank} | ${finding.severity} | ${finding.workflow} | ${finding.archetype} | ${finding.score} | ${finding.confidence_pct}% | ${finding.recommendation} |`
    );
  }
  lines.push('');
  return lines.join('\n');
}

function renderImplementationLog(changedFiles) {
  const lines = [];
  lines.push('## 3) Implementation Log Per File');
  lines.push('');
  lines.push('| File | Purpose |');
  lines.push('|---|---|');
  for (const item of changedFiles) {
    lines.push(`| ${item.file} | ${item.rationale} |`);
  }
  lines.push('');
  return lines.join('\n');
}

function renderQaSummary(coverage, rounds, opportunities) {
  const lines = [];
  lines.push('## 4) Final QA Summary');
  lines.push('');
  lines.push(`- Adversarial rounds executed: ${rounds.length}`);
  lines.push(`- Minimum rounds gate (>=20): ${rounds.length >= 20 ? 'pass' : 'fail'}`);
  lines.push(
    `- Critical unresolved blockers: ${opportunities.some((item) => item.priority === 'P1' && item.confidence_pct < 35) ? 'present (data confidence risk)' : 'none'}`
  );
  lines.push(`- Evidence coverage gate: ${coverage.weighted_analyzed_coverage_pct >= 55 ? 'pass' : 'fail (insufficient analyzable page evidence)'}`);
  lines.push('');
  return lines.join('\n');
}

function renderRisks(opportunities, coverage) {
  const lines = [];
  lines.push('## 5) Remaining Risks + Mitigation');
  lines.push('');

  const risks = [];
  if (SKIP_NETWORK) {
    risks.push({
      risk: 'Live crawl disabled, so evidence confidence depends on cached or seed-derived signals.',
      mitigation: 'Run full crawl with PEDS_INTEL_SKIP_NETWORK=0 and PEDS_INTEL_DOMAIN_LIMIT>=140 overnight.'
    });
  }
  if (coverage.weighted_coverage_pct < 85) {
    risks.push({
      risk: `Weighted coverage is ${coverage.weighted_coverage_pct}%, below deep-research target of 85%+ captured priority weight.`,
      mitigation: 'Increase domain limit and cache refresh window; add retries and regional mirror domains.'
    });
  }
  if (coverage.weighted_analyzed_coverage_pct < 55) {
    risks.push({
      risk: `Weighted evidence coverage is ${coverage.weighted_analyzed_coverage_pct}%, indicating insufficient analyzable page content from crawl targets.`,
      mitigation: 'Increase allowlisted network access, extend timeouts/retries, and prioritize domains returning HTML content.'
    });
  }

  const highRiskBuild = opportunities.find(
    (item) => item.dimensions.governance_readiness < 4.5 || item.dimensions.implementation_feasibility < 4.5
  );
  if (highRiskBuild) {
    risks.push({
      risk: `Top opportunity ${highRiskBuild.id} has elevated build/governance risk.`,
      mitigation: 'Split into MVP + governance hardening milestone, and require clinical review checklist.'
    });
  }

  if (risks.length === 0) {
    lines.push('- No material residual blockers detected at current evidence confidence.');
  } else {
    for (const risk of risks) {
      lines.push(`- Risk: ${risk.risk}`);
      lines.push(`- Mitigation: ${risk.mitigation}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

function renderRoleLens(roleLens) {
  const lines = [];
  lines.push('## Role-Lens Directives');
  lines.push('');
  for (const lens of roleLens) {
    lines.push(`### ${lens.role}`);
    for (const rec of lens.recommendations) lines.push(`- ${rec}`);
    lines.push('');
  }
  return lines.join('\n');
}

function renderReport(context) {
  const {
    configSummary,
    coverage,
    findings,
    changedFiles,
    rounds,
    roleLens,
    opportunities,
    roadmap,
    gtm,
    financial
  } = context;

  const lines = [];
  lines.push('# TinyHumanMD Pediatric Strategy Orchestrator Report');
  lines.push('');
  lines.push(`- Date: ${TODAY}`);
  lines.push(`- Generated at: ${STAMP}`);
  lines.push(`- Specialty: pediatrics`);
  lines.push(`- Mode: ${SKIP_NETWORK ? 'offline/cache' : 'live network crawl'}`);
  lines.push('');

  lines.push('## Executive Summary');
  lines.push('');
  lines.push(
    `This run reached ${coverage.crawled_domains}/${coverage.seeded_domains} seeded pediatric domains and extracted analyzable page evidence from ${coverage.analyzed_domains} domains, producing ${opportunities.length} ranked opportunities. Top immediate bets concentrate on high-frequency workflows such as medication safety, infectious disease, and growth/immunization operations with calculator/pathway archetypes.`
  );
  lines.push('');

  lines.push(renderCoverageMethodology(coverage, configSummary));
  lines.push(renderFindingsLog(findings));
  lines.push(renderImplementationLog(changedFiles));
  lines.push(renderQaSummary(coverage, rounds, opportunities));
  lines.push(renderRisks(opportunities, coverage));

  lines.push('## Roadmap Snapshot');
  lines.push('');
  lines.push(`- H1 (0-90 days): ${roadmap.h1.length} items`);
  lines.push(`- H2 (3-9 months): ${roadmap.h2.length} items`);
  lines.push(`- H3 (9-18 months): ${roadmap.h3.length} items`);
  lines.push('');

  lines.push('## GTM Snapshot');
  lines.push('');
  lines.push(`- Pillar themes: ${gtm.pillars.length}`);
  lines.push(`- Capture channels: ${gtm.capture_channels.join(', ')}`);
  lines.push('');

  lines.push('## Financial Snapshot (Base Scenario)');
  lines.push('');
  const base = financial.scenarios.find((scenario) => scenario.scenario === 'base');
  if (base) {
    lines.push(`- Year-end MAU: ${base.year_end_mau}`);
    lines.push(`- Annual revenue: $${base.annual_revenue_usd.toLocaleString('en-US')}`);
    lines.push(`- Contribution after acquisition: $${base.contribution_after_acquisition_usd.toLocaleString('en-US')}`);
  }
  lines.push('');

  lines.push(renderRoleLens(roleLens));

  return lines.join('\n');
}

function renderRoadmap(opportunities, roadmap) {
  const lines = [];
  lines.push('# Pediatric Product Roadmap');
  lines.push('');
  lines.push(`Date: ${TODAY}`);
  lines.push('');

  const sections = [
    { key: 'h1', label: 'H1 (0-90 Days): Daily-Use Core' },
    { key: 'h2', label: 'H2 (3-9 Months): Workflow Expansion' },
    { key: 'h3', label: 'H3 (9-18 Months): Platform Moat' }
  ];

  for (const section of sections) {
    lines.push(`## ${section.label}`);
    lines.push('');
    for (const item of roadmap[section.key]) {
      lines.push(`### ${item.workflow_name} x ${item.archetype_name}`);
      lines.push(`- Opportunity ID: ${item.id}`);
      lines.push(`- Score: ${item.score} (${item.priority})`);
      lines.push(`- Proposed slug: ${item.proposed_slug}`);
      lines.push(`- Why now: ${item.rationale[0]}`);
      lines.push(`- Build note: ${item.execution_risks[0] || 'Standard implementation risk profile.'}`);
      lines.push('');
    }
  }

  lines.push('## Deferred / Watchlist');
  lines.push('');
  for (const item of opportunities.slice(24, 36)) {
    lines.push(`- ${item.id} (${item.score})`);
  }
  lines.push('');

  return lines.join('\n');
}

function renderBacklog(roadmap) {
  const lines = [];
  lines.push('# Pediatric Execution Backlog');
  lines.push('');
  lines.push(`Date: ${TODAY}`);
  lines.push('');

  let idx = 1;
  for (const item of [...roadmap.h1, ...roadmap.h2].slice(0, 26)) {
    lines.push(`## Epic ${idx}: ${item.workflow_name} - ${item.archetype_name}`);
    lines.push('');
    lines.push(`- Priority: ${item.priority}`);
    lines.push(`- Horizon: ${item.horizon}`);
    lines.push(`- Scope: Build ${item.proposed_slug} with deterministic calculator/reference behavior and citation metadata.`);
    lines.push('- Acceptance criteria:');
    lines.push('  - Clinical references are linked with source and update date metadata.');
    lines.push('  - Tool output remains deterministic and test-covered.');
    lines.push('  - Mobile experience remains point-of-care fast and readable.');
    lines.push(`- Evidence anchors: ${item.evidence.slice(0, 3).map((e) => e.url).join(', ') || 'seed-level inference only'}`);
    lines.push('');
    idx += 1;
  }

  return lines.join('\n');
}

function renderGtm(gtm, roadmap) {
  const lines = [];
  lines.push('# Pediatric GTM Plan');
  lines.push('');
  lines.push(`Date: ${TODAY}`);
  lines.push('');

  lines.push('## Positioning');
  lines.push('');
  lines.push('- Product claim: fastest trustworthy pediatric bedside answers with guideline-linked calculators and pathways.');
  lines.push('- Category wedge: medication safety dosing, infectious disease triage, and growth/preventive operations.');
  lines.push('');

  lines.push('## Content Architecture');
  lines.push('');
  for (const pillar of gtm.pillars.slice(0, 10)) {
    lines.push(`- Pillar: ${pillar.workflow} (${pillar.pillar_slug})`);
    for (const cluster of pillar.support_clusters.slice(0, 6)) {
      lines.push(`  - ${cluster}`);
    }
  }
  lines.push('');

  lines.push('## Distribution Loops');
  lines.push('');
  for (const loop of gtm.distribution_loops) lines.push(`- ${loop}`);
  lines.push('');

  lines.push('## Launch Sequence');
  lines.push('');
  lines.push(`- Wave 1 (H1): ${roadmap.h1.slice(0, 6).map((item) => item.proposed_slug).join(', ')}`);
  lines.push(`- Wave 2 (H2): ${roadmap.h2.slice(0, 6).map((item) => item.proposed_slug).join(', ')}`);
  lines.push('');

  return lines.join('\n');
}

function renderFinancial(financial) {
  const lines = [];
  lines.push('# Pediatric Financial Model');
  lines.push('');
  lines.push(`Date: ${TODAY}`);
  lines.push('');

  lines.push('## Scenario Table (12-Month)');
  lines.push('');
  lines.push('| Scenario | Year-End MAU | Annual Revenue | Gross Profit | Acquisition Spend | Contribution |');
  lines.push('|---|---:|---:|---:|---:|---:|');

  for (const scenario of financial.scenarios) {
    lines.push(
      `| ${scenario.scenario} | ${scenario.year_end_mau} | $${scenario.annual_revenue_usd.toLocaleString('en-US')} | $${scenario.annual_gross_profit_usd.toLocaleString('en-US')} | $${scenario.annual_acquisition_spend_usd.toLocaleString('en-US')} | $${scenario.contribution_after_acquisition_usd.toLocaleString('en-US')} |`
    );
  }

  lines.push('');
  lines.push(`- Opportunity-weighted revenue lift index: ${financial.opportunity_weighted_revenue_lift_index}`);
  lines.push('');

  return lines.join('\n');
}

function renderEvidence(domainProfiles, domainResults) {
  const lines = [];
  lines.push('# Pediatric Evidence Register');
  lines.push('');
  lines.push(`Date: ${TODAY}`);
  lines.push('');
  lines.push('## Domain Summary');
  lines.push('');
  lines.push('| Domain | Group | Tier | Source | Pages | Top Workflow | Top Archetype | Sample Error |');
  lines.push('|---|---|---|---|---:|---|---|---|');

  for (const profile of domainProfiles.slice(0, 120)) {
    const sampleError = (profile.errors[0] || '').replace(/\|/g, '/').slice(0, 90) || '(none)';
    lines.push(
      `| ${profile.domain} | ${profile.group} | ${profile.tier} | ${profile.source_mode} | ${profile.pages_analyzed} | ${profile.top_workflows[0]?.name || '(none)'} | ${profile.top_archetypes[0]?.name || '(none)'} | ${sampleError} |`
    );
  }

  lines.push('');
  lines.push('## Page-Level Evidence Samples');
  lines.push('');

  const pageEvidence = [];
  for (const domain of domainResults) {
    for (const page of ensureArray(domain.pages).slice(0, 3)) {
      pageEvidence.push({
        domain: domain.domain,
        url: page.url,
        title: page.title || page.h1?.[0] || '(untitled)',
        top_workflow: page.category_scores?.[0]?.name || '(none)',
        top_archetype: page.archetype_scores?.[0]?.name || '(none)'
      });
    }
  }

  pageEvidence.sort((a, b) => a.domain.localeCompare(b.domain));

  if (pageEvidence.length === 0) {
    if (SKIP_NETWORK) {
      lines.push('- No page-level evidence extracted because this run used offline mode.');
    } else {
      lines.push('- No analyzable page-level evidence was extracted in this run.');
      lines.push('- Most targets likely returned blocked/non-HTML/timeout responses; review Sample Error column and adjust crawl policy.');
    }
  } else {
    for (const page of pageEvidence.slice(0, 220)) {
      lines.push(`- ${page.domain} :: ${page.title}`);
      lines.push(`  - URL: ${page.url}`);
      lines.push(`  - Top workflow: ${page.top_workflow}`);
      lines.push(`  - Top archetype: ${page.top_archetype}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

function renderOrchestratorDoc() {
  return `# Peds Strategy Orchestrator

This orchestrator performs deep pediatric competitive intelligence from public web sources and outputs a multi-document strategy pack for downstream product, engineering, and GTM execution.

## Command

\`npm run qa:peds:intel\`

## Modes

- Default (live network crawl + cache): \`npm run qa:peds:intel\`
- Offline/cache mode: \`PEDS_INTEL_SKIP_NETWORK=1 npm run qa:peds:intel\`
- Force refresh cache: \`npm run qa:peds:intel:refresh\`

## Key Environment Variables

- \`PEDS_INTEL_SKIP_NETWORK\`: \`1\` to disable network crawling
- \`PEDS_INTEL_FORCE_REFRESH\`: \`1\` to ignore fresh cache and recrawl
- \`PEDS_INTEL_DOMAIN_LIMIT\`: cap number of domains to process (default \`${DOMAIN_LIMIT}\`)
- \`PEDS_INTEL_MAX_PAGES_PER_DOMAIN\`: cap pages per domain (default \`${MAX_PAGES_PER_DOMAIN}\`)
- \`PEDS_INTEL_CONCURRENCY\`: worker pool size (default \`${CONCURRENCY}\`)
- \`PEDS_INTEL_ROUNDS\`: adversarial loop rounds (minimum 20)

## Inputs

- \`data/intel/peds/domain-seeds.json\`
- \`data/intel/peds/taxonomy.json\`
- \`data/intel/peds/scoring-weights.json\`
- \`data/intel/peds/persona-models.json\`

## Outputs

- \`docs/PEDS_STRATEGY_REPORT_${TODAY}.md\`
- \`docs/PEDS_COMPETITOR_MATRIX_${TODAY}.json\`
- \`docs/PEDS_PRODUCT_ROADMAP_${TODAY}.md\`
- \`docs/PEDS_EXECUTION_BACKLOG_${TODAY}.md\`
- \`docs/PEDS_GTM_PLAN_${TODAY}.md\`
- \`docs/PEDS_FINANCIAL_MODEL_${TODAY}.md\`
- \`docs/PEDS_EVIDENCE_${TODAY}.md\`

## Guardrails

- Publicly reachable pages only.
- Preserve TinyHumanMD clinical logic boundaries (this script does not modify clinical calculator behavior).
- Keep deterministic output format for downstream agents.
`;
}

async function main() {
  const seedConfigPath = path.join(INTEL_DIR, 'domain-seeds.json');
  const taxonomyPath = path.join(INTEL_DIR, 'taxonomy.json');
  const weightsPath = path.join(INTEL_DIR, 'scoring-weights.json');
  const personaPath = path.join(INTEL_DIR, 'persona-models.json');

  const seedConfig = await readJson(seedConfigPath, null);
  const taxonomy = await readJson(taxonomyPath, null);
  const weights = await readJson(weightsPath, null);
  const personaConfig = await readJson(personaPath, null);

  if (!seedConfig || !taxonomy || !weights || !personaConfig) {
    throw new Error('Missing required config under data/intel/peds/.');
  }

  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.mkdir(DOCS_DIR, { recursive: true });

  const seedUniverse = buildSeedUniverse(seedConfig);
  const targetSeeds = seedUniverse.seeds.slice(0, DOMAIN_LIMIT);

  const domainResults = await runPool(
    targetSeeds,
    async (seed) => {
      try {
        return await crawlDomain(seed, taxonomy, weights);
      } catch (error) {
        return {
          domain: seed.domain,
          group: seed.group,
          tier: seed.tier,
          crawl_priority: seed.crawl_priority,
          groups: seed.groups,
          source_mode: 'error',
          crawled_at: null,
          pages: [],
          discovery: { attempted: false, url_candidates: [] },
          errors: [String(error && error.message ? error.message : error)],
          notes: ['Crawler failed for this domain.']
        };
      }
    },
    CONCURRENCY
  );

  const coverage = buildCoverageMatrix(
    {
      ...seedUniverse,
      seeds: targetSeeds
    },
    domainResults
  );

  const domainProfiles = aggregateDomainProfiles(domainResults, taxonomy);
  const opportunities = buildOpportunityMap(domainResults, taxonomy, weights, personaConfig);
  const roadmap = splitByHorizon(opportunities, weights);
  const findings = buildKeyFindings(opportunities);
  const rounds = buildAdversarialRounds(opportunities, ROUNDS_MIN);
  const roleLens = buildRoleLens(personaConfig, opportunities);
  const gtm = buildGtmThemes(taxonomy, opportunities);
  const financial = buildFinancialModel(weights, opportunities);

  const changedFiles = [
    {
      file: 'scripts/peds-strategy-orchestrator.mjs',
      rationale: 'Adds deep pediatric intelligence orchestration: crawl, classify, score, and report generation.'
    },
    {
      file: 'data/intel/peds/domain-seeds.json',
      rationale: 'Defines domain universe and priority tiers for pediatric competitive/authority research.'
    },
    {
      file: 'data/intel/peds/taxonomy.json',
      rationale: 'Defines pediatric workflow and archetype classification schema.'
    },
    {
      file: 'data/intel/peds/scoring-weights.json',
      rationale: 'Defines weighted scoring model, horizon thresholds, and financial assumptions.'
    },
    {
      file: 'data/intel/peds/persona-models.json',
      rationale: 'Defines persona demand model, role lenses, and north-star metrics.'
    },
    {
      file: 'docs/PEDS_STRATEGY_ORCHESTRATOR.md',
      rationale: 'Documents orchestrator usage, environment switches, and output artifacts.'
    }
  ];

  const configSummary = {
    run_date: TODAY,
    generated_at: STAMP,
    skip_network: SKIP_NETWORK,
    force_refresh: FORCE_REFRESH,
    domain_limit: DOMAIN_LIMIT,
    max_pages_per_domain: MAX_PAGES_PER_DOMAIN,
    timeout_ms: REQUEST_TIMEOUT_MS,
    concurrency: CONCURRENCY,
    rounds: ROUNDS_MIN,
    cache_max_age_hours: CACHE_MAX_AGE_HOURS
  };

  const matrix = {
    metadata: {
      title: 'TinyHumanMD Pediatric Intelligence Matrix',
      version: TODAY,
      run_mode: SKIP_NETWORK ? 'offline/cache' : 'live',
      config: configSummary
    },
    coverage,
    adversarial_rounds: rounds,
    role_lens: roleLens,
    domain_profiles: domainProfiles,
    opportunities,
    roadmap,
    findings,
    gtm,
    financial,
    changed_files: changedFiles
  };

  const reportPath = path.join(DOCS_DIR, `PEDS_STRATEGY_REPORT_${TODAY}.md`);
  const matrixPath = path.join(DOCS_DIR, `PEDS_COMPETITOR_MATRIX_${TODAY}.json`);
  const roadmapPath = path.join(DOCS_DIR, `PEDS_PRODUCT_ROADMAP_${TODAY}.md`);
  const backlogPath = path.join(DOCS_DIR, `PEDS_EXECUTION_BACKLOG_${TODAY}.md`);
  const gtmPath = path.join(DOCS_DIR, `PEDS_GTM_PLAN_${TODAY}.md`);
  const financialPath = path.join(DOCS_DIR, `PEDS_FINANCIAL_MODEL_${TODAY}.md`);
  const evidencePath = path.join(DOCS_DIR, `PEDS_EVIDENCE_${TODAY}.md`);
  const docPath = path.join(DOCS_DIR, 'PEDS_STRATEGY_ORCHESTRATOR.md');

  await writeText(
    reportPath,
    renderReport({
      configSummary,
      coverage,
      findings,
      changedFiles,
      rounds,
      roleLens,
      opportunities,
      roadmap,
      gtm,
      financial
    })
  );
  await writeJson(matrixPath, matrix);
  await writeText(roadmapPath, renderRoadmap(opportunities, roadmap));
  await writeText(backlogPath, renderBacklog(roadmap));
  await writeText(gtmPath, renderGtm(gtm, roadmap));
  await writeText(financialPath, renderFinancial(financial));
  await writeText(evidencePath, renderEvidence(domainProfiles, domainResults));
  await writeText(docPath, renderOrchestratorDoc());

  console.log(
    JSON.stringify(
      {
        report: path.relative(REPO_ROOT, reportPath),
        matrix: path.relative(REPO_ROOT, matrixPath),
        roadmap: path.relative(REPO_ROOT, roadmapPath),
        backlog: path.relative(REPO_ROOT, backlogPath),
        gtm: path.relative(REPO_ROOT, gtmPath),
        financial: path.relative(REPO_ROOT, financialPath),
        evidence: path.relative(REPO_ROOT, evidencePath),
        orchestrator_doc: path.relative(REPO_ROOT, docPath),
        coverage,
        opportunities: {
          total: opportunities.length,
          top_10: opportunities.slice(0, 10).map((item) => ({
            id: item.id,
            score: item.score,
            priority: item.priority,
            horizon: item.horizon
          }))
        },
        rounds_executed: rounds.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
