# QA God Orchestrator Report

Date: 2026-02-17
Staging target: https://staging.tinyhumanmd.pages.dev
Medical authority: AAP primary, CDC secondary
Adversarial rounds executed: 30

## Severity Summary

- Blocker: 3
- Major: 15
- Minor: 2
- Total confirmed findings: 20

## Runtime Probe Summary

- https://staging.tinyhumanmd.pages.dev/ -> 200
- https://staging.tinyhumanmd.pages.dev/catch-up/ -> 200
- https://staging.tinyhumanmd.pages.dev/growth/ -> 200
- https://staging.tinyhumanmd.pages.dev/bili/ -> 200
- https://staging.tinyhumanmd.pages.dev/ga-calc/ -> 200
- https://staging.tinyhumanmd.pages.dev/dosing/ -> 200
- https://staging.tinyhumanmd.pages.dev/terms/ -> 200
- https://staging.tinyhumanmd.pages.dev/privacy/ -> 200
- https://staging.tinyhumanmd.pages.dev/shared/analytics-config.js -> 200
- https://staging.tinyhumanmd.pages.dev/shared/analytics.js -> 200
- https://staging.tinyhumanmd.pages.dev/sw.js -> 200

## Confirmed Findings

### G-LEGAL-001 [BLOCKER] Growth analytics payload includes DOB and measurement date fields
- Domain: technical
- Owner: analytics
- Observed: DOB and measurement_date are serialized into analytics event payloads.
- Expected: Potentially identifying/date-sensitive clinical inputs should be excluded or strongly minimized from analytics payloads.
- Risk: Privacy and compliance exposure for health-adjacent user data.
- Fix hint: Strip DOB/date fields from analytics events and retain only coarse, non-identifying derived categories.
- Code refs: growth/growth.js:206, growth/growth.js:79, shared/analytics.js:415
- Repro: Open /growth/. -> Enter DOB and measurement date, then calculate. -> Inspect analytics payload fields in growth.js and TinyTrack ingestion path.

### G-MED-001 [BLOCKER] Catch-up engine cannot validate dose chronology (checkbox counts only)
- Domain: medical
- Owner: logic
- Observed: Tool represents prior history as dose counts, not dated administrations, while advertising next-dose planning.
- Expected: Catch-up planning should capture date-aware prior dose validity when claiming interval-sensitive planning.
- Risk: Incorrect next-step recommendations when historical doses violate minimum intervals or age validity.
- Fix hint: Add per-dose date capture and validation pipeline before forecasting.
- Code refs: catch-up/catch-up.js:162, catch-up/index.html:36
- Citations: AAP Immunizations (primary): https://www.aap.org/en/patient-care/immunizations/ | CDC Catch-up Schedule (secondary): https://www.cdc.gov/vaccines/hcp/imz-schedules/child-adolescent-catch-up.html
- Repro: Open /catch-up/. -> Note only dose checkboxes are collected per vaccine; no per-dose dates are entered. -> Generate plan for a child with delayed and irregular prior timing.

### G-MED-002 [BLOCKER] Dosing calculator displays minimum-age notes but has no age-gating enforcement
- Domain: medical
- Owner: logic
- Observed: Minimum-age constraints exist in data (Ibuprofen (Advil/Motrin), Diphenhydramine (Benadryl)) but are not algorithmically enforced.
- Expected: Medication outputs with age restrictions should require age input and enforce hard-stop/guardrails.
- Risk: Unsafe dose display for age-ineligible patients.
- Fix hint: Add patient age input, evaluate med.minAge rules before output, and block/flag ineligible results.
- Code refs: data/dosing-reference.json:34, data/dosing-reference.json:174, dosing/dosing.js:92, dosing/index.html:42
- Citations: AAP Immunizations (primary): https://www.aap.org/en/patient-care/immunizations/
- Repro: Open /dosing/. -> Enter weight only (no age input exists). -> Observe ibuprofen/diphenhydramine dose outputs are still generated regardless of child age.

### G-CROSS-001 [MAJOR] Legal positioning and clinician-targeted structured data are materially inconsistent
- Domain: cross
- Owner: legal
- Observed: Terms disclaim medical-tool use while schema explicitly positions clinician-facing medical web application context.
- Expected: Legal, product, and structured-data positioning should be coherent and non-contradictory.
- Risk: Legal ambiguity and compliance exposure for intended-use representation.
- Fix hint: Harmonize legal language with actual product intent and schema declarations.
- Code refs: terms/index.html:53, terms/index.html:103, index.html:325
- Repro: Review terms page language on medical-tool restrictions. -> Review homepage JSON-LD positioning and audience targeting. -> Compare normative legal statement against marketed schema role.

### G-LEGAL-002 [MAJOR] "No tracking" copy conflicts with active analytics/fingerprinting stack
- Domain: cross
- Owner: legal
- Observed: Privacy banner states no tracking while analytics script initializes multi-provider tracking and fingerprint collection.
- Expected: Public privacy claims should accurately reflect active telemetry behavior.
- Risk: Regulatory, legal, and trust risk due to contradictory representations.
- Fix hint: Align copy and policy with actual behavior or disable tracking paths that contradict current statements.
- Code refs: catch-up/index.html:77, growth/index.html:119, bili/index.html:90, ga-calc/index.html:89, dosing/index.html:73, shared/analytics.js:41, shared/analytics.js:182, shared/analytics.js:233, shared/analytics.js:279
- Repro: Open any calculator route showing the privacy banner. -> Review shared/analytics.js initialization and tracking methods. -> Compare live behavior with on-page no-tracking statement.

### G-LEGAL-003 [MAJOR] Analytics initializes automatically with hardcoded GA fallback and no consent gate
- Domain: technical
- Owner: legal
- Observed: Tracking providers initialize on load with fallback GA ID and no explicit consent branch.
- Expected: Consent-sensitive tracking should be gated and fallback IDs should not silently activate in production paths.
- Risk: Privacy/legal exposure and uncontrolled telemetry in environments expecting opt-in behavior.
- Fix hint: Introduce explicit consent state gate and remove implicit hardcoded production measurement defaults.
- Code refs: shared/analytics.js:27, shared/analytics.js:563, shared/analytics.js:564, shared/analytics.js:566
- Repro: Open shared/analytics.js init flow. -> Confirm no consent/opt-in check before provider initialization. -> Confirm GA fallback ID is hardcoded.

### G-LEGAL-004 [MAJOR] Do-Not-Track value is collected but not used for tracking suppression
- Domain: technical
- Owner: legal
- Observed: DNT is tracked as metadata rather than used as a policy gate.
- Expected: If DNT is represented as respected behavior, analytics init should branch accordingly.
- Risk: Potential deceptive privacy posture and compliance risk.
- Fix hint: Add explicit pre-init DNT gate or remove claims implying DNT-based suppression.
- Code refs: shared/analytics.js:56, shared/analytics.js:41, shared/analytics.js:563
- Repro: Inspect deviceInfo collection in shared/analytics.js. -> Search for control flow that disables tracking based on doNotTrack. -> Observe that value is captured but not enforced.

### G-LEGAL-005 [MAJOR] Geolocation path uses ip-api free endpoint over HTTP URL pattern in code
- Domain: technical
- Owner: ops
- Observed: Code defaults to free ip-api endpoint path when key is absent.
- Expected: Production telemetry should use secure, policy-approved geolocation providers and explicit contractual limits.
- Risk: Reliability/compliance risk and weaker transport/provider posture.
- Fix hint: Move geolocation behind first-party endpoint or approved provider with explicit HTTPS and governance controls.
- Code refs: shared/analytics.js:109, shared/analytics.js:107
- Repro: Inspect getIPGeolocation() in shared/analytics.js. -> Observe fallback endpoint and provider assumptions. -> Assess usage constraints/security posture for production telemetry.

### G-MED-003 [MAJOR] GA term-status thresholds are shifted from standard obstetric category boundaries
- Domain: medical
- Owner: logic
- Observed: Current day cutoffs classify term categories with late boundaries that do not align with standard bins.
- Expected: Term classifications should map accurately to accepted gestational age bins.
- Risk: Incorrect term-status labeling in clinical communication.
- Fix hint: Replace hardcoded thresholds with validated constants and add unit tests for boundary days.
- Code refs: ga-calc/ga-calc.js:124
- Citations: ACOG Term Definitions (secondary): https://www.acog.org/womens-health/faqs/when-pregnancy-goes-past-your-due-date
- Repro: Open /ga-calc/. -> Inspect termStatus conditional thresholds in ga-calc.js. -> Compare threshold boundaries to standard term-category definitions.

### G-MED-004 [MAJOR] Growth chart metric-tab click path drops Fenton context and redraws via WHO/CDC path
- Domain: medical
- Owner: logic
- Observed: Tab redraw path does not preserve/use Fenton mode state.
- Expected: Preterm/Fenton mode should persist across tab interactions.
- Risk: Visualization can misrepresent percentile context for preterm patients.
- Fix hint: Persist calculation context (including useFenton/fentonGaWeeks) and pass through tab redraw calls.
- Code refs: growth/growth.js:394, growth/growth.js:259, growth/growth.js:378
- Repro: Open /growth/ and run a preterm case using Fenton. -> Switch chart tabs after initial calculation. -> Review tab click handler: drawChart is called without useFenton argument.

### G-MED-005 [MAJOR] Bilirubin UI accepts postnatal ages beyond available threshold curve data
- Domain: medical
- Owner: logic
- Observed: Input allows through 168h while threshold arrays top out at 96h; interpolation clamps to terminal value.
- Expected: Input range and modeled threshold domain should remain aligned or explicitly flagged as extrapolation.
- Risk: False confidence in late-hour threshold interpretation.
- Fix hint: Either constrain accepted age to supported data range or add explicitly validated extended curves.
- Code refs: bili/index.html:57, data/bili-thresholds.json, bili/bili.js:30
- Citations: AAP 2022 Hyperbilirubinemia Guideline (primary): https://publications.aap.org/pediatrics/article/150/3/e2022058859/188726/
- Repro: Open /bili/ and enter postnatal age > 96h. -> Compare input range to threshold data max age. -> Inspect interpolation behavior at curve tail.

### G-MED-006 [MAJOR] Growth page markets BMI-for-age support but calculator does not implement BMI path
- Domain: medical
- Owner: content
- Observed: Public copy includes BMI-for-age language while runtime only computes weight/length/HC.
- Expected: Public capability statements should match implemented calculator behavior.
- Risk: Clinical expectation mismatch and misleading feature claims.
- Fix hint: Either implement BMI-for-age calculations and UI or remove BMI claims from metadata/content.
- Code refs: growth/index.html:8, growth/growth.js
- Repro: Read growth page metadata/FAQ claims for BMI-for-age. -> Inspect growth.js metric branches and chart tabs. -> Confirm no BMI input/calculation/visualization branch exists.

### G-OPS-001 [MAJOR] wrangler.toml and staging-wrangler.toml resolve to same project name
- Domain: technical
- Owner: ops
- Observed: Both config files currently target "tinyhumanmd-staging" with in-place config mutation in deploy flow.
- Expected: Environment configs should clearly separate targets and avoid mutable swap-side effects.
- Risk: Accidental environment cross-deploy and operator error.
- Fix hint: Use explicit project separation and deploy commands without mutable config swaps.
- Code refs: wrangler.toml:1, staging-wrangler.toml:1, scripts/deploy.sh:23, scripts/deploy.sh:29
- Repro: Open wrangler.toml and staging-wrangler.toml. -> Compare name values. -> Review deploy script workflow that swaps wrangler config files in-place.

### G-RUNTIME-003 [MAJOR] Staging headers confirm one-year immutable cache policy on unversioned JS asset
- Domain: technical
- Owner: ops
- Observed: Runtime response applies long immutable cache policy to stable filename asset.
- Expected: Immutable caching should accompany content-hashed/versioned asset paths.
- Risk: Delayed clinical logic propagation due to cache stickiness.
- Fix hint: Introduce versioned asset strategy before retaining immutable 1y cache semantics.
- Runtime refs: https://staging.tinyhumanmd.pages.dev/shared/analytics.js cache-control: public, max-age=31536000, immutable
- Repro: Request https://staging.tinyhumanmd.pages.dev/shared/analytics.js and inspect cache-control headers. -> Compare header policy with non-hashed asset naming strategy.

### G-TECH-001 [MAJOR] Bilirubin chart x-axis cap (100h) conflicts with UI input range (0-168h)
- Domain: technical
- Owner: frontend
- Observed: Chart axis truncates at 100h despite accepted inputs through 168h.
- Expected: Visualization domain should cover accepted input domain or enforce stricter input limits.
- Risk: User-facing graph may clip or misrepresent entered values.
- Fix hint: Synchronize axis bounds with validated input limits and threshold data range.
- Code refs: bili/index.html:57, bili/bili.js:171
- Repro: Open /bili/ and enter age >100h. -> Generate chart and inspect patient point visibility/scaling. -> Review chart x-axis hard cap in bili.js.

### G-TECH-002 [MAJOR] shared/analytics-config.js is referenced but absent from repository
- Domain: technical
- Owner: frontend
- Observed: Multiple pages reference a file that is not present in tracked source.
- Expected: Required runtime assets should be present in source or safely gated when missing.
- Risk: 404 errors, config drift, and unpredictable analytics runtime behavior.
- Fix hint: Commit a safe default config module or harden loader path to handle optional config deterministically.
- Code refs: shared/analytics-config.js, index.html:338, growth/index.html:175, bili/index.html:141, catch-up/index.html:124, dosing/index.html:120, ga-calc/index.html:134
- Repro: Search for shared/analytics-config.js in repo. -> Verify script tag references across route HTML files. -> Load pages in an environment without deploy-time injection and observe missing asset requests.

### G-TECH-003 [MAJOR] Security header baseline missing CSP and HSTS directives in _headers
- Domain: technical
- Owner: ops
- Observed: Current header policy includes basic headers but omits CSP and HSTS directives.
- Expected: Production header baseline should include CSP and HSTS (where deployment supports HTTPS-only).
- Risk: Increased attack surface and weaker browser-enforced hardening.
- Fix hint: Add CSP and HSTS directives with staged rollout/testing to avoid breaking required assets.
- Code refs: _headers:3, _headers:4, _headers:5
- Repro: Open _headers policy file. -> Check for Content-Security-Policy and Strict-Transport-Security directives. -> Compare to expected hardened baseline for health-adjacent tooling.

### G-TECH-004 [MAJOR] Long immutable caching is applied to unversioned JS/CSS asset names
- Domain: technical
- Owner: ops
- Observed: Assets are cache-immutable for one year while filenames remain stable/non-hashed.
- Expected: Immutable caching should be paired with hashed or versioned asset paths.
- Risk: Stale clinical logic persisted in clients after important updates.
- Fix hint: Adopt build-time content hashing or explicit version query strategy and update cache policy accordingly.
- Code refs: _headers:10, index.html:336, index.html:339
- Repro: Review _headers static asset cache rules. -> Review HTML script/link tags for versioned filenames or content hashes. -> Assess cache invalidation behavior for clinical logic updates.

### G-CONTENT-001 [MINOR] Metadata governance appears inconsistent across sitemap/page metadata timestamps
- Domain: technical
- Owner: seo
- Observed: Cross-file metadata dates are not clearly synchronized by a single publishing workflow.
- Expected: Sitemap/page metadata should reflect a consistent release-date governance process.
- Risk: Indexing drift and audit-trail ambiguity.
- Fix hint: Generate sitemap and metadata timestamps from a single release pipeline source.
- Code refs: sitemap.xml:8, index.html:325
- Repro: Inspect sitemap.xml lastmod values. -> Compare page-level dateModified and legal effective dates. -> Assess consistency of update metadata governance.

### G-TECH-005 [MINOR] Service worker precache list is hand-maintained and drift-prone
- Domain: technical
- Owner: ops
- Observed: Precache inventory is static/manual.
- Expected: Critical cache manifests should be generated or validated automatically.
- Risk: Offline/runtime drift and incomplete cache updates.
- Fix hint: Generate precache manifest during build or add automated cache-manifest consistency checks.
- Code refs: sw.js:3, sw.js:37, sw.js:38
- Repro: Open sw.js asset list. -> Compare with project file inventory and route dependencies. -> Assess risk of missing/new assets not reflected in cache list.

## Adversarial Round Log

| Round | Submitted | New Findings | Blockers | Majors | Minors | Judge |
|---|---:|---:|---:|---:|---:|---|
| 1 | 20 | 20 | 3 | 15 | 2 | accepted |
| 2 | 20 | 0 | 3 | 15 | 2 | accepted |
| 3 | 20 | 0 | 3 | 15 | 2 | accepted |
| 4 | 20 | 0 | 3 | 15 | 2 | accepted |
| 5 | 20 | 0 | 3 | 15 | 2 | accepted |
| 6 | 20 | 0 | 3 | 15 | 2 | accepted |
| 7 | 20 | 0 | 3 | 15 | 2 | accepted |
| 8 | 20 | 0 | 3 | 15 | 2 | accepted |
| 9 | 20 | 0 | 3 | 15 | 2 | accepted |
| 10 | 20 | 0 | 3 | 15 | 2 | accepted |
| 11 | 20 | 0 | 3 | 15 | 2 | accepted |
| 12 | 20 | 0 | 3 | 15 | 2 | accepted |
| 13 | 20 | 0 | 3 | 15 | 2 | accepted |
| 14 | 20 | 0 | 3 | 15 | 2 | accepted |
| 15 | 20 | 0 | 3 | 15 | 2 | accepted |
| 16 | 20 | 0 | 3 | 15 | 2 | accepted |
| 17 | 20 | 0 | 3 | 15 | 2 | accepted |
| 18 | 20 | 0 | 3 | 15 | 2 | accepted |
| 19 | 20 | 0 | 3 | 15 | 2 | accepted |
| 20 | 20 | 0 | 3 | 15 | 2 | accepted |
| 21 | 20 | 0 | 3 | 15 | 2 | accepted |
| 22 | 20 | 0 | 3 | 15 | 2 | accepted |
| 23 | 20 | 0 | 3 | 15 | 2 | accepted |
| 24 | 20 | 0 | 3 | 15 | 2 | accepted |
| 25 | 20 | 0 | 3 | 15 | 2 | accepted |
| 26 | 20 | 0 | 3 | 15 | 2 | accepted |
| 27 | 20 | 0 | 3 | 15 | 2 | accepted |
| 28 | 20 | 0 | 3 | 15 | 2 | accepted |
| 29 | 20 | 0 | 3 | 15 | 2 | accepted |
| 30 | 20 | 0 | 3 | 15 | 2 | accepted |
