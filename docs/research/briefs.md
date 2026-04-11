# Research Task Briefs

> Assign these to the Research subagent. Each task is independently executable.

---

## Brief 0.1 — Superset Archaeology

**Objective**: Map the Apache Superset frontend for reusable components and patterns.

**Scope**:
- Repository: `apache/superset`, focus on `superset-frontend/`
- Target areas:
  - `superset-frontend/src/explore/` — chart builder UX, control panels
  - `superset-frontend/src/dashboard/` — dashboard composition, filter UX
  - `superset-frontend/src/components/` — reusable UI components
  - `superset-frontend/plugins/` — chart plugin registration model
  - `superset-frontend/src/dataMask/` — filter/cross-filter state
- Map dependency graph for each target area
- Identify what depends on Flask/Python backend, metastore, query-context

**Expected Output**:
- `docs/research/superset-archaeology.md` with:
  - Module-by-module analysis
  - Coupling assessment (standalone vs backend-dependent)
  - Classification: code donor / inspiration / discarded
  - Specific file paths and relevant line ranges
  - License: Apache 2.0, note NOTICE file requirements

**Non-Goals**:
- Do not analyze Python backend
- Do not suggest importing large entangled modules
- Do not write implementation code

---

## Brief 0.2 — Puck Study

**Objective**: Evaluate Puck as the dashboard designer editor shell.

**Scope**:
- Repository: `measuredco/puck`
- Evaluate:
  - Component registration API (custom blocks, fields)
  - Nested component support (layout containers)
  - Responsive layout capabilities
  - Custom field editor support
  - Data resolution (async data in editor)
  - Save/load serialization format
  - Performance with 20+ blocks
  - Theming/styling customization
  - Host-app integration patterns (controlled mode)
  - Plugin/extension points
- Test with a proof-of-concept if feasible

**Expected Output**:
- `docs/research/puck-study.md` with:
  - Feature-by-feature assessment
  - Known limitations and workarounds
  - "Blocker" analysis: what would force us to abandon Puck?
  - Integration architecture recommendation
  - Comparison with alternatives (GrapesJS, Craft.js, react-page)

**Non-Goals**:
- Do not build the full designer
- Do not commit to Puck without presenting findings

---

## Brief 0.3 — Rill Schema Study

**Objective**: Study Rill's YAML-based resource organization for dashboard definition ideas.

**Scope**:
- Repository: `rilldata/rill`
- Focus on:
  - Dashboard YAML format and structure
  - Metrics view definitions
  - Component-oriented canvas model
  - Human-readability of config files
  - How they handle measure/dimension definitions

**Expected Output**:
- `docs/research/rill-study.md` with:
  - Schema examples annotated with strengths/weaknesses
  - Ideas worth borrowing for Supersubset's canonical schema
  - Ideas to avoid (metrics-view lock-in, product-specific patterns)

---

## Brief 0.4 — Dashbuilder Study

**Objective**: Evaluate Red Hat Dashbuilder for reusable concepts.

**Scope**:
- Repository: `kiegroup/kie-tools` (Dashbuilder is part of KIE)
- Focus on:
  - YAML/JSON dashboard definition format
  - Page and navigation concepts
  - Editor/runtime split architecture
  - Static-client deployment model
  - Component registry patterns

**Expected Output**:
- `docs/research/dashbuilder-study.md` with:
  - Reusable concepts vs Supersubset-specific needs
  - Classification: inspiration / discarded for each concept

---

## Brief 0.5 — Perspective Study

**Objective**: Evaluate FINOS Perspective for table/pivot/explorer widget runtime.

**Scope**:
- Repository: `finos/perspective`
- Focus on:
  - Embeddable custom-element/React runtime
  - Save/restore config model
  - Pivot table implementation
  - Performance with large datasets
  - Integration pattern with React host apps
  - Bundle size and WASM requirements

**Expected Output**:
- `docs/research/perspective-study.md` with:
  - Best use: table only? pivot? full explorer? widget runtime?
  - Integration complexity assessment
  - WASM bundle size concern evaluation
  - Recommendation: where to use Perspective vs native ECharts tables

---

## Brief 0.6 — Landscape Scan

**Objective**: Find related projects that bridge the gap between Superset and embeddable libraries.

**Targets**:
- geOrchestra's superset-core fork
- open-source-dashboard (DashboardBuilder)
- React visual editors that save JSON/YAML (GrapesJS, Craft.js, BuilderIO)
- Embeddable analytics: Metabase embedding, Cube.js frontend
- Low-code page builders with analytics focus

**Expected Output**:
- `docs/research/landscape-scan.md` with:
  - Per-project summary: what it does, how it's relevant
  - Classification: code donor / inspiration / discarded
  - Any discoveries that should change our architecture assumptions
