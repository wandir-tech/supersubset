# Runtime API

`@supersubset/runtime` renders a `DashboardDefinition` with host-owned widget registration, theme input, filter state, and interaction callbacks.

## Main Exports

- `SupersubsetRenderer`
- `FilterBar`, `DATE_PRESETS`, `resolveRelativeDate()`
- `DrillBreadcrumbBar`
- `WidgetRegistry`, `createWidgetRegistry()`
- `LayoutRenderer`
- `FilterProvider`, `useFilters()`
- `InteractionProvider`, `useInteractions()`, `useInteractionHandler()`
- `DrillProvider`, `useDrill()`
- `serializeState()`, `deserializeState()`, `stateToUrlParams()`, `stateFromUrlParams()`
- `useStatePersistence()`

## SupersubsetRenderer

`SupersubsetRenderer` is the default embedding surface.

```tsx
<SupersubsetRenderer
  definition={definition}
  registry={registry}
  theme={theme}
  cssVariables={themeToCssVariables(theme)}
  activePage={activePageId}
  filterOptions={filterOptions}
  onFilterChange={setFilterState}
  onNavigate={handleNavigate}
/>
```

Important props:

- `definition`: the canonical dashboard document to render
- `registry`: a `WidgetRegistry` containing the widget types used by the document
- `theme`: resolved theme object, usually from `resolveTheme()`
- `cssVariables`: CSS custom properties from `themeToCssVariables()`
- `activePage`: optional page override; falls back to dashboard defaults or the first page
- `initialFilterValues`: initial filter state seeded by the host
- `onFilterChange`: host callback for filter state changes
- `onWidgetEvent`: low-level click, hover, and select events emitted by widgets
- `onNavigate`: structured navigation callback receiving `{ target, filterState }`
- `onExternalAction`: host callback for external interaction actions
- `onDrill`: host callback for drill actions
- `onError`: runtime error boundary callback
- `filterOptions`: legacy static fallback option lists for select filter controls when authored filters do not already declare static options

## Widget Registry

The runtime never hard-codes widget implementations. Hosts register them.

```ts
import { createWidgetRegistry } from '@supersubset/runtime';
import { registerAllCharts } from '@supersubset/charts-echarts';

const registry = createWidgetRegistry();
registerAllCharts(registry);
```

`WidgetRegistry` methods:

- `register(type, component)`
- `get(type)`
- `has(type)`
- `getRegisteredTypes()`
- `unregister(type)`

## Widget Component Contract

Every registered widget receives `WidgetProps`:

- `widgetId`, `widgetType`, `title`, `config`
- `data`, `columns`
- `theme`
- `width`, `height`
- `loading`, `error`
- `activeFilters`
- `onEvent`

This contract is what lets hosts wrap or replace bundled widgets while keeping the renderer generic.

## Filters And Interactions

Use the provider and hook exports only if you are building custom shells around lower-level runtime pieces. Most hosts can stay on `SupersubsetRenderer`.

- `FilterProvider` and `useFilters()` manage active filter state
- `InteractionProvider` and `useInteractions()` execute click, hover, and select interactions
- `NavigateRequest` carries `target` plus the current `filterState`
- `DrillProvider` and `useDrill()` manage drill breadcrumbs and active drill state

Current limitation:

- Authored select filters can now declare static options in the dashboard schema. Field-backed dynamic option resolution is defined at the query-contract layer, but the runtime does not yet consume that capability directly; hosts still need a fallback strategy for that case.

## State Persistence Helpers

Runtime state persistence stays host-owned. The runtime only ships helpers:

- `serializeState()` and `deserializeState()` for JSON persistence
- `stateToUrlParams()` and `stateFromUrlParams()` for query-string sync
- `useStatePersistence()` for `localStorage`, `sessionStorage`, `url`, or `none`

Use them when you want shared filter state or page selection to survive refreshes without coupling persistence policy to the renderer itself.

## Related Docs

- [schema.md](./schema.md)
- [theme-and-widgets.md](./theme-and-widgets.md)
- [Getting Started](../getting-started.md)
