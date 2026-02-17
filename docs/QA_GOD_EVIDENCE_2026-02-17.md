# QA God Evidence Pack

Date: 2026-02-17

## Runtime Responses

- https://staging.tinyhumanmd.pages.dev/
  - status: 200
  - content-type: text/html; charset=utf-8
- https://staging.tinyhumanmd.pages.dev/catch-up/
  - status: 200
  - content-type: text/html; charset=utf-8
- https://staging.tinyhumanmd.pages.dev/growth/
  - status: 200
  - content-type: text/html; charset=utf-8
- https://staging.tinyhumanmd.pages.dev/bili/
  - status: 200
  - content-type: text/html; charset=utf-8
- https://staging.tinyhumanmd.pages.dev/ga-calc/
  - status: 200
  - content-type: text/html; charset=utf-8
- https://staging.tinyhumanmd.pages.dev/dosing/
  - status: 200
  - content-type: text/html; charset=utf-8
- https://staging.tinyhumanmd.pages.dev/terms/
  - status: 200
  - content-type: text/html; charset=utf-8
- https://staging.tinyhumanmd.pages.dev/privacy/
  - status: 200
  - content-type: text/html; charset=utf-8
- https://staging.tinyhumanmd.pages.dev/shared/analytics-config.js
  - status: 200
  - cache-control: public, max-age=31536000, immutable
- https://staging.tinyhumanmd.pages.dev/shared/analytics.js
  - status: 200
  - cache-control: public, max-age=31536000, immutable
- https://staging.tinyhumanmd.pages.dev/sw.js
  - status: 200
  - cache-control: public, max-age=31536000, immutable

## Finding Evidence

### G-LEGAL-001
- Title: Growth analytics payload includes DOB and measurement date fields
- Code refs: growth/growth.js:206, growth/growth.js:79, shared/analytics.js:415

### G-MED-001
- Title: Catch-up engine cannot validate dose chronology (checkbox counts only)
- Code refs: catch-up/catch-up.js:162, catch-up/index.html:36
- Citations: AAP Immunizations (primary): https://www.aap.org/en/patient-care/immunizations/ | CDC Catch-up Schedule (secondary): https://www.cdc.gov/vaccines/hcp/imz-schedules/child-adolescent-catch-up.html

### G-MED-002
- Title: Dosing calculator displays minimum-age notes but has no age-gating enforcement
- Code refs: data/dosing-reference.json:34, data/dosing-reference.json:174, dosing/dosing.js:92, dosing/index.html:42
- Citations: AAP Immunizations (primary): https://www.aap.org/en/patient-care/immunizations/

### G-CROSS-001
- Title: Legal positioning and clinician-targeted structured data are materially inconsistent
- Code refs: terms/index.html:53, terms/index.html:103, index.html:325

### G-LEGAL-002
- Title: "No tracking" copy conflicts with active analytics/fingerprinting stack
- Code refs: catch-up/index.html:77, growth/index.html:119, bili/index.html:90, ga-calc/index.html:89, dosing/index.html:73, shared/analytics.js:41, shared/analytics.js:182, shared/analytics.js:233, shared/analytics.js:279

### G-LEGAL-003
- Title: Analytics initializes automatically with hardcoded GA fallback and no consent gate
- Code refs: shared/analytics.js:27, shared/analytics.js:563, shared/analytics.js:564, shared/analytics.js:566

### G-LEGAL-004
- Title: Do-Not-Track value is collected but not used for tracking suppression
- Code refs: shared/analytics.js:56, shared/analytics.js:41, shared/analytics.js:563

### G-LEGAL-005
- Title: Geolocation path uses ip-api free endpoint over HTTP URL pattern in code
- Code refs: shared/analytics.js:109, shared/analytics.js:107

### G-MED-003
- Title: GA term-status thresholds are shifted from standard obstetric category boundaries
- Code refs: ga-calc/ga-calc.js:124
- Citations: ACOG Term Definitions (secondary): https://www.acog.org/womens-health/faqs/when-pregnancy-goes-past-your-due-date

### G-MED-004
- Title: Growth chart metric-tab click path drops Fenton context and redraws via WHO/CDC path
- Code refs: growth/growth.js:394, growth/growth.js:259, growth/growth.js:378

### G-MED-005
- Title: Bilirubin UI accepts postnatal ages beyond available threshold curve data
- Code refs: bili/index.html:57, data/bili-thresholds.json, bili/bili.js:30
- Citations: AAP 2022 Hyperbilirubinemia Guideline (primary): https://publications.aap.org/pediatrics/article/150/3/e2022058859/188726/

### G-MED-006
- Title: Growth page markets BMI-for-age support but calculator does not implement BMI path
- Code refs: growth/index.html:8, growth/growth.js

### G-OPS-001
- Title: wrangler.toml and staging-wrangler.toml resolve to same project name
- Code refs: wrangler.toml:1, staging-wrangler.toml:1, scripts/deploy.sh:23, scripts/deploy.sh:29

### G-RUNTIME-003
- Title: Staging headers confirm one-year immutable cache policy on unversioned JS asset
- Runtime refs: https://staging.tinyhumanmd.pages.dev/shared/analytics.js cache-control: public, max-age=31536000, immutable

### G-TECH-001
- Title: Bilirubin chart x-axis cap (100h) conflicts with UI input range (0-168h)
- Code refs: bili/index.html:57, bili/bili.js:171

### G-TECH-002
- Title: shared/analytics-config.js is referenced but absent from repository
- Code refs: shared/analytics-config.js, index.html:338, growth/index.html:175, bili/index.html:141, catch-up/index.html:124, dosing/index.html:120, ga-calc/index.html:134

### G-TECH-003
- Title: Security header baseline missing CSP and HSTS directives in _headers
- Code refs: _headers:3, _headers:4, _headers:5

### G-TECH-004
- Title: Long immutable caching is applied to unversioned JS/CSS asset names
- Code refs: _headers:10, index.html:336, index.html:339

### G-CONTENT-001
- Title: Metadata governance appears inconsistent across sitemap/page metadata timestamps
- Code refs: sitemap.xml:8, index.html:325

### G-TECH-005
- Title: Service worker precache list is hand-maintained and drift-prone
- Code refs: sw.js:3, sw.js:37, sw.js:38
