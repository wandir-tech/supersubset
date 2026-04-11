# ADR-006: Multi-Dashboard Navigation, Alerts Widget, and Reusable Filter Rule Editor

## Status

Accepted

## Date

2026-04-10

## Context

Supersubset currently renders a single `DashboardDefinition` at a time via `SupersubsetRenderer`. That works for embedded, standalone dashboards, but it still leaves open questions around how navigation contracts should evolve before the first public release.

Three adjacent gaps need coordinated decisions, but they do not all need to ship in the same slice:

1. **Cross-dashboard click navigation**
   - Current interactions support cross-filtering, page navigation inside one dashboard, external callbacks, and drill state.
  - There is no first-class runtime model for rendering or navigating among multiple dashboard definitions.
  - The navigation contract was page-only, which would force a second breaking change later if dashboard targets are added.

2. **Alert/status tiles**
  - There is no existing component that renders theme-aware alert/status tiles from dashboard data.
  - KPI cards are the closest current widget, but they do not support multiple alert rows, severity styling, or alert-specific layout modes.

3. **Reusable filter-rule editing**
   - The current `FilterBuilderPanel` is useful, but it is tightly shaped around dashboard filter definitions.
  - Navigation filter mapping and future conditional UI will likely need the same dataset/field/operator/value editing primitives without dashboard filter scope semantics.

These requirements are related, but only alerts and the theme contract need to land immediately:

- Cross-dashboard navigation needs a forward-compatible target shape.
- Alert styling needs semantic theming.
- The runtime needs a multi-dashboard host contract while keeping a clean boundary between a dashboard document and the pages inside it.

### Page vs dashboard

A page is an alternate canvas inside a single dashboard document.

Pages share the surrounding dashboard contract:

- the same `dashboard.id`
- the same filter definitions and scope model
- the same interaction set
- the same theme/defaults/persistence envelope

Use multiple pages when the user is still inside one analytical workbook and simply needs another view of the same document.

A separate dashboard is a different document.

Separate dashboards may intentionally differ in:

- route or deep link
- title and descriptive framing
- saved layout and defaults
- filter contract
- ownership, permissions, or lifecycle

Use dashboard-to-dashboard navigation when the user is leaving one analytical surface and entering another, not just switching canvases.

## Decision

### 1. Keep `DashboardDefinition` as the atomic document; do not ship a multi-dashboard runtime bundle yet

Do **not** replace the canonical dashboard document with a bare array.

Instead:

- Keep `DashboardDefinition` as the schema-first unit of authoring, persistence, import/export, and validation.
- Keep `SupersubsetRenderer` as the single-dashboard runtime primitive.
- Broaden the navigation API now so it can later address either a page or a dashboard target.
- Defer a higher-level runtime bundle abstraction until there is a real host routing requirement to satisfy.

Illustrative future host contract:

```ts
interface DashboardRuntimeBundle {
  dashboards: DashboardDefinition[];
  initialDashboardId?: string;
}
```

This keeps the document boundary explicit: `DashboardDefinition` is the thing a host persists, versions, deep-links, and hands to the renderer, while pages remain an internal navigation concern inside that document.

#### Requirement: every dashboard, including the first, must have an ID

The first dashboard may still be treated as the initial or “prime” dashboard, but it must still carry an ID.

Reason:

- target selection cannot depend on array position alone
- URLs, persistence, caching, analytics, and tests all need stable identifiers
- a first dashboard without an ID makes backward/forward navigation brittle

The bundle determines the initial dashboard using:

1. `initialDashboardId`, if provided
2. otherwise, `dashboards[0]`

An array of length 1 remains valid and simply means no cross-dashboard navigation is configured.

### 2. Treat field-level navigation as a designer affordance, not the canonical interaction model

The user’s intuition is right about the designer UX: authors should be able to configure navigation from the field they are plotting.

However, the canonical contract should **not** put all navigation semantics directly onto `FieldBinding`.

Reason:

- a click often represents more than one plotted field
- stacked/segmented charts may emit multiple dimensions in one event payload
- tables, KPI cards, and future widgets also need navigation
- navigation already belongs conceptually to the interaction engine

Decision:

- Keep future dashboard navigation in the interaction system.
- Keep the current designer authoring flow page-focused for now.
- Add no dashboard-target authoring UI until the runtime bundle/host-routing slice is actually scheduled.
- Preserve room for a field-level shortcut UI later, compiling into interaction metadata rather than field-binding metadata.

#### Navigation model

Broaden `navigate` interactions now to use a structured target object.

Illustrative shape:

```ts
type NavigateTarget =
  | { kind: 'page'; pageId: string }
  | {
      kind: 'dashboard';
      dashboardId: string;
      filterMapping?: NavigationFilterMapping[];
      onMappingFailure?: 'error' | 'warn' | 'ignore';
    };

type InteractionAction =
  | { type: 'filter'; targetWidgetIds?: string[]; fieldRef: string }
  | { type: 'navigate'; target: NavigateTarget }
  | { type: 'external'; callbackKey: string; payload?: Record<string, unknown> }
  | { type: 'drill'; fieldRef: string; targetWidgetId?: string };

interface NavigationFilterMapping {
  sourceFieldRef: string;
  sourceDatasetRef?: string;
  targetFilterId?: string;
  targetFieldRef?: string;
  targetDatasetRef?: string;
  transform?: 'identity';
}
```

Notes:

- Page targets are the only authored target kind in the current designer UI.
- Dashboard targets are valid schema/API values but are not yet executed by bundled host tooling.
- Filter mapping metadata belongs to dashboard targets only.

### 3. Reserve both auto-mapping and explicit filter mapping for future dashboard targets

Auto-mapping is useful, but it is not enough on its own.

#### Auto-mapping rules

When a widget click triggers dashboard navigation and no explicit mapping is defined:

1. inspect the widget event payload
2. try to match payload keys to target dashboard filter definitions by exact `fieldRef`
3. if exactly one match exists for each candidate field, pass those values into the target dashboard as initial filter state

#### Failure modes

If the runtime cannot determine a unique target mapping:

- default behavior: block navigation and surface an error callback to the host
- optional behavior: warn and continue without mapped filters

This addresses the user’s “customer to supplier” example: navigation should not silently guess when there is no overlap.

#### Qualifiers

Qualifiers are required for reliability in real models where generic field names such as `id`, `date`, or `name` exist in multiple datasets.

Therefore the model supports optional qualifiers:

- `sourceDatasetRef`
- `targetDatasetRef`
- `targetFilterId`

The designer should default to auto-mapping but expose an advanced mapping editor when needed.

### 4. Introduce an Alerts widget as a first-class widget, not an ECharts chart

There is no equivalent component in the current library.

The new “Alerts” type should be modeled as a widget that renders one or more status tiles from bound rows.

It is **not** an ECharts visualization and should not force an ECharts implementation.

#### Placement

Alerts should participate in normal layout like any other widget.

Do **not** make “top” or “bottom” a dashboard-global placement concept in the widget itself. Authors can already place the widget at the top or bottom of the page through the layout tree.

Optional widget-level layout modes are still useful:

- `inline`
- `wrap`
- `stack`

#### Proposed config

```ts
interface AlertsWidgetConfig {
  datasetRef: string;
  titleField: string;
  messageField: string;
  severityField?: string;
  timestampField?: string;
  layout?: 'inline' | 'wrap' | 'stack';
  maxItems?: number;
  emptyState?: 'hide' | 'placeholder';
  showTimestamp?: boolean;
  defaultSeverity?: 'info' | 'success' | 'warning' | 'danger';
}
```

#### Evaluation model

Alerts v1 are data-driven rather than rule-builder-driven.

Recommended v1 semantics:

- the widget receives query result rows like any other data-driven widget
- each row is treated as an alert tile candidate
- title/message/severity/timestamp fields are selected from the widget config
- the widget can render a capped subset of rows via `maxItems`

This ships a useful alerts surface now while leaving richer rule authoring as a later enhancement.

Rule-based alert authoring, reusable predicate editors, and richer content composition remain follow-up work.

### 5. Add semantic theme tokens for alerts and future status UI

Current theme colors are too thin for alert/status use cases.

Current built-ins are essentially:

- `primary`
- `secondary`
- `background`
- `surface`
- `text`
- `chartPalette`

Decision:

- extend the theme contract with semantic status colors

Illustrative additions:

```ts
interface ThemeColors {
  primary?: string;
  secondary?: string;
  background?: string;
  surface?: string;
  text?: string;
  chartPalette?: string[];
  success?: string;
  warning?: string;
  danger?: string;
  info?: string;
  border?: string;
}

type ColorReference =
  | { type: 'literal'; value: string }
  | {
      type: 'theme-token';
      token:
        | 'primary'
        | 'secondary'
        | 'background'
        | 'surface'
        | 'text'
        | 'success'
        | 'warning'
        | 'danger'
        | 'info'
        | 'border';
    };
```

This enables:

- hard-coded colors where needed
- theme-aware colors for warnings, info bars, success states, and future status widgets

### 6. Defer reusable filter-rule editor extraction until it is needed by a scheduled feature

The repo already has a reusable runtime filter control renderer (`FilterBar`) and a reusable designer-side dashboard filter builder (`FilterBuilderPanel`).

What is missing is a lower-level reusable predicate editor.

Decision:

- keep `FilterBuilderPanel` as-is for the current slice
- track reusable predicate editing as explicit follow-up work for future dashboard-target mapping or rule-based alerts

Illustrative decomposition:

```ts
FilterConditionEditor      // one dataset/field/operator/value rule
FilterConditionGroupEditor // AND/OR list of rules
FilterScopeEditor          // dashboard filter scoping only
FilterBuilderPanel         // composes condition editor + scope editor
AlertRuleEditor            // composes condition editor + rich text + color refs
NavigationMappingEditor    // composes condition/mapping primitives for advanced nav setup
```

`FilterBuilderPanel` stays in the public designer API, and decomposition work is deferred until a concrete consumer needs it.

## Consequences

### Positive

- keeps page navigation and dashboard navigation as distinct concepts instead of conflating them
- preserves a clean document boundary for persistence, links, ownership, and validation
- broadens the navigation API once now instead of again later when dashboard targets arrive
- keeps future dashboard navigation inside the interaction engine instead of inventing a second navigation system
- ships a useful alerts widget without waiting for a full rule editor subsystem
- gives theming a semantic contract that can be reused beyond alerts

### Negative

- the API now exposes dashboard targets before bundled runtime support exists for them
- future filter auto-mapping still needs careful failure handling to avoid incorrect silent navigation
- alerts require a new widget config shape, renderer, designer config UI, and test fixtures
- rule-editor reuse is still deferred and will need a later design pass

### Neutral

- `SupersubsetRenderer` remains the low-level primitive; multi-dashboard orchestration stays opt-in and deferred
- authors can continue to use a single dashboard definition with no navigation changes

## Alternatives Considered

| Alternative | Pros | Cons | Why Rejected |
|------------|------|------|-------------|
| Use a raw `DashboardDefinition[]` everywhere as the canonical contract | Very simple runtime seed model | No bundle metadata, weak identity semantics, positional coupling | Good as a host shorthand, not as the long-term schema contract |
| Store navigation directly on `FieldBinding` | Matches the desired designer affordance | Too chart-specific, duplicates the interaction model, breaks on multi-field click payloads | Keep as UI sugar only |
| Auto-map filters only, no explicit qualifiers | Minimal configuration | Unsafe for real schemas with duplicate field names or mismatched models | Explicit mapping is required as an escape hatch |
| Implement Alerts as an ECharts widget | Reuses existing package | Alerts are not chart grammar; rich text and semantic tile layout are awkward in ECharts | Better as a first-class widget |
| Keep hard-coded alert colors only | Fastest implementation | Breaks host theming and semantic consistency | Need semantic theme tokens now |

## References

- [ADR-001: Editor Shell — Puck](./001-editor-shell.md)
- [ADR-005: Designer Information Architecture & Navigation Redesign](./005-designer-ia-navigation.md)
- [Interaction engine](../../packages/runtime/src/interactions/InteractionEngine.tsx)
- [Filter builder panel](../../packages/designer/src/components/FilterBuilderPanel.tsx)
- [Theme package](../../packages/theme/src/index.ts)