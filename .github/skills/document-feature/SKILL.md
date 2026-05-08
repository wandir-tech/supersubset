---
name: document-feature
description: "Document a Supersubset feature with before/after screenshots from both the designer and viewer perspective. Use when writing end-user documentation for dashboard authors. Covers screenshot capture, quality checking, bug fixing, MDX page creation, and navigation slot-in. Enforces the screenshot-driven QA gate: if a feature doesn't work, fix it before documenting it."
---

# Document a Feature

## When to Use

- Writing end-user documentation for a dashboard authoring feature
- Adding a new chart type, widget, layout component, filter, or interaction to the docs
- Updating documentation after a feature's UI or behavior has changed
- Re-capturing screenshots after a bug fix or visual refresh
- Performing systematic QA across all features by running through the full inventory

Use this skill not only for net-new docs pages, but also when a PR changes an existing documented property or visual authoring surface and the screenshots in `packages/docs/src/assets/screenshots/` would otherwise become stale.

If a user-visible property changed and there are already docs screenshots for that surface, the default expectation is to refresh the affected screenshots or explain explicitly why not.

## Prerequisites

- The dev-app is running (`pnpm dev` from workspace root, serves at `http://localhost:3000`)
- The docs site exists at `packages/docs/` with Astro Starlight configured
- Playwright is available (`@playwright/test` in root devDependencies)
- The feature to document is implemented and accessible in the dev-app

## Feature Categories

| Category      | Location in Docs      | Designer Component                  | Example Features                                                                                         |
| ------------- | --------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Chart Types   | `docs/chart-types/`   | ChartTypePicker, FieldBindingPicker | Line, Bar, Area, Pie, Scatter, Radar, Funnel, Gauge, Heatmap, Sankey, Treemap, Waterfall, BoxPlot, Combo |
| Widgets       | `docs/widgets/`       | Property panels per widget type     | KPI Card, Table, Markdown, Alerts                                                                        |
| Layout        | `docs/layout/`        | Puck editor drag-and-drop           | Grid, Row, Column, Tabs, Header, Divider                                                                 |
| Filters       | `docs/filters/`       | FilterBuilderPanel                  | Select, Date, Scope, Cross-Filtering                                                                     |
| Interactions  | `docs/interactions/`  | InteractionEditorPanel              | Click actions, Drill-down                                                                                |
| Pages         | `docs/pages/`         | Page management controls            | Multi-page, Navigation                                                                                   |
| Import/Export | `docs/import-export/` | ImportExportPanel, CodeViewPanel    | JSON export, Import, Code View                                                                           |

## Screenshot Naming Convention

All screenshots go in `packages/docs/src/assets/screenshots/` using this pattern:

```
{category}/{feature-slug}-{variant}-{view}.png
```

- **category**: `chart-types`, `widgets`, `layout`, `filters`, `interactions`, `pages`, `import-export`
- **feature-slug**: kebab-case feature name (e.g., `line-chart`, `kpi-card`, `select-filter`)
- **variant**: `default`, or a config property name (e.g., `smooth`, `horizontal`, `stacked`)
- **view**: `designer` or `viewer`

Examples:

- `chart-types/line-chart-default-designer.png`
- `chart-types/line-chart-default-viewer.png`
- `chart-types/line-chart-smooth-designer.png`
- `chart-types/line-chart-smooth-viewer.png`

## Procedure

### Step 0: Decide Whether Screenshot Refresh Is Required

Before starting full documentation work, ask:

- Does this PR change something a dashboard author or viewer can visibly see?
- Is that surface already represented in `packages/docs/src/assets/screenshots/` or an existing MDX page?
- Would a reviewer reasonably need a screenshot to understand the effect of the change?

If yes, screenshot refresh is part of the task, not a nice-to-have follow-up.

Acceptable reasons to defer screenshot refresh should be rare and explicit, for example:

- the UI is intentionally temporary and not yet documented
- the docs site is being reworked in the same area by a separate tracked task
- the current change is backend-only and produces no visible authoring or viewer difference

### Step 1: Identify the Feature

- Name the feature and its category
- List all configurable properties that affect the end-user output
- Identify the designer component that owns the property panel
- Identify the runtime widget that renders the output
- Locate the relevant schema types in `packages/schema/src/types/`

**Output**: A feature brief — feature name, category, property list, component files.

### Step 2: Set Up Clean State

- Navigate the dev-app to designer mode
- Ensure the Sales Dashboard (`demo-sales`) is loaded
- Navigate to the page that contains the widget to document (Overview page for most charts/widgets, Chart Gallery for advanced charts)
- Select the widget in the Puck editor
- Verify the property panel is visible and shows the feature's settings

**Commands**:

```bash
# If dev-app isn't running:
cd /path/to/supersubset && pnpm dev
```

Use Playwright or Chrome MCP to navigate:

```typescript
await page.goto('http://localhost:3000');
// Switch to designer mode, select the widget
```

### Step 3: Capture Designer "Default" Screenshot

- The property panel should show the setting at its **default** value
- Frame the screenshot to show the property panel clearly, including the setting label and current value
- Use a consistent viewport size (1440×900 for desktop)

**Naming**: `{category}/{feature-slug}-default-designer.png`

### Step 4: Capture Viewer "Default" Screenshot

- Switch to viewer/preview mode (or navigate to the viewer route)
- Frame the screenshot to show the widget with its default rendering
- For charts: ensure the chart is fully rendered with data
- For layout: show the layout component in context

**Naming**: `{category}/{feature-slug}-default-viewer.png`

### Step 5: Change the Setting

- Switch back to designer mode
- Change the configuration property being documented
- For boolean properties: toggle the value
- For enum properties: select a different option
- For numeric properties: change to a visually distinct value

### Step 6: Capture Designer "Changed" Screenshot

- The property panel should now show the **changed** value
- Frame identically to Step 3 for easy visual comparison

**Naming**: `{category}/{feature-slug}-{property-name}-designer.png`

### Step 7: Capture Viewer "Changed" Screenshot

- Switch to viewer/preview mode
- The widget should reflect the changed configuration
- Frame identically to Step 4 for easy visual comparison

**Naming**: `{category}/{feature-slug}-{property-name}-viewer.png`

### Step 7.5: Verify Before/After Difference (MANDATORY)

**This is a hard requirement.** Every property that claims to change the visual output MUST have at least two screenshots that visually demonstrate the difference.

1. **Compare the "default" viewer screenshot with the "changed" viewer screenshot.** They MUST be visibly different. If they look the same, the property either:
   - Didn't actually get toggled (capture script bug)
   - Doesn't produce a visible change (documentation should not claim it does)
   - Is broken (product bug — go to Step 9)

2. **How to verify programmatically**: After capturing both screenshots, load them and compare pixel data or file hashes. If the MD5 hashes are identical, the screenshots are duplicates and the property change was not captured.

3. **What constitutes a valid difference**:
   - For boolean toggles (smooth, area fill, show points): the chart rendering must visibly change
   - For field reference changes: different data should be plotted on the axis
   - For enum changes (color scheme, aggregation): the visual output must reflect the new value
   - For numeric changes (limit, padding): the layout or content must visibly shift

4. **MDX must show both states**: The documentation page must include BOTH the before and after screenshots so the reader can see what the property actually does. A single screenshot of the property panel is NOT sufficient — the reader needs to see the visual result.

**If the before and after screenshots are identical, STOP. Do not proceed. File a bug.**

### Step 8: Quality Check

Verify all of the following:

- [ ] No console errors in the browser (use `page.on('console')` or Chrome MCP `chr_list_console_messages`)
- [ ] The designer property panel correctly shows the setting and its value
- [ ] The viewer output visually reflects the configuration change
- [ ] Existing screenshot artifacts for this surface were refreshed, or the omission is explicitly justified in the change notes
- [ ] The widget renders with actual data (not empty/loading state)
- [ ] Screenshots are sharp, correctly framed, and at consistent dimensions
- [ ] The feature behaves as documented (no visual glitches, clipping, or overflow)

### Step 9: Bug Fix Gate

**This is a hard gate.** If Step 8 reveals any issues:

1. **Stop documentation** — do not write the MDX page yet
2. **File the bug** — describe the issue, attach the screenshot showing the problem
3. **Fix the bug** — make the code change in the appropriate package
4. **Run tests** — `pnpm test` in the affected package, `pnpm typecheck`
5. **Re-capture** — go back to Step 2 and re-take all screenshots for this feature
6. **Log the fix** — note the bug and fix in the MDX page's changelog section

Only proceed to Step 10 when the feature passes all quality checks.

### Step 10: Write the MDX Page

Create the MDX file in the appropriate docs directory using this template:

```mdx
---
title: { Feature Title }
description: Learn how to configure the {feature name} in your Supersubset dashboard.
sidebar:
  order: { N }
---

import ScreenshotComparison from '../../../components/ScreenshotComparison.astro';
import PropertyShowcase from '../../../components/PropertyShowcase.astro';
import ExpandAll from '../../../components/ExpandAll.astro';

# {Feature Title}

{1-2 sentence description of what this feature does and when to use it.}

<ExpandAll />

## Default Appearance

{Brief description of the default behavior.}

<ScreenshotComparison
  label="Default"
  designerSrc={import('../../../assets/screenshots/{path}-default-designer.png')}
  designerAlt="{Feature} default settings in the designer property panel"
  viewerSrc={import('../../../assets/screenshots/{path}-default-viewer.png')}
  viewerAlt="{Feature} default rendering in the dashboard viewer"
/>

## Configuration Options

### {Property Name} (`{propName}`)

{Description of what this property controls and its valid values.}

<PropertyShowcase
  label="{Property Name} toggled"
  beforeSrc={import('../../../assets/screenshots/{path}-{variant}-before-viewer.png')}
  beforeAlt="{Feature} before {property} change"
  afterSrc={import('../../../assets/screenshots/{path}-{variant}-viewer.png')}
  afterAlt="{Feature} after enabling {property}"
  calloutSrc={import('../../../assets/screenshots/{path}-{variant}-callout-designer.png')}
  calloutAlt="{Property} setting highlighted in designer"
/>

**IMPORTANT**: The before and after viewer screenshots MUST be visibly different. If they are not, the property is either not working or the capture was incorrect. See Step 7.5.

{Repeat ### for each configurable property}

## Tips

- {Practical tips for dashboard authors}

## Related Features

- [{Related Feature 1}](../path-to-related)
- [{Related Feature 2}](../path-to-related)
```

### Step 11: Slot into Navigation

Add the new page to the Starlight sidebar configuration in `packages/docs/astro.config.mjs`:

```javascript
// Find the correct category group and add the page in the appropriate order
sidebar: [
  {
    label: '{Category}',
    items: [
      // ... existing items
      { label: '{Feature Title}', slug: '{category}/{feature-slug}' },
    ],
  },
];
```

Verify the page appears in the correct position in the sidebar.

### Step 12: Cross-Reference

- Add links to related features in the "Related Features" section
- Update related feature pages to link back to this new page
- Ensure the Getting Started guide references this feature if appropriate

## MDX Component Reference

### `<PropertyShowcase>`

Renders a three-panel comparison for a property toggle: before viewer, after viewer, and designer callout. Use this for all property variant documentation sections. Props:

| Prop         | Type            | Description                                                        |
| ------------ | --------------- | ------------------------------------------------------------------ |
| `label`      | `string`        | Display name for the comparison (shown in the collapsible summary) |
| `beforeSrc`  | `ImageMetadata` | Import of the viewer screenshot **before** the property change     |
| `beforeAlt`  | `string`        | Alt text for the "before" image                                    |
| `afterSrc`   | `ImageMetadata` | Import of the viewer screenshot **after** the property change      |
| `afterAlt`   | `string`        | Alt text for the "after" image                                     |
| `calloutSrc` | `ImageMetadata` | Import of the designer callout screenshot (optional)               |
| `calloutAlt` | `string`        | Alt text for the callout image                                     |

**Screenshot file pattern:**

- Before viewer: `{slug}-{variantSlug}-before-viewer.png`
- After viewer: `{slug}-{variantSlug}-viewer.png`
- Designer callout: `{slug}-{variantSlug}-callout-designer.png`

**Example usage:**

```mdx
import PropertyShowcase from '../../../components/PropertyShowcase.astro';
import stacked_before from '../../../assets/screenshots/chart-types/bar-chart-stacked-before-viewer.png';
import stacked_after from '../../../assets/screenshots/chart-types/bar-chart-stacked-viewer.png';
import stacked_callout from '../../../assets/screenshots/chart-types/bar-chart-stacked-callout-designer.png';

<PropertyShowcase
  label="Stacked bars enabled"
  beforeSrc={stacked_before}
  beforeAlt="Bar chart with grouped bars"
  afterSrc={stacked_after}
  afterAlt="Bar chart with stacked bars"
  calloutSrc={stacked_callout}
  calloutAlt="Stacked property highlighted in designer"
/>
```

### `<ScreenshotComparison>`

Renders a designer/viewer pair inside a `<details>` element. Use for "Default Appearance" sections where no before/after comparison is needed. Props:

| Prop          | Type            | Description                                            |
| ------------- | --------------- | ------------------------------------------------------ |
| `label`       | `string`        | Display name for the comparison (shown in the summary) |
| `designerSrc` | `ImageMetadata` | Import of the designer screenshot                      |
| `designerAlt` | `string`        | Alt text for the designer screenshot                   |
| `viewerSrc`   | `ImageMetadata` | Import of the viewer screenshot                        |
| `viewerAlt`   | `string`        | Alt text for the viewer screenshot                     |

### `<ExpandAll>`

Renders a toggle button that opens/closes all `<details>` elements on the page. No props required. Place it once near the top of the page, after the intro text.

### `<FeatureScreenshot>`

Renders a single captioned screenshot. Props:

| Prop      | Type            | Description                       |
| --------- | --------------- | --------------------------------- |
| `src`     | `ImageMetadata` | Import of the screenshot image    |
| `alt`     | `string`        | Alt text for the image            |
| `caption` | `string`        | Caption displayed below the image |

## Playwright Screenshot Script Pattern

For automated capture, use scripts in `packages/docs/capture/`:

```typescript
import { test } from '@playwright/test';

test.describe('{Feature} screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    // Navigate to designer mode, select the widget
  });

  test('default - designer', async ({ page }) => {
    // Frame the property panel
    await page.screenshot({
      path: 'src/assets/screenshots/{category}/{slug}-default-designer.png',
      clip: { x, y, width, height }, // or use element screenshot
    });
  });

  test('default - viewer', async ({ page }) => {
    // Switch to viewer mode
    await page.screenshot({
      path: 'src/assets/screenshots/{category}/{slug}-default-viewer.png',
      clip: { x, y, width, height },
    });
  });

  // Repeat for each property variant
});
```

Run with: `npx playwright test packages/docs/capture/{feature}.spec.ts`

## Property Variant Capture (Before/After)

The `property-variants.spec.ts` script captures **before/after** screenshots for
every toggleable property on chart and widget blocks. It uses a data-driven
`WidgetVariantSpec` interface and the shared helpers in `helpers.ts`.

### Key Architecture Discovery

When the Puck designer edits a dashboard via `onChange`, it re-serializes **all**
layout node IDs from the original form (e.g., `w-line`) to a `layout-{widgetRef}`
form (e.g., `layout-chart-revenue-trend`). This means `data-ss-node`-based
selectors break after any property toggle.

**Solution**: Capture variant screenshots from the **Puck canvas iframe** using
`data-puck-component` attributes, NOT from the runtime viewer.

### Puck Canvas Iframe Selectors

Inside the Puck editor iframe (`page.frameLocator('iframe').first()`):

| Attribute             | Value                    | Example                                |
| --------------------- | ------------------------ | -------------------------------------- |
| `data-puck-component` | Puck component TYPE name | `LineChart`, `BarChart`, `HeaderBlock` |
| `data-puck-dnd`       | Content item instance ID | `chart-revenue-trend`, `divider-1`     |

Use `data-puck-dnd` (or `data-puck-component`) to target specific widget
instances within the iframe. The `captureWidgetFromCanvas()` helper handles this.

### Runtime Viewer Selectors

In the runtime viewer (initial load, before any designer edits):

| Attribute        | Value                | Example                              |
| ---------------- | -------------------- | ------------------------------------ |
| `data-ss-node`   | Layout node ID       | `w-line`, `header-title`, `row-kpis` |
| `.ss-widget`     | Widget wrapper class | —                                    |
| `.ss-filter-bar` | Filter bar element   | —                                    |
| `.ss-chart`      | ECharts container    | —                                    |

**IMPORTANT**: Chart titles render inside ECharts canvas, NOT as DOM text.
`hasText`-based selectors will NOT work on chart widgets.

### Property Toggle Helpers

- `toggleRadioProperty(page, fieldLabel, targetValue)` — toggle a radio option using React fiber `__reactProps$` onChange (primary), `.click()` fallback
- `changeSelectProperty(page, fieldLabel, targetValue)` — change a `<select>` value using React fiber onChange with JSON-encoded option matching (Puck stores option values as `{"value":"actual_value"}`)
- `scrollPropertyIntoView(page, fieldLabel)` — scroll the sidebar to find a field
- `capturePropertyCallout(page, fieldLabel, category, slug, variant)` — capture a focused callout screenshot centered on a specific property field with a blue highlight border

### Designer Callout Capture

The `capturePropertyCallout` helper produces compact 340×250px screenshots centered on a specific property field:

1. Uses Playwright locators to find the VISIBLE `PuckFields-field` container (Puck renders hidden field panels for all components — only the selected one is visible)
2. Iterates all matching elements and finds the first one with non-zero `boundingBox()`
3. Scrolls the field into view and recalculates its position
4. Injects a temporary blue highlight `div` (3px solid #2563eb, border-radius 8px, box-shadow)
5. Captures a 340×250px clip centered on the field
6. Removes the highlight overlay
7. Falls back to `capturePropertyPanel` if the field isn't found

### React Fiber Event Dispatch

Puck handles form field changes through React's synthetic event system. Native DOM events (`dispatchEvent`, `nativeInputValueSetter`) do NOT trigger Puck state updates. Both radio and select helpers use React fiber props (`__reactProps$` onChange) to trigger actual Puck state changes.

**Important**: After changing a property via React fiber, the designer package must be rebuilt for ChartPreview fixes to take effect:

```bash
pnpm --filter @supersubset/designer build
```

### ChartPreview Boolean Mapping

`packages/designer/src/preview/ChartPreview.tsx` `buildWidgetConfig()` maps Puck block props to widget config. Boolean radio props must handle BOTH `'true'` AND `'false'` string values:

```typescript
// CORRECT — handles both checked and unchecked states
if (puckProps.smooth === 'true') config.smooth = true;
else if (puckProps.smooth === 'false') config.smooth = false;
```

If only the `'true'` case is handled, toggling to 'false' is silently ignored when the DEFAULT_CONFIGS has the property set to `true`.

### WidgetVariantSpec Interface

```typescript
interface WidgetVariantSpec {
  layerLabel: string; // Layer panel text to click
  nodeId: string; // Original data-ss-node ID (for viewer on initial load)
  puckComponentId: string; // data-puck-dnd value (for canvas iframe capture)
  category: string; // Screenshot category folder
  slug: string; // Feature slug for file names
  page: 'overview' | 'gallery';
  variants: Array<{
    name: string; // Variant name (e.g., 'smooth', 'horizontal')
    field: string; // Property panel field label
    value: string; // Target value to set
    type: 'radio' | 'select';
  }>;
}
```

### Running Variant Captures

```bash
# All variants
cd packages/docs && npx playwright test capture/property-variants.spec.ts

# Specific category
npx playwright test capture/property-variants.spec.ts -g "Overview"
npx playwright test capture/property-variants.spec.ts -g "Gallery"

# Specific chart
npx playwright test capture/property-variants.spec.ts -g "line-chart"
```

### Layout and Filter Captures

Use `layout-filters.spec.ts` for layout-element and filter-state screenshots:

```bash
npx playwright test capture/layout-filters.spec.ts
```

Layout elements use `data-ss-node` in the viewer (initial load) and viewport
clipping or Puck layer selection in the designer. Filter screenshots capture
different filter states (active, cleared, multiple active) and the filter
builder panel.

## Quality Checklist Summary

Before considering a feature page complete:

- [ ] Feature brief is written (Step 1)
- [ ] All default screenshots captured (Steps 3-4)
- [ ] All property variant screenshots captured (Steps 5-7, repeated per property)
- [ ] **Before/after difference verified for every property** (Step 7.5) — screenshots MUST be visibly different
- [ ] Quality check passed — no console errors, correct rendering (Step 8)
- [ ] No outstanding bugs — bug fix gate cleared (Step 9)
- [ ] MDX page written with all sections (Step 10)
- [ ] Property variant sections use `<PropertyShowcase>` with before/after viewer + designer callout (3 images per variant)
- [ ] Default Appearance sections use `<ScreenshotComparison>` with designer + viewer pair
- [ ] Page added to sidebar navigation (Step 11)
- [ ] Cross-references added (Step 12)
- [ ] `pnpm docs:build` succeeds with the new page
- [ ] Field reference inputs are dropdowns (not text boxes) — if text boxes are found, file a bug
