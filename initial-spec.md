# Supersubset — AI Agent Build Spec

## Mission

Build **Supersubset**, an embeddable open-source analytics builder/runtime for a no-code platform.

Supersubset must provide:

1. **A designer component** inspired by Apache Superset’s authoring experience that saves dashboard definitions in **one canonical schema** while supporting multiple serialization formats (at minimum JSON and YAML).
2. **A rendering engine** that executes a dashboard definition and renders it inside a host web application.
3. **A data-model ingestion layer** that accepts a developer-defined analytical model as input, such as:
   - Prisma schema
   - dbt manifest / schema metadata
   - JSON Schema
   - OpenAPI/GraphQL-derived metadata
   - SQL catalog metadata from a secure query endpoint

The resulting system should be **library-first**, not product-first:

- embeddable into an existing React application
- no required vendor backend
- no forced hosted service
- compatible with a ClickHouse-based backend exposed through a secure SQL API
- source-of-truth schema owned by the host platform

## Product Philosophy

We are **not** building a clone of Superset, Rill, or Lightdash.
We are extracting the best ideas from permissive OSS and reassembling only the parts needed.

Target philosophy:

- Think **Form.io for analytics dashboards**
- Host app owns auth, data access, metadata, persistence, theming, permissions
- Supersubset supplies designer + runtime + schema + adapters
- Backend modeling is external and developer-owned

## Non-Goals

Do **not** build:

- a full BI platform
- a warehouse-native semantic layer product
- a multi-tenant hosted analytics service
- an iframe-based embedded whole-app clone
- a forced metastore/backend coupling like Superset’s current architecture
- tight dependency on dbt, Rill, or any single modeling system

## Primary Inputs / Inspirations

### Use as inspiration, not as architecture constraints

- **Apache Superset**
  - Mine for: chart-builder UX, dashboard composition, filter UX, explore affordances, plugin model ideas, control panel patterns
  - Treat as: the richest **feature quarry** and UX reference implementation
  - Avoid inheriting: Flask/Python backend coupling, metastore assumptions, query-context entanglement, iframe-centric embedding assumptions, full-product architecture

- **Puck**
  - **Bake this in as the default editor shell**
  - Mine for: embeddable React-native editor architecture, drag-and-drop block editing, field/property editing, host-app integration ergonomics, controlled data ownership
  - Default stance: unless discovery proves otherwise, build the visual designer on top of Puck rather than inventing the editor shell from scratch

- **Rill**
  - Mine for: YAML resource organization, dashboard-as-files ergonomics, component-oriented canvas ideas, clean human-readable dashboard definitions
  - Avoid inheriting: metrics-view lock-in, product/runtime worldview

- **Dashbuilder**
  - Mine for: YAML/JSON dashboard definition, page/navigation concepts, lightweight runtime/editor split, static-client deployment ideas

- **Perspective**
  - Mine for: embeddable custom-element/runtime ideas, save/restore config model, high-performance interactive runtime concepts, pivot/table exploration

- **Apache ECharts**
  - Mine for: rendering engine, chart option model, extensibility, theming, advanced chart coverage

## Spec Authoring Best Practices for Long-Horizon AI Work

This spec must be written and maintained for long-horizon autonomous work by coding agents operating in VS Code with **Claude Opus 4.6** and **ChatGPT GPT-5.4**-class models.

The spec must therefore follow these principles:

1. **Outcome-first**
   - Start with mission, constraints, acceptance criteria, and non-goals before implementation detail.

2. **Layered detail**
   - Provide a short executive mission, then architecture rules, then phased tasks, then file/module-level detail.
   - Make it easy for an orchestrator to hand smaller sections to subagents without losing intent.

3. **Deterministic contracts**
   - Define canonical schemas, APIs, and package boundaries clearly.
   - Avoid vague terms like “nice UI” unless accompanied by measurable behavior.

4. **Explicit decision logs**
   - Require ADRs for key choices.
   - Require the orchestrator to maintain a running decision register and unresolved questions list.

5. **Parallelizable work decomposition**
   - Break work into independent streams that can be delegated safely to subagents with minimal shared mutable context.

6. **Verification loops**
   - Every phase must include code validation, tests, and browser verification.
   - No phase is complete until verified through automated checks and real browser interaction.

7. **Artifact-driven execution**
   - Agents must produce durable artifacts: ADRs, schemas, test plans, package skeletons, demos, and status summaries.

8. **Context reset resilience**
   - The repo must contain enough local documentation that a fresh agent session can resume work reliably.
   - Core operational context must live in repository documents, not only transient chat history.

## Required Deliverables

### 1. Canonical Dashboard Schema

Design one canonical schema that can be serialized as:

- JSON
- YAML

The canonical schema must support:

- dashboard metadata
- pages / tabs / navigation
- layout tree
- widgets
- widget bindings
- filters
- interactions
- theming
- permissions / visibility rules
- drilldown / navigation actions
- default state / saved state
- versioning / migrations

#### Schema principles

- human-readable
- deterministic serialization
- stable IDs
- schema version field required
- backward-compatible migration system
- no serialization-specific semantics
- JSON and YAML are just encodings of the same AST

### 2. Designer Component

Build a React-based embeddable designer that:

- can be mounted inside an existing app
- is controlled by props/callbacks
- emits canonical dashboard definitions
- loads existing dashboard definitions
- supports controlled and uncontrolled modes

#### Designer requirements

- drag-and-drop layout editing
- palette of widgets
- property panel
- dataset/model browser
- field picker
- chart type picker
- filter builder
- interactions editor
- dashboard/page navigator
- responsive preview modes
- undo/redo
- copy/paste/duplicate
- keyboard shortcuts
- validation panel
- code view (JSON/YAML)
- import/export

#### Design system constraints

- use React + TypeScript
- UI should be host-app-themeable
- no assumptions about routing/auth framework
- no iframe for core editor

### 3. Rendering Engine

Build a renderer that:

- accepts canonical dashboard definitions
- renders them in the DOM
- works independently of the designer
- supports read-only and interactive modes
- executes widget-level queries against a pluggable data adapter

#### Renderer requirements

- layout engine
- widget runtime registry
- filter state engine
- cross-widget interactions
- chart rendering
- table rendering
- KPI cards
- markdown/rich text blocks
- empty/loading/error states
- event hooks to host app
- dashboard lifecycle hooks

### 4. Data Model Adapter Layer

The runtime and designer must consume a normalized metadata contract produced from adapters.

#### Supported input adapters (prioritized)

1. **Prisma schema adapter**
2. **SQL introspection adapter** for a secure SQL endpoint
3. **dbt manifest / schema adapter**
4. **Generic JSON metadata adapter**

The system must translate source metadata into an internal analytical model:

- entities / datasets
- fields / dimensions / measures
- data types
- time fields
- relationships
- default aggregations
- formatting hints
- allowed filter operators
- row-level-security hints (metadata only)

## Recommended Architecture

### Package layout

Use a monorepo with packages roughly like:

- `packages/schema`
  - canonical schema types
  - JSON schema
  - validation
  - migrations
  - serializers

- `packages/designer`
  - React visual editor
  - block palette
  - property editors
  - data model browser

- `packages/runtime`
  - renderer
  - layout engine
  - widget registry
  - filter/interactions engine

- `packages/charts-echarts`
  - ECharts-backed widget implementations

- `packages/data-model`
  - normalized metadata model
  - adapter interfaces

- `packages/adapter-prisma`
- `packages/adapter-sql`
- `packages/adapter-dbt`
- `packages/adapter-json`

- `packages/query-client`
  - pluggable query transport
  - secure SQL execution contract

- `packages/theme`
  - tokens / theming / host-style bridge

- `packages/dev-app`
  - local playground showcasing designer + runtime + adapters

## Architecture Rules

1. **Library-first**
   - Everything important should be consumable as npm packages.

2. **Backend-agnostic**
   - No required Superset/Rill/Lightdash backend.

3. **Schema-first**
   - The schema is the product contract.

4. **Adapter-first metadata ingestion**
   - Designer/runtime never depend directly on Prisma/dbt/ClickHouse specifics.

5. **Renderer independent from editor**
   - Runtime must work without editor dependencies.

6. **Host-owned persistence**
   - Designer emits schema; host app persists it.

7. **Host-owned authz**
   - Supersubset should accept capability metadata and query results only within caller permissions.

## Data Query Model

Assume the host platform exposes a secure analytical query endpoint.

Supersubset should define a query abstraction like:

- dataset
- selected fields
- aggregations
- group by
- filters
- sort
- limit
- time grain
- comparison period
- pagination

Do not hardcode SQL generation as the only path.

Support two execution modes:

1. **logical query plan** emitted to host adapter
2. **direct SQL generation** for environments that want it

## Widget Set — MVP

Support these widget categories in v1:

### Value / summary

- KPI card
- KPI grid
- sparkline KPI

### Charts

- line
- bar
- stacked bar
- area
- donut/pie
- scatter
- heatmap
- combo

### Tabular

- table
- pivot table

### Content

- markdown
- text / HTML-safe rich text
- image
- divider/spacer

### Control widgets

- filter bar
- date range selector
- segment control / tabs

## Interactions — MVP

- dashboard-level filters
- widget-local filters
- click-to-filter
- drill-to-detail
- navigate to page/tab
- navigate to external route via host callback
- hover tooltips
- cross-filtering
- saved default state

## Serialization Requirements

Canonical schema example shape:

```ts
interface DashboardDefinition {
  schemaVersion: string;
  id: string;
  title: string;
  description?: string;
  pages: PageDefinition[];
  theme?: ThemeRef | ThemeDefinition;
  dataModelRef?: string;
  defaults?: DashboardDefaults;
  permissions?: VisibilityRule[];
}