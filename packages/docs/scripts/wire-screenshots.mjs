#!/usr/bin/env node
/**
 * Wire captured screenshots into MDX documentation pages.
 *
 * For each MDX page, this script:
 * 1. Finds matching screenshots in src/assets/screenshots/
 * 2. Adds import statements for the images
 * 3. Updates the first <ScreenshotComparison> to use the imports
 *
 * Usage: node packages/docs/scripts/wire-screenshots.mjs
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.resolve(__dirname, '../src/content/docs');
const SCREENSHOTS_DIR = path.resolve(__dirname, '../src/assets/screenshots');

/**
 * Map: MDX file path (relative to DOCS_DIR) → array of { viewer, designer } screenshot info.
 * Each entry represents a ScreenshotComparison block to wire up.
 */
const WIRING_MAP = {
  // ─── Getting Started ─────────────────────────────
  'getting-started/introduction.mdx': [
    { category: 'getting-started', slug: 'overview', variant: 'default' },
  ],
  'getting-started/first-dashboard.mdx': [
    { category: 'getting-started', slug: 'overview', variant: 'default' },
  ],

  // ─── Chart Types ──────────────────────────────────
  'chart-types/overview.mdx': [
    { category: 'chart-types', slug: 'gallery', variant: 'default' },
  ],
  'chart-types/line-chart.mdx': [
    { category: 'chart-types', slug: 'line-chart', variant: 'default' },
  ],
  'chart-types/bar-chart.mdx': [
    { category: 'chart-types', slug: 'bar-chart', variant: 'default' },
  ],
  'chart-types/pie-chart.mdx': [
    { category: 'chart-types', slug: 'pie-chart', variant: 'default' },
  ],
  'chart-types/scatter-chart.mdx': [
    { category: 'chart-types', slug: 'scatter-chart', variant: 'default' },
  ],
  'chart-types/area-chart.mdx': [
    { category: 'chart-types', slug: 'area-chart', variant: 'default' },
  ],
  'chart-types/combo-chart.mdx': [
    { category: 'chart-types', slug: 'combo-chart', variant: 'default' },
  ],
  'chart-types/gauge.mdx': [
    { category: 'chart-types', slug: 'gauge', variant: 'default' },
  ],
  'chart-types/funnel-chart.mdx': [
    { category: 'chart-types', slug: 'funnel-chart', variant: 'default' },
  ],
  'chart-types/radar-chart.mdx': [
    { category: 'chart-types', slug: 'radar-chart', variant: 'default' },
  ],
  'chart-types/treemap.mdx': [
    { category: 'chart-types', slug: 'treemap', variant: 'default' },
  ],
  'chart-types/heatmap.mdx': [
    { category: 'chart-types', slug: 'heatmap', variant: 'default' },
  ],
  'chart-types/waterfall.mdx': [
    { category: 'chart-types', slug: 'waterfall', variant: 'default' },
  ],
  'chart-types/sankey.mdx': [
    { category: 'chart-types', slug: 'sankey', variant: 'default' },
  ],
  'chart-types/box-plot.mdx': [
    { category: 'chart-types', slug: 'box-plot', variant: 'default' },
  ],

  // ─── Widgets ──────────────────────────────────────
  'widgets/kpi-card.mdx': [
    { category: 'widgets', slug: 'kpi-card', variant: 'default' },
  ],
  'widgets/table.mdx': [
    { category: 'widgets', slug: 'table', variant: 'default' },
  ],
  'widgets/alerts.mdx': [
    { category: 'widgets', slug: 'alerts', variant: 'default' },
  ],
  'widgets/markdown.mdx': [
    { category: 'widgets', slug: 'markdown', variant: 'default' },
  ],

  // ─── Filters ──────────────────────────────────────
  'filters/select-filter.mdx': [
    { category: 'filters', slug: 'select-filter', variant: 'default' },
  ],
  'filters/date-filter.mdx': [
    { category: 'filters', slug: 'filter-bar', variant: 'default' },
  ],
  'filters/cross-filtering.mdx': [
    { category: 'filters', slug: 'cross-filter', variant: 'default' },
  ],
  'filters/filter-scope.mdx': [
    { category: 'filters', slug: 'filter-builder', variant: 'default' },
  ],

  // ─── Pages ────────────────────────────────────────
  'pages/multi-page.mdx': [
    { category: 'pages', slug: 'multi-page', variant: 'page1' },
  ],
  'pages/navigation.mdx': [
    { category: 'pages', slug: 'pages-scenario', variant: 'page1' },
  ],

  // ─── Import/Export ────────────────────────────────
  'import-export/code-view.mdx': [
    { category: 'import-export', slug: 'code-view', variant: 'default' },
  ],
  'import-export/json-export.mdx': [
    { category: 'import-export', slug: 'import-export', variant: 'default' },
  ],
  'import-export/import.mdx': [
    { category: 'import-export', slug: 'designer', variant: 'default' },
  ],

  // ─── Interactions ─────────────────────────────────
  'interactions/click-actions.mdx': [
    { category: 'interactions', slug: 'interaction-editor', variant: 'default' },
  ],
  'interactions/drill-down.mdx': [
    { category: 'interactions', slug: 'interaction-editor', variant: 'default' },
  ],

  // ─── Layout ───────────────────────────────────────
  'layout/grid.mdx': [
    { category: 'getting-started', slug: 'overview', variant: 'default' },
  ],
  'layout/rows-columns.mdx': [
    { category: 'getting-started', slug: 'overview', variant: 'default' },
  ],
  'layout/tabs.mdx': [
    { category: 'pages', slug: 'multi-page', variant: 'page1' },
  ],
  'layout/header.mdx': [
    { category: 'getting-started', slug: 'overview', variant: 'default' },
  ],
  'layout/divider.mdx': [
    { category: 'getting-started', slug: 'overview', variant: 'default' },
  ],
};

function findScreenshot(category, slug, variant, view) {
  const filename = `${slug}-${variant}-${view}.png`;
  const filePath = path.join(SCREENSHOTS_DIR, category, filename);
  return fs.existsSync(filePath) ? filePath : null;
}

function computeRelativeImportPath(mdxFile, screenshotPath) {
  const mdxDir = path.dirname(path.join(DOCS_DIR, mdxFile));
  let rel = path.relative(mdxDir, screenshotPath);
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

function processFile(mdxRelPath, entries) {
  const mdxAbsPath = path.join(DOCS_DIR, mdxRelPath);
  if (!fs.existsSync(mdxAbsPath)) {
    console.warn(`  SKIP: ${mdxRelPath} does not exist`);
    return;
  }

  let content = fs.readFileSync(mdxAbsPath, 'utf-8');

  // Collect all imports needed
  const imports = [];
  const entry = entries[0]; // Wire the first entry to the first ScreenshotComparison

  const viewerPath = findScreenshot(entry.category, entry.slug, entry.variant, 'viewer');
  const designerPath = findScreenshot(entry.category, entry.slug, entry.variant, 'designer');

  const viewerVarName = `${entry.slug.replace(/-/g, '_')}_viewer`;
  const designerVarName = `${entry.slug.replace(/-/g, '_')}_designer`;

  if (viewerPath) {
    const rel = computeRelativeImportPath(mdxRelPath, viewerPath);
    imports.push(`import ${viewerVarName} from '${rel}';`);
  }
  if (designerPath) {
    const rel = computeRelativeImportPath(mdxRelPath, designerPath);
    imports.push(`import ${designerVarName} from '${rel}';`);
  }

  if (imports.length === 0) {
    console.warn(`  SKIP: No screenshots found for ${mdxRelPath}`);
    return;
  }

  // Insert imports after the last import statement
  const importInsertionPoint = content.lastIndexOf("import ");
  if (importInsertionPoint === -1) {
    console.warn(`  SKIP: No import statements found in ${mdxRelPath}`);
    return;
  }
  // Find the end of the last import line
  const lineEnd = content.indexOf('\n', importInsertionPoint);
  const beforeImports = content.slice(0, lineEnd + 1);
  const afterImports = content.slice(lineEnd + 1);

  content = beforeImports + imports.join('\n') + '\n' + afterImports;

  // Replace the FIRST <ScreenshotComparison that has no props (or only label)
  // with one that includes the image imports
  const firstComparisonRegex = /<ScreenshotComparison\s*\n\s*label="([^"]+)"\s*\n?\s*\/>/;
  const match = content.match(firstComparisonRegex);
  if (match) {
    const label = match[1];
    let replacement = `<ScreenshotComparison\n  label="${label}"`;
    if (designerPath) {
      replacement += `\n  designerSrc={${designerVarName}}\n  designerAlt="${label} in designer mode"`;
    }
    if (viewerPath) {
      replacement += `\n  viewerSrc={${viewerVarName}}\n  viewerAlt="${label} in viewer mode"`;
    }
    replacement += '\n/>';
    content = content.replace(match[0], replacement);
  }

  fs.writeFileSync(mdxAbsPath, content, 'utf-8');
  console.log(`  ✓ ${mdxRelPath} — ${imports.length} imports, first <ScreenshotComparison> wired`);
}

// Run
console.log('Wiring screenshots into MDX pages...\n');
let processed = 0;
for (const [mdxRelPath, entries] of Object.entries(WIRING_MAP)) {
  processFile(mdxRelPath, entries);
  processed++;
}
console.log(`\nDone. Processed ${processed} files.`);
