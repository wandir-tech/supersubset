/**
 * SupersubsetRenderer — the main entry point for rendering dashboards.
 * Host apps mount this component with a DashboardDefinition and widget registry.
 */
import { createElement, useMemo } from 'react';
import type { DashboardDefinition, PageDefinition } from '@supersubset/schema';
import type { WidgetRegistry, WidgetEvent } from '../widgets/registry';
import { LayoutRenderer } from '../layout/LayoutRenderer';
import { FilterProvider, useFilters, type FilterState } from '../filters/FilterEngine';
import {
  InteractionProvider,
  useInteractions,
  type InteractionCallbacks,
  type NavigateRequest,
} from '../interactions/InteractionEngine';
import { DrillProvider } from '../interactions/DrillManager';
import { DrillBreadcrumbBar } from './DrillBreadcrumbBar';

// ─── Props ───────────────────────────────────────────────────

export interface SupersubsetRendererProps {
  /** The dashboard definition to render */
  definition: DashboardDefinition;
  /** Widget registry with chart components */
  registry: WidgetRegistry;
  /** Resolved theme as plain object (from @supersubset/theme's resolveTheme) */
  theme?: Record<string, unknown>;
  /** CSS variables to apply to the container */
  cssVariables?: Record<string, string>;
  /** Which page to render (defaults to first page or defaults.activePage) */
  activePage?: string;
  /** Initial filter values */
  initialFilterValues?: Record<string, unknown>;
  /** Callback when filter state changes */
  onFilterChange?: (state: FilterState) => void;
  /** Callback for widget events (click, hover, select) */
  onWidgetEvent?: (event: WidgetEvent) => void;
  /** Callback for navigate interactions */
  onNavigate?: (request: NavigateRequest) => void;
  /** Callback for external interactions */
  onExternalAction?: (callbackKey: string, payload?: Record<string, unknown>) => void;
  /** Callback for drill interactions */
  onDrill?: (fieldRef: string, targetWidgetId?: string) => void;
  /** Callback for errors */
  onError?: (error: Error) => void;
  /** Static option values per filter ID for FilterBar dropdowns */
  filterOptions?: Record<string, string[]>;
  /** Additional CSS class on the container */
  className?: string;
  /**
   * When true (default), the renderer container is painted with the resolved
   * theme's background, text color, and font family — derived from any
   * `--ss-color-background`, `--ss-color-text`, and `--ss-font-family` entries
   * in `cssVariables`. Set to `false` if the host wants the container to stay
   * transparent and inherit those styles from its own CSS instead.
   */
  paintContainer?: boolean;
}

// ─── Component ───────────────────────────────────────────────

export function SupersubsetRenderer({
  definition,
  registry,
  theme,
  cssVariables,
  activePage,
  initialFilterValues,
  onFilterChange,
  onWidgetEvent,
  onNavigate,
  onExternalAction,
  onDrill,
  filterOptions,
  className,
  paintContainer = true,
}: SupersubsetRendererProps) {
  // All hooks must run on every render in the same order — keep them above the
  // early return for the empty-pages case below.
  const page = useMemo(() => {
    const pageId = activePage ?? definition.defaults?.activePage ?? definition.pages[0]?.id;
    return definition.pages.find((p) => p.id === pageId) ?? definition.pages[0];
  }, [definition, activePage]);

  const containerStyle = useMemo(() => {
    const style: Record<string, string> = {};
    if (cssVariables) {
      Object.assign(style, cssVariables);
      if (paintContainer) {
        if (cssVariables['--ss-color-background']) {
          style.backgroundColor = cssVariables['--ss-color-background'];
        }
        if (cssVariables['--ss-color-text']) {
          style.color = cssVariables['--ss-color-text'];
        }
        if (cssVariables['--ss-font-family']) {
          style.fontFamily = cssVariables['--ss-font-family'];
        }
      }
    }
    return style;
  }, [cssVariables, paintContainer]);

  const interactionCallbacks: InteractionCallbacks = useMemo(
    () => ({ onNavigate, onExternalAction, onDrill, onWidgetEvent }),
    [onNavigate, onExternalAction, onDrill, onWidgetEvent],
  );

  if (!page) {
    return createElement('div', { className: 'ss-renderer ss-error' }, 'No pages in dashboard');
  }

  return createElement(
    'div',
    {
      className: `ss-renderer ${className ?? ''}`.trim(),
      style: containerStyle,
      'data-ss-dashboard': definition.id,
      'data-ss-page': page.id,
    },
    createElement(FilterProvider, {
      initialValues: initialFilterValues ?? definition.defaults?.filterValues,
      filters: definition.filters,
      activePageId: page.id,
      onFilterChange,
      children: createElement(DrillProvider, {
        children: createElement(InteractionProvider, {
          interactions: definition.interactions ?? [],
          callbacks: interactionCallbacks,
          children: createElement(DashboardContent, {
            definition,
            page,
            registry,
            theme,
            filterOptions,
          }),
        }),
      }),
    }),
  );
}

// ─── Inner Component (has access to filter context) ──────────

interface DashboardContentProps {
  definition: DashboardDefinition;
  page: PageDefinition;
  registry: WidgetRegistry;
  theme?: Record<string, unknown>;
  filterOptions?: Record<string, string[]>;
}

function DashboardContent({
  definition,
  page,
  registry,
  theme,
  filterOptions,
}: DashboardContentProps) {
  const { state } = useFilters();
  const { handleWidgetEvent } = useInteractions();
  const filters = definition.filters ?? [];

  // Build active filter values list from current state
  const activeFilterValues = useMemo(
    () =>
      Object.entries(state.values).map(([filterId, value]) => ({
        filterId,
        value,
      })),
    [state.values],
  );

  return createElement(
    'div',
    { className: 'ss-dashboard-content' },
    createElement(DrillBreadcrumbBar),
    createElement(LayoutRenderer, {
      layout: page.layout,
      rootNodeId: page.rootNodeId,
      activePageId: page.id,
      widgets: page.widgets,
      registry,
      theme,
      filters,
      datasets: definition.dataModel?.datasets,
      filterOptions,
      activeFilterValues,
      onWidgetEvent: handleWidgetEvent,
    }),
  );
}
