# Superset Archaeology — Research Report

> **Task**: 0.1  
> **Agent**: Research  
> **Date**: 2026-04-08  
> **Repository**: `apache/superset` @ `master`

## Executive Summary

Apache Superset's frontend (`superset-frontend/`) is a large React+TypeScript application (~200k LoC frontend) with deep coupling to a Flask/Python backend via REST APIs, Redux state management, and metastore assumptions. The chart plugin system is the most extractable module, offering a well-defined `ChartPlugin` base class with `buildQuery`, `transformProps`, and `controlPanel` hooks. However, nearly every other module (dashboard layout, filter state, explore) is heavily entangled with backend API calls, Redux-based hydration from server state, and Superset-specific abstractions.

For Supersubset, the plugin system architecture is **architectural inspiration** — we should study its patterns (registration, config, transform pipeline) and reimplement cleanly. The filter state model (`dataMask`) offers useful conceptual patterns for cross-filtering but is too entangled with Superset's native filter system to extract directly. The dashboard layout engine uses a custom tree-based component hierarchy with `DragDroppable` components that are deeply coupled to Superset's internal grid system and Redux actions.

**Bottom line**: Superset is a **feature quarry** for UX patterns and architectural ideas. No module can be extracted as a code donor without significant rewriting to remove backend dependencies.

## Module-by-Module Analysis

### 1. Chart Plugin System (`superset-frontend/plugins/`)

- **What it does**: Plugin architecture for registering chart types. Each chart plugin extends `EchartsChartPlugin` (which extends `ChartPlugin`) and provides `buildQuery`, `transformProps`, `controlPanel`, and a renderer component.
- **Key files**:
  - `plugins/plugin-chart-echarts/src/types.ts` — `EchartsChartPlugin` class extending `ChartPlugin<T, P>`
  - `plugins/plugin-chart-echarts/src/Timeseries/index.ts` — Registration pattern with `buildQuery`, `controlPanel`, `loadChart`, `metadata`, `transformProps`
  - `plugins/plugin-chart-echarts/src/constants.ts` — Shared chart constants (grid offsets, legend defaults, opacity enums)
- **Dependencies**: 
  - `@superset-ui/core` — ChartPlugin, ChartProps, ChartMetadata, ChartDataResponseResult, SetDataMaskHook, SqlaFormData
  - `echarts/core` — EChartsCoreOption, EChartsType
  - Backend coupling: `buildQuery` generates `QueryContext` objects sent to Python backend; `ChartDataResponseResult` comes from backend API
- **Coupling assessment**: **Partially coupled** — The plugin registration pattern is clean and well-abstracted. But `buildQuery` assumes Superset's query context format, and `transformProps` receives backend-formatted data. The `controlPanel` system has complex form data types tied to Superset's explore view.
- **Classification**: **Architectural inspiration**
- **Evidence**: 
  - Plugin pattern: `super({ buildQuery, controlPanel, loadChart, metadata, transformProps })` — clean registration
  - But `buildQuery` outputs Superset-specific `QueryContext`: `{ datasource, force, queries: [{ columns, metrics, filters, orderby }] }`
  - `ChartProps` contains Superset-specific fields: `datasource`, `formData` (Superset form), `queriesData` (from backend)
  - Each plugin has ~15-30 files including control panels with ~hundreds of control definitions

### 2. Explore / Chart Builder (`superset-frontend/src/explore/`)

- **What it does**: The chart authoring UX — selecting data source, configuring chart type, setting controls, previewing output.
- **Key files**:
  - `src/explore/components/ExploreChartPanel/` — chart preview panel
  - `src/explore/components/controls/` — rich library of form controls (column selectors, filter controls, color schemes)
  - `src/explore/actions/` — Redux actions dispatching to backend APIs
- **Dependencies**:
  - Backend: Every action calls REST endpoints (`/api/v1/chart/`, `/api/v1/explore/`)
  - Redux store: `exploreReducer` hydrates from backend state
  - `src/explore/actions/hydrateExplore.ts` — pulls full chart state from server
- **Coupling assessment**: **Heavily coupled** — The explore view is a full-product feature, not a library component. Controls directly reference datasource IDs, query contexts, and Superset-specific field types.
- **Classification**: **Architectural inspiration** — Study the control panel UX patterns (field selectors, aggregation pickers, filter builders), but reimplement from scratch.
- **Evidence**: Controls import from `@superset-ui/chart-controls` which itself depends on Superset's datasource model and query framework.

### 3. Dashboard Composition (`superset-frontend/src/dashboard/`)

- **What it does**: Dashboard layout, rendering, editing (drag-and-drop), tab navigation, filter bars.
- **Key files**:
  - `src/dashboard/components/DashboardBuilder/DashboardBuilder.tsx` — 729 lines, main dashboard shell
  - `src/dashboard/actions/dashboardLayout.ts` — `handleComponentDrop`, `deleteTopLevelTabs`, `clearDashboardHistory`
  - `src/dashboard/actions/dashboardState.ts` — `setDirectPathToChild`, `setEditMode`
  - `src/dashboard/components/nativeFilters/` — native filter bar system
  - `src/dashboard/components/dnd/DragDroppable` — drag-and-drop system
  - `src/dashboard/reducers/` — Redux state management
  - `src/dashboard/types.ts` — `DashboardLayout`, `FilterBarOrientation`, `RootState`
- **Dependencies**:
  - `HYDRATE_DASHBOARD` action — receives full dashboard state from backend API
  - Redux everywhere — actions, reducers, selectors, containers
  - Backend: Dashboard save/load via REST API, filter configuration from server
  - `src/dashboard/util/constants.ts` — `DASHBOARD_GRID_ID`, `DASHBOARD_ROOT_ID`
  - `BuilderComponentPane` — component palette in edit mode
  - `FilterBar` from `nativeFilters` — native filter sidebar
  - `ResizableSidebar`, `UiConfigContext` — Superset-specific UI
- **Coupling assessment**: **Heavily coupled** — The dashboard system is deeply integrated with Redux, backend hydration, Superset's component tree model, and the native filter system. It uses a custom layout grid with Superset-specific depth/grid/root constants.
- **Classification**: **Architectural inspiration** — Study dashboard composition patterns (tab navigation, filter bar orientation, component hierarchy), but the layout approach is too backend-coupled to reuse.
- **Evidence**: `DashboardBuilder` imports from 15+ Superset-specific modules including `setEditMode`, `handleComponentDrop`, `clearDashboardHistory`, `HYDRATE_DASHBOARD`, and Superset's bespoke drag-and-drop system.

### 4. Filter State / DataMask (`superset-frontend/src/dataMask/`)

- **What it does**: Centralized filter state management. The `dataMask` reducer handles native filters, chart customizations, cross-filtering state, and filter hydration from dashboard metadata.
- **Key files**:
  - `src/dataMask/reducer.ts` — ~250 lines, Immer-based reducer handling `UPDATE_DATA_MASK`, `HYDRATE_DASHBOARD`, `HYDRATE_EXPLORE`, `SET_DATA_MASK_FOR_FILTER_CHANGES_COMPLETE`
  - `src/dataMask/actions.ts` — Action creators: `updateDataMask`, `clearDataMask`, `removeDataMask`, `setDataMaskForFilterChangesComplete`
- **Dependencies**:
  - `@superset-ui/core` — `DataMask`, `DataMaskStateWithId`, `Filter`, `FilterConfiguration`, `Filters`, `FilterState`, `ExtraFormData`, `ChartCustomization`
  - `NATIVE_FILTER_PREFIX` — Superset's native filter identification
  - `HYDRATE_DASHBOARD` — Backend-driven state initialization
  - `HYDRATE_EXPLORE` — Explore page state initialization
  - `SaveFilterChangesType` — Superset filter config modal types
  - `migrateChartCustomizationArray` — Migration utilities
- **Coupling assessment**: **Heavily coupled** — The reducer handles cross-cutting concerns: native filters, chart customizations, explore hydration, and dashboard hydration. It uses NATIVE_FILTER_PREFIX conventions and chart_customization_config format specific to Superset.
- **Classification**: **Architectural inspiration** — The `DataMask` concept (a filter state object with `extraFormData`, `filterState`, `ownState`) is a useful pattern for Supersubset's filter engine. The idea of a centralized filter state with ID-based lookup is valuable.
- **Evidence**: 
  - `getInitialDataMask(id)` returns `{ id, extraFormData: {}, filterState: {}, ownState: {} }` — clean state init pattern worth copying
  - `fillNativeFilters` merges default data masks with saved state — useful merge strategy
  - But entangled: `HYDRATE_DASHBOARD` case handles `chart_configuration`, `native_filter_configuration`, `chart_customization_config` simultaneously

### 5. Reusable UI Components (`superset-frontend/src/components/`)

- **What it does**: Shared UI component library including modals, alerts, resizable sidebar, loading states, icons, and configuration contexts.
- **Key files**:
  - `src/components/ResizableSidebar/` — resizable sidebar panel
  - `src/components/UiConfigContext/` — UI configuration provider
  - `src/components/Icons/` — icon library (via `@superset-ui/core`)
  - `src/components/Loading/` — loading spinner components
- **Dependencies**: These components often import from `@superset-ui/core` and use Superset's emotion-based theming system. Many depend on Superset-specific context providers.
- **Coupling assessment**: **Partially coupled** — Individual components are relatively standalone, but they use Superset's theme system (`theme.colorBgContainer`, `theme.sizeUnit`, `theme.motionDurationMid`) which is not standard CSS-in-JS.
- **Classification**: **Discarded** — Standard UI components are readily available from any React component library. Not worth extracting Superset-specific versions.

## Cross-Cutting Concerns

### Backend Coupling Map
| Area | Backend Dependency | Severity |
|------|-------------------|----------|
| Chart rendering | `buildQuery` → Python query API → `ChartDataResponseResult` | High |
| Dashboard load | `HYDRATE_DASHBOARD` → REST API → full state from server | High |
| Filter state | `native_filter_configuration` from dashboard metadata | High |
| Explore | Every action dispatches to `/api/v1/` endpoints | Critical |
| Plugin registration | `ChartPlugin.loadChart()` is standalone, but data comes from backend | Medium |

### State Management
- Redux throughout: actions, reducers, selectors, containers
- Immer for immutable state updates
- `dataMask` is the centralized filter state slice
- Dashboard state is hydrated from backend on load, then locally managed

### API Contract Dependencies
- `QueryContext` — Superset's query format sent to Python backend
- `ChartDataResponseResult` — Backend response format
- `DataMask` — Filter state contract tied to Superset's native filter system
- Dashboard JSON definition schema is Superset-specific and not documented as a public contract

### Authentication/Authorization Coupling
- Auth is managed by Flask-AppBuilder on the backend
- Frontend assumes authenticated API calls via session cookies
- Row-level security is handled by the Python metastore, not frontend

## License Assessment

- **License**: Apache License 2.0
- **NOTICE file**: Yes, requires attribution in derivative works
- **Attribution needed**: If any code is directly borrowed, NOTICE file contents must be included
- **Status**: Fully compatible with Supersubset (also Apache 2.0 compatible)

## Reuse Recommendations

### Architectural Inspiration (study patterns, reimplement)

1. **Chart plugin registration pattern**: `ChartPlugin` with `buildQuery`, `transformProps`, `controlPanel`, `loadChart`, `metadata`. Reimplement as Supersubset's widget registry with a cleaner interface that doesn't assume backend query context.
2. **DataMask state model**: The `{ extraFormData, filterState, ownState }` pattern for per-filter state is a clean abstraction. Reimplement without Superset's native filter prefix system.
3. **Control panel UX patterns**: Superset's explore controls (column selectors, aggregation pickers, color scheme selectors) are excellent UX references for property editors.
4. **Dashboard composition hierarchy**: Tab navigation, grid-based layout with depth tracking, filter bar positioning (horizontal/vertical). Study the UX, reimplement on Puck.

### Discarded (too entangled or not relevant)

1. **Dashboard layout engine**: Too deeply intertwined with Redux actions, backend hydration, and Superset's custom grid constants.
2. **Native filter system**: Over-engineered for Superset's specific needs (filter config modal, native filter migration, chart customizations).
3. **Explore view**: Full-product feature requiring Superset backend.
4. **UI component library**: Standard components, no advantage over existing React UI libraries.

## Risks and Caveats

1. **No extractable code donors**: Despite the large codebase, no module can be extracted without significant rewriting.
2. **ECharts integration is the most reusable pattern**: Superset's `plugin-chart-echarts` shows how to wrap ECharts with `transformProps` translating app-level config to ECharts options. This pipeline pattern (canonical config → ECharts option) is exactly what Supersubset needs.
3. **Filter state complexity**: Superset's filter system has grown organically with native filters, cross-filters, chart customizations, and legacy migration code. Supersubset should design a simpler filter state model upfront.
4. **Superset is moving toward more coupling, not less**: Recent commits show deeper integration between dashboard, filters, and chart customizations. This trend confirms that extracting Superset modules will only get harder over time.
