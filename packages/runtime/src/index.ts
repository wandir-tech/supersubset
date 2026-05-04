// @supersubset/runtime — Dashboard rendering engine

// Main renderer component
export {
  SupersubsetRenderer,
  type SupersubsetRendererProps,
} from './components/SupersubsetRenderer';

// FilterBar component
export {
  FilterBar,
  type FilterBarProps,
  DATE_PRESETS,
  resolveRelativeDate,
} from './components/FilterBar';

// DrillBreadcrumbBar component
export { DrillBreadcrumbBar } from './components/DrillBreadcrumbBar';

// Widget registry
export {
  WidgetRegistry,
  createWidgetRegistry,
  getBuiltInWidgetEntries,
  type WidgetProps,
  type WidgetEvent,
  type WidgetComponent,
} from './widgets/registry';

// Layout renderer (for advanced usage / custom shells)
export { LayoutRenderer, type LayoutRendererProps } from './layout/LayoutRenderer';

// Filter engine
export {
  FilterProvider,
  useFilters,
  type FilterProviderProps,
  type FilterContextValue,
  type FilterState,
  type FilterValue,
} from './filters/FilterEngine';

// Interaction engine
export {
  InteractionProvider,
  useInteractions,
  type InteractionProviderProps,
  type InteractionContextValue,
  type InteractionCallbacks,
  type NavigateRequest,
} from './interactions/InteractionEngine';

// Interaction handler hook
export { useInteractionHandler } from './interactions/useInteractionHandler';

// Drill manager
export {
  DrillProvider,
  useDrill,
  type DrillProviderProps,
  type DrillContextValue,
  type DrillState,
  type DrillBreadcrumb,
} from './interactions/DrillManager';

// State persistence
export {
  serializeState,
  deserializeState,
  stateToUrlParams,
  stateFromUrlParams,
  type DashboardState,
} from './state/StatePersistence';

export {
  useStatePersistence,
  type StatePersistenceOptions,
  type StatePersistenceResult,
} from './state/useStatePersistence';
