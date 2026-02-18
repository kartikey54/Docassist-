# Calculator Rollout Orchestrator

## Purpose

`calculator-rollout-orchestrator` turns deep-research context docs into an implementation-ready calculator rollout:

1. Parse GTM/roadmap/backlog/review context.
2. Rank candidate calculator opportunities.
3. Build a registry as single source of truth for routes, SEO, categories, and nav exposure.
4. Generate internal-link graph.
5. Scaffold category hubs and calculator pages.
6. Trigger SEO artifact generation (sitemap + manifest + report).

## Commands

```bash
# plan-only ranking preview
npm run qa:calc:plan

# full generation (registry, pages, docs, sitemap)
npm run qa:calc:orchestrate

# regenerate SEO artifacts from current registry
npm run qa:calc:seo
```

## Inputs

- `docs/PEDS_GTM_PLAN_2026-02-17.md`
- `docs/PEDS_PRODUCT_ROADMAP_2026-02-17.md`
- `docs/PEDS_EXECUTION_BACKLOG_2026-02-17.md`
- `docs/PEDS_STRATEGY_REPORT_2026-02-17.md`
- `docs/QA_GOD_FIX_QUEUE_2026-02-17.md`
- `docs/WEBSITE_REVIEW_2026-02-17.md`

## Outputs

- `data/calculators/registry.json`
- `data/calculators/internal-links.json`
- `data/calculators/seo-manifest.json`
- `docs/CALCULATOR_ROLLOUT_PLAN_<date>.md`
- `docs/CALCULATOR_ROLLOUT_WAVES_<date>.md`
- `docs/CALCULATOR_ROLLOUT_EVIDENCE_<date>.md`
- `docs/SEO_ROLLOUT_REPORT_<date>.md`
- `sitemap.xml`

## Notes

- Generated pages are intentionally deterministic for stable diffs.
- Clinical outputs are decision support only and must be verified against current guidelines and local protocols.
