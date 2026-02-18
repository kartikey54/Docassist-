#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const STATIC_ROUTES = [
  { route: '/', priority: '1.0', changefreq: 'weekly' },
  { route: '/catch-up/', priority: '0.9', changefreq: 'monthly' },
  { route: '/growth/', priority: '0.9', changefreq: 'monthly' },
  { route: '/bili/', priority: '0.9', changefreq: 'monthly' },
  { route: '/ga-calc/', priority: '0.9', changefreq: 'monthly' },
  { route: '/dosing/', priority: '0.9', changefreq: 'monthly' },
  { route: '/terms/', priority: '0.5', changefreq: 'yearly' },
  { route: '/privacy/', priority: '0.5', changefreq: 'yearly' }
];

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeRoute(route) {
  let out = String(route || '/').trim();
  if (!out.startsWith('/')) out = `/${out}`;
  if (!out.endsWith('/')) out = `${out}/`;
  out = out.replace(/\/+/g, '/');
  return out;
}

function xmlEscape(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function ensureDirForFile(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

export async function buildSeoArtifacts(options = {}) {
  const repoRoot = options.repoRoot || REPO_ROOT;
  const outDate = options.outDate || todayIsoDate();

  let registry = options.registry || null;
  if (!registry) {
    const registryPath = path.join(repoRoot, 'data', 'calculators', 'registry.json');
    const raw = await fs.readFile(registryPath, 'utf8');
    registry = JSON.parse(raw);
  }

  const routeMap = new Map();

  for (const entry of STATIC_ROUTES) {
    routeMap.set(normalizeRoute(entry.route), {
      route: normalizeRoute(entry.route),
      title: '',
      description: '',
      keywords: [],
      canonical: `https://tinyhumanmd.com${normalizeRoute(entry.route)}`,
      priority: entry.priority,
      changefreq: entry.changefreq,
      type: 'static',
      category_slug: ''
    });
  }

  const categories = Array.isArray(registry.categories) ? registry.categories : [];
  for (const category of categories) {
    const route = normalizeRoute(category.route);
    routeMap.set(route, {
      route,
      title: category.title || '',
      description: category.description || '',
      keywords: Array.isArray(category.keywords) ? category.keywords : [],
      canonical: `https://tinyhumanmd.com${route}`,
      priority: '0.8',
      changefreq: 'weekly',
      type: 'category',
      category_slug: category.slug || ''
    });
  }

  const tools = Array.isArray(registry.tools) ? registry.tools : [];
  for (const tool of tools) {
    const route = normalizeRoute(tool.route);
    const seo = tool.seo || {};
    const existing = routeMap.get(route);
    routeMap.set(route, {
      route,
      title: seo.title || tool.title || '',
      description: seo.description || tool.description || '',
      keywords: Array.isArray(seo.keywords) ? seo.keywords : [],
      canonical: seo.canonical || `https://tinyhumanmd.com${route}`,
      priority: existing ? existing.priority : tool.type === 'core' ? '0.9' : '0.8',
      changefreq: existing ? existing.changefreq : tool.type === 'core' ? 'monthly' : 'weekly',
      type: tool.type || 'calculator',
      category_slug: tool.category_slug || ''
    });
  }

  const routes = Array.from(routeMap.values()).sort((a, b) => {
    if (a.route === '/') return -1;
    if (b.route === '/') return 1;
    return a.route.localeCompare(b.route);
  });

  const sitemapLines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
    '        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">',
    ''
  ];

  for (const entry of routes) {
    sitemapLines.push('  <url>');
    sitemapLines.push(`    <loc>${xmlEscape(`https://tinyhumanmd.com${entry.route}`)}</loc>`);
    sitemapLines.push(`    <lastmod>${outDate}</lastmod>`);
    sitemapLines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
    sitemapLines.push(`    <priority>${entry.priority}</priority>`);
    sitemapLines.push('  </url>');
    sitemapLines.push('');
  }

  sitemapLines.push('</urlset>');
  sitemapLines.push('');

  const seoManifest = {
    generated_at: new Date().toISOString(),
    out_date: outDate,
    route_count: routes.length,
    routes: routes.map((entry) => ({
      route: entry.route,
      type: entry.type,
      category_slug: entry.category_slug,
      title: entry.title,
      description: entry.description,
      canonical: entry.canonical,
      keywords: entry.keywords
    }))
  };

  const reportLines = [
    '# SEO Rollout Report',
    '',
    `Date: ${outDate}`,
    '',
    '## Summary',
    '',
    `- Total routes indexed: ${routes.length}`,
    `- Core routes: ${routes.filter((r) => r.type === 'core').length}`,
    `- Category routes: ${routes.filter((r) => r.type === 'category').length}`,
    `- Calculator routes: ${routes.filter((r) => r.type === 'calculator').length}`,
    '',
    '## Generated Files',
    '',
    '- `sitemap.xml`',
    '- `data/calculators/seo-manifest.json`',
    `- \`docs/SEO_ROLLOUT_REPORT_${outDate}.md\``,
    '',
    '## Notes',
    '',
    '- Sitemap and metadata are generated from `data/calculators/registry.json` as single source of truth.'
  ];

  const output = {
    outDate,
    routes,
    sitemapXml: sitemapLines.join('\n'),
    seoManifest,
    report: reportLines.join('\n') + '\n'
  };

  if (options.writeOutputs !== false) {
    const sitemapPath = path.join(repoRoot, 'sitemap.xml');
    const manifestPath = path.join(repoRoot, 'data', 'calculators', 'seo-manifest.json');
    const reportPath = path.join(repoRoot, 'docs', `SEO_ROLLOUT_REPORT_${outDate}.md`);

    await ensureDirForFile(sitemapPath);
    await ensureDirForFile(manifestPath);
    await ensureDirForFile(reportPath);

    await fs.writeFile(sitemapPath, output.sitemapXml, 'utf8');
    await fs.writeFile(manifestPath, `${JSON.stringify(output.seoManifest, null, 2)}\n`, 'utf8');
    await fs.writeFile(reportPath, output.report, 'utf8');
  }

  return output;
}

function parseCliArgs(argv) {
  const args = {
    outDate: null,
    writeOutputs: true
  };

  for (const token of argv) {
    if (token.startsWith('--date=')) args.outDate = token.slice('--date='.length);
    if (token === '--dry-run') args.writeOutputs = false;
  }

  return args;
}

async function runCli() {
  const args = parseCliArgs(process.argv.slice(2));
  const output = await buildSeoArtifacts({
    repoRoot: REPO_ROOT,
    outDate: args.outDate || todayIsoDate(),
    writeOutputs: args.writeOutputs
  });

  process.stdout.write(
    JSON.stringify(
      {
        status: 'ok',
        out_date: output.outDate,
        routes: output.routes.length,
        write_outputs: args.writeOutputs
      },
      null,
      2
    ) + '\n'
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().catch((error) => {
    console.error(error && error.stack ? error.stack : String(error));
    process.exit(1);
  });
}
