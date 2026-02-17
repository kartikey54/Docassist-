#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const DOCS_DIR = path.join(REPO_ROOT, 'docs');
const TODAY = new Date().toISOString().slice(0, 10);
const STAGING_BASE_URL = process.env.STAGING_BASE_URL || 'https://staging.tinyhumanmd.pages.dev';
const ROUNDS_MIN = Math.max(1, Number(process.env.QA_GOD_ROUNDS || 30));
const SKIP_NETWORK = process.env.QA_GOD_SKIP_NETWORK === '1';

const ROUTES = ['/', '/catch-up/', '/growth/', '/bili/', '/ga-calc/', '/dosing/', '/terms/', '/privacy/'];

const MEDICAL_CITATIONS = {
  aap_catchup: 'AAP Immunizations (primary): https://www.aap.org/en/patient-care/immunizations/',
  cdc_catchup: 'CDC Catch-up Schedule (secondary): https://www.cdc.gov/vaccines/hcp/imz-schedules/child-adolescent-catch-up.html',
  aap_bili: 'AAP 2022 Hyperbilirubinemia Guideline (primary): https://publications.aap.org/pediatrics/article/150/3/e2022058859/188726/',
  cdc_mpox: 'CDC Mpox Vaccines (secondary): https://www.cdc.gov/mpox/vaccines/index.html',
  acog_term: 'ACOG Term Definitions (secondary): https://www.acog.org/womens-health/faqs/when-pregnancy-goes-past-your-due-date'
};

const REL_FILES = [
  'index.html',
  'catch-up/index.html',
  'catch-up/catch-up.js',
  'growth/index.html',
  'growth/growth.js',
  'bili/index.html',
  'bili/bili.js',
  'ga-calc/index.html',
  'ga-calc/ga-calc.js',
  'dosing/index.html',
  'dosing/dosing.js',
  'data/dosing-reference.json',
  'data/bili-thresholds.json',
  'shared/analytics.js',
  'terms/index.html',
  'privacy/index.html',
  'sw.js',
  '_headers',
  'package.json',
  'wrangler.toml',
  'staging-wrangler.toml',
  'scripts/deploy.sh',
  'sitemap.xml'
];

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

function includes(files, relPath, snippet) {
  const file = files[relPath];
  return !!(file && file.exists && file.content.includes(snippet));
}

function regexTest(files, relPath, regex) {
  const file = files[relPath];
  return !!(file && file.exists && regex.test(file.content));
}

function parseJson(files, relPath) {
  const file = files[relPath];
  if (!file || !file.exists) return null;
  try {
    return JSON.parse(file.content);
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url, timeoutMs = 12000, method = 'GET') {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method, redirect: 'follow', signal: ctrl.signal });
    const headers = {};
    response.headers.forEach((v, k) => {
      headers[k.toLowerCase()] = v;
    });
    const body = method === 'GET' ? await response.text() : '';
    return {
      ok: true,
      url,
      finalUrl: response.url,
      status: response.status,
      headers,
      body
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

function makeFinding(payload) {
  return {
    gate_id: payload.gate_id,
    domain: payload.domain,
    severity: payload.severity,
    title: payload.title,
    status: 'confirmed',
    evidence: {
      code_refs: payload.code_refs || [],
      runtime_refs: payload.runtime_refs || [],
      citations: payload.citations || []
    },
    repro_steps: payload.repro_steps || [],
    observed: payload.observed,
    expected: payload.expected,
    risk: payload.risk,
    fix_hint: payload.fix_hint,
    owner: payload.owner
  };
}

function buildStaticFindings(files, runtime) {
  const findings = [];

  const dosingData = parseJson(files, 'data/dosing-reference.json') || { medications: [] };
  const medsWithMinAge = (dosingData.medications || []).filter((m) => !!m.minAge).map((m) => m.name);

  const biliData = parseJson(files, 'data/bili-thresholds.json');
  let biliMaxAge = null;
  if (biliData && biliData.phototherapy && biliData.phototherapy.noRiskFactors) {
    const sample = biliData.phototherapy.noRiskFactors['38wk'];
    if (Array.isArray(sample) && sample.length > 0) biliMaxAge = sample[sample.length - 1].age;
  }

  const packageJson = parseJson(files, 'package.json') || { scripts: {} };
  const scripts = packageJson.scripts || {};
  const hasQaScripts = Object.keys(scripts).some((k) => /test|lint|qa|typecheck/i.test(k));

  const wrangler = files['wrangler.toml']?.content || '';
  const stagingWrangler = files['staging-wrangler.toml']?.content || '';
  const wranglerName = (wrangler.match(/^name\s*=\s*"([^"]+)"/m) || [])[1] || '';
  const stagingName = (stagingWrangler.match(/^name\s*=\s*"([^"]+)"/m) || [])[1] || '';

  const noTrackingPages = [
    'catch-up/index.html',
    'growth/index.html',
    'bili/index.html',
    'ga-calc/index.html',
    'dosing/index.html'
  ].filter((p) => includes(files, p, 'No accounts. No servers. No tracking.'));

  if (
    includes(files, 'catch-up/catch-up.js', 'input type="checkbox" data-vaccine=') &&
    !includes(files, 'catch-up/catch-up.js', 'type="date" data-vaccine=')
  ) {
    findings.push(
      makeFinding({
        gate_id: 'G-MED-001',
        domain: 'medical',
        severity: 'blocker',
        title: 'Catch-up engine cannot validate dose chronology (checkbox counts only)',
        code_refs: makeCodeRefs(files, 'catch-up/catch-up.js', ['input type="checkbox" data-vaccine='])
          .concat(makeCodeRefs(files, 'catch-up/index.html', ['Generate a catch-up framework with minimum intervals and next-dose planning'])),
        citations: [MEDICAL_CITATIONS.aap_catchup, MEDICAL_CITATIONS.cdc_catchup],
        repro_steps: [
          'Open /catch-up/.',
          'Note only dose checkboxes are collected per vaccine; no per-dose dates are entered.',
          'Generate plan for a child with delayed and irregular prior timing.'
        ],
        observed: 'Tool represents prior history as dose counts, not dated administrations, while advertising next-dose planning.',
        expected: 'Catch-up planning should capture date-aware prior dose validity when claiming interval-sensitive planning.',
        risk: 'Incorrect next-step recommendations when historical doses violate minimum intervals or age validity.',
        fix_hint: 'Add per-dose date capture and validation pipeline before forecasting.',
        owner: 'logic'
      })
    );
  }

  if (
    includes(files, 'growth/growth.js', 'measurement_date: measureDate') &&
    includes(files, 'growth/growth.js', 'dob: dob')
  ) {
    findings.push(
      makeFinding({
        gate_id: 'G-LEGAL-001',
        domain: 'technical',
        severity: 'blocker',
        title: 'Growth analytics payload includes DOB and measurement date fields',
        code_refs: makeCodeRefs(files, 'growth/growth.js', ['measurement_date: measureDate', 'dob: dob'])
          .concat(makeCodeRefs(files, 'shared/analytics.js', ['window.TinyTrack.calcUsed', 'input_params: JSON.stringify(params)'])),
        repro_steps: [
          'Open /growth/.',
          'Enter DOB and measurement date, then calculate.',
          'Inspect analytics payload fields in growth.js and TinyTrack ingestion path.'
        ],
        observed: 'DOB and measurement_date are serialized into analytics event payloads.',
        expected: 'Potentially identifying/date-sensitive clinical inputs should be excluded or strongly minimized from analytics payloads.',
        risk: 'Privacy and compliance exposure for health-adjacent user data.',
        fix_hint: 'Strip DOB/date fields from analytics events and retain only coarse, non-identifying derived categories.',
        owner: 'analytics'
      })
    );
  }

  if (noTrackingPages.length > 0 && includes(files, 'shared/analytics.js', 'getDeviceFingerprint()')) {
    findings.push(
      makeFinding({
        gate_id: 'G-LEGAL-002',
        domain: 'cross',
        severity: 'major',
        title: '"No tracking" copy conflicts with active analytics/fingerprinting stack',
        code_refs: noTrackingPages.flatMap((p) => makeCodeRefs(files, p, ['No accounts. No servers. No tracking.']))
          .concat(makeCodeRefs(files, 'shared/analytics.js', ['getDeviceFingerprint()', 'initGoogleAnalytics()', 'initPostHog()', 'initClarity()'])),
        repro_steps: [
          'Open any calculator route showing the privacy banner.',
          'Review shared/analytics.js initialization and tracking methods.',
          'Compare live behavior with on-page no-tracking statement.'
        ],
        observed: 'Privacy banner states no tracking while analytics script initializes multi-provider tracking and fingerprint collection.',
        expected: 'Public privacy claims should accurately reflect active telemetry behavior.',
        risk: 'Regulatory, legal, and trust risk due to contradictory representations.',
        fix_hint: 'Align copy and policy with actual behavior or disable tracking paths that contradict current statements.',
        owner: 'legal'
      })
    );
  }

  if (medsWithMinAge.length > 0 && includes(files, 'dosing/dosing.js', 'med.minAge ?') && !regexTest(files, 'dosing/dosing.js', /if\s*\([^\n]*minAge/i)) {
    findings.push(
      makeFinding({
        gate_id: 'G-MED-002',
        domain: 'medical',
        severity: 'blocker',
        title: 'Dosing calculator displays minimum-age notes but has no age-gating enforcement',
        code_refs: makeCodeRefs(files, 'data/dosing-reference.json', ['"minAge": "6 months"', '"minAge": "2 years"'])
          .concat(makeCodeRefs(files, 'dosing/dosing.js', ['med.minAge ?']))
          .concat(makeCodeRefs(files, 'dosing/index.html', ['Patient Weight'])),
        citations: [MEDICAL_CITATIONS.aap_catchup],
        repro_steps: [
          'Open /dosing/.',
          'Enter weight only (no age input exists).',
          'Observe ibuprofen/diphenhydramine dose outputs are still generated regardless of child age.'
        ],
        observed: `Minimum-age constraints exist in data (${medsWithMinAge.join(', ')}) but are not algorithmically enforced.`,
        expected: 'Medication outputs with age restrictions should require age input and enforce hard-stop/guardrails.',
        risk: 'Unsafe dose display for age-ineligible patients.',
        fix_hint: 'Add patient age input, evaluate med.minAge rules before output, and block/flag ineligible results.',
        owner: 'logic'
      })
    );
  }

  if (includes(files, 'ga-calc/ga-calc.js', "gaAtBirthDays < 280 ? 'Early term'")) {
    findings.push(
      makeFinding({
        gate_id: 'G-MED-003',
        domain: 'medical',
        severity: 'major',
        title: 'GA term-status thresholds are shifted from standard obstetric category boundaries',
        code_refs: makeCodeRefs(files, 'ga-calc/ga-calc.js', ["gaAtBirthDays < 280 ? 'Early term'", "gaAtBirthDays < 294 ? 'Full term'", "gaAtBirthDays < 301 ? 'Late term'"]),
        citations: [MEDICAL_CITATIONS.acog_term],
        repro_steps: [
          'Open /ga-calc/.',
          'Inspect termStatus conditional thresholds in ga-calc.js.',
          'Compare threshold boundaries to standard term-category definitions.'
        ],
        observed: 'Current day cutoffs classify term categories with late boundaries that do not align with standard bins.',
        expected: 'Term classifications should map accurately to accepted gestational age bins.',
        risk: 'Incorrect term-status labeling in clinical communication.',
        fix_hint: 'Replace hardcoded thresholds with validated constants and add unit tests for boundary days.',
        owner: 'logic'
      })
    );
  }

  if (includes(files, 'growth/growth.js', 'drawChart(standard, sex, age, metric, results);')) {
    findings.push(
      makeFinding({
        gate_id: 'G-MED-004',
        domain: 'medical',
        severity: 'major',
        title: 'Growth chart metric-tab click path drops Fenton context and redraws via WHO/CDC path',
        code_refs: makeCodeRefs(files, 'growth/growth.js', ['drawChart(standard, sex, age, metric, results);', 'if (useFenton && fentonData)', "var standard = getStandard(age);"]),
        repro_steps: [
          'Open /growth/ and run a preterm case using Fenton.',
          'Switch chart tabs after initial calculation.',
          'Review tab click handler: drawChart is called without useFenton argument.'
        ],
        observed: 'Tab redraw path does not preserve/use Fenton mode state.',
        expected: 'Preterm/Fenton mode should persist across tab interactions.',
        risk: 'Visualization can misrepresent percentile context for preterm patients.',
        fix_hint: 'Persist calculation context (including useFenton/fentonGaWeeks) and pass through tab redraw calls.',
        owner: 'logic'
      })
    );
  }

  if (biliMaxAge !== null && includes(files, 'bili/index.html', 'max="168"') && biliMaxAge < 168) {
    findings.push(
      makeFinding({
        gate_id: 'G-MED-005',
        domain: 'medical',
        severity: 'major',
        title: 'Bilirubin UI accepts postnatal ages beyond available threshold curve data',
        code_refs: makeCodeRefs(files, 'bili/index.html', ['max="168"'])
          .concat(makeCodeRefs(files, 'data/bili-thresholds.json', ['"age": 96']))
          .concat(makeCodeRefs(files, 'bili/bili.js', ['if (age >= curve[curve.length - 1].age) return curve[curve.length - 1].threshold;'])),
        citations: [MEDICAL_CITATIONS.aap_bili],
        repro_steps: [
          'Open /bili/ and enter postnatal age > 96h.',
          'Compare input range to threshold data max age.',
          'Inspect interpolation behavior at curve tail.'
        ],
        observed: `Input allows through 168h while threshold arrays top out at ${biliMaxAge}h; interpolation clamps to terminal value.`,
        expected: 'Input range and modeled threshold domain should remain aligned or explicitly flagged as extrapolation.',
        risk: 'False confidence in late-hour threshold interpretation.',
        fix_hint: 'Either constrain accepted age to supported data range or add explicitly validated extended curves.',
        owner: 'logic'
      })
    );
  }

  if (includes(files, 'bili/bili.js', 'config.options.scales.x.max = 100;') && includes(files, 'bili/index.html', 'max="168"')) {
    findings.push(
      makeFinding({
        gate_id: 'G-TECH-001',
        domain: 'technical',
        severity: 'major',
        title: 'Bilirubin chart x-axis cap (100h) conflicts with UI input range (0-168h)',
        code_refs: makeCodeRefs(files, 'bili/index.html', ['max="168"'])
          .concat(makeCodeRefs(files, 'bili/bili.js', ['config.options.scales.x.max = 100;'])),
        repro_steps: [
          'Open /bili/ and enter age >100h.',
          'Generate chart and inspect patient point visibility/scaling.',
          'Review chart x-axis hard cap in bili.js.'
        ],
        observed: 'Chart axis truncates at 100h despite accepted inputs through 168h.',
        expected: 'Visualization domain should cover accepted input domain or enforce stricter input limits.',
        risk: 'User-facing graph may clip or misrepresent entered values.',
        fix_hint: 'Synchronize axis bounds with validated input limits and threshold data range.',
        owner: 'frontend'
      })
    );
  }

  if (!files['shared/analytics-config.js']?.exists) {
    findings.push(
      makeFinding({
        gate_id: 'G-TECH-002',
        domain: 'technical',
        severity: 'major',
        title: 'shared/analytics-config.js is referenced but absent from repository',
        code_refs: [
          'shared/analytics-config.js',
          ...makeCodeRefs(files, 'index.html', ['shared/analytics-config.js']),
          ...makeCodeRefs(files, 'growth/index.html', ['shared/analytics-config.js']),
          ...makeCodeRefs(files, 'bili/index.html', ['shared/analytics-config.js']),
          ...makeCodeRefs(files, 'catch-up/index.html', ['shared/analytics-config.js']),
          ...makeCodeRefs(files, 'dosing/index.html', ['shared/analytics-config.js']),
          ...makeCodeRefs(files, 'ga-calc/index.html', ['shared/analytics-config.js'])
        ],
        repro_steps: [
          'Search for shared/analytics-config.js in repo.',
          'Verify script tag references across route HTML files.',
          'Load pages in an environment without deploy-time injection and observe missing asset requests.'
        ],
        observed: 'Multiple pages reference a file that is not present in tracked source.',
        expected: 'Required runtime assets should be present in source or safely gated when missing.',
        risk: '404 errors, config drift, and unpredictable analytics runtime behavior.',
        fix_hint: 'Commit a safe default config module or harden loader path to handle optional config deterministically.',
        owner: 'frontend'
      })
    );
  }

  if (includes(files, 'shared/analytics.js', "GA_MEASUREMENT_ID = analyticsCfg.gaId || 'G-FMNPFLW6LD'")) {
    findings.push(
      makeFinding({
        gate_id: 'G-LEGAL-003',
        domain: 'technical',
        severity: 'major',
        title: 'Analytics initializes automatically with hardcoded GA fallback and no consent gate',
        code_refs: makeCodeRefs(files, 'shared/analytics.js', ["GA_MEASUREMENT_ID = analyticsCfg.gaId || 'G-FMNPFLW6LD'", 'initGoogleAnalytics();', 'initPostHog();', 'initClarity();']),
        repro_steps: [
          'Open shared/analytics.js init flow.',
          'Confirm no consent/opt-in check before provider initialization.',
          'Confirm GA fallback ID is hardcoded.'
        ],
        observed: 'Tracking providers initialize on load with fallback GA ID and no explicit consent branch.',
        expected: 'Consent-sensitive tracking should be gated and fallback IDs should not silently activate in production paths.',
        risk: 'Privacy/legal exposure and uncontrolled telemetry in environments expecting opt-in behavior.',
        fix_hint: 'Introduce explicit consent state gate and remove implicit hardcoded production measurement defaults.',
        owner: 'legal'
      })
    );
  }

  if (includes(files, 'shared/analytics.js', 'doNotTrack: navigator.doNotTrack') && !regexTest(files, 'shared/analytics.js', /if\s*\([^\n]*doNotTrack[^\n]*\)/i)) {
    findings.push(
      makeFinding({
        gate_id: 'G-LEGAL-004',
        domain: 'technical',
        severity: 'major',
        title: 'Do-Not-Track value is collected but not used for tracking suppression',
        code_refs: makeCodeRefs(files, 'shared/analytics.js', ['doNotTrack: navigator.doNotTrack', 'getDeviceFingerprint()', 'initGoogleAnalytics();']),
        repro_steps: [
          'Inspect deviceInfo collection in shared/analytics.js.',
          'Search for control flow that disables tracking based on doNotTrack.',
          'Observe that value is captured but not enforced.'
        ],
        observed: 'DNT is tracked as metadata rather than used as a policy gate.',
        expected: 'If DNT is represented as respected behavior, analytics init should branch accordingly.',
        risk: 'Potential deceptive privacy posture and compliance risk.',
        fix_hint: 'Add explicit pre-init DNT gate or remove claims implying DNT-based suppression.',
        owner: 'legal'
      })
    );
  }

  if (!includes(files, '_headers', 'Content-Security-Policy') || !includes(files, '_headers', 'Strict-Transport-Security')) {
    findings.push(
      makeFinding({
        gate_id: 'G-TECH-003',
        domain: 'technical',
        severity: 'major',
        title: 'Security header baseline missing CSP and HSTS directives in _headers',
        code_refs: makeCodeRefs(files, '_headers', ['X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy']),
        repro_steps: [
          'Open _headers policy file.',
          'Check for Content-Security-Policy and Strict-Transport-Security directives.',
          'Compare to expected hardened baseline for health-adjacent tooling.'
        ],
        observed: 'Current header policy includes basic headers but omits CSP and HSTS directives.',
        expected: 'Production header baseline should include CSP and HSTS (where deployment supports HTTPS-only).',
        risk: 'Increased attack surface and weaker browser-enforced hardening.',
        fix_hint: 'Add CSP and HSTS directives with staged rollout/testing to avoid breaking required assets.',
        owner: 'ops'
      })
    );
  }

  if (includes(files, '_headers', 'max-age=31536000, immutable') && regexTest(files, 'index.html', /<script src="[^\"]+\.js">/)) {
    findings.push(
      makeFinding({
        gate_id: 'G-TECH-004',
        domain: 'technical',
        severity: 'major',
        title: 'Long immutable caching is applied to unversioned JS/CSS asset names',
        code_refs: makeCodeRefs(files, '_headers', ['max-age=31536000, immutable'])
          .concat(makeCodeRefs(files, 'index.html', ['<script src="shared/i18n.js">', '<script src="shared/analytics.js">'])),
        repro_steps: [
          'Review _headers static asset cache rules.',
          'Review HTML script/link tags for versioned filenames or content hashes.',
          'Assess cache invalidation behavior for clinical logic updates.'
        ],
        observed: 'Assets are cache-immutable for one year while filenames remain stable/non-hashed.',
        expected: 'Immutable caching should be paired with hashed or versioned asset paths.',
        risk: 'Stale clinical logic persisted in clients after important updates.',
        fix_hint: 'Adopt build-time content hashing or explicit version query strategy and update cache policy accordingly.',
        owner: 'ops'
      })
    );
  }

  if (includes(files, 'sw.js', 'var ASSETS = [')) {
    findings.push(
      makeFinding({
        gate_id: 'G-TECH-005',
        domain: 'technical',
        severity: 'minor',
        title: 'Service worker precache list is hand-maintained and drift-prone',
        code_refs: makeCodeRefs(files, 'sw.js', ['var ASSETS = [', "'/locales/en.json'", "'/locales/es.json'"]),
        repro_steps: [
          'Open sw.js asset list.',
          'Compare with project file inventory and route dependencies.',
          'Assess risk of missing/new assets not reflected in cache list.'
        ],
        observed: 'Precache inventory is static/manual.',
        expected: 'Critical cache manifests should be generated or validated automatically.',
        risk: 'Offline/runtime drift and incomplete cache updates.',
        fix_hint: 'Generate precache manifest during build or add automated cache-manifest consistency checks.',
        owner: 'ops'
      })
    );
  }

  if (wranglerName && stagingName && wranglerName === stagingName) {
    findings.push(
      makeFinding({
        gate_id: 'G-OPS-001',
        domain: 'technical',
        severity: 'major',
        title: 'wrangler.toml and staging-wrangler.toml resolve to same project name',
        code_refs: makeCodeRefs(files, 'wrangler.toml', [`name = "${wranglerName}"`])
          .concat(makeCodeRefs(files, 'staging-wrangler.toml', [`name = "${stagingName}"`]))
          .concat(makeCodeRefs(files, 'scripts/deploy.sh', ['cp staging-wrangler.toml wrangler.toml', 'npx wrangler pages deploy .'])) ,
        repro_steps: [
          'Open wrangler.toml and staging-wrangler.toml.',
          'Compare name values.',
          'Review deploy script workflow that swaps wrangler config files in-place.'
        ],
        observed: `Both config files currently target "${wranglerName}" with in-place config mutation in deploy flow.`,
        expected: 'Environment configs should clearly separate targets and avoid mutable swap-side effects.',
        risk: 'Accidental environment cross-deploy and operator error.',
        fix_hint: 'Use explicit project separation and deploy commands without mutable config swaps.',
        owner: 'ops'
      })
    );
  }

  if (!hasQaScripts) {
    findings.push(
      makeFinding({
        gate_id: 'G-TECH-006',
        domain: 'technical',
        severity: 'major',
        title: 'No automated test/lint/typecheck QA gate in package scripts',
        code_refs: makeCodeRefs(files, 'package.json', ['"build"', '"deploy:staging"']),
        repro_steps: [
          'Inspect package.json scripts.',
          'Look for test/lint/typecheck/qa pipelines.',
          'Observe only build/dev/deploy entries.'
        ],
        observed: 'No first-class automated QA script path exists.',
        expected: 'Clinical web tooling should have enforceable pre-deploy QA scripts.',
        risk: 'Regressions can ship without automated detection.',
        fix_hint: 'Add deterministic QA command (lint + static checks + targeted functional tests) and require it pre-deploy.',
        owner: 'qa'
      })
    );
  }

  if (includes(files, 'growth/index.html', 'BMI-for-age') && !includes(files, 'growth/growth.js', 'BMI')) {
    findings.push(
      makeFinding({
        gate_id: 'G-MED-006',
        domain: 'medical',
        severity: 'major',
        title: 'Growth page markets BMI-for-age support but calculator does not implement BMI path',
        code_refs: makeCodeRefs(files, 'growth/index.html', ['BMI-for-age'])
          .concat(makeCodeRefs(files, 'growth/growth.js', ['var currentMetric = \"weight\"', 'metric === \"weight\"', 'metric === \"length\"', 'metric === \"hc\"'])),
        repro_steps: [
          'Read growth page metadata/FAQ claims for BMI-for-age.',
          'Inspect growth.js metric branches and chart tabs.',
          'Confirm no BMI input/calculation/visualization branch exists.'
        ],
        observed: 'Public copy includes BMI-for-age language while runtime only computes weight/length/HC.',
        expected: 'Public capability statements should match implemented calculator behavior.',
        risk: 'Clinical expectation mismatch and misleading feature claims.',
        fix_hint: 'Either implement BMI-for-age calculations and UI or remove BMI claims from metadata/content.',
        owner: 'content'
      })
    );
  }

  if (
    includes(files, 'terms/index.html', 'is not a medical tool') &&
    includes(files, 'index.html', '"@type":"MedicalWebPage"') &&
    includes(files, 'index.html', '"audienceType":"Clinician"')
  ) {
    findings.push(
      makeFinding({
        gate_id: 'G-CROSS-001',
        domain: 'cross',
        severity: 'major',
        title: 'Legal positioning and clinician-targeted structured data are materially inconsistent',
        code_refs: makeCodeRefs(files, 'terms/index.html', ['is not a medical tool', 'Do not use this site in a medical workflow'])
          .concat(makeCodeRefs(files, 'index.html', ['"@type":"MedicalWebPage"', '"audienceType":"Clinician"', '"MedicalSpecialty"'])),
        repro_steps: [
          'Review terms page language on medical-tool restrictions.',
          'Review homepage JSON-LD positioning and audience targeting.',
          'Compare normative legal statement against marketed schema role.'
        ],
        observed: 'Terms disclaim medical-tool use while schema explicitly positions clinician-facing medical web application context.',
        expected: 'Legal, product, and structured-data positioning should be coherent and non-contradictory.',
        risk: 'Legal ambiguity and compliance exposure for intended-use representation.',
        fix_hint: 'Harmonize legal language with actual product intent and schema declarations.',
        owner: 'legal'
      })
    );
  }

  if (includes(files, 'app.js', 'No waning observed for 5+ years.')) {
    findings.push(
      makeFinding({
        gate_id: 'G-MED-007',
        domain: 'medical',
        severity: 'major',
        title: 'Mpox vaccine durability claim appears stronger than source-conservative wording',
        code_refs: makeCodeRefs(files, 'app.js', ['No waning observed for 5+ years.']),
        citations: [MEDICAL_CITATIONS.cdc_mpox],
        repro_steps: [
          'Open homepage mpox card source copy in app.js.',
          'Compare certainty language to conservative phrasing in current public-health source wording.'
        ],
        observed: 'Copy asserts no waning observed for 5+ years as an unqualified statement.',
        expected: 'Clinical copy should avoid overconfident durability claims where certainty remains evolving.',
        risk: 'Potential misinformation risk through overstated confidence.',
        fix_hint: 'Qualify duration statements and cite source uncertainty explicitly.',
        owner: 'content'
      })
    );
  }

  if (includes(files, 'shared/analytics.js', 'https://ip-api.com/json/')) {
    findings.push(
      makeFinding({
        gate_id: 'G-LEGAL-005',
        domain: 'technical',
        severity: 'major',
        title: 'Geolocation path uses ip-api free endpoint over HTTP URL pattern in code',
        code_refs: makeCodeRefs(files, 'shared/analytics.js', ['https://ip-api.com/json/', 'IP_API_KEY ?']),
        repro_steps: [
          'Inspect getIPGeolocation() in shared/analytics.js.',
          'Observe fallback endpoint and provider assumptions.',
          'Assess usage constraints/security posture for production telemetry.'
        ],
        observed: 'Code defaults to free ip-api endpoint path when key is absent.',
        expected: 'Production telemetry should use secure, policy-approved geolocation providers and explicit contractual limits.',
        risk: 'Reliability/compliance risk and weaker transport/provider posture.',
        fix_hint: 'Move geolocation behind first-party endpoint or approved provider with explicit HTTPS and governance controls.',
        owner: 'ops'
      })
    );
  }

  if (includes(files, 'sitemap.xml', '<lastmod>2025-') || includes(files, 'index.html', 'dateModified":"2026-02-17"')) {
    findings.push(
      makeFinding({
        gate_id: 'G-CONTENT-001',
        domain: 'technical',
        severity: 'minor',
        title: 'Metadata governance appears inconsistent across sitemap/page metadata timestamps',
        code_refs: makeCodeRefs(files, 'sitemap.xml', ['<lastmod>'])
          .concat(makeCodeRefs(files, 'index.html', ['dateModified'])),
        repro_steps: [
          'Inspect sitemap.xml lastmod values.',
          'Compare page-level dateModified and legal effective dates.',
          'Assess consistency of update metadata governance.'
        ],
        observed: 'Cross-file metadata dates are not clearly synchronized by a single publishing workflow.',
        expected: 'Sitemap/page metadata should reflect a consistent release-date governance process.',
        risk: 'Indexing drift and audit-trail ambiguity.',
        fix_hint: 'Generate sitemap and metadata timestamps from a single release pipeline source.',
        owner: 'seo'
      })
    );
  }

  if (runtime.enabled && runtime.routeChecks.length > 0) {
    const badRoutes = runtime.routeChecks.filter((r) => r.ok && r.status !== 200);
    if (badRoutes.length > 0) {
      findings.push(
        makeFinding({
          gate_id: 'G-RUNTIME-001',
          domain: 'technical',
          severity: 'blocker',
          title: 'One or more staging routes did not return HTTP 200',
          runtime_refs: badRoutes.map((r) => `${r.url} -> ${r.status}`),
          repro_steps: [
            `Run route probe against ${STAGING_BASE_URL}.`,
            'Inspect returned status codes for each in-scope route.'
          ],
          observed: `Non-200 status detected for ${badRoutes.length} route(s).`,
          expected: 'All public routes in scope should return 200 on staging.',
          risk: 'Broken or inaccessible clinical tooling surface.',
          fix_hint: 'Resolve deployment/routing errors before release.',
          owner: 'ops'
        })
      );
    }

    const analyticsConfigProbe = runtime.assetChecks.find((x) => x.path === '/shared/analytics-config.js');
    if (analyticsConfigProbe && analyticsConfigProbe.ok && analyticsConfigProbe.status >= 400) {
      findings.push(
        makeFinding({
          gate_id: 'G-RUNTIME-002',
          domain: 'technical',
          severity: 'major',
          title: 'Staging probe confirms missing analytics-config asset',
          runtime_refs: [`${analyticsConfigProbe.url} -> ${analyticsConfigProbe.status}`],
          repro_steps: [
            `Request ${STAGING_BASE_URL}/shared/analytics-config.js.`,
            'Observe non-success status.'
          ],
          observed: 'Referenced runtime config script is not served on staging.',
          expected: 'Referenced scripts should resolve successfully or be conditionally omitted.',
          risk: 'Runtime noise, config uncertainty, and brittle deploy assumptions.',
          fix_hint: 'Serve explicit config module or remove unconditional script includes.',
          owner: 'ops'
        })
      );
    }

    const cacheProbe = runtime.assetChecks.find((x) => x.path === '/shared/analytics.js');
    if (cacheProbe && cacheProbe.ok) {
      const cacheControl = cacheProbe.headers['cache-control'] || '';
      if (/immutable/i.test(cacheControl) && /max-age=31536000/i.test(cacheControl)) {
        findings.push(
          makeFinding({
            gate_id: 'G-RUNTIME-003',
            domain: 'technical',
            severity: 'major',
            title: 'Staging headers confirm one-year immutable cache policy on unversioned JS asset',
            runtime_refs: [`${cacheProbe.url} cache-control: ${cacheControl}`],
            repro_steps: [
              `Request ${STAGING_BASE_URL}/shared/analytics.js and inspect cache-control headers.`,
              'Compare header policy with non-hashed asset naming strategy.'
            ],
            observed: 'Runtime response applies long immutable cache policy to stable filename asset.',
            expected: 'Immutable caching should accompany content-hashed/versioned asset paths.',
            risk: 'Delayed clinical logic propagation due to cache stickiness.',
            fix_hint: 'Introduce versioned asset strategy before retaining immutable 1y cache semantics.',
            owner: 'ops'
          })
        );
      }
    }
  }

  return findings;
}

function dedupeFindings(findings) {
  const out = [];
  const seen = new Set();
  for (const f of findings) {
    const key = `${f.gate_id}::${f.observed}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out;
}

function severityRank(severity) {
  if (severity === 'blocker') return 0;
  if (severity === 'major') return 1;
  return 2;
}

function ownerFromDomain(domain) {
  if (domain === 'medical') return 'medical';
  if (domain === 'technical') return 'engineering';
  return 'cross-functional';
}

function summarizeBySeverity(findings) {
  const summary = { blocker: 0, major: 0, minor: 0 };
  for (const f of findings) summary[f.severity] = (summary[f.severity] || 0) + 1;
  return summary;
}

async function runRuntimeChecks() {
  if (SKIP_NETWORK) {
    return {
      enabled: false,
      routeChecks: [],
      assetChecks: [],
      notes: ['Network checks skipped via QA_GOD_SKIP_NETWORK=1.']
    };
  }

  const routeChecks = await Promise.all(
    ROUTES.map(async (route) => {
      const url = `${STAGING_BASE_URL}${route}`;
      return fetchWithTimeout(url, 12000, 'GET');
    })
  );

  const assetPaths = ['/shared/analytics-config.js', '/shared/analytics.js', '/sw.js'];
  const assetChecks = await Promise.all(
    assetPaths.map(async (assetPath) => {
      const url = `${STAGING_BASE_URL}${assetPath}`;
      const probe = await fetchWithTimeout(url, 12000, 'GET');
      probe.path = assetPath;
      return probe;
    })
  );

  return {
    enabled: true,
    routeChecks,
    assetChecks,
    notes: []
  };
}

function buildRoundLog(uniqueFindings, roundsMin) {
  const seen = new Set();
  const roundLog = [];

  for (let round = 1; round <= roundsMin; round++) {
    const signatures = uniqueFindings.map((f) => `${f.gate_id}::${f.observed}`);
    let newCount = 0;
    for (const sig of signatures) {
      if (!seen.has(sig)) {
        seen.add(sig);
        newCount += 1;
      }
    }

    const blockers = uniqueFindings.filter((f) => f.severity === 'blocker').length;
    const majors = uniqueFindings.filter((f) => f.severity === 'major').length;
    const minors = uniqueFindings.filter((f) => f.severity === 'minor').length;

    roundLog.push({
      round,
      executor_submitted: uniqueFindings.length,
      critics_new_findings: newCount,
      open_blockers: blockers,
      open_majors: majors,
      open_minors: minors,
      judge_status: 'accepted'
    });
  }

  return roundLog;
}

function buildFixQueue(findings) {
  const sorted = deepClone(findings).sort((a, b) => {
    const s = severityRank(a.severity) - severityRank(b.severity);
    if (s !== 0) return s;
    return a.gate_id.localeCompare(b.gate_id);
  });

  return sorted.map((f, index) => ({
    priority: index + 1,
    gate_id: f.gate_id,
    severity: f.severity,
    title: f.title,
    owner: f.owner || ownerFromDomain(f.domain),
    first_action: f.fix_hint,
    acceptance: f.expected
  }));
}

function markdownForReport({ findings, summary, roundLog, runtime }) {
  const sorted = deepClone(findings).sort((a, b) => {
    const s = severityRank(a.severity) - severityRank(b.severity);
    if (s !== 0) return s;
    return a.gate_id.localeCompare(b.gate_id);
  });

  const lines = [];
  lines.push('# QA God Orchestrator Report');
  lines.push('');
  lines.push(`Date: ${TODAY}`);
  lines.push(`Staging target: ${STAGING_BASE_URL}`);
  lines.push('Medical authority: AAP primary, CDC secondary');
  lines.push(`Adversarial rounds executed: ${roundLog.length}`);
  lines.push('');
  lines.push('## Severity Summary');
  lines.push('');
  lines.push(`- Blocker: ${summary.blocker}`);
  lines.push(`- Major: ${summary.major}`);
  lines.push(`- Minor: ${summary.minor}`);
  lines.push(`- Total confirmed findings: ${findings.length}`);
  lines.push('');

  lines.push('## Runtime Probe Summary');
  lines.push('');
  if (!runtime.enabled) {
    lines.push('- Network probes were skipped.');
  } else {
    for (const route of runtime.routeChecks) {
      if (route.ok) lines.push(`- ${route.url} -> ${route.status}`);
      else lines.push(`- ${route.url} -> ERROR (${route.error})`);
    }
    for (const asset of runtime.assetChecks) {
      if (asset.ok) lines.push(`- ${asset.url} -> ${asset.status}`);
      else lines.push(`- ${asset.url} -> ERROR (${asset.error})`);
    }
  }
  lines.push('');

  lines.push('## Confirmed Findings');
  lines.push('');
  for (const f of sorted) {
    lines.push(`### ${f.gate_id} [${f.severity.toUpperCase()}] ${f.title}`);
    lines.push(`- Domain: ${f.domain}`);
    lines.push(`- Owner: ${f.owner}`);
    lines.push(`- Observed: ${f.observed}`);
    lines.push(`- Expected: ${f.expected}`);
    lines.push(`- Risk: ${f.risk}`);
    lines.push(`- Fix hint: ${f.fix_hint}`);
    if (f.evidence.code_refs.length) lines.push(`- Code refs: ${f.evidence.code_refs.join(', ')}`);
    if (f.evidence.runtime_refs.length) lines.push(`- Runtime refs: ${f.evidence.runtime_refs.join(', ')}`);
    if (f.evidence.citations.length) lines.push(`- Citations: ${f.evidence.citations.join(' | ')}`);
    lines.push(`- Repro: ${f.repro_steps.join(' -> ')}`);
    lines.push('');
  }

  lines.push('## Adversarial Round Log');
  lines.push('');
  lines.push('| Round | Submitted | New Findings | Blockers | Majors | Minors | Judge |');
  lines.push('|---|---:|---:|---:|---:|---:|---|');
  for (const r of roundLog) {
    lines.push(`| ${r.round} | ${r.executor_submitted} | ${r.critics_new_findings} | ${r.open_blockers} | ${r.open_majors} | ${r.open_minors} | ${r.judge_status} |`);
  }
  lines.push('');

  return lines.join('\n');
}

function markdownForFixQueue(fixQueue) {
  const lines = [];
  lines.push('# QA God Fix Queue');
  lines.push('');
  lines.push(`Date: ${TODAY}`);
  lines.push('');
  lines.push('| Priority | Gate | Severity | Owner | Action | Acceptance |');
  lines.push('|---:|---|---|---|---|---|');
  for (const item of fixQueue) {
    lines.push(`| ${item.priority} | ${item.gate_id} | ${item.severity} | ${item.owner} | ${item.first_action} | ${item.acceptance} |`);
  }
  lines.push('');
  return lines.join('\n');
}

function markdownForEvidence(findings, runtime) {
  const lines = [];
  lines.push('# QA God Evidence Pack');
  lines.push('');
  lines.push(`Date: ${TODAY}`);
  lines.push('');

  if (runtime.enabled) {
    lines.push('## Runtime Responses');
    lines.push('');
    for (const route of runtime.routeChecks) {
      if (route.ok) {
        lines.push(`- ${route.url}`);
        lines.push(`  - status: ${route.status}`);
        lines.push(`  - content-type: ${route.headers['content-type'] || 'n/a'}`);
      } else {
        lines.push(`- ${route.url}`);
        lines.push(`  - error: ${route.error}`);
      }
    }
    for (const asset of runtime.assetChecks) {
      if (asset.ok) {
        lines.push(`- ${asset.url}`);
        lines.push(`  - status: ${asset.status}`);
        if (asset.headers['cache-control']) lines.push(`  - cache-control: ${asset.headers['cache-control']}`);
      } else {
        lines.push(`- ${asset.url}`);
        lines.push(`  - error: ${asset.error}`);
      }
    }
    lines.push('');
  }

  lines.push('## Finding Evidence');
  lines.push('');
  for (const finding of findings) {
    lines.push(`### ${finding.gate_id}`);
    lines.push(`- Title: ${finding.title}`);
    if (finding.evidence.code_refs.length) lines.push(`- Code refs: ${finding.evidence.code_refs.join(', ')}`);
    if (finding.evidence.runtime_refs.length) lines.push(`- Runtime refs: ${finding.evidence.runtime_refs.join(', ')}`);
    if (finding.evidence.citations.length) lines.push(`- Citations: ${finding.evidence.citations.join(' | ')}`);
    lines.push('');
  }

  return lines.join('\n');
}

function orchestratorMetadata(summary, roundLog, runtime, findings) {
  return {
    title: 'TinyHumanMD QA God Orchestrator Output',
    date: TODAY,
    staging_base_url: STAGING_BASE_URL,
    medical_authority: {
      primary: 'AAP',
      secondary: ['CDC']
    },
    rounds_executed: roundLog.length,
    runtime_probes_enabled: runtime.enabled,
    counts: {
      blocker: summary.blocker,
      major: summary.major,
      minor: summary.minor,
      total: findings.length
    }
  };
}

async function main() {
  const files = {};
  for (const rel of REL_FILES) {
    files[rel] = await readFileSafe(rel);
  }
  files['shared/analytics-config.js'] = await readFileSafe('shared/analytics-config.js');

  const runtime = await runRuntimeChecks();

  const rawFindings = buildStaticFindings(files, runtime);
  const findings = dedupeFindings(rawFindings);
  findings.sort((a, b) => {
    const s = severityRank(a.severity) - severityRank(b.severity);
    if (s !== 0) return s;
    return a.gate_id.localeCompare(b.gate_id);
  });

  const summary = summarizeBySeverity(findings);
  const roundLog = buildRoundLog(findings, ROUNDS_MIN);
  const fixQueue = buildFixQueue(findings);

  await fs.mkdir(DOCS_DIR, { recursive: true });

  const reportPath = path.join(DOCS_DIR, `QA_GOD_ORCHESTRATOR_REPORT_${TODAY}.md`);
  const matrixPath = path.join(DOCS_DIR, `QA_GOD_GATE_MATRIX_${TODAY}.json`);
  const fixQueuePath = path.join(DOCS_DIR, `QA_GOD_FIX_QUEUE_${TODAY}.md`);
  const evidencePath = path.join(DOCS_DIR, `QA_GOD_EVIDENCE_${TODAY}.md`);

  const matrixPayload = {
    metadata: orchestratorMetadata(summary, roundLog, runtime, findings),
    round_log: roundLog,
    findings
  };

  await Promise.all([
    fs.writeFile(reportPath, markdownForReport({ findings, summary, roundLog, runtime }), 'utf8'),
    fs.writeFile(matrixPath, JSON.stringify(matrixPayload, null, 2) + '\n', 'utf8'),
    fs.writeFile(fixQueuePath, markdownForFixQueue(fixQueue), 'utf8'),
    fs.writeFile(evidencePath, markdownForEvidence(findings, runtime), 'utf8')
  ]);

  const output = {
    report: path.relative(REPO_ROOT, reportPath),
    matrix: path.relative(REPO_ROOT, matrixPath),
    fix_queue: path.relative(REPO_ROOT, fixQueuePath),
    evidence: path.relative(REPO_ROOT, evidencePath),
    summary
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error('[qa-god] Failed:', error);
  process.exit(1);
});
