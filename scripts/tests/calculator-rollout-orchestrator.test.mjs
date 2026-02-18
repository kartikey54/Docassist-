import test from 'node:test';
import assert from 'node:assert/strict';

import {
  rankCalculatorCandidates,
  buildRegistry,
  generateInternalLinks,
  runCalculatorRollout
} from '../calculator-rollout-orchestrator.mjs';

const corpus = {
  all: [
    'pediatric fever calculator pediatric antibiotic dosing pediatric sepsis risk score',
    'pediatric dehydration management pediatric asthma action tool otitis media treatment pediatric',
    'well child visit checklist medication safety dosing engine'
  ].join(' '),
  byPath: {
    'docs/PEDS_GTM_PLAN_2026-02-17.md': 'pediatric fever calculator pediatric antibiotic dosing pediatric sepsis risk score',
    'docs/PEDS_PRODUCT_ROADMAP_2026-02-17.md': 'medication safety dosing weight age dosing engine',
    'docs/PEDS_EXECUTION_BACKLOG_2026-02-17.md': 'otitis media treatment pediatric well child visit checklist',
    'docs/PEDS_STRATEGY_REPORT_2026-02-17.md': 'pediatric dehydration management pediatric asthma action tool'
  }
};

test('rankCalculatorCandidates returns deterministic top list', () => {
  const ranked = rankCalculatorCandidates(corpus, 8);
  assert.equal(ranked.length, 8);
  assert.equal(ranked[0].rank, 1);
  assert.ok(ranked.some((entry) => entry.id === 'pediatric-fever-calculator'));
  assert.ok(ranked.some((entry) => entry.id === 'pediatric-antibiotic-dosing'));
});

test('buildRegistry returns categories + core + selected calculators', () => {
  const ranked = rankCalculatorCandidates(corpus, 8);
  const registry = buildRegistry(ranked, '2026-02-18');

  assert.equal(registry.categories.length, 5);
  assert.equal(registry.tools.length, 14); // 6 core + 8 selected

  const hasCore = registry.tools.find((tool) => tool.id === 'core-dosing');
  const hasCalculator = registry.tools.find((tool) => tool.id === 'pediatric-fever-calculator');

  assert.ok(hasCore);
  assert.ok(hasCalculator);
  assert.equal(hasCalculator.rollout_wave, 'wave_1');
  assert.match(hasCalculator.seo.canonical, /tinyhumanmd\.com/);
});

test('generateInternalLinks builds route and id maps', () => {
  const ranked = rankCalculatorCandidates(corpus, 8);
  const registry = buildRegistry(ranked, '2026-02-18');
  const links = generateInternalLinks(registry);

  assert.ok(links.by_tool_id['pediatric-fever-calculator'].length > 0);
  assert.ok(links.by_route['/calculators/pediatric-fever-calculator/'].length > 0);
});

test('runCalculatorRollout dry run loads canonical context docs', async () => {
  const result = await runCalculatorRollout({
    repoRoot: process.cwd(),
    apply: false,
    topLimit: 8,
    outDate: '2026-02-18'
  });

  assert.equal(result.selected.length, 8);
  assert.equal(result.registry.categories.length, 5);
  assert.ok(result.selected[0].score >= result.selected[1].score);
});
