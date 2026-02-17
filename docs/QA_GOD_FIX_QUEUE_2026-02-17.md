# QA God Fix Queue

Date: 2026-02-17

| Priority | Gate | Severity | Owner | Action | Acceptance |
|---:|---|---|---|---|---|
| 1 | G-LEGAL-001 | blocker | analytics | Strip DOB/date fields from analytics events and retain only coarse, non-identifying derived categories. | Potentially identifying/date-sensitive clinical inputs should be excluded or strongly minimized from analytics payloads. |
| 2 | G-MED-001 | blocker | logic | Add per-dose date capture and validation pipeline before forecasting. | Catch-up planning should capture date-aware prior dose validity when claiming interval-sensitive planning. |
| 3 | G-MED-002 | blocker | logic | Add patient age input, evaluate med.minAge rules before output, and block/flag ineligible results. | Medication outputs with age restrictions should require age input and enforce hard-stop/guardrails. |
| 4 | G-CROSS-001 | major | legal | Harmonize legal language with actual product intent and schema declarations. | Legal, product, and structured-data positioning should be coherent and non-contradictory. |
| 5 | G-LEGAL-002 | major | legal | Align copy and policy with actual behavior or disable tracking paths that contradict current statements. | Public privacy claims should accurately reflect active telemetry behavior. |
| 6 | G-LEGAL-003 | major | legal | Introduce explicit consent state gate and remove implicit hardcoded production measurement defaults. | Consent-sensitive tracking should be gated and fallback IDs should not silently activate in production paths. |
| 7 | G-LEGAL-004 | major | legal | Add explicit pre-init DNT gate or remove claims implying DNT-based suppression. | If DNT is represented as respected behavior, analytics init should branch accordingly. |
| 8 | G-LEGAL-005 | major | ops | Move geolocation behind first-party endpoint or approved provider with explicit HTTPS and governance controls. | Production telemetry should use secure, policy-approved geolocation providers and explicit contractual limits. |
| 9 | G-MED-003 | major | logic | Replace hardcoded thresholds with validated constants and add unit tests for boundary days. | Term classifications should map accurately to accepted gestational age bins. |
| 10 | G-MED-004 | major | logic | Persist calculation context (including useFenton/fentonGaWeeks) and pass through tab redraw calls. | Preterm/Fenton mode should persist across tab interactions. |
| 11 | G-MED-005 | major | logic | Either constrain accepted age to supported data range or add explicitly validated extended curves. | Input range and modeled threshold domain should remain aligned or explicitly flagged as extrapolation. |
| 12 | G-MED-006 | major | content | Either implement BMI-for-age calculations and UI or remove BMI claims from metadata/content. | Public capability statements should match implemented calculator behavior. |
| 13 | G-OPS-001 | major | ops | Use explicit project separation and deploy commands without mutable config swaps. | Environment configs should clearly separate targets and avoid mutable swap-side effects. |
| 14 | G-RUNTIME-003 | major | ops | Introduce versioned asset strategy before retaining immutable 1y cache semantics. | Immutable caching should accompany content-hashed/versioned asset paths. |
| 15 | G-TECH-001 | major | frontend | Synchronize axis bounds with validated input limits and threshold data range. | Visualization domain should cover accepted input domain or enforce stricter input limits. |
| 16 | G-TECH-002 | major | frontend | Commit a safe default config module or harden loader path to handle optional config deterministically. | Required runtime assets should be present in source or safely gated when missing. |
| 17 | G-TECH-003 | major | ops | Add CSP and HSTS directives with staged rollout/testing to avoid breaking required assets. | Production header baseline should include CSP and HSTS (where deployment supports HTTPS-only). |
| 18 | G-TECH-004 | major | ops | Adopt build-time content hashing or explicit version query strategy and update cache policy accordingly. | Immutable caching should be paired with hashed or versioned asset paths. |
| 19 | G-CONTENT-001 | minor | seo | Generate sitemap and metadata timestamps from a single release pipeline source. | Sitemap/page metadata should reflect a consistent release-date governance process. |
| 20 | G-TECH-005 | minor | ops | Generate precache manifest during build or add automated cache-manifest consistency checks. | Critical cache manifests should be generated or validated automatically. |
