/**
 * Layout renderer — walks the flat normalized layout map and renders components.
 * Starts from rootNodeId, recursively renders children.
 */
import {
  type CSSProperties,
  type ReactNode,
  createElement,
  useState,
  Component,
  type ErrorInfo,
  type PropsWithChildren,
} from 'react';
import type {
  LayoutMap,
  LayoutComponent,
  LayoutComponentType,
  WidgetDefinition,
  FilterDefinition,
  DatasetDefinition,
} from '@supersubset/schema';
import type { WidgetRegistry, WidgetProps, WidgetEvent } from '../widgets/registry';
import { filterAppliesToWidget, type FilterValue } from '../filters/FilterEngine';

// ─── Layout Renderer Props ───────────────────────────────────

/** Maximum recursion depth to prevent infinite loops from circular references */
const MAX_LAYOUT_DEPTH = 50;

export interface LayoutRendererProps {
  layout: LayoutMap;
  rootNodeId: string;
  activePageId?: string;
  widgets: WidgetDefinition[];
  registry: WidgetRegistry;
  theme?: Record<string, unknown>;
  filters?: FilterDefinition[];
  datasets?: DatasetDefinition[];
  filterOptions?: Record<string, string[]>;
  activeFilterValues?: FilterValue[];
  onWidgetEvent?: (event: WidgetEvent) => void;
  className?: string;
}

// ─── Main Component ──────────────────────────────────────────

export function LayoutRenderer({
  layout,
  rootNodeId,
  activePageId,
  widgets,
  registry,
  theme,
  filters,
  datasets,
  filterOptions,
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
    renderChildren(
      rootNode.children,
      layout,
      activePageId,
      widgets,
      registry,
      theme,
      filters,
      datasets,
      filterOptions,
      activeFilterValues,
      onWidgetEvent,
      new Set([rootNodeId]),
      0,
    ),
  );
}

// ─── Recursive Child Rendering ───────────────────────────────

function renderChildren(
  childIds: string[],
  layout: LayoutMap,
  activePageId: string | undefined,
  widgets: WidgetDefinition[],
  registry: WidgetRegistry,
  theme: Record<string, unknown> | undefined,
  filters: FilterDefinition[] | undefined,
  datasets: DatasetDefinition[] | undefined,
  filterOptions: Record<string, string[]> | undefined,
  activeFilterValues: FilterValue[] | undefined,
  onWidgetEvent: ((event: WidgetEvent) => void) | undefined,
  visited: Set<string>,
  depth: number,
): ReactNode[] {
  if (depth > MAX_LAYOUT_DEPTH) {
    return [
      createElement(
        'div',
        { key: 'depth-limit', className: 'ss-layout-error' },
        'Layout depth limit exceeded',
      ),
    ];
  }
  return childIds.map((childId) => {
    if (visited.has(childId)) {
      return createElement(
        'div',
        { key: childId, className: 'ss-layout-error' },
        `Circular reference: ${childId}`,
      );
    }
    const node = layout[childId];
    if (!node) return null;
    const nextVisited = new Set(visited);
    nextVisited.add(childId);
    return renderNode(
      node,
      layout,
      activePageId,
      widgets,
      registry,
      theme,
      filters,
      datasets,
      filterOptions,
      activeFilterValues,
      onWidgetEvent,
      nextVisited,
      depth + 1,
    );
  });
}

function renderNode(
  node: LayoutComponent,
  layout: LayoutMap,
  activePageId: string | undefined,
  widgets: WidgetDefinition[],
  registry: WidgetRegistry,
  theme: Record<string, unknown> | undefined,
  filters: FilterDefinition[] | undefined,
  datasets: DatasetDefinition[] | undefined,
  filterOptions: Record<string, string[]> | undefined,
  activeFilterValues: FilterValue[] | undefined,
  onWidgetEvent: ((event: WidgetEvent) => void) | undefined,
  visited: Set<string>,
  depth: number,
): ReactNode {
  const renderer = COMPONENT_RENDERERS[node.type];
  if (!renderer) {
    return createElement('div', { key: node.id, className: 'ss-unknown' }, `Unknown: ${node.type}`);
  }
  return renderer(
    node,
    layout,
    activePageId,
    widgets,
    registry,
    theme,
    filters,
    datasets,
    filterOptions,
    activeFilterValues,
    onWidgetEvent,
    visited,
    depth,
  );
}

// ─── Component Type Renderers ────────────────────────────────

type NodeRenderer = (
  node: LayoutComponent,
  layout: LayoutMap,
  activePageId: string | undefined,
  widgets: WidgetDefinition[],
  registry: WidgetRegistry,
  theme: Record<string, unknown> | undefined,
  filters: FilterDefinition[] | undefined,
  datasets: DatasetDefinition[] | undefined,
  filterOptions: Record<string, string[]> | undefined,
  activeFilterValues: FilterValue[] | undefined,
  onWidgetEvent: ((event: WidgetEvent) => void) | undefined,
  visited: Set<string>,
  depth: number,
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
  markdown: renderMarkdown,
  divider: renderDivider,
};

function renderGrid(
  node: LayoutComponent,
  layout: LayoutMap,
  activePageId: string | undefined,
  widgets: WidgetDefinition[],
  registry: WidgetRegistry,
  theme: Record<string, unknown> | undefined,
  filters: FilterDefinition[] | undefined,
  datasets: DatasetDefinition[] | undefined,
  filterOptions: Record<string, string[]> | undefined,
  activeFilterValues: FilterValue[] | undefined,
  onWidgetEvent: ((event: WidgetEvent) => void) | undefined,
  visited: Set<string>,
  depth: number,
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
    renderChildren(
      node.children,
      layout,
      activePageId,
      widgets,
      registry,
      theme,
      filters,
      datasets,
      filterOptions,
      activeFilterValues,
      onWidgetEvent,
      visited,
      depth,
    ),
  );
}

function renderRow(
  node: LayoutComponent,
  layout: LayoutMap,
  activePageId: string | undefined,
  widgets: WidgetDefinition[],
  registry: WidgetRegistry,
  theme: Record<string, unknown> | undefined,
  filters: FilterDefinition[] | undefined,
  datasets: DatasetDefinition[] | undefined,
  filterOptions: Record<string, string[]> | undefined,
  activeFilterValues: FilterValue[] | undefined,
  onWidgetEvent: ((event: WidgetEvent) => void) | undefined,
  visited: Set<string>,
  depth: number,
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
    renderChildren(
      node.children,
      layout,
      activePageId,
      widgets,
      registry,
      theme,
      filters,
      datasets,
      filterOptions,
      activeFilterValues,
      onWidgetEvent,
      visited,
      depth,
    ),
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
  activePageId: string | undefined,
  widgets: WidgetDefinition[],
  registry: WidgetRegistry,
  theme: Record<string, unknown> | undefined,
  filters: FilterDefinition[] | undefined,
  datasets: DatasetDefinition[] | undefined,
  filterOptions: Record<string, string[]> | undefined,
  activeFilterValues: FilterValue[] | undefined,
  onWidgetEvent: ((event: WidgetEvent) => void) | undefined,
  visited: Set<string>,
  depth: number,
): ReactNode {
  const style: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: node.meta.gap ?? 'var(--ss-grid-gap, 16px)',
  };
  return createElement(
    'div',
    { key: node.id, className: 'ss-column', style, 'data-ss-node': node.id },
    renderChildren(
      node.children,
      layout,
      activePageId,
      widgets,
      registry,
      theme,
      filters,
      datasets,
      filterOptions,
      activeFilterValues,
      onWidgetEvent,
      visited,
      depth,
    ),
  );
}

function renderWidget(
  node: LayoutComponent,
  _layout: LayoutMap,
  activePageId: string | undefined,
  widgets: WidgetDefinition[],
  registry: WidgetRegistry,
  theme: Record<string, unknown> | undefined,
  filters: FilterDefinition[] | undefined,
  datasets: DatasetDefinition[] | undefined,
  filterOptions: Record<string, string[]> | undefined,
  activeFilterValues: FilterValue[] | undefined,
  onWidgetEvent: ((event: WidgetEvent) => void) | undefined,
  _visited: Set<string>,
  _depth: number,
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
  const widgetActiveFilters = computeActiveFilters(
    widgetDef.id,
    filters,
    activeFilterValues,
    activePageId,
  );

  // Translate dataBinding field roles into config keys so widgets can
  // access field references (e.g. xField, yFields) without knowing about
  // the dataBinding abstraction.
  const mergedConfig = resolveDataBindingConfig(widgetDef);

  const widgetProps: WidgetProps = {
    widgetId: widgetDef.id,
    widgetType: widgetDef.type,
    title: widgetDef.title,
    config: mergedConfig,
    theme,
    activeFilters: widgetActiveFilters.length > 0 ? widgetActiveFilters : undefined,
    dashboardFilters: filters,
    datasets,
    filterOptions,
    onEvent: onWidgetEvent,
  };

  return createElement(
    'div',
    { key: node.id, className: 'ss-widget', style, 'data-ss-node': node.id },
    createElement(
      WidgetErrorBoundary,
      { widgetId: widgetDef.id, title: widgetDef.title },
      createElement(Component, widgetProps),
    ),
  );
}

/**
 * Compute which active filter values apply to a specific widget based on scope.
 */
function computeActiveFilters(
  widgetId: string,
  filters: FilterDefinition[] | undefined,
  activeFilterValues: FilterValue[] | undefined,
  activePageId: string | undefined,
): FilterValue[] {
  if (!filters || !activeFilterValues || activeFilterValues.length === 0) return [];

  const activeMap = new Map(activeFilterValues.map((fv) => [fv.filterId, fv]));
  const result: FilterValue[] = [];

  for (const filter of filters) {
    const fv = activeMap.get(filter.id);
    if (!fv) continue;

    if (filterAppliesToWidget(filter.scope, widgetId, activePageId)) {
      result.push(fv);
    }
  }

  return result;
}

function renderTabs(
  node: LayoutComponent,
  layout: LayoutMap,
  activePageId: string | undefined,
  widgets: WidgetDefinition[],
  registry: WidgetRegistry,
  theme: Record<string, unknown> | undefined,
  filters: FilterDefinition[] | undefined,
  datasets: DatasetDefinition[] | undefined,
  filterOptions: Record<string, string[]> | undefined,
  activeFilterValues: FilterValue[] | undefined,
  onWidgetEvent: ((event: WidgetEvent) => void) | undefined,
  visited: Set<string>,
  depth: number,
): ReactNode {
  return createElement(TabsContainer, {
    key: node.id,
    node,
    layout,
    activePageId,
    widgets,
    registry,
    theme,
    filters,
    datasets,
    filterOptions,
    activeFilterValues,
    onWidgetEvent,
    visited,
    depth,
  });
}

/**
 * Tabs needs local state, so it's a proper component.
 */
function TabsContainer({
  node,
  layout,
  activePageId,
  widgets,
  registry,
  theme,
  filters,
  datasets,
  filterOptions,
  activeFilterValues,
  onWidgetEvent,
  visited,
  depth,
}: {
  node: LayoutComponent;
  layout: LayoutMap;
  activePageId: string | undefined;
  widgets: WidgetDefinition[];
  registry: WidgetRegistry;
  theme?: Record<string, unknown>;
  filters?: FilterDefinition[];
  datasets?: DatasetDefinition[];
  filterOptions?: Record<string, string[]>;
  activeFilterValues?: FilterValue[];
  onWidgetEvent?: (event: WidgetEvent) => void;
  visited: Set<string>;
  depth: number;
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
      {
        className: 'ss-tabs-header',
        style: {
          display: 'flex',
          gap: '4px',
          borderBottom: '1px solid #e0e0e0',
          marginBottom: '16px',
        },
      },
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
              borderBottom:
                i === activeTab
                  ? '2px solid var(--ss-color-primary, #1677ff)'
                  : '2px solid transparent',
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
          renderChildren(
            tabNodes[activeTab].children,
            layout,
            activePageId,
            widgets,
            registry,
            theme,
            filters,
            datasets,
            filterOptions,
            activeFilterValues,
            onWidgetEvent,
            visited,
            depth,
          ),
        )
      : null,
  );
}

function renderTab(
  node: LayoutComponent,
  layout: LayoutMap,
  activePageId: string | undefined,
  widgets: WidgetDefinition[],
  registry: WidgetRegistry,
  theme: Record<string, unknown> | undefined,
  filters: FilterDefinition[] | undefined,
  datasets: DatasetDefinition[] | undefined,
  filterOptions: Record<string, string[]> | undefined,
  activeFilterValues: FilterValue[] | undefined,
  onWidgetEvent: ((event: WidgetEvent) => void) | undefined,
  visited: Set<string>,
  depth: number,
): ReactNode {
  // Tabs renders tab content directly — this is only called if a tab is rendered standalone
  return createElement(
    'div',
    { key: node.id, className: 'ss-tab', 'data-ss-node': node.id },
    renderChildren(
      node.children,
      layout,
      activePageId,
      widgets,
      registry,
      theme,
      filters,
      datasets,
      filterOptions,
      activeFilterValues,
      onWidgetEvent,
      visited,
      depth,
    ),
  );
}

function renderSpacer(
  node: LayoutComponent,
  _layout: LayoutMap,
  _activePageId: string | undefined,
  _widgets: WidgetDefinition[],
  _registry: WidgetRegistry,
  _theme: Record<string, unknown> | undefined,
  _filters: FilterDefinition[] | undefined,
  _datasets: DatasetDefinition[] | undefined,
  _filterOptions: Record<string, string[]> | undefined,
  _activeFilterValues: FilterValue[] | undefined,
  _onWidgetEvent: ((event: WidgetEvent) => void) | undefined,
  _visited: Set<string>,
  _depth: number,
): ReactNode {
  const style: CSSProperties = {
    height: node.meta.height ? `${node.meta.height}px` : '24px',
  };
  return createElement('div', {
    key: node.id,
    className: 'ss-spacer',
    style,
    'data-ss-node': node.id,
  });
}

function renderHeader(
  node: LayoutComponent,
  _layout: LayoutMap,
  _activePageId: string | undefined,
  _widgets: WidgetDefinition[],
  _registry: WidgetRegistry,
  _theme: Record<string, unknown> | undefined,
  _filters: FilterDefinition[] | undefined,
  _datasets: DatasetDefinition[] | undefined,
  _filterOptions: Record<string, string[]> | undefined,
  _activeFilterValues: FilterValue[] | undefined,
  _onWidgetEvent: ((event: WidgetEvent) => void) | undefined,
  _visited: Set<string>,
  _depth: number,
): ReactNode {
  const sizeMap = { small: 'h3', medium: 'h2', large: 'h1' } as const;
  const tag = sizeMap[node.meta.headerSize ?? 'medium'];
  const style: CSSProperties = {
    margin: 0,
  };
  return createElement(
    tag,
    { key: node.id, className: 'ss-header', style, 'data-ss-node': node.id },
    node.meta.text ?? '',
  );
}

function renderMarkdown(
  node: LayoutComponent,
  _layout: LayoutMap,
  _activePageId: string | undefined,
  _widgets: WidgetDefinition[],
  _registry: WidgetRegistry,
  _theme: Record<string, unknown> | undefined,
  _filters: FilterDefinition[] | undefined,
  _datasets: DatasetDefinition[] | undefined,
  _filterOptions: Record<string, string[]> | undefined,
  _activeFilterValues: FilterValue[] | undefined,
  _onWidgetEvent: ((event: WidgetEvent) => void) | undefined,
  _visited: Set<string>,
  _depth: number,
): ReactNode {
  const style: CSSProperties = {
    margin: 0,
    whiteSpace: 'pre-wrap',
    lineHeight: 1.6,
  };

  return createElement(
    'div',
    { key: node.id, className: 'ss-markdown', style, 'data-ss-node': node.id },
    node.meta.text ?? '',
  );
}

function renderDivider(
  node: LayoutComponent,
  _layout: LayoutMap,
  _activePageId: string | undefined,
  _widgets: WidgetDefinition[],
  _registry: WidgetRegistry,
  _theme: Record<string, unknown> | undefined,
  _filters: FilterDefinition[] | undefined,
  _datasets: DatasetDefinition[] | undefined,
  _filterOptions: Record<string, string[]> | undefined,
  _activeFilterValues: FilterValue[] | undefined,
  _onWidgetEvent: ((event: WidgetEvent) => void) | undefined,
  _visited: Set<string>,
  _depth: number,
): ReactNode {
  const style: CSSProperties = {
    border: 'none',
    borderTop: '1px solid #e0e0e0',
    margin: '8px 0',
  };
  return createElement('hr', {
    key: node.id,
    className: 'ss-divider',
    style,
    'data-ss-node': node.id,
  });
}

// ─── dataBinding → config translation ────────────────────────

const ROLE_TO_CONFIG_KEY: Record<string, string> = {
  'x-axis': 'xField',
  'y-axis': 'yField',
  series: 'seriesField',
  value: 'valueField',
  category: 'categoryField',
  size: 'sizeField',
  'color-group': 'colorGroupField',
  'bar-y': 'barField',
  'line-y': 'lineField',
  name: 'nameField',
  parent: 'parentField',
  source: 'sourceField',
  target: 'targetField',
  comparison: 'comparisonField',
  'alert-title': 'titleField',
  'alert-message': 'messageField',
  'alert-severity': 'severityField',
  'alert-timestamp': 'timestampField',
};

const ROLE_TO_ARRAY_CONFIG_KEY: Record<string, string> = {
  'y-axis': 'yFields',
  'bar-y': 'barFields',
  'line-y': 'lineFields',
};

function resolveDataBindingConfig(widgetDef: WidgetDefinition): Record<string, unknown> {
  const config = { ...widgetDef.config };
  if (!widgetDef.dataBinding?.fields) return config;

  const arrayCollectors: Record<string, string[]> = {};

  for (const field of widgetDef.dataBinding.fields) {
    const configKey = ROLE_TO_CONFIG_KEY[field.role];
    if (configKey && config[configKey] === undefined) {
      config[configKey] = field.fieldRef;
    }
    const arrayKey = ROLE_TO_ARRAY_CONFIG_KEY[field.role];
    if (arrayKey) {
      if (!arrayCollectors[arrayKey]) arrayCollectors[arrayKey] = [];
      arrayCollectors[arrayKey].push(field.fieldRef);
    }
  }

  for (const [key, values] of Object.entries(arrayCollectors)) {
    if (config[key] === undefined) {
      config[key] = values;
    }
  }

  // Also expose datasetRef in config for widgets that need it
  if (widgetDef.dataBinding.datasetRef && !config.datasetRef) {
    config.datasetRef = widgetDef.dataBinding.datasetRef;
  }

  return config;
}

// ─── Error Boundary ──────────────────────────────────────────

interface WidgetErrorBoundaryProps {
  widgetId: string;
  title?: string;
}

interface WidgetErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class WidgetErrorBoundary extends Component<
  PropsWithChildren<WidgetErrorBoundaryProps>,
  WidgetErrorBoundaryState
> {
  constructor(props: WidgetErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): WidgetErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`Widget "${this.props.widgetId}" crashed:`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return createElement(
        'div',
        {
          className: 'ss-widget-error',
          style: {
            padding: '16px',
            color: '#cf1322',
            background: '#fff1f0',
            border: '1px solid #ffa39e',
            borderRadius: '8px',
            fontSize: '13px',
          },
        },
        createElement('strong', null, this.props.title ?? this.props.widgetId),
        createElement(
          'div',
          { style: { marginTop: '4px' } },
          `Widget error: ${this.state.error?.message ?? 'Unknown error'}`,
        ),
      );
    }
    return this.props.children;
  }
}
