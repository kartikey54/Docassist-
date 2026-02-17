#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const DOCS_DIR = path.join(REPO_ROOT, 'docs');
const TODAY = new Date().toISOString().slice(0, 10);
const STAGING_BASE_URL = process.env.STAGING_BASE_URL || 'https://staging.tinyhumanmd.pages.dev';
const ROUNDS_MIN = Math.max(20, Number(process.env.MOBILE_UX_ROUNDS || 20));
const SKIP_NETWORK = process.env.MOBILE_UX_SKIP_NETWORK === '1';
const argv = new Set(process.argv.slice(2));
const APPLY_MODE = argv.has('--apply') || argv.has('--fix') || process.env.MOBILE_UX_APPLY === '1';

const ROUTES = [
  '/',
  '/catch-up/',
  '/growth/',
  '/bili/',
  '/ga-calc/',
  '/dosing/',
  '/terms/',
  '/privacy/'
];

const ROUTE_HTML = [
  'index.html',
  'catch-up/index.html',
  'growth/index.html',
  'bili/index.html',
  'ga-calc/index.html',
  'dosing/index.html',
  'terms/index.html',
  'privacy/index.html'
];

const CSS_FILES = [
  'styles.css',
  'shared/design.css',
  'catch-up/catch-up.css',
  'growth/growth.css',
  'bili/bili.css',
  'ga-calc/ga-calc.css',
  'dosing/dosing.css'
];

const MOBILE_WIDTHS = [360, 390, 430];
const TARGET_WIDTH = 390;
const GLOBAL_COVERAGE_TARGET_PCT = 90;
const IPHONE_BLOCKER_MAJOR_MAX = 0;

const COVERAGE_SOURCES = {
  statcounter_os:
    'https://gs.statcounter.com/os-market-share/mobile/worldwide',
  statcounter_browser:
    'https://gs.statcounter.com/browser-market-share/mobile/worldwide',
  statcounter_resolution:
    'https://gs.statcounter.com/screen-resolution-stats/mobile/worldwide',
  gsma_device_specs:
    'https://www.gsmarena.com/'
};

const COVERAGE_PERIOD = 'January 2026';

const GLOBAL_OS_SHARE = [
  { name: 'Android', share_pct: 70.36 },
  { name: 'iOS', share_pct: 29.25 }
];

const GLOBAL_BROWSER_SHARE = [
  { name: 'Chrome Mobile', share_pct: 67.28 },
  { name: 'Safari Mobile', share_pct: 23.23 },
  { name: 'Samsung Internet', share_pct: 3.61 }
];

const GLOBAL_RESOLUTION_ANCHORS = [
  { resolution: '360x800', share_pct: 15.89 },
  { resolution: '390x844', share_pct: 5.15 },
  { resolution: '393x873', share_pct: 4.33 },
  { resolution: '412x915', share_pct: 4.19 },
  { resolution: '430x932', share_pct: 4.16 },
  { resolution: '375x812', share_pct: 3.15 }
];

const GSMA_CLASS_MAP = [
  {
    class_id: 'android_360w',
    viewport_portrait: '360x780-800',
    representative_devices: 'Galaxy S/A class, Pixel base class, Redmi Note class'
  },
  {
    class_id: 'android_390_412w',
    viewport_portrait: '390x844, 393x873, 412x915',
    representative_devices: 'Large Android slab phones'
  },
  {
    class_id: 'iphone_notch_390w',
    viewport_portrait: '390x844',
    representative_devices: 'iPhone 12/13/14/15/16 non-Max'
  },
  {
    class_id: 'iphone_max_430w',
    viewport_portrait: '430x932',
    representative_devices: 'iPhone Pro Max class'
  }
];

const IPHONE_MATRIX = [
  { class_id: 'iphone_se', css_viewport: '375x667', orientation: 'portrait+landscape', browser: 'Safari' },
  { class_id: 'iphone_mini', css_viewport: '375x812', orientation: 'portrait+landscape', browser: 'Safari' },
  { class_id: 'iphone_base_pro_390', css_viewport: '390x844', orientation: 'portrait+landscape', browser: 'Safari' },
  { class_id: 'iphone_base_pro_393', css_viewport: '393x852-873', orientation: 'portrait+landscape', browser: 'Safari' },
  { class_id: 'iphone_plus_max', css_viewport: '428x926-430x932', orientation: 'portrait+landscape', browser: 'Safari' }
];

const TAP_TARGETS = [
  { file: 'styles.css', selector: '.mobile-menu-btn', label: 'Home mobile menu trigger', critical: true },
  { file: 'styles.css', selector: '.mobile-nav-close', label: 'Home mobile nav close button', critical: true },
  { file: 'styles.css', selector: '.mobile-nav-list a', label: 'Home mobile nav links', critical: true },
  { file: 'styles.css', selector: '.mobile-nav-sub-grid a', label: 'Home mobile nav section links', critical: true },
  { file: 'styles.css', selector: '.thmd-lang-select', label: 'Home language select', critical: true },
  { file: 'shared/design.css', selector: '.tool-mobile-btn', label: 'Tool mobile menu trigger', critical: true },
  { file: 'shared/design.css', selector: '.tool-mobile-close', label: 'Tool mobile nav close button', critical: true },
  { file: 'shared/design.css', selector: '.tool-mobile-list a', label: 'Tool mobile nav links', critical: true },
  { file: 'shared/design.css', selector: '.tool-mobile-suggest', label: 'Tool mobile suggest button', critical: false },
  { file: 'shared/design.css', selector: '.thmd-lang-select', label: 'Tool language select', critical: true },
  { file: 'shared/design.css', selector: '.btn', label: 'Tool primary buttons', critical: false },
  { file: 'shared/design.css', selector: '.form-group input', label: 'Tool form inputs', critical: true },
  { file: 'shared/design.css', selector: '.form-group select', label: 'Tool form selects', critical: true }
];

const FONT_SIZE_TARGETS = [
  { file: 'styles.css', selector: '.search-input', label: 'Home search input' },
  { file: 'styles.css', selector: '.filter-select', label: 'Home filter select' },
  { file: 'styles.css', selector: '.thmd-lang-select', label: 'Home language select' },
  { file: 'shared/design.css', selector: '.form-group input', label: 'Tool form inputs' },
  { file: 'shared/design.css', selector: '.form-group select', label: 'Tool form selects' },
  { file: 'shared/design.css', selector: '.thmd-lang-select', label: 'Tool language select' }
];

const PHONE_POLISH_START = '/* MOBILE_UX_ORCHESTRATOR_PHONE_POLISH_START */';
const PHONE_POLISH_END = '/* MOBILE_UX_ORCHESTRATOR_PHONE_POLISH_END */';

const PHONE_POLISH_BLOCKS = {
  'styles.css': `${PHONE_POLISH_START}
@media (max-width: 768px) {
  .mobile-menu-btn,
  .mobile-nav-close,
  .mobile-nav-list a,
  .mobile-nav-sub-grid a,
  .thmd-lang-select,
  .search-input,
  .filter-select {
    min-height: 44px;
  }

  .mobile-menu-btn,
  .mobile-nav-close {
    min-width: 44px;
    align-items: center;
    justify-content: center;
  }

  .mobile-nav-list a,
  .mobile-nav-sub-grid a {
    display: flex;
    align-items: center;
  }

  .mobile-nav-sub-grid a {
    justify-content: center;
  }

  .search-input,
  .filter-select,
  .thmd-lang-select {
    font-size: 16px;
  }

  .header {
    padding-top: env(safe-area-inset-top);
  }

  .mobile-nav-panel {
    padding-top: calc(var(--s-6) + env(safe-area-inset-top));
    padding-bottom: calc(var(--s-6) + env(safe-area-inset-bottom));
  }
}
${PHONE_POLISH_END}
`,
  'shared/design.css': `${PHONE_POLISH_START}
@media (max-width: 768px) {
  .tool-mobile-btn,
  .tool-mobile-close,
  .tool-mobile-list a,
  .tool-mobile-suggest,
  .thmd-lang-select,
  .btn,
  .form-group input,
  .form-group select {
    min-height: 44px;
  }

  .tool-mobile-btn,
  .tool-mobile-close {
    min-width: 44px;
    align-items: center;
    justify-content: center;
  }

  .tool-mobile-list a,
  .tool-mobile-suggest,
  .btn {
    display: inline-flex;
    align-items: center;
  }

  .tool-mobile-list a,
  .tool-mobile-suggest {
    width: 100%;
  }

  .form-group input,
  .form-group select,
  .thmd-lang-select {
    font-size: 16px;
  }

  .tool-header {
    padding-top: env(safe-area-inset-top);
  }

  .tool-mobile-panel {
    padding-top: calc(var(--s-6) + env(safe-area-inset-top));
    padding-bottom: calc(var(--s-6) + env(safe-area-inset-bottom));
  }
}
${PHONE_POLISH_END}
`
};

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function readFileSafe(relPath) {
  const abs = path.join(REPO_ROOT, relPath);
  try {
    const content = await fs.readFile(abs, 'utf8');
    return { exists: true, content };
  } catch (error) {
    if (error && error.code === 'ENOENT') return { exists: false, content: '' };
    throw error;
  }
}

function ensureTrailingNewline(value) {
  if (!value) return '\n';
  return value.endsWith('\n') ? value : `${value}\n`;
}

function upsertMarkedBlock(content, block) {
  const normalized = ensureTrailingNewline(content);
  const startIndex = normalized.indexOf(PHONE_POLISH_START);
  const endIndex = normalized.indexOf(PHONE_POLISH_END);
  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const replacement = `${block}\n`;
    const before = normalized.slice(0, startIndex);
    const after = normalized.slice(endIndex + PHONE_POLISH_END.length).replace(/^\n+/, '');
    return `${before}${replacement}${after}`;
  }

  return `${normalized}\n${block}\n`;
}

async function applyPhonePolishPatches() {
  const changed = [];

  for (const relPath of Object.keys(PHONE_POLISH_BLOCKS)) {
    const file = await readFileSafe(relPath);
    if (!file.exists) continue;

    const next = upsertMarkedBlock(file.content, PHONE_POLISH_BLOCKS[relPath]);
    if (next !== file.content) {
      await fs.writeFile(path.join(REPO_ROOT, relPath), next, 'utf8');
      changed.push(relPath);
    }
  }

  return {
    mode: APPLY_MODE ? 'apply' : 'audit',
    changed_files: changed
  };
}

function findLineBySnippet(content, snippet) {
  if (!content) return null;
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(snippet)) return i + 1;
  }
  return null;
}

function findLineByRegex(content, regex) {
  if (!content) return null;
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    regex.lastIndex = 0;
    if (regex.test(lines[i])) return i + 1;
  }
  return null;
}

function makeCodeRefs(files, relPath, snippets = [], regexes = []) {
  const out = [];
  const file = files[relPath] || { exists: false, content: '' };

  if (!file.exists) {
    out.push(relPath);
    return out;
  }

  for (const snippet of snippets) {
    const line = findLineBySnippet(file.content, snippet);
    if (line) out.push(`${relPath}:${line}`);
  }

  for (const regex of regexes) {
    const line = findLineByRegex(file.content, regex);
    if (line) out.push(`${relPath}:${line}`);
  }

  if (out.length === 0) out.push(relPath);
  return Array.from(new Set(out));
}

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function parseTopLevelBlocks(css) {
  const blocks = [];
  let i = 0;
  while (i < css.length) {
    while (i < css.length && /\s/.test(css[i])) i++;
    if (i >= css.length) break;

    const braceIndex = css.indexOf('{', i);
    if (braceIndex === -1) break;

    const prelude = css.slice(i, braceIndex).trim();
    let j = braceIndex + 1;
    let depth = 1;
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth += 1;
      else if (css[j] === '}') depth -= 1;
      j += 1;
    }
    const body = css.slice(braceIndex + 1, j - 1);
    blocks.push({ prelude, body });
    i = j;
  }
  return blocks;
}

function parseDeclarations(blockBody) {
  const declarations = {};
  const parts = blockBody.split(';');
  for (const part of parts) {
    const idx = part.indexOf(':');
    if (idx === -1) continue;
    const prop = part.slice(0, idx).trim().toLowerCase();
    const value = part.slice(idx + 1).trim();
    if (!prop || !value) continue;
    declarations[prop] = value;
  }
  return declarations;
}

function parseCssRules(css, mediaStack = [], out = []) {
  const cleaned = stripComments(css);
  const blocks = parseTopLevelBlocks(cleaned);
  for (const block of blocks) {
    const prelude = block.prelude.trim();
    if (!prelude) continue;
    if (/^@media\b/i.test(prelude)) {
      parseCssRules(block.body, [...mediaStack, prelude], out);
      continue;
    }
    if (prelude.startsWith('@')) continue;
    const selectors = prelude
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    const declarations = parseDeclarations(block.body);
    out.push({ selectors, declarations, media: deepClone(mediaStack) });
  }
  return out;
}

function mediaApplies(mediaChain, widthPx) {
  for (const media of mediaChain) {
    const maxMatches = [...media.matchAll(/max-width\s*:\s*(\d+(?:\.\d+)?)px/gi)];
    for (const match of maxMatches) {
      const maxVal = Number(match[1]);
      if (Number.isFinite(maxVal) && widthPx > maxVal) return false;
    }

    const minMatches = [...media.matchAll(/min-width\s*:\s*(\d+(?:\.\d+)?)px/gi)];
    for (const match of minMatches) {
      const minVal = Number(match[1]);
      if (Number.isFinite(minVal) && widthPx < minVal) return false;
    }
  }
  return true;
}

function buildCustomPropMap(parsedRulesByFile) {
  const vars = {};
  for (const relPath of Object.keys(parsedRulesByFile)) {
    const rules = parsedRulesByFile[relPath];
    for (const rule of rules) {
      if (!rule.selectors.includes(':root')) continue;
      for (const [prop, value] of Object.entries(rule.declarations)) {
        if (prop.startsWith('--')) vars[prop] = value;
      }
    }
  }
  return vars;
}

function resolveLength(rawValue, vars, baseFontPx = 16, stack = []) {
  if (rawValue == null) return null;
  const value = String(rawValue).trim().toLowerCase();
  if (!value) return null;

  if (value.startsWith('var(')) {
    const nameMatch = value.match(/var\(\s*(--[a-z0-9-_]+)/i);
    if (nameMatch) {
      const key = nameMatch[1];
      if (stack.includes(key)) return null;
      const resolved = vars[key];
      if (resolved != null) return resolveLength(resolved, vars, baseFontPx, [...stack, key]);
    }

    const fallbackMatch = value.match(/var\([^,]+,\s*([^)]+)\)/i);
    if (fallbackMatch) return resolveLength(fallbackMatch[1], vars, baseFontPx, stack);
    return null;
  }

  if (/^-?\d*\.?\d+$/.test(value)) return Number(value);
  if (value === '0') return 0;

  const pxMatch = value.match(/^(-?\d*\.?\d+)px$/);
  if (pxMatch) return Number(pxMatch[1]);

  const remMatch = value.match(/^(-?\d*\.?\d+)rem$/);
  if (remMatch) return Number(remMatch[1]) * 16;

  const emMatch = value.match(/^(-?\d*\.?\d+)em$/);
  if (emMatch) return Number(emMatch[1]) * baseFontPx;

  return null;
}

function resolveLineHeight(rawValue, fontSizePx, vars) {
  if (rawValue == null) return 1.2 * fontSizePx;
  const value = String(rawValue).trim().toLowerCase();
  if (!value || value === 'normal') return 1.2 * fontSizePx;

  if (/^-?\d*\.?\d+$/.test(value)) return Number(value) * fontSizePx;

  const px = resolveLength(value, vars, fontSizePx);
  if (px != null) return px;

  return 1.2 * fontSizePx;
}

function parsePaddingShorthand(rawValue, vars, fontSizePx) {
  if (!rawValue) return null;
  const tokens = String(rawValue).trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 1 || tokens.length > 4) return null;

  const resolved = tokens.map((token) => resolveLength(token, vars, fontSizePx));
  if (resolved.some((x) => x == null)) return null;

  if (resolved.length === 1) return { top: resolved[0], bottom: resolved[0] };
  if (resolved.length === 2) return { top: resolved[0], bottom: resolved[0] };
  if (resolved.length === 3) return { top: resolved[0], bottom: resolved[2] };
  return { top: resolved[0], bottom: resolved[2] };
}

function computeVerticalPadding(style, vars, fontSizePx) {
  let top = resolveLength(style['padding-top'], vars, fontSizePx);
  let bottom = resolveLength(style['padding-bottom'], vars, fontSizePx);

  if (top == null || bottom == null) {
    const shorthand = parsePaddingShorthand(style.padding, vars, fontSizePx);
    if (shorthand) {
      if (top == null) top = shorthand.top;
      if (bottom == null) bottom = shorthand.bottom;
    }
  }

  return {
    top: top == null ? 0 : top,
    bottom: bottom == null ? 0 : bottom
  };
}

function styleForSelector(parsedRulesByFile, relPath, selector, widthPx) {
  const rules = parsedRulesByFile[relPath] || [];
  const style = {};
  for (const rule of rules) {
    if (!rule.selectors.includes(selector)) continue;
    if (!mediaApplies(rule.media, widthPx)) continue;
    Object.assign(style, rule.declarations);
  }
  return style;
}

function estimateTapTargetHeight(style, vars) {
  const fontSize = resolveLength(style['font-size'], vars, 16) ?? 16;
  const lineHeight = resolveLineHeight(style['line-height'], fontSize, vars);
  const padding = computeVerticalPadding(style, vars, fontSize);
  const explicitHeight = resolveLength(style.height, vars, fontSize);
  const minHeight = resolveLength(style['min-height'], vars, fontSize);

  let estimated = lineHeight + padding.top + padding.bottom;
  if (explicitHeight != null) estimated = Math.max(estimated, explicitHeight);
  if (minHeight != null) estimated = Math.max(estimated, minHeight);

  return {
    estimated,
    fontSize,
    lineHeight,
    paddingTop: padding.top,
    paddingBottom: padding.bottom,
    height: explicitHeight,
    minHeight
  };
}

function makeFinding(payload) {
  return {
    gate_id: payload.gate_id,
    domain: payload.domain || 'mobile',
    severity: payload.severity,
    title: payload.title,
    status: 'confirmed',
    evidence: {
      code_refs: payload.code_refs || [],
      runtime_refs: payload.runtime_refs || [],
      metrics: payload.metrics || {}
    },
    repro_steps: payload.repro_steps || [],
    observed: payload.observed,
    expected: payload.expected,
    risk: payload.risk,
    fix_hint: payload.fix_hint,
    owner: payload.owner || 'frontend'
  };
}

function severityRank(severity) {
  if (severity === 'blocker') return 0;
  if (severity === 'major') return 1;
  return 2;
}

function summarizeFindings(findings) {
  const summary = { blocker: 0, major: 0, minor: 0 };
  for (const finding of findings) {
    if (summary[finding.severity] != null) summary[finding.severity] += 1;
  }
  return summary;
}

function roundPct(value) {
  return Number(value.toFixed(2));
}

function sumShare(rows) {
  return rows.reduce((acc, row) => acc + (Number(row.share_pct) || 0), 0);
}

function buildCoverageMatrix() {
  const osCoverage = sumShare(GLOBAL_OS_SHARE);
  const browserCoverage = sumShare(GLOBAL_BROWSER_SHARE);
  const resolutionAnchorCoverage = sumShare(GLOBAL_RESOLUTION_ANCHORS);

  return {
    period: COVERAGE_PERIOD,
    target_global_pct: GLOBAL_COVERAGE_TARGET_PCT,
    methodology: [
      'Use StatCounter global mobile OS share for platform coverage.',
      'Use StatCounter global mobile browser share for runtime engine coverage.',
      'Use StatCounter top mobile screen resolutions as viewport anchors.',
      'Use GSMArena class mapping for representative device families.'
    ],
    sources: COVERAGE_SOURCES,
    os_mix: GLOBAL_OS_SHARE,
    browser_mix: GLOBAL_BROWSER_SHARE,
    resolution_anchors: GLOBAL_RESOLUTION_ANCHORS,
    gsma_class_map: GSMA_CLASS_MAP,
    metrics: {
      os_coverage_pct: roundPct(osCoverage),
      browser_coverage_pct: roundPct(browserCoverage),
      resolution_anchor_pct: roundPct(resolutionAnchorCoverage),
      conservative_global_coverage_pct: roundPct(Math.min(osCoverage, browserCoverage))
    },
    assumptions: [
      'Browser share is treated as the conservative global coverage bound because browser share already reflects real-world OS/device mix.',
      'Resolution anchors are used as representative viewport classes, not full-population cumulative coverage.',
      'GSMArena is used for device-family mapping to viewport classes.'
    ]
  };
}

function buildQualityGates(summary, findings, coverage) {
  const iphoneBlockerMajor = findings.filter(
    (finding) => finding.domain === 'mobile' && (finding.severity === 'blocker' || finding.severity === 'major')
  ).length;

  const globalCoveragePass = coverage.metrics.conservative_global_coverage_pct >= GLOBAL_COVERAGE_TARGET_PCT;
  const iphonePass = iphoneBlockerMajor <= IPHONE_BLOCKER_MAJOR_MAX;
  const overallPass = globalCoveragePass && iphonePass && summary.blocker === 0;

  return {
    global_coverage_gate: {
      threshold_pct: GLOBAL_COVERAGE_TARGET_PCT,
      measured_pct: coverage.metrics.conservative_global_coverage_pct,
      pass: globalCoveragePass
    },
    iphone_quality_gate: {
      blocker_major_max: IPHONE_BLOCKER_MAJOR_MAX,
      blocker_major_found: iphoneBlockerMajor,
      pass: iphonePass,
      matrix: IPHONE_MATRIX
    },
    overall_pass: overallPass
  };
}

function buildImplementationLog(applyResult) {
  const scopedFiles = [
    {
      file: 'styles.css',
      rationale: 'Global homepage shell: touch targets, iOS-safe form font sizing, and safe-area handling.'
    },
    {
      file: 'shared/design.css',
      rationale: 'Shared tool shell: touch targets, iOS-safe form font sizing, and safe-area handling.'
    }
  ];

  return scopedFiles.map((item) => {
    if (applyResult.mode !== 'apply') {
      return {
        file: item.file,
        status: 'not-applied',
        rationale: item.rationale
      };
    }
    return {
      file: item.file,
      status: applyResult.changed_files.includes(item.file) ? 'updated' : 'already-compliant',
      rationale: item.rationale
    };
  });
}

function buildRouteDeviceQaSummary(files, runtime, summary) {
  const rows = [];
  for (let i = 0; i < ROUTES.length; i++) {
    const route = ROUTES[i];
    const htmlPath = ROUTE_HTML[i];
    const html = files[htmlPath]?.content || '';
    const hasViewport = /<meta[^>]*name=["']viewport["'][^>]*>/i.test(html);
    const runtimeCheck = (runtime.routeChecks || []).find((check) => check.url.endsWith(route));

    rows.push({
      route,
      viewport_meta_ok: hasViewport,
      runtime_status: SKIP_NETWORK
        ? 'skipped'
        : runtimeCheck
          ? runtimeCheck.ok
            ? runtimeCheck.status
            : `error:${runtimeCheck.error}`
          : 'missing',
      tested_global_widths_px: MOBILE_WIDTHS,
      tested_iphone_classes: IPHONE_MATRIX.map((item) => item.class_id),
      qa_status: summary.blocker > 0 || summary.major > 0 ? 'needs-work' : 'pass',
      screenshot_evidence: 'manual-capture-required'
    });
  }
  return rows;
}

function buildRemainingRisks(summary) {
  const risks = [];

  if (SKIP_NETWORK) {
    risks.push({
      severity: 'major',
      risk: 'Runtime route probes were skipped in code-only mode.',
      mitigation: 'Run without MOBILE_UX_SKIP_NETWORK=1 against staging before release.'
    });
  }

  risks.push({
    severity: 'major',
    risk: 'Screenshot evidence is not auto-generated by this script.',
    mitigation: 'Capture before/after screenshots across the full matrix and attach them to the release checklist.'
  });

  if (summary.minor > 0) {
    risks.push({
      severity: 'minor',
      risk: `${summary.minor} minor mobile issues remain open.`,
      mitigation: 'Resolve minors or explicitly defer with documented rationale.'
    });
  }

  if (risks.length === 0) {
    risks.push({
      severity: 'none',
      risk: 'No open risks detected in current gate outputs.',
      mitigation: 'Proceed with normal staging verification.'
    });
  }

  return risks;
}

function roundLogTemplate(rounds, findingSummary) {
  const roundsOut = [];
  for (let i = 1; i <= rounds; i++) {
    roundsOut.push({
      round: i,
      executor: 'Executor-Mobile-UX',
      critics: [
        'Critic-Visual-Design',
        'Critic-iOS-Safari',
        'Critic-Accessibility',
        'Critic-Performance',
        'Critic-Regression'
      ],
      status: i === rounds ? 'finalized' : 'adversarial-review',
      unresolved_blockers: findingSummary.blocker,
      unresolved_majors: findingSummary.major
    });
  }
  return roundsOut;
}

async function fetchWithTimeout(url, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const response = await fetch(url, { redirect: 'follow', signal: ctrl.signal });
    const headers = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
    return {
      ok: true,
      url,
      finalUrl: response.url,
      status: response.status,
      headers
    };
  } catch (error) {
    return {
      ok: false,
      url,
      error: String(error && error.message ? error.message : error)
    };
  } finally {
    clearTimeout(timeout);
  }
}

function buildStaticFindings(files, parsedRulesByFile, vars, analysis) {
  const findings = [];

  const missingViewport = [];
  for (const relPath of ROUTE_HTML) {
    const file = files[relPath];
    if (!file || !file.exists) {
      missingViewport.push({ relPath, reason: 'missing-file' });
      continue;
    }
    const metaTagMatch = file.content.match(/<meta[^>]*name=["']viewport["'][^>]*>/i);
    if (!metaTagMatch) {
      missingViewport.push({ relPath, reason: 'missing-meta' });
      continue;
    }
    const tag = metaTagMatch[0];
    const hasWidth = /width\s*=\s*device-width/i.test(tag);
    const hasInitialScale = /initial-scale\s*=\s*1(?:\.0)?/i.test(tag);
    if (!hasWidth || !hasInitialScale) {
      missingViewport.push({ relPath, reason: 'invalid-content' });
    }
  }

  if (missingViewport.length > 0) {
    findings.push(
      makeFinding({
        gate_id: 'G-MOBILE-001',
        severity: 'blocker',
        title: 'One or more routes are missing a proper mobile viewport declaration',
        code_refs: missingViewport.flatMap((x) => makeCodeRefs(files, x.relPath, ['viewport'])),
        observed: 'Missing or invalid viewport meta tags were found on route entry HTML files.',
        expected: 'Every route should include `width=device-width, initial-scale=1.0` viewport metadata.',
        risk: 'Layouts and text scaling can render incorrectly on phones.',
        fix_hint: 'Normalize viewport meta tags across all route HTML files.',
        repro_steps: [
          'Open route entry HTML files.',
          'Check for viewport meta tag with width=device-width and initial-scale=1.0.',
          'Load affected route on a phone and compare rendering.'
        ]
      })
    );
  }

  const breakpointIssues = [];
  for (const relPath of ['styles.css', 'shared/design.css']) {
    const file = files[relPath];
    if (!file || !file.exists) continue;
    const has768 = /@media\s*\(\s*max-width\s*:\s*768px\s*\)/i.test(file.content);
    const has480 = /@media\s*\(\s*max-width\s*:\s*480px\s*\)/i.test(file.content);
    if (!has768 || !has480) {
      breakpointIssues.push({ relPath, has768, has480 });
    }
  }

  if (breakpointIssues.length > 0) {
    findings.push(
      makeFinding({
        gate_id: 'G-MOBILE-002',
        severity: 'major',
        title: 'Global responsive breakpoint coverage is incomplete',
        code_refs: breakpointIssues.flatMap((x) => makeCodeRefs(files, x.relPath, ['@media'])),
        observed: 'A global stylesheet is missing one or more required phone breakpoint ranges (<=768px, <=480px).',
        expected: 'Both global stylesheets should define responsive behavior at <=768px and <=480px.',
        risk: 'Inconsistent layout behavior across common phone sizes.',
        fix_hint: 'Add missing breakpoint blocks and route critical layout styles through them.',
        repro_steps: [
          'Inspect responsive media queries in styles.css and shared/design.css.',
          'Resize to 390px and 430px viewport widths.',
          'Validate nav, hero, cards, and forms remain consistent.'
        ]
      })
    );
  }

  if (analysis.tapTargetFailures.length > 0) {
    const severeCount = analysis.tapTargetFailures.filter((x) => x.critical).length;
    const refs = [];
    for (const issue of analysis.tapTargetFailures) {
      refs.push(...makeCodeRefs(files, issue.file, [issue.selector]));
    }

    findings.push(
      makeFinding({
        gate_id: 'G-MOBILE-003',
        severity: severeCount > 0 ? 'major' : 'minor',
        title: 'Interactive touch targets estimate below recommended 44px mobile minimum',
        code_refs: Array.from(new Set(refs)),
        metrics: {
          affected_controls: analysis.tapTargetFailures.map((x) => ({
            selector: x.selector,
            file: x.file,
            estimated_px: Number(x.estimated.toFixed(1)),
            critical: x.critical
          }))
        },
        observed: `${analysis.tapTargetFailures.length} interactive control styles estimate below 44px touch target size at phone widths.`,
        expected: 'Primary mobile controls should provide at least 44px hit area.',
        risk: 'High-tap-error navigation and reduced usability on small screens.',
        fix_hint: 'Add explicit min-height: 44px and sufficient vertical padding for mobile controls.',
        repro_steps: [
          'Run mobile audit at 360px and 390px widths.',
          'Inspect target controls in nav and form surfaces.',
          'Measure hit area in browser devtools accessibility pane.'
        ]
      })
    );
  }

  if (analysis.fontSizeFailures.length > 0) {
    const refs = [];
    for (const issue of analysis.fontSizeFailures) {
      refs.push(...makeCodeRefs(files, issue.file, [issue.selector]));
    }
    findings.push(
      makeFinding({
        gate_id: 'G-MOBILE-004',
        severity: 'major',
        title: 'Input/select font sizes are below 16px at phone width',
        code_refs: Array.from(new Set(refs)),
        metrics: {
          affected_fields: analysis.fontSizeFailures.map((x) => ({
            selector: x.selector,
            file: x.file,
            computed_font_px: Number(x.fontPx.toFixed(2))
          }))
        },
        observed: `${analysis.fontSizeFailures.length} field selectors evaluate below 16px at ${TARGET_WIDTH}px width.`,
        expected: 'Mobile form field fonts should be >=16px to prevent iOS zoom and improve readability.',
        risk: 'Auto-zoom jumps and reduced form usability on iPhone.',
        fix_hint: 'Set mobile input/select font-size to 16px or larger for all interactive form fields.',
        repro_steps: [
          'Open route on iPhone Safari.',
          'Tap affected input/select fields.',
          'Observe whether viewport auto-zooms and text legibility degrades.'
        ]
      })
    );
  }

  const hasPhoneTableFallback =
    /@media\s*\(\s*max-width\s*:\s*768px\s*\)[\s\S]*?\.table-wrap\s*\{[\s\S]*?display\s*:\s*none/i.test(files['styles.css']?.content || '') &&
    /@media\s*\(\s*max-width\s*:\s*768px\s*\)[\s\S]*?\.mobile-cards\s*\{[\s\S]*?display\s*:\s*flex/i.test(files['styles.css']?.content || '');
  if (!hasPhoneTableFallback) {
    findings.push(
      makeFinding({
        gate_id: 'G-MOBILE-005',
        severity: 'major',
        title: 'Homepage mobile fallback card view is not reliably enforced',
        code_refs: makeCodeRefs(files, 'styles.css', ['.table-wrap', '.mobile-cards', '@media (max-width: 768px)']),
        observed: 'Expected table-to-card mobile switch rules could not be confirmed.',
        expected: 'Desktop table should hide on phone widths and mobile cards should render as primary view.',
        risk: 'Horizontal table overflow and poor readability on phones.',
        fix_hint: 'Enforce table hide/mobile-card show behavior inside the <=768px breakpoint.',
        repro_steps: [
          'Open homepage at 390px width.',
          'Verify table wrapper is hidden.',
          'Verify mobile cards are visible and interactive.'
        ]
      })
    );
  }

  const hasHomeMobileEsc =
    /mobileNavOverlay/.test(files['app.js']?.content || '') &&
    /Escape/.test(files['app.js']?.content || '') &&
    /mobileNavClose/.test(files['app.js']?.content || '');
  const hasToolMobileEsc =
    /tool-mobile-overlay/.test(files['shared/nav.js']?.content || '') &&
    /Escape/.test(files['shared/nav.js']?.content || '') &&
    /tool-mobile-close/.test(files['shared/nav.js']?.content || '');
  if (!hasHomeMobileEsc || !hasToolMobileEsc) {
    findings.push(
      makeFinding({
        gate_id: 'G-MOBILE-006',
        severity: 'major',
        title: 'Mobile navigation close behaviors are incomplete',
        code_refs: makeCodeRefs(files, 'app.js', ['Escape', 'mobileNavOverlay', 'mobileNavClose']).concat(
          makeCodeRefs(files, 'shared/nav.js', ['Escape', 'tool-mobile-overlay', 'tool-mobile-close'])
        ),
        observed: 'Escape key and/or overlay close handling for mobile nav could not be fully validated.',
        expected: 'Both homepage and tool mobile nav overlays should support explicit close controls and Escape handling.',
        risk: 'Users can become trapped in mobile navigation overlays.',
        fix_hint: 'Add consistent close-on-Escape and close-on-overlay-click handlers across all mobile nav shells.',
        repro_steps: [
          'Open mobile menu on homepage and a tool page.',
          'Test close via close button, overlay tap, and Escape key.',
          'Confirm focus and body scroll state restore correctly.'
        ]
      })
    );
  }

  const hasSafeArea = /safe-area-inset/i.test((files['styles.css']?.content || '') + '\n' + (files['shared/design.css']?.content || ''));
  if (!hasSafeArea) {
    findings.push(
      makeFinding({
        gate_id: 'G-MOBILE-007',
        severity: 'minor',
        title: 'No explicit safe-area inset handling for notched devices',
        code_refs: makeCodeRefs(files, 'styles.css', ['.header', '.mobile-nav-panel']).concat(
          makeCodeRefs(files, 'shared/design.css', ['.tool-header', '.tool-mobile-panel'])
        ),
        observed: 'Safe-area environment variables are not used in mobile overlay/header spacing.',
        expected: 'Critical mobile overlays and sticky bars should account for `env(safe-area-inset-*)` where needed.',
        risk: 'Minor clipping or cramped controls on devices with notches/dynamic islands.',
        fix_hint: 'Add safe-area-aware padding to fixed/sticky mobile surfaces.',
        repro_steps: [
          'Test on iPhone with notch.',
          'Open nav overlays and inspect top/bottom insets.',
          'Check for clipped controls near safe areas.'
        ]
      })
    );
  }

  return findings;
}

function analyzeMobileSelectors(parsedRulesByFile, vars) {
  const tapTargetFailures = [];
  for (const target of TAP_TARGETS) {
    let worst = null;
    for (const width of MOBILE_WIDTHS) {
      const style = styleForSelector(parsedRulesByFile, target.file, target.selector, width);
      if (!style || Object.keys(style).length === 0) continue;
      const metrics = estimateTapTargetHeight(style, vars);
      if (!worst || metrics.estimated < worst.estimated) {
        worst = { ...metrics, width };
      }
    }
    if (worst && worst.estimated < 44) {
      tapTargetFailures.push({
        ...target,
        estimated: worst.estimated,
        width: worst.width,
        fontSize: worst.fontSize
      });
    }
  }

  const fontSizeFailures = [];
  for (const target of FONT_SIZE_TARGETS) {
    const style = styleForSelector(parsedRulesByFile, target.file, target.selector, TARGET_WIDTH);
    if (!style || Object.keys(style).length === 0) continue;
    const fontPx = resolveLength(style['font-size'], vars, 16);
    if (fontPx != null && fontPx < 16) {
      fontSizeFailures.push({
        ...target,
        fontPx
      });
    }
  }

  return { tapTargetFailures, fontSizeFailures };
}

function renderReport(summary, findings, runtime, rounds, applyResult, coverage, gates, implementationLog, routeQaSummary, remainingRisks) {
  const lines = [];
  lines.push('# Mobile UX Orchestrator Report');
  lines.push('');
  lines.push(`Date: ${TODAY}`);
  lines.push(`Global phone baselines: ${MOBILE_WIDTHS.join('px, ')}px`);
  lines.push(`Adversarial rounds configured: ${rounds}`);
  lines.push(`Staging target: ${STAGING_BASE_URL}`);
  lines.push('');
  lines.push('## Severity Summary');
  lines.push('');
  lines.push(`- Blocker: ${summary.blocker}`);
  lines.push(`- Major: ${summary.major}`);
  lines.push(`- Minor: ${summary.minor}`);
  lines.push(`- Total confirmed findings: ${findings.length}`);
  lines.push('');

  lines.push('## Coverage Matrix + Methodology');
  lines.push('');
  lines.push(`- Coverage period: ${coverage.period}`);
  lines.push(`- Coverage target: >=${coverage.target_global_pct}%`);
  lines.push(`- Conservative measured coverage: ${coverage.metrics.conservative_global_coverage_pct}%`);
  lines.push(`- OS coverage (Android + iOS): ${coverage.metrics.os_coverage_pct}%`);
  lines.push(`- Browser coverage (Chrome + Safari + Samsung Internet): ${coverage.metrics.browser_coverage_pct}%`);
  lines.push(`- Resolution-anchor share (top listed buckets): ${coverage.metrics.resolution_anchor_pct}%`);
  lines.push(`- Global coverage gate: ${gates.global_coverage_gate.pass ? 'PASS' : 'FAIL'}`);
  lines.push(`- iPhone blocker/major gate: ${gates.iphone_quality_gate.pass ? 'PASS' : 'FAIL'}`);
  lines.push(`- Overall gate: ${gates.overall_pass ? 'PASS' : 'FAIL'}`);
  lines.push('');
  lines.push('### Sources');
  lines.push('');
  lines.push(`- StatCounter OS: ${coverage.sources.statcounter_os}`);
  lines.push(`- StatCounter Browser: ${coverage.sources.statcounter_browser}`);
  lines.push(`- StatCounter Resolution: ${coverage.sources.statcounter_resolution}`);
  lines.push(`- GSMArena mapping base: ${coverage.sources.gsma_device_specs}`);
  lines.push('');
  lines.push('### iPhone Matrix');
  lines.push('');
  for (const entry of IPHONE_MATRIX) {
    lines.push(`- ${entry.class_id}: ${entry.css_viewport} (${entry.orientation}, ${entry.browser})`);
  }
  lines.push('');

  lines.push('## Execution Mode');
  lines.push('');
  lines.push(`- Mode: ${applyResult.mode}`);
  if (applyResult.mode === 'apply') {
    lines.push(`- Changed files: ${applyResult.changed_files.length > 0 ? applyResult.changed_files.join(', ') : '(none)'}`);
  }
  lines.push('');

  if (runtime && runtime.routeChecks && runtime.routeChecks.length > 0) {
    lines.push('## Runtime Probe Summary');
    lines.push('');
    for (const check of runtime.routeChecks) {
      if (check.ok) {
        lines.push(`- ${check.url} -> ${check.status}`);
      } else {
        lines.push(`- ${check.url} -> ERROR (${check.error})`);
      }
    }
    lines.push('');
  }

  lines.push('## Prioritized Findings Log');
  lines.push('');
  if (findings.length === 0) {
    lines.push('- No findings. Mobile baseline checks passed.');
    lines.push('');
  } else {
    const ordered = findings.slice().sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
    for (const finding of ordered) {
      lines.push(`### ${finding.gate_id} [${finding.severity.toUpperCase()}] ${finding.title}`);
      lines.push(`- Domain: ${finding.domain}`);
      lines.push(`- Owner: ${finding.owner}`);
      lines.push(`- Observed: ${finding.observed}`);
      lines.push(`- Expected: ${finding.expected}`);
      lines.push(`- Risk: ${finding.risk}`);
      lines.push(`- Fix hint: ${finding.fix_hint}`);
      if (finding.evidence && finding.evidence.code_refs && finding.evidence.code_refs.length > 0) {
        lines.push(`- Code refs: ${finding.evidence.code_refs.join(', ')}`);
      }
      if (finding.evidence && finding.evidence.runtime_refs && finding.evidence.runtime_refs.length > 0) {
        lines.push(`- Runtime refs: ${finding.evidence.runtime_refs.join(', ')}`);
      }
      if (finding.repro_steps && finding.repro_steps.length > 0) {
        lines.push(`- Repro: ${finding.repro_steps.join(' -> ')}`);
      }
      lines.push('');
    }
  }

  lines.push('## Implementation Log By File');
  lines.push('');
  for (const entry of implementationLog) {
    lines.push(`- ${entry.file}: ${entry.status} — ${entry.rationale}`);
  }
  lines.push('');

  lines.push('## Final QA Summary By Route/Device');
  lines.push('');
  for (const row of routeQaSummary) {
    lines.push(`- ${row.route}`);
    lines.push(`  - viewport meta: ${row.viewport_meta_ok ? 'ok' : 'missing'}`);
    lines.push(`  - runtime: ${row.runtime_status}`);
    lines.push(`  - widths: ${row.tested_global_widths_px.join(', ')}`);
    lines.push(`  - iPhone classes: ${row.tested_iphone_classes.join(', ')}`);
    lines.push(`  - qa status: ${row.qa_status}`);
    lines.push(`  - screenshot evidence: ${row.screenshot_evidence}`);
  }
  lines.push('');

  lines.push('## Remaining Risks + Mitigation');
  lines.push('');
  for (const risk of remainingRisks) {
    lines.push(`- [${risk.severity.toUpperCase()}] ${risk.risk}`);
    lines.push(`  - Mitigation: ${risk.mitigation}`);
  }
  lines.push('');

  lines.push('## Output Checklist');
  lines.push('');
  lines.push(`- Coverage matrix + methodology: ${gates.global_coverage_gate.pass ? 'pass' : 'fail'}`);
  lines.push('- Prioritized findings log: present');
  lines.push(`- Implementation log by file: ${implementationLog.length > 0 ? 'present' : 'missing'}`);
  lines.push(`- Route/device QA summary: ${routeQaSummary.length === ROUTES.length ? 'present' : 'incomplete'}`);
  lines.push(`- Remaining risk register: ${remainingRisks.length > 0 ? 'present' : 'missing'}`);
  lines.push(`- iPhone zero blocker/major: ${gates.iphone_quality_gate.pass ? 'pass' : 'fail'}`);
  lines.push('');

  return lines.join('\n');
}

function renderFixQueue(findings) {
  const ordered = findings.slice().sort((a, b) => {
    const sev = severityRank(a.severity) - severityRank(b.severity);
    if (sev !== 0) return sev;
    return a.gate_id.localeCompare(b.gate_id);
  });

  const lines = [];
  lines.push('# Mobile UX Fix Queue');
  lines.push('');
  lines.push(`Date: ${TODAY}`);
  lines.push('');
  lines.push('| Priority | Gate | Severity | Owner | Action | Acceptance |');
  lines.push('|---:|---|---|---|---|---|');
  ordered.forEach((finding, idx) => {
    lines.push(
      `| ${idx + 1} | ${finding.gate_id} | ${finding.severity} | ${finding.owner} | ${finding.fix_hint} | ${finding.expected} |`
    );
  });
  lines.push('');
  return lines.join('\n');
}

function renderEvidence(runtime, findings) {
  const lines = [];
  lines.push('# Mobile UX Evidence');
  lines.push('');
  lines.push(`Date: ${TODAY}`);
  lines.push('');
  lines.push('## Runtime Checks');
  lines.push('');
  if (!runtime || !runtime.routeChecks || runtime.routeChecks.length === 0) {
    lines.push('- Runtime checks skipped.');
  } else {
    for (const check of runtime.routeChecks) {
      lines.push(`- ${check.url}`);
      if (check.ok) {
        lines.push(`  - status: ${check.status}`);
        lines.push(`  - content-type: ${check.headers['content-type'] || '(missing)'}`);
      } else {
        lines.push(`  - error: ${check.error}`);
      }
    }
  }
  lines.push('');
  lines.push('## Findings Snapshot');
  lines.push('');
  for (const finding of findings.slice().sort((a, b) => severityRank(a.severity) - severityRank(b.severity))) {
    lines.push(`### ${finding.gate_id}`);
    lines.push(`- Title: ${finding.title}`);
    if (finding.evidence && finding.evidence.code_refs) {
      lines.push(`- Code refs: ${finding.evidence.code_refs.join(', ')}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function renderPrompt(rounds) {
  return `# Mobile UX Orchestrator Prompt

Last updated: ${TODAY}

Use this prompt directly in your orchestrator:

\`\`\`text
You are the Orchestration Lead for TinyHumanMD, a static client-side medical web app (HTML/CSS/vanilla JS) deployed on Cloudflare Pages.

Mission:
Make the site look amazing on phones globally, with measurable coverage for at least the top 90% of phone usage worldwide, and a perfect experience on iPhones.

Hard constraints:
1) Do not change medical calculator logic or clinical reference data behavior.
2) Do not break analytics semantics or IDs.
3) Preserve legal/medical disclaimers and route structure.
4) Keep stack framework-free (HTML/CSS/vanilla JS).
5) Maintain shared runtime conventions in shared/ (nav.js, analytics.js, seo.js, lms.js, chart-helpers.js, storage.js).

Routes in scope:
- /
- /catch-up/
- /growth/
- /bili/
- /ga-calc/
- /dosing/
- /terms/
- /privacy/

Agent roles:
- Executor-Mobile-UX
- Critic-Visual-Design
- Critic-iOS-Safari
- Critic-Accessibility
- Critic-Performance
- Critic-Regression
- Orchestrator (final gate authority)

Phase 0: Device coverage definition
- Build a phone test matrix using:
  - Global mobile OS/browser usage from StatCounter (most recent full-month global snapshot).
  - Device/viewport mappings from GSMArena for dominant phone classes.
- Show explicit coverage math proving >=90% global phone usage coverage.
- Build a dedicated iPhone matrix in Safari:
  - 4.7"/SE class, 5.4"/Mini class, 6.1" base/Pro class, 6.7"/Plus/Pro Max class
  - Portrait and landscape
  - Current iOS Safari behavior expectations
- Output assumptions and source timestamps.

Phase 1: Baseline audit
- Capture before screenshots for every route across the matrix.
- Audit:
  - typography, spacing rhythm, visual hierarchy
  - touch target sizing (>=44px)
  - safe-area handling (notch/dynamic island/home indicator)
  - sticky/fixed headers, menus, overlays, modals
  - form usability (>=16px control font on iOS)
  - overflow, wrapping, table/card behavior
  - contrast and readability
- Log issues as blocker/major/minor with:
  - route
  - viewport/device
  - repro steps
  - file-level suspected refs

Phase 2: Mobile UX implementation
- Implement mobile-first CSS/JS polish while preserving product constraints.
- Required UX baselines:
  - all primary interactive controls >=44px touch size
  - iOS form controls >=16px
  - safe-area env() integration where fixed/sticky UI exists
  - no horizontal scroll on tested phone viewports
  - smooth interaction transitions without jank
  - intentional, premium visual polish (not generic boilerplate)

Phase 3: iPhone perfection pass
- Validate deeply on iPhone Safari matrix:
  - dvh/svh/vh usage and keyboard-safe behavior
  - scroll lock and modal/open-menu body behavior
  - notch/dynamic-island/home-indicator insets
  - tap responsiveness and font rendering
- iPhone gate: zero blocker and zero major issues allowed.

Phase 4: Regression + quality gates
- Re-capture after screenshots across full matrix.
- Confirm no regressions in:
  - calculator behavior
  - route navigation
  - analytics semantics
  - legal/disclaimer presence
- Confirm mobile performance trend is not degraded (LCP/CLS/INP directionally stable or improved).

Adversarial protocol:
- Run at least ${rounds} executor-vs-critic rounds.
- Every round must include:
  - changed files
  - critic findings
  - remediation outcome
- Do not finalize with unresolved blockers.
- Final authority is quality gates, not effort spent.

Required final output sections:
1) Coverage matrix + methodology + source dates
2) Prioritized findings log (before)
3) Implementation log by file
4) Route/device QA summary (after)
5) Remaining risks and mitigation
6) Final pass/fail verdict against:
   - >=90% global phone coverage
   - zero blocker/major on iPhone matrix
\`\`\`
`;
}

function orchestratorMetadata(summary, roundLog, runtime, findings, applyResult, coverage, gates) {
  return {
    title: 'TinyHumanMD Mobile UX Orchestrator Output',
    date: TODAY,
    staging_base_url: STAGING_BASE_URL,
    phone_widths: MOBILE_WIDTHS,
    rounds_configured: ROUNDS_MIN,
    summary,
    rounds_executed: roundLog.length,
    runtime_probe_count: runtime.routeChecks.length,
    findings_total: findings.length,
    mode: applyResult.mode,
    changed_files: applyResult.changed_files,
    coverage_period: coverage.period,
    conservative_global_coverage_pct: coverage.metrics.conservative_global_coverage_pct,
    global_coverage_target_pct: coverage.target_global_pct,
    global_coverage_gate_pass: gates.global_coverage_gate.pass,
    iphone_gate_pass: gates.iphone_quality_gate.pass,
    overall_gate_pass: gates.overall_pass
  };
}

async function runRuntimeProbes() {
  if (SKIP_NETWORK) return { routeChecks: [] };
  const routeChecks = [];
  for (const route of ROUTES) {
    const url = `${STAGING_BASE_URL}${route}`;
    routeChecks.push(await fetchWithTimeout(url));
  }
  return { routeChecks };
}

async function main() {
  const applyResult = APPLY_MODE
    ? await applyPhonePolishPatches()
    : {
        mode: 'audit',
        changed_files: []
      };

  const files = {};
  for (const relPath of [...ROUTE_HTML, ...CSS_FILES, 'app.js', 'shared/nav.js']) {
    files[relPath] = await readFileSafe(relPath);
  }

  const parsedRulesByFile = {};
  for (const relPath of CSS_FILES) {
    const file = files[relPath];
    parsedRulesByFile[relPath] = file && file.exists ? parseCssRules(file.content) : [];
  }

  const vars = buildCustomPropMap(parsedRulesByFile);
  const analysis = analyzeMobileSelectors(parsedRulesByFile, vars);

  const runtime = await runRuntimeProbes();
  const findings = buildStaticFindings(files, parsedRulesByFile, vars, analysis);
  const summary = summarizeFindings(findings);
  const coverage = buildCoverageMatrix();
  const gates = buildQualityGates(summary, findings, coverage);
  const implementationLog = buildImplementationLog(applyResult);
  const routeQaSummary = buildRouteDeviceQaSummary(files, runtime, summary);
  const remainingRisks = buildRemainingRisks(summary);
  const roundLog = roundLogTemplate(ROUNDS_MIN, summary);

  const reportPath = path.join(DOCS_DIR, `MOBILE_UX_ORCHESTRATOR_REPORT_${TODAY}.md`);
  const matrixPath = path.join(DOCS_DIR, `MOBILE_UX_GATE_MATRIX_${TODAY}.json`);
  const fixQueuePath = path.join(DOCS_DIR, `MOBILE_UX_FIX_QUEUE_${TODAY}.md`);
  const evidencePath = path.join(DOCS_DIR, `MOBILE_UX_EVIDENCE_${TODAY}.md`);
  const promptPath = path.join(DOCS_DIR, `MOBILE_UX_ORCHESTRATOR_PROMPT_${TODAY}.md`);

  const matrix = {
    metadata: orchestratorMetadata(summary, roundLog, runtime, findings, applyResult, coverage, gates),
    round_log: roundLog,
    coverage,
    quality_gates: gates,
    implementation_log: implementationLog,
    route_device_qa_summary: routeQaSummary,
    remaining_risks: remainingRisks,
    findings
  };

  await fs.mkdir(DOCS_DIR, { recursive: true });
  await fs.writeFile(
    reportPath,
    renderReport(summary, findings, runtime, ROUNDS_MIN, applyResult, coverage, gates, implementationLog, routeQaSummary, remainingRisks),
    'utf8'
  );
  await fs.writeFile(matrixPath, JSON.stringify(matrix, null, 2), 'utf8');
  await fs.writeFile(fixQueuePath, renderFixQueue(findings), 'utf8');
  await fs.writeFile(evidencePath, renderEvidence(runtime, findings), 'utf8');
  await fs.writeFile(promptPath, renderPrompt(ROUNDS_MIN), 'utf8');

  console.log(
    JSON.stringify(
      {
        report: path.relative(REPO_ROOT, reportPath),
        matrix: path.relative(REPO_ROOT, matrixPath),
        fix_queue: path.relative(REPO_ROOT, fixQueuePath),
        evidence: path.relative(REPO_ROOT, evidencePath),
        prompt: path.relative(REPO_ROOT, promptPath),
        mode: applyResult.mode,
        changed_files: applyResult.changed_files,
        quality_gates: gates,
        summary
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
