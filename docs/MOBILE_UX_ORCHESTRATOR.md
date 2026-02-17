# Mobile UX Orchestrator

## Purpose

`mobile-ux-orchestrator` is a strict phone-readiness workflow for TinyHumanMD. It focuses on:

1. Mobile viewport correctness across all routes
2. Responsive breakpoint coverage
3. Global phone coverage matrix with a >=90% quality gate
4. Dedicated iPhone Safari matrix with zero blocker/major acceptance gate
5. Touch-target sizing and input/select font sizing mobile checks
6. Mobile nav and homepage fallback behavior
7. Runtime route probe health (optional)

It supports two modes:

- Audit mode (default): report-only, non-mutating
- Apply mode (`--apply`): injects deterministic phone-polish CSS overrides, then re-audits

## Command

```bash
# Audit only
npm run qa:mobile

# Apply phone UX polish + re-audit
npm run qa:mobile:apply
```

## Environment Variables

- `STAGING_BASE_URL` (default: `https://staging.tinyhumanmd.pages.dev`)
- `MOBILE_UX_ROUNDS` (default/minimum: `20`)
- `MOBILE_UX_SKIP_NETWORK=1` for code-only mode
- `MOBILE_UX_APPLY=1` to enable apply mode without CLI flags

Examples:

```bash
# Full run (code + staging probes)
npm run qa:mobile

# Code-only run
MOBILE_UX_SKIP_NETWORK=1 npm run qa:mobile

# Code-only apply run
MOBILE_UX_SKIP_NETWORK=1 MOBILE_UX_APPLY=1 npm run qa:mobile

# Alternate staging target with longer adversarial loop
STAGING_BASE_URL="https://your-preview.pages.dev" MOBILE_UX_ROUNDS=30 npm run qa:mobile
```

## Generated Artifacts

Each run writes dated files under `docs/`:

- `MOBILE_UX_ORCHESTRATOR_REPORT_<YYYY-MM-DD>.md`
- `MOBILE_UX_GATE_MATRIX_<YYYY-MM-DD>.json`
- `MOBILE_UX_FIX_QUEUE_<YYYY-MM-DD>.md`
- `MOBILE_UX_EVIDENCE_<YYYY-MM-DD>.md`
- `MOBILE_UX_ORCHESTRATOR_PROMPT_<YYYY-MM-DD>.md`

The report and matrix artifacts include:

- Coverage matrix + methodology (StatCounter + GSMArena assumptions)
- Prioritized findings log
- Implementation log by file
- Route/device QA summary
- Remaining risk register + mitigation

## Notes

- This orchestrator is intentionally strict on phone usability and may flag controls that are technically functional but below ergonomic thresholds.
- Apply mode only touches `styles.css` and `shared/design.css`, using marker-based idempotent blocks.
- Coverage is computed using a conservative browser-share bound and must pass the >=90% global threshold.
- iPhone acceptance requires zero blocker/major mobile findings.
- It does not alter analytics behavior.
- Use the generated prompt artifact to run a multi-agent executor-vs-critic implementation pass.
