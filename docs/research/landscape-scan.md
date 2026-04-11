# Landscape Scan — Research Report

> **Task**: 0.6  
> **Agent**: Research  
> **Date**: 2026-04-08

## Executive Summary

This scan evaluated projects that bridge the gap between full BI platforms and embeddable component libraries. The key finding is that **no existing project fills Supersubset's niche** — an embeddable, schema-first, React-native analytics builder/runtime. Most projects are either full products (Superset forks), generic page builders (GrapesJS, Craft.js), or specialized data tools (Perspective, Cube.js). This validates Supersubset's positioning and confirms that building from composable primitives (Puck + ECharts + custom schema) is the right approach.

## Per-Project Summaries

### 1. geOrchestra superset-core Fork

- **Repository**: `georchestra/superset-core`
- **What it does**: A fork of Apache Superset customized for integration into the geOrchestra spatial data infrastructure (SDI) platform. Adds geOrchestra header integration, CSP nonce handling, and platform branding.
- **Relevance**: Demonstrates the effort required to embed Superset into another platform. Their approach is the "iframe-based embedded whole-app clone" pattern that Supersubset explicitly rejects.
- **Key observations**:
  - 124 commits ahead, 189 behind apache main — significant divergence
  - `superset-embedded-sdk` with `getDataMask` function — their approach to embedding
  - Fork maintenance burden is clearly visible (CSP fixes, marshmallow pinning)
  - Still requires full Python backend
- **Classification**: **Discarded** — Validates that forking Superset for embedding is a maintenance trap. Confirms Supersubset's "no iframe architecture" non-goal.
- **License**: Apache 2.0

### 2. open-source-dashboard (DashboardBuilder)

- **Repository**: `nickvdyck/open-source-dashboard`
- **Status**: **404 Not Found** — Repository appears to have been deleted or made private.
- **Classification**: **Discarded** — Cannot evaluate a non-existent project.

### 3. GrapesJS

- **Repository**: `GrapesJS/grapesjs`
- **Stars**: 25.7k | **License**: BSD 3-clause
- **What it does**: Free and open-source Web Builder Framework for creating HTML templates. Designed for use inside a CMS to speed up dynamic template creation.
- **Key features**:
  - Block/component system with drag-and-drop
  - Style Manager for CSS editing
  - Layer Manager for component hierarchy
  - Asset Manager for images/media
  - Code Viewer for source inspection
  - Plugin ecosystem (newsletter builder, webpage builder, forms, etc.)
  - `@grapesjs/react` React wrapper available
  - Monorepo with pnpm
- **Relevance**: A mature page builder with extensive plugin ecosystem. Could theoretically be adapted for dashboard building.
- **Why not for Supersubset**:
  - **HTML/CSS output model**: GrapesJS fundamentally works with HTML structure and CSS styling. Its data model IS the DOM. Supersubset needs a declarative JSON/YAML schema that describes dashboard semantics (data bindings, filters, interactions), not HTML structure.
  - **BSD 3-clause license**: While compatible, MIT (Puck) is simpler.
  - **No data resolution concept**: No equivalent to Puck's `resolveData` for async data fetching during editing.
  - **Web page builder, not dashboard builder**: Would need significant reworking of core concepts (styles → data bindings, HTML blocks → chart widgets).
- **Classification**: **Discarded** for editor shell — HTML-centric model doesn't map to dashboard semantics. However, their plugin architecture and Style Manager patterns are worth noting as architectural reference for anyone building a visual editor.

### 4. Craft.js

- **Repository**: `prevwong/craft.js`
- **Stars**: 8.6k | **License**: MIT
- **What it does**: A React framework for building extensible drag-and-drop page editors. Not an editor itself, but building blocks for creating one.
- **Key features**:
  - React-native: Components use `useNode()` hook for drag/edit capabilities
  - `<Editor>`, `<Frame>`, `<Element>` components for structuring the editor
  - `<Canvas>` for droppable regions
  - Serializable state to JSON via `query.serialize()`
  - Fine-grained control over component editing via hooks
  - `@craftjs/layers` for Photoshop-like layer panel
  - React 19 support
- **Relevance**: Direct alternative to Puck. More low-level, giving maximum control but requiring more boilerplate.
- **Comparison with Puck**:
  | Aspect | Craft.js | Puck |
  |--------|----------|------|
  | **Approach** | Library of hooks | Complete editor component |
  | **Boilerplate** | High (every component needs `useNode()`) | Low (config object) |
  | **Property editing** | DIY | Built-in field system |
  | **Data resolution** | No built-in | `resolveData` async |
  | **Editor UI** | Fully custom | Default UI + overrides |
  | **Nested containers** | `<Canvas>` | Slot fields |
  | **Activity** | Maintained but slower | Actively developed |
  | **Latest release** | Feb 2025 | Apr 2026 |
- **Classification**: **Discarded** as primary editor, **fallback option** if Puck proves insufficient.
- **Rationale**: Puck provides more out-of-the-box functionality that Supersubset needs (field system, data resolution, built-in editor UI). Craft.js would require building all of this from scratch. However, if Puck hits a blocking limitation, Craft.js is the strongest alternative.

### 5. Metabase Embedding

- **What it does**: Metabase offers an embedding SDK (`@metabase/embedding-sdk-react`) for embedding Metabase dashboards and questions in React applications.
- **Approach**: iframe-based and SDK-based embedding of Metabase-authored content. Requires a running Metabase instance.
- **Relevance**: Shows the market demand for embeddable analytics. Their React SDK approach demonstrates current industry expectations for embedding ergonomics.
- **Why not for Supersubset**:
  - **Product embedding, not library**: Metabase embedding requires running Metabase. Supersubset is library-first.
  - **Not composable**: You embed Metabase dashboards whole, you don't compose from primitives.
  - **Vendor lock-in**: Content authored in Metabase can only be rendered by Metabase.
- **Classification**: **Discarded** — Different paradigm (product vs library).
- **Useful insight**: Metabase's embedding SDK API (`<MetabaseProvider>`, `<InteractiveDashboard>`) shows good React embedding ergonomics that Supersubset should match or exceed.

### 6. Cube.js Frontend

- **What it does**: Cube.js is a headless BI API layer. Its frontend components (`@cubejs-client/react`) provide React hooks and components for building analytics dashboards on top of Cube's query API.
- **Approach**: Query-first — define queries via Cube's schema, render results with any chart library.
- **Relevance**: Shows a query-abstraction approach similar to Supersubset's query-client concept.
- **Key patterns**:
  - `useCubeQuery(query)` hook — clean query abstraction
  - Query object: `{ measures, dimensions, timeDimensions, filters, segments, limit, offset }`
  - Framework-agnostic query results fed to any chart library
- **Why not for Supersubset**:
  - **Backend-required**: Cube.js requires a Cube server for query processing
  - **No designer**: No visual editor component
  - **Query schema, not dashboard schema**: Cube defines data models, not dashboard layouts
- **Classification**: **Architectural inspiration** — Cube's query object format (`{ measures, dimensions, timeDimensions, filters }`) is a clean reference for Supersubset's query abstraction.
- **License**: MIT (frontend packages)

### 7. BuilderIO / builder.io

- **What it does**: Visual CMS and page builder with a headless API. `@builder.io/sdk-react` embeds into React apps.
- **Approach**: Commercial SaaS with open-source SDK. Visual editor lives in Builder.io's cloud.
- **Relevance**: Shows commercial market for visual editors, but is a product (SaaS), not a library.
- **Classification**: **Discarded** — SaaS product, not an open-source library.

### 8. react-page (formerly ORY Editor)

- **Repository**: `react-page/react-page`
- **What it does**: Highly customizable content editing for React. Produces JSON output.
- **Relevance**: Another React page editor, positioned between Puck and Craft.js.
- **Status**: Less active than Puck (~3.6k stars, maintenance mode).
- **Classification**: **Discarded** — Puck is a better-maintained, more feature-complete alternative.

## Architecture Assumptions Validation

The landscape scan **validates** Supersubset's core architecture assumptions:

1. **No existing project fills the niche** ✅ — There is no embeddable, schema-first, React-native analytics builder/runtime. Supersubset's positioning is unique.

2. **Puck + ECharts is the right composition** ✅ — No single project provides both visual editing and chart rendering in a library-first manner. Composing Puck (editor) + ECharts (charts) + custom schema is the pragmatic approach.

3. **Library-first is differentiated** ✅ — Every existing analytics embedding solution requires a backend service. Supersubset's no-backend-required approach is genuinely different.

4. **Schema-first is essential** ✅ — Projects that don't have a clean schema contract (GrapesJS's HTML, Superset's internal JSON) create lock-in. Supersubset's canonical schema is its key differentiator.

5. **Fork approaches fail** ✅ — geOrchestra's Superset fork demonstrates the maintenance burden of forking a full product.

## No Discoveries That Should Change Architecture

No project discovered in this scan suggests a fundamental change to Supersubset's planned architecture. The composition of:
- **Puck** for visual editing
- **ECharts** for chart rendering
- **Custom canonical schema** as the product contract
- **Adapter-first metadata** for data model ingestion
- **Perspective** as optional advanced widget

...remains the strongest approach given the landscape.

## Summary Table

| Project | License | Stars | Classification | Key Insight |
|---------|---------|-------|---------------|-------------|
| geOrchestra superset-core | Apache 2.0 | 0 | Discarded | Fork maintenance trap |
| open-source-dashboard | N/A | N/A | Discarded | Project deleted |
| GrapesJS | BSD 3 | 25.7k | Discarded | HTML-centric, wrong paradigm |
| Craft.js | MIT | 8.6k | Fallback option | Good but more boilerplate than Puck |
| Metabase Embedding | AGPL/Proprietary | N/A | Discarded | Product embedding, not library |
| Cube.js Frontend | MIT | N/A | Inspiration | Clean query abstraction |
| BuilderIO | Proprietary | N/A | Discarded | SaaS, not library |
| react-page | MIT | 3.6k | Discarded | Less maintained than Puck |
