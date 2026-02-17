# QA God Orchestrator

## Purpose

`qa-god-orchestrator` is a deep, adversarial QA runner for TinyHumanMD that audits:

1. Technical correctness (code + runtime probes)
2. Medical correctness risk markers (AAP-primary framing with CDC secondary citations)
3. Cross-domain contradictions (legal/privacy claims vs runtime behavior)

It emits a gate matrix and prioritized remediation queue with evidence.

## Command

```bash
npm run qa:god
```

## Environment Variables

- `STAGING_BASE_URL` (default: `https://staging.tinyhumanmd.pages.dev`)
- `QA_GOD_ROUNDS` (default: `30`)
- `QA_GOD_SKIP_NETWORK=1` to run code-only mode

Examples:

```bash
# Full code + staging probe (default)
npm run qa:god

# Code-only mode
QA_GOD_SKIP_NETWORK=1 npm run qa:god

# Alternate staging target and longer adversarial loop
STAGING_BASE_URL="https://your-preview.pages.dev" QA_GOD_ROUNDS=40 npm run qa:god
```

## Generated Artifacts

Each run writes dated files under `docs/`:

- `QA_GOD_ORCHESTRATOR_REPORT_<YYYY-MM-DD>.md`
- `QA_GOD_GATE_MATRIX_<YYYY-MM-DD>.json`
- `QA_GOD_FIX_QUEUE_<YYYY-MM-DD>.md`
- `QA_GOD_EVIDENCE_<YYYY-MM-DD>.md`

## Output Model

Each finding includes:

- Gate ID
- Domain (`technical`, `medical`, `cross`)
- Severity (`blocker`, `major`, `minor`)
- Repro steps
- Observed vs expected behavior
- Risk statement
- Fix hint
- Evidence (`code_refs`, `runtime_refs`, citations)

## Notes

- This orchestrator is non-mutating for product code.
- It is intentionally strict and may classify marketing/legal inconsistency as high risk.
- Medical citations are structured as AAP-first references with CDC secondary checks.
