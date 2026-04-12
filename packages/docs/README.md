# @supersubset/docs

End-user documentation site for Supersubset dashboard authors. Built with [Astro Starlight](https://starlight.astro.build/).

## Quick Start

```bash
# From the monorepo root:
pnpm docs:dev          # http://localhost:4321
pnpm docs:build        # Production build
pnpm docs:preview      # Preview the production build
```

Or from this directory:

```bash
pnpm dev               # http://localhost:4321
pnpm build
pnpm preview
```

## Content Structure

All content lives in `src/content/docs/` as MDX files:

```
src/content/docs/
├── index.mdx              # Landing page
├── getting-started/       # First-run tutorial
├── chart-types/           # 14 chart type guides + overview
│   ├── overview.mdx
│   ├── line-chart.mdx
│   ├── bar-chart.mdx
│   └── ...
├── widgets/               # KPI, table, markdown, alerts
├── layout/                # Grid, responsive, sections
├── filters/               # Filter bar, types, interactions
├── interactions/          # Click actions, drill-down, linking
├── pages/                 # Multi-page, navigation, tabs
└── import-export/         # JSON, YAML, schema viewer
```

## Screenshots

Screenshots are captured programmatically from the running dev-app using Playwright.

### Prerequisites

The dev-app must be running on port 3000:

```bash
# From monorepo root:
pnpm dev        # starts dev-app at http://localhost:3000
```

### Capture All Screenshots

```bash
# From monorepo root:
pnpm docs:screenshots
```

This runs 6 Playwright spec files in `capture/` and writes PNGs to `src/assets/screenshots/`.

### Capture Specs

| Spec | What it captures |
|------|-----------------|
| `overview.spec.ts` | Designer/viewer overview, mode toggling |
| `chart-gallery.spec.ts` | All 14 chart types in designer + viewer |
| `widgets.spec.ts` | KPI card, table, markdown, alerts widgets |
| `filters.spec.ts` | Filter bar, filter types, filter interactions |
| `pages.spec.ts` | Multi-page navigation, page management |
| `import-export.spec.ts` | JSON/YAML export, schema code view |

### Adding a Screenshot

1. Add a Playwright test in the appropriate `capture/*.spec.ts` file
2. Use the helpers from `capture/helpers.ts` for consistent viewport and wait behavior
3. Run the capture to generate the PNG
4. Import the screenshot in the MDX file:

```mdx
import myScreenshot from '../../../assets/screenshots/category/my-screenshot.png';

<FeatureScreenshot src={myScreenshot} alt="Description of what's shown" />
```

## Adding a New Page

1. Create `src/content/docs/<category>/<slug>.mdx`
2. Add frontmatter with `title` and `description`
3. Add the page to the sidebar in `astro.config.mjs` if it's not auto-discovered
4. Capture any needed screenshots
5. Build and verify: `pnpm build`

## Custom Components

MDX pages can use these custom components from `src/components/`:

- **`<FeatureScreenshot>`** — Responsive image with caption
- **`<ScreenshotComparison>`** — Side-by-side designer vs. viewer view
- **`<ExpandAll>`** — Expandable/collapsible content sections

## Tech Stack

- [Astro](https://astro.build/) 5.x
- [Starlight](https://starlight.astro.build/) 0.34.x
- [Playwright](https://playwright.dev/) for screenshot capture
- [sharp](https://sharp.pixelplumbing.com/) for image optimization
