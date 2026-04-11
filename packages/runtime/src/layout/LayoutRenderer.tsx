/**
 * Layout renderer — walks the flat normalized layout map and renders components.
 * Starts from rootNodeId, recursively renders children.
 */
import { type CSSProperties, type ReactNode, createElement, useState } from 'react';
import type {
  LayoutMap,
  LayoutComponent,
  LayoutComponentType,
  WidgetDefinition,
  FilterDefinition,
} from '@supersubset/schema';
import { GRID_COLUMN_COUNT } from '@supersubset/schema';
import type { WidgetRegistry, WidgetProps, WidgetEvent } from '../widgets/registry';
import type { FilterValue } from '../filters/FilterEngine';

// ─── Layout Renderer Props ───────────────────────────────────

export interface LayoutRendererProps {
  layout: LayoutMap;
  rootNodeId: string;
  widgets: WidgetDefinition[];
  registry: WidgetRegistry;
  theme?: Record<string, unknown>;
  filters?: FilterDefinition[];
  activeFilterValues?: FilterValue[];
  onWidgetEvent?: (event: WidgetEvent) => void;
  className?: string;
}

// ─── Main Component ──────────────────────────────────────────

export function LayoutRenderer({
  layout,
  rootNodeId,
  widgets,
  registry,
  theme,
  filters,
  activeFilterValues,
  onWidgetEvent,
  className,
}: LayoutRendererProps) {
  const rootNode = layout[rootNodeId];
  if (!rootNode) {
    return createElement('div', { className: 'ss-layout-error' }, 'Missing root layout node');
  }

  return createElement(
    'div',
    { className: `ss-layout-root ${className ?? ''}`.trim(), 'data-ss-node': rootNodeId },
    renderChildren(rootNode.children, layout, widgets, registry, theme, filters, activeFilterValues, onWidgetEvent),
  );
}

// ─── Recursive Child Rendering ───────────────────────────────

function renderChildren(
  childIds: string[],
  layout: LayoutMap,
  widgets: WidgetDefinition[],
  registry: WidgetRegistry,
  theme: Record<string, unknown> | undefined,
  filters: FilterDefinition[] | undefined,
  activeFilterValues: FilterValue[] | undefined,
  onWidgetEvent: ((event: WidgetEvent) => void) | undefined,
): ReactNode[] {
  return childIds.map((childId) => {
    const node = layout[childId];
    if (!node) return null;
    return renderNode(node, layout, widgets, registry, theme, filters, activeFilterValues, onWidgetEvent);
  });
}

function renderNode(
  node: LayoutComponent,
  layout: LayoutMap,
  widgets: WidgetDefinition[],
  registry: WidgetRegistry,
  theme: Record<string, unknown> | undefined,
  filters: FilterDefinition[] | undefined,
  activeFilterValues: FilterValue[] | undefined,
  onWidgetEvent: ((event: WidgetEvent) => void) | undefined,
): ReactNode {
  const renderer = COMPONENT_RENDERERS[node.type];
  if (!renderer) {
    return createElement('div', { key: node.id, className: 'ss-unknown' }, `Unknown: ${node.type}`);
  }
  return renderer(node, layout, widgets, registry, theme, filters, activeFilterValues, onWidgetEvent);
}

// ─── Component Type Renderers ────────────────────────────────

type NodeRenderer = (
  node: LayoutComponent,
  layout: LayoutMap,
  widgets: WidgetDefinition[],
  registry: WidgetRegistry,
  theme: Record<string, unknown> | undefined,
  filters: FilterDefinition[] | undefined,
  activeFilterValues: FilterValue[] | undefined,
  onWidgetEvent: ((event: WidgetEvent) => void) | undefined,
) => ReactNode;

const COMPONENT_RENDERERS: Record<LayoutComponentType, NodeRenderer> = {
  root: renderGrid,
  grid: renderGrid,
  row: renderRow,
  column: renderColumn,
  widget: renderWidget,
  tabs: renderTabs,
  tab: renderTab,
  spacer: renderSpacer,
  header: renderHeader,
  divider: renderDivider,
};

function renderGrid(
  node: LayoutComponent,
  layout: LayoutMap,
  widgets: WidgetDefinition[],
  registry: WidgetRegistry,
  theme: Record<string, unknown> | undefined,
  filters: FilterDefinition[] | undefined,
  activeFilterValues: FilterValue[] | undefined,
  onWidgetEvent: ((event: WidgetEvent) => void) | undefined,
): ReactNode {
  const style: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: node.meta.gap ?? 'var(--ss-grid-gap, 16px)',
    minHeight: node.meta.minHeight,
  };
  return createElement(
    'div',
    { key: node.id, className: `ss-grid`, style, 'data-ss-node': node.id },
    renderChildren(node.children, layout, widgets, registry, theme, filters, activeFilterValues, onWidgetEvent),
  );
}

function renderRow(
  node: LayoutComponent,
  layout: LayoutMap,
  widgets: WidgetDefinition[],
  registry: WidgetRegistry,
  theme: Record<string, unknown> | undefined,
  filters: FilterDefinition[] | undefined,
  activeFilterValues: FilterValue[] | undefined,
  onWidgetEvent: ((event: WidgetEvent) => void) | undefined,
): ReactNode {
  const style: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: buildRowColumns(node.children, layout),
    gap: node.meta.gap ?? 'var(--ss-grid-gap, 16px)',
    gridColumn: node.meta.width ? `span ${node.meta.width}` : `1 / -1`,
  };
  return createElement(
    'div',
    { key: node.id, className: 'ss-row', style, 'data-ss-node': node.id },
    renderChildren(node.children, layout, widgets, registry, theme, filters, activeFilterValues, onWidgetEvent),
  );
}

/**
 * Build CSS grid-template-columns for a row based on children's width metadata.
 * Each child's width is in grid column units out of 12.
 */
function buildRowColumns(childIds: string[], layout: LayoutMap): string {
  return childIds
    .map((id) => {
      const child = layout[id];
      if (!child?.meta.width) return '1fr';
      return `${child.meta.width}fr`;
    })
    .join(' ');
}

function renderColumn(
  node: LayoutComponent,
  layout: LayoutMap,
  widgets: WidgetDefinition[],
  registry: WidgetRegistry,
  theme: Record<string, unknown> | undefined,
  filters: FilterDefinition[] | undefined,
  activeFilterValues: FilterValue[] | undefined,
  onWidgetEvent: ((event: WidgetEvent) => void) | undefined,
): ReactNode {
  const style: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: node.meta.gap ?? 'var(--ss-grid-gap, 16px)',
  };
  return createElement(
    'div',
    { key: node.id, className: 'ss-column', style, 'data-ss-node': node.id },
    renderChildren(node.children, layout, widgets, registry, theme, filters, activeFilterValues, onWidgetEvent),
  );
}

function renderWidget(
  node: LayoutComponent,
  layout: LayoutMap,
  widgets: WidgetDefinition[],
  registry: WidgetRegistry,
  theme: Record<string, unknown> | undefined,
  filters: FilterDefinition[] | undefined,
  activeFilterValues: FilterValue[] | undefined,
  onWidgetEvent: ((event: WidgetEvent) => void) | undefined,
): ReactNode {
  const widgetDef = widgets.find((w) => w.id === node.meta.widgetRef);
  if (!widgetDef) {
    return createElement(
      'div',
      { key: node.id, className: 'ss-widget ss-widget-missing', 'data-ss-node': node.id },
      `Widget not found: ${node.meta.widgetRef ?? 'no ref'}`,
    );
  }

  const Component = registry.get(widgetDef.type);
  if (!Component) {
    return createElement(
      'div',
      { key: node.id, className: 'ss-widget ss-widget-unregistered', 'data-ss-node': node.id },
      `No widget registered for type: ${widgetDef.type}`,
    );
  }

  const style: CSSProperties = {
    minHeight: node.meta.height ? `${node.meta.height}px` : undefined,
    background: node.meta.background ?? 'var(--ss-color-surface, #fff)',
    padding: 'var(--ss-widget-padding, 16px)',
    borderRadius: '8px',
    overflow: 'hidden',
  };

  // Compute active filters for this widget
  const widgetActiveFilters = computeActiveFilters(widgetDef.id, filters, activeFilterValues);

  const widgetProps: WidgetProps = {
    widgetId: widgetDef.id,
    widgetType: widgetDef.type,
    title: widgetDef.title,
    config: widgetDef.config,
    theme,
    activeFilters: widgetActiveFilters.length > 0 ? widgetActiveFilters : undefined,
    onEvent: onWidgetEvent,
  };

  return createElement(
    'div',
    { key: node.id, className: 'ss-widget', style, 'data-ss-node': node.id },
    createElement(Component, widgetProps),
  );
}

/**
 * Compute which active filter values apply to a specific widget based on scope.
 */
function computeActiveFilters(
  widgetId: string,
  filters: FilterDefinition[] | undefined,
  activeFilterValues: FilterValue[] | undefined,
): FilterValue[] {
  if (!filters || !activeFilterValues || activeFilterValues.length === 0) return [];

  const activeMap = new Map(activeFilterValues.map((fv) => [fv.filterId, fv]));
  const result: FilterValue[] = [];

  for (const filter of filters) {
    const fv = activeMap.get(filter.id);
    if (!fv) continue;

    if (filter.scope.type === 'global') {
      result.push(fv);
    } else if (filter.scope.type === 'page') {
      result.push(fv);
    } else if (filter.scope.type === 'widgets' && filter.scope.widgetIds.includes(widgetId)) {
      result.push(fv);
    }
  }

  return result;
}

function renderTabs(
  node: LayoutComponent,
  layout: LayoutMap,
  widgets: WidgetDefinition[],
  registry: WidgetRegistry,
  theme: Record<string, unknown> | undefined,
  filters: FilterDefinition[] | undefined,
  activeFilterValues: FilterValue[] | undefined,
  onWidgetEvent: ((event: WidgetEvent) => void) | undefined,
): ReactNode {
  return createElement(TabsContainer, {
    key: node.id,
    node,
    layout,
    widgets,
    registry,
    theme,
    filters,
    activeFilterValues,
    onWidgetEvent,
  });
}

/**
 * Tabs needs local state, so it's a proper component.
 */
function TabsContainer({
  node,
  layout,
  widgets,
  registry,
  theme,
  filters,
  activeFilterValues,
  onWidgetEvent,
}: {
  node: LayoutComponent;
  layout: LayoutMap;
  widgets: WidgetDefinition[];
  registry: WidgetRegistry;
  theme?: Record<string, unknown>;
  filters?: FilterDefinition[];
  activeFilterValues?: FilterValue[];
  onWidgetEvent?: (event: WidgetEvent) => void;
}) {
  const [activeTab, setActiveTab] = useState(0);

  const tabNodes = node.children
    .map((id) => layout[id])
    .filter((t): t is LayoutComponent => t != null && t.type === 'tab');

  return createElement(
    'div',
    { className: 'ss-tabs', 'data-ss-node': node.id },
    // Tab buttons
    createElement(
      'div',
      { className: 'ss-tabs-header', style: { display: 'flex', gap: '4px', borderBottom: '1px solid #e0e0e0', marginBottom: '16px' } },
      ...tabNodes.map((tab, i) =>
        createElement(
          'button',
          {
            key: tab.id,
            className: `ss-tab-button ${i === activeTab ? 'ss-tab-active' : ''}`,
            onClick: () => setActiveTab(i),
            style: {
              padding: '8px 16px',
              border: 'none',
              borderBottom: i === activeTab ? '2px solid var(--ss-color-primary, #1677ff)' : '2px solid transparent',
              background: 'transparent',
              cursor: 'pointer',
              fontWeight: i === activeTab ? 600 : 400,
            },
          },
          tab.meta.text ?? `Tab ${i + 1}`,
        ),
      ),
    ),
    // Active tab content
    tabNodes[activeTab]
      ? createElement(
          'div',
          { className: 'ss-tab-content', 'data-ss-node': tabNodes[activeTab].id },
          renderChildren(tabNodes[activeTab].children, layout, widgets, registry, theme, filters, activeFilterValues, onWidgetEvent),
        )
      : null,
  );
}

function renderTab(
  node: LayoutComponent,
  layout: LayoutMap,
  widgets: WidgetDefinition[],
  registry: WidgetRegistry,
  theme: Record<string, unknown> | undefined,
  filters: FilterDefinition[] | undefined,
  activeFilterValues: FilterValue[] | undefined,
  onWidgetEvent: ((event: WidgetEvent) => void) | undefined,
): ReactNode {
  // Tabs renders tab content directly — this is only called if a tab is rendered standalone
  return createElement(
    'div',
    { key: node.id, className: 'ss-tab', 'data-ss-node': node.id },
    renderChildren(node.children, layout, widgets, registry, theme, filters, activeFilterValues, onWidgetEvent),
  );
}

function renderSpacer(
  node: LayoutComponent,
  _layout: LayoutMap,
  _widgets: WidgetDefinition[],
  _registry: WidgetRegistry,
  _theme: Record<string, unknown> | undefined,
  _filters: FilterDefinition[] | undefined,
  _activeFilterValues: FilterValue[] | undefined,
  _onWidgetEvent: ((event: WidgetEvent) => void) | undefined,
): ReactNode {
  const style: CSSProperties = {
    height: node.meta.height ? `${node.meta.height}px` : '24px',
  };
  return createElement('div', { key: node.id, className: 'ss-spacer', style, 'data-ss-node': node.id });
}

function renderHeader(
  node: LayoutComponent,
  _layout: LayoutMap,
  _widgets: WidgetDefinition[],
  _registry: WidgetRegistry,
  _theme: Record<string, unknown> | undefined,
  _filters: FilterDefinition[] | undefined,
  _activeFilterValues: FilterValue[] | undefined,
  _onWidgetEvent: ((event: WidgetEvent) => void) | undefined,
): ReactNode {
  const sizeMap = { small: 'h3', medium: 'h2', large: 'h1' } as const;
  const tag = sizeMap[node.meta.headerSize ?? 'medium'];
  const style: CSSProperties = {
    margin: 0,
  };
  return createElement(tag, { key: node.id, className: 'ss-header', style, 'data-ss-node': node.id }, node.meta.text ?? '');
}

function renderDivider(
  node: LayoutComponent,
  _layout: LayoutMap,
  _widgets: WidgetDefinition[],
  _registry: WidgetRegistry,
  _theme: Record<string, unknown> | undefined,
  _filters: FilterDefinition[] | undefined,
  _activeFilterValues: FilterValue[] | undefined,
  _onWidgetEvent: ((event: WidgetEvent) => void) | undefined,
): ReactNode {
  const style: CSSProperties = {
    border: 'none',
    borderTop: '1px solid #e0e0e0',
    margin: '8px 0',
  };
  return createElement('hr', { key: node.id, className: 'ss-divider', style, 'data-ss-node': node.id });
}
