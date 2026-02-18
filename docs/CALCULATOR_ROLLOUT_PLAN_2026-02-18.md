# Calculator Rollout Plan

Date: 2026-02-18

## Scope

- Top 8 calculators from deep-research action-plan context
- Clinical pillar URL taxonomy and nav categories
- SEO-first page metadata and schema generation

## Ranked Calculators

| Rank | Calculator | Category | Score | Wave |
|---:|---|---|---:|---|
| 1 | Pediatric Asthma Action Tool | respiratory-asthma | 257 | wave_1 |
| 2 | Medication Safety Dosing Engine v2 | medication-safety-dosing | 246 | wave_1 |
| 3 | Pediatric Antibiotic Dosing Calculator | pediatric-infectious-disease | 213 | wave_1 |
| 4 | Pediatric Sepsis Risk Score | emergency-acute-care | 182 | wave_1 |
| 5 | Well-Child Visit Checklist | growth-preventive-care | 169.5 | wave_2 |
| 6 | Pediatric Fever Calculator | emergency-acute-care | 152.5 | wave_2 |
| 7 | Pediatric Dehydration Management Calculator | emergency-acute-care | 137 | wave_2 |
| 8 | Otitis Media Treatment Calculator | pediatric-infectious-disease | 135 | wave_2 |

## Generated Interfaces

- `data/calculators/registry.json` as source of truth for routes, metadata, and categories.
- `data/calculators/internal-links.json` for contextual calculator cross-linking.
- Category hubs under `/categories/*` and calculator pages under `/calculators/*`.
