# Peds Strategy Orchestrator

This orchestrator performs deep pediatric competitive intelligence from public web sources and outputs a multi-document strategy pack for downstream product, engineering, and GTM execution.

## Command

`npm run qa:peds:intel`

## Modes

- Default (live network crawl + cache): `npm run qa:peds:intel`
- Offline/cache mode: `PEDS_INTEL_SKIP_NETWORK=1 npm run qa:peds:intel`
- Force refresh cache: `npm run qa:peds:intel:refresh`

## Key Environment Variables

- `PEDS_INTEL_SKIP_NETWORK`: `1` to disable network crawling
- `PEDS_INTEL_FORCE_REFRESH`: `1` to ignore fresh cache and recrawl
- `PEDS_INTEL_DOMAIN_LIMIT`: cap number of domains to process (default `220`)
- `PEDS_INTEL_MAX_PAGES_PER_DOMAIN`: cap pages per domain (default `18`)
- `PEDS_INTEL_CONCURRENCY`: worker pool size (default `6`)
- `PEDS_INTEL_ROUNDS`: adversarial loop rounds (minimum 20)

## Inputs

- `data/intel/peds/domain-seeds.json`
- `data/intel/peds/taxonomy.json`
- `data/intel/peds/scoring-weights.json`
- `data/intel/peds/persona-models.json`

## Outputs

- `docs/PEDS_STRATEGY_REPORT_2026-02-17.md`
- `docs/PEDS_COMPETITOR_MATRIX_2026-02-17.json`
- `docs/PEDS_PRODUCT_ROADMAP_2026-02-17.md`
- `docs/PEDS_EXECUTION_BACKLOG_2026-02-17.md`
- `docs/PEDS_GTM_PLAN_2026-02-17.md`
- `docs/PEDS_FINANCIAL_MODEL_2026-02-17.md`
- `docs/PEDS_EVIDENCE_2026-02-17.md`

## Guardrails

- Publicly reachable pages only.
- Preserve TinyHumanMD clinical logic boundaries (this script does not modify clinical calculator behavior).
- Keep deterministic output format for downstream agents.
