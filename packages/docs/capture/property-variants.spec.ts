/**
 * Screenshot capture: Property variant before/after comparisons.
 *
 * For each chart type and widget, toggles a property and captures the viewer
 * output before and after, producing before/after pairs for documentation.
 *
 * Addresses issues #3, #4, #8.
 */
import { test, expect } from '@playwright/test';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import {
  switchToDesigner,
  waitForChartsReady,
  captureWidgetFromCanvas,
  capturePropertyCallout,
  selectWidgetFromCanvasByComponentId,
  selectWidgetViaLayers,
  toggleRadioProperty,
  changeSelectProperty,
  changeNumberProperty,
  scrollPropertyIntoView,
  screenshotPath,
  setupConsoleErrorCapture,
  assertNoConsoleErrors,
} from './helpers';

// ─── Variant Definitions ─────────────────────────────────────

interface PropertyVariant {
  /** Property label as shown in Puck panel */
  fieldLabel: string;
  /** Value to set (for radio: button label; for select: option value; for number: input value) */
  targetValue: string;
  /** Variant slug for the screenshot filename */
  variantSlug: string;
  /** 'radio', 'select', or 'number' */
  fieldType: 'radio' | 'select' | 'number';
}

interface WidgetVariantSpec {
  /** Widget label in Puck Layers panel */
  layerLabel: string;
  /** Widget node ID for viewer captures (data-ss-node) — original, before edit */
  nodeId: string;
  /** Puck component ID for canvas iframe captures (data-puck-component) — equals the widget's id in dashboard definition */
  puckComponentId: string;
  /** Screenshot category (chart-types, widgets, etc.) */
  category: string;
  /** Screenshot slug */
  slug: string;
  /** Which page has this widget: 'overview' or 'gallery' */
  page: 'overview' | 'gallery';
  /** Properties to toggle */
  variants: PropertyVariant[];
}

// ── Overview page widgets ────────────────────────────────────

const overviewWidgets: WidgetVariantSpec[] = [
  {
    layerLabel: 'Line Chart',
    nodeId: 'w-line',
    puckComponentId: 'chart-revenue-trend',
    category: 'chart-types',
    slug: 'line-chart',
    page: 'overview',
    variants: [
      {
        fieldLabel: 'Smooth',
        targetValue: 'No',
        variantSlug: 'straight-lines',
        fieldType: 'radio',
      },
      {
        fieldLabel: 'Show Markers',
        targetValue: 'No',
        variantSlug: 'no-markers',
        fieldType: 'radio',
      },
      {
        fieldLabel: 'Step Interpolation',
        targetValue: 'middle',
        variantSlug: 'step-middle',
        fieldType: 'select',
      },
    ],
  },
  {
    layerLabel: 'Bar Chart',
    nodeId: 'w-bar',
    puckComponentId: 'chart-region-sales',
    category: 'chart-types',
    slug: 'bar-chart',
    page: 'overview',
    variants: [
      {
        fieldLabel: 'Orientation',
        targetValue: 'Horizontal',
        variantSlug: 'horizontal',
        fieldType: 'radio',
      },
      {
        fieldLabel: 'Show Values',
        targetValue: 'Yes',
        variantSlug: 'show-values',
        fieldType: 'radio',
      },
      {
        fieldLabel: 'Bar Width',
        targetValue: '20%',
        variantSlug: 'slim-bars',
        fieldType: 'select',
      },
    ],
  },
  {
    layerLabel: 'Table',
    nodeId: 'w-table',
    puckComponentId: 'table-orders',
    category: 'widgets',
    slug: 'table',
    page: 'overview',
    variants: [
      { fieldLabel: 'Striped', targetValue: 'No', variantSlug: 'no-stripes', fieldType: 'radio' },
      {
        fieldLabel: 'Row Numbers',
        targetValue: 'Yes',
        variantSlug: 'row-numbers',
        fieldType: 'radio',
      },
      {
        fieldLabel: 'Show Totals',
        targetValue: 'Yes',
        variantSlug: 'show-totals',
        fieldType: 'radio',
      },
    ],
  },
  {
    layerLabel: 'Alerts',
    nodeId: 'w-alerts',
    puckComponentId: 'alerts-overview',
    category: 'widgets',
    slug: 'alerts',
    page: 'overview',
    variants: [
      {
        fieldLabel: 'Layout',
        targetValue: 'inline',
        variantSlug: 'inline-layout',
        fieldType: 'select',
      },
      {
        fieldLabel: 'Show Timestamp',
        targetValue: 'No',
        variantSlug: 'no-timestamp',
        fieldType: 'radio',
      },
    ],
  },
  {
    layerLabel: 'KPI Card',
    nodeId: 'w-kpi-revenue',
    puckComponentId: 'kpi-revenue',
    category: 'widgets',
    slug: 'kpi-card',
    page: 'overview',
    variants: [
      {
        fieldLabel: 'Font Size',
        targetValue: 'lg',
        variantSlug: 'large-font',
        fieldType: 'select',
      },
      {
        fieldLabel: 'Trend Direction',
        targetValue: 'Down = Good',
        variantSlug: 'down-good',
        fieldType: 'radio',
      },
    ],
  },
];

// ── Gallery page widgets ─────────────────────────────────────

const galleryWidgets: WidgetVariantSpec[] = [
  {
    layerLabel: 'Pie Chart',
    nodeId: 'w-pie',
    puckComponentId: 'chart-pie',
    category: 'chart-types',
    slug: 'pie-chart',
    page: 'gallery',
    variants: [
      { fieldLabel: 'Variant', targetValue: 'donut', variantSlug: 'donut', fieldType: 'select' },
      {
        fieldLabel: 'Label Position',
        targetValue: 'inside',
        variantSlug: 'labels-inside',
        fieldType: 'select',
      },
    ],
  },
  {
    layerLabel: 'Scatter Chart',
    nodeId: 'w-scatter',
    puckComponentId: 'chart-scatter',
    category: 'chart-types',
    slug: 'scatter-chart',
    page: 'gallery',
    variants: [
      {
        fieldLabel: 'Opacity',
        targetValue: '0.4',
        variantSlug: 'low-opacity',
        fieldType: 'select',
      },
    ],
  },
  {
    layerLabel: 'Area Chart',
    nodeId: 'w-area',
    puckComponentId: 'chart-area',
    category: 'chart-types',
    slug: 'area-chart',
    page: 'gallery',
    variants: [
      {
        fieldLabel: 'Step Interpolation',
        targetValue: 'middle',
        variantSlug: 'step-middle',
        fieldType: 'select',
      },
      {
        fieldLabel: 'Area Opacity',
        targetValue: '1',
        variantSlug: 'full-opacity',
        fieldType: 'select',
      },
      {
        fieldLabel: 'Show Markers',
        targetValue: 'No',
        variantSlug: 'no-markers',
        fieldType: 'radio',
      },
    ],
  },
  {
    layerLabel: 'Combo Chart',
    nodeId: 'w-combo',
    puckComponentId: 'chart-combo',
    category: 'chart-types',
    slug: 'combo-chart',
    page: 'gallery',
    variants: [
      {
        fieldLabel: 'Smooth Lines',
        targetValue: 'No',
        variantSlug: 'straight-lines',
        fieldType: 'radio',
      },
    ],
  },
  {
    layerLabel: 'Gauge',
    nodeId: 'w-gauge',
    puckComponentId: 'chart-gauge',
    category: 'chart-types',
    slug: 'gauge',
    page: 'gallery',
    variants: [
      {
        fieldLabel: 'Split Count',
        targetValue: '5',
        variantSlug: 'low-split-count',
        fieldType: 'number',
      },
      {
        fieldLabel: 'Progress Mode',
        targetValue: 'Yes',
        variantSlug: 'progress',
        fieldType: 'radio',
      },
    ],
  },
  {
    layerLabel: 'Funnel Chart',
    nodeId: 'w-funnel',
    puckComponentId: 'chart-funnel',
    category: 'chart-types',
    slug: 'funnel-chart',
    page: 'gallery',
    variants: [
      {
        fieldLabel: 'Sort',
        targetValue: 'ascending',
        variantSlug: 'ascending',
        fieldType: 'select',
      },
      {
        fieldLabel: 'Alignment',
        targetValue: 'Left',
        variantSlug: 'align-left',
        fieldType: 'radio',
      },
    ],
  },
  {
    layerLabel: 'Radar Chart',
    nodeId: 'w-radar',
    puckComponentId: 'chart-radar',
    category: 'chart-types',
    slug: 'radar-chart',
    page: 'gallery',
    variants: [
      { fieldLabel: 'Shape', targetValue: 'Circle', variantSlug: 'circle', fieldType: 'radio' },
      { fieldLabel: 'Area Fill', targetValue: 'No', variantSlug: 'no-fill', fieldType: 'radio' },
    ],
  },
  {
    layerLabel: 'Treemap',
    nodeId: 'w-treemap',
    puckComponentId: 'chart-treemap',
    category: 'chart-types',
    slug: 'treemap',
    page: 'gallery',
    variants: [
      {
        fieldLabel: 'Show Values',
        targetValue: 'Yes',
        variantSlug: 'show-values',
        fieldType: 'radio',
      },
    ],
  },
  {
    layerLabel: 'Heatmap',
    nodeId: 'w-heatmap',
    puckComponentId: 'chart-heatmap',
    category: 'chart-types',
    slug: 'heatmap',
    page: 'gallery',
    variants: [
      {
        fieldLabel: 'Show Values',
        targetValue: 'Yes',
        variantSlug: 'show-values',
        fieldType: 'radio',
      },
    ],
  },
  {
    layerLabel: 'Waterfall Chart',
    nodeId: 'w-waterfall',
    puckComponentId: 'chart-waterfall',
    category: 'chart-types',
    slug: 'waterfall',
    page: 'gallery',
    variants: [
      {
        fieldLabel: 'Show Values',
        targetValue: 'Yes',
        variantSlug: 'show-values',
        fieldType: 'radio',
      },
    ],
  },
  {
    layerLabel: 'Sankey Diagram',
    nodeId: 'w-sankey',
    puckComponentId: 'chart-sankey',
    category: 'chart-types',
    slug: 'sankey',
    page: 'gallery',
    variants: [
      {
        fieldLabel: 'Orientation',
        targetValue: 'Vertical',
        variantSlug: 'vertical',
        fieldType: 'radio',
      },
    ],
  },
  {
    layerLabel: 'Box Plot',
    nodeId: 'w-boxplot',
    puckComponentId: 'chart-boxplot',
    category: 'chart-types',
    slug: 'box-plot',
    page: 'gallery',
    variants: [
      {
        fieldLabel: 'Box Width',
        targetValue: '50',
        variantSlug: 'wide-boxes',
        fieldType: 'select',
      },
    ],
  },
];

// ─── Test Generation ─────────────────────────────────────────

function md5(filePath: string): string {
  return crypto.createHash('md5').update(fs.readFileSync(filePath)).digest('hex');
}

function generateTests(widgets: WidgetVariantSpec[]) {
  for (const widget of widgets) {
    for (const variant of widget.variants) {
      test(`${widget.slug} — ${variant.variantSlug}`, async ({ page }) => {
        // 1. Navigate & go to designer
        await page.goto('/');
        await waitForChartsReady(page);
        await switchToDesigner(page);
        await waitForChartsReady(page);

        // Navigate to gallery page if needed
        if (widget.page === 'gallery') {
          const galleryTab = page.locator('[data-testid="designer-page-tab-page-gallery"]');
          if (await galleryTab.isVisible({ timeout: 3000 }).catch(() => false)) {
            await galleryTab.click();
            await waitForChartsReady(page);
          }
        }

        // 2. Select the widget via Layers
        const selected =
          (await selectWidgetFromCanvasByComponentId(page, widget.puckComponentId)) ||
          (await selectWidgetViaLayers(page, widget.layerLabel));
        expect(selected, `Could not select ${widget.layerLabel} via Layers`).toBe(true);

        // 2b. Capture the DEFAULT viewer from canvas BEFORE toggling
        const beforePath = await captureWidgetFromCanvas(
          page,
          widget.puckComponentId,
          widget.category,
          widget.slug,
          `${variant.variantSlug}-before`,
        );

        // 3. Scroll property into view and toggle it
        await scrollPropertyIntoView(page, variant.fieldLabel);

        let toggled: boolean;
        if (variant.fieldType === 'radio') {
          toggled = await toggleRadioProperty(page, variant.fieldLabel, variant.targetValue);
        } else if (variant.fieldType === 'select') {
          toggled = await changeSelectProperty(page, variant.fieldLabel, variant.targetValue);
        } else {
          toggled = await changeNumberProperty(page, variant.fieldLabel, variant.targetValue);
        }
        expect(toggled, `Could not toggle ${variant.fieldLabel} to ${variant.targetValue}`).toBe(
          true,
        );

        // 4. Wait for Puck re-render to settle after property change
        await page.waitForTimeout(1500);

        // 5. Capture designer callout — focused, centered, with blue highlight
        await scrollPropertyIntoView(page, variant.fieldLabel);
        await page.waitForTimeout(500);
        await capturePropertyCallout(
          page,
          variant.fieldLabel,
          widget.category,
          widget.slug,
          variant.variantSlug,
        );

        // 5. Capture the AFTER viewer from the Puck canvas iframe
        const afterPath = await captureWidgetFromCanvas(
          page,
          widget.puckComponentId,
          widget.category,
          widget.slug,
          variant.variantSlug,
        );

        // 6. Compare before and after — verify they differ
        if (fs.existsSync(beforePath)) {
          const beforeHash = md5(beforePath);
          const afterHash = md5(afterPath);
          if (afterHash === beforeHash) {
            console.warn(
              `WARNING: ${widget.slug}-${variant.variantSlug} before/after viewer screenshots are identical`,
            );
          }
        }
      });
    }
  }
}

test.describe('Property variant screenshots — Overview', () => {
  generateTests(overviewWidgets);
});

test.describe('Property variant screenshots — Gallery', () => {
  generateTests(galleryWidgets);
});
