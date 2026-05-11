/**
 * Layout renderer — walks the flat normalized layout map and renders components.
 * Starts from rootNodeId, recursively renders children.
 */
import { type CSSProperties, type ReactNode, createElement, useEffect, useState } from 'react';
import type { QueryAdapter } from '@supersubset/data-model';
import {
  type LayoutMap,
  type LayoutComponent,
  type LayoutComponentType,
  type WidgetDefinition,
  type FilterDefinition,
  type DatasetDefinition,
} from '@supersubset/schema';
import type {
  WidgetComponent,
  WidgetRegistry,
  WidgetProps,
  WidgetEvent,
} from '../widgets/registry';
import { type FilterValue } from '../filters/FilterEngine';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';
import {
  buildStructuredAlertResultSignature,
  buildWidgetQuery,
  computeActiveFilters,
  mapQueryResultToState,
  mapStructuredAlertRuleResult,
  parseStructuredAlertRule,
  type QueryDataState,
} from './render-query-helpers';
import { resolveDataBindingConfig } from './widget-config';

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
  queryAdapter?: QueryAdapter;
  filters?: FilterDefinition[];
  datasets?: DatasetDefinition[];
  filterOptions?: Record<string, string[]>;
  activeFilterValues?: FilterValue[];
  onWidgetEvent?: (event: WidgetEvent) => void;
  className?: string;
}

interface RenderContext {
  layout: LayoutMap;
  activePageId?: string;
  widgets: WidgetDefinition[];
  registry: WidgetRegistry;
  theme?: Record<string, unknown>;
  queryAdapter?: QueryAdapter;
  filters?: FilterDefinition[];
  datasets?: DatasetDefinition[];
  filterOptions?: Record<string, string[]>;
  activeFilterValues?: FilterValue[];
  onWidgetEvent?: (event: WidgetEvent) => void;
  visited: Set<string>;
  depth: number;
}

function withVisitedNode(context: RenderContext, nodeId: string): RenderContext {
  const visited = new Set(context.visited);
  visited.add(nodeId);

  return {
    ...context,
    visited,
    depth: context.depth + 1,
  };
}

// ─── Main Component ──────────────────────────────────────────

export function LayoutRenderer({
  layout,
  rootNodeId,
  activePageId,
  widgets,
  registry,
  theme,
  queryAdapter,
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

  const renderContext: RenderContext = {
    layout,
    activePageId,
    widgets,
    registry,
    theme,
    queryAdapter,
    filters,
    datasets,
    filterOptions,
    activeFilterValues,
    onWidgetEvent,
    visited: new Set([rootNodeId]),
    depth: 0,
  };

  return createElement(
    'div',
    { className: `ss-layout-root ${className ?? ''}`.trim(), 'data-ss-node': rootNodeId },
    renderChildren(rootNode.children, renderContext),
  );
}

// ─── Recursive Child Rendering ───────────────────────────────

function renderChildren(childIds: string[], context: RenderContext): ReactNode[] {
  if (context.depth > MAX_LAYOUT_DEPTH) {
    return [
      createElement(
        'div',
        { key: 'depth-limit', className: 'ss-layout-error' },
        'Layout depth limit exceeded',
      ),
    ];
  }

  return childIds.map((childId) => {
    if (context.visited.has(childId)) {
      return createElement(
        'div',
        { key: childId, className: 'ss-layout-error' },
        `Circular reference: ${childId}`,
      );
    }

    const node = context.layout[childId];
    if (!node) return null;

    return renderNode(node, withVisitedNode(context, childId));
  });
}

function renderNode(node: LayoutComponent, context: RenderContext): ReactNode {
  const renderer = COMPONENT_RENDERERS[node.type];
  if (!renderer) {
    return createElement('div', { key: node.id, className: 'ss-unknown' }, `Unknown: ${node.type}`);
  }

  return renderer(node, context);
}

// ─── Component Type Renderers ────────────────────────────────

type NodeRenderer = (node: LayoutComponent, context: RenderContext) => ReactNode;

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

function renderGrid(node: LayoutComponent, context: RenderContext): ReactNode {
  const style: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: node.meta.gap ?? 'var(--ss-grid-gap, 16px)',
    minHeight: node.meta.minHeight,
  };
  return createElement(
    'div',
    { key: node.id, className: `ss-grid`, style, 'data-ss-node': node.id },
    renderChildren(node.children, context),
  );
}

function renderRow(node: LayoutComponent, context: RenderContext): ReactNode {
  const style: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: buildRowColumns(node.children, context.layout),
    gap: node.meta.gap ?? 'var(--ss-grid-gap, 16px)',
    gridColumn: node.meta.width ? `span ${node.meta.width}` : `1 / -1`,
  };
  return createElement(
    'div',
    { key: node.id, className: 'ss-row', style, 'data-ss-node': node.id },
    renderChildren(node.children, context),
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

function renderColumn(node: LayoutComponent, context: RenderContext): ReactNode {
  const style: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: node.meta.gap ?? 'var(--ss-grid-gap, 16px)',
  };
  return createElement(
    'div',
    { key: node.id, className: 'ss-column', style, 'data-ss-node': node.id },
    renderChildren(node.children, context),
  );
}

function renderWidget(node: LayoutComponent, context: RenderContext): ReactNode {
  const widgetDef = context.widgets.find((w) => w.id === node.meta.widgetRef);
  if (!widgetDef) {
    return createElement(
      'div',
      { key: node.id, className: 'ss-widget ss-widget-missing', 'data-ss-node': node.id },
      `Widget not found: ${node.meta.widgetRef ?? 'no ref'}`,
    );
  }

  const Component = context.registry.get(widgetDef.type);
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
    context.filters,
    context.activeFilterValues,
    context.activePageId,
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
    theme: context.theme,
    activeFilters: widgetActiveFilters.length > 0 ? widgetActiveFilters : undefined,
    dashboardFilters: context.filters,
    datasets: context.datasets,
    filterOptions: context.filterOptions,
    onEvent: context.onWidgetEvent,
  };

  return createElement(
    'div',
    { key: node.id, className: 'ss-widget', style, 'data-ss-node': node.id },
    createElement(
      WidgetErrorBoundary,
      { widgetId: widgetDef.id, title: widgetDef.title },
      createElement(QueryBoundWidget, {
        widgetDef,
        widgetComponent: Component,
        queryAdapter: context.queryAdapter,
        filters: context.filters,
        activeFilters: widgetActiveFilters,
        widgetProps,
      }),
    ),
  );
}

interface QueryBoundWidgetProps {
  widgetDef: WidgetDefinition;
  widgetComponent: WidgetComponent;
  queryAdapter?: QueryAdapter;
  filters?: FilterDefinition[];
  activeFilters?: FilterValue[];
  widgetProps: WidgetProps;
}

interface QueryState extends QueryDataState {
  error: Error | null;
  loading: boolean;
}

function QueryBoundWidget({
  widgetDef,
  widgetComponent,
  queryAdapter,
  filters,
  activeFilters,
  widgetProps,
}: QueryBoundWidgetProps) {
  const structuredAlertRule = parseStructuredAlertRule(widgetDef);
  const query = buildWidgetQuery(widgetDef, filters, activeFilters, structuredAlertRule);
  const querySignature = JSON.stringify(query ?? null);
  const structuredAlertResultSignature = buildStructuredAlertResultSignature(
    widgetDef,
    structuredAlertRule,
  );
  const [queryState, setQueryState] = useState<QueryState>({
    data: undefined,
    columns: undefined,
    error: null,
    loading: false,
  });

  useEffect(() => {
    if (!queryAdapter || !query) {
      setQueryState({
        data: undefined,
        columns: undefined,
        error: null,
        loading: false,
      });
      return;
    }

    let isCancelled = false;

    setQueryState({
      data: undefined,
      columns: undefined,
      error: null,
      loading: true,
    });

    void queryAdapter
      .execute(query)
      .then((result) => {
        if (isCancelled) {
          return;
        }

        const nextState = structuredAlertRule
          ? mapStructuredAlertRuleResult(widgetDef, result, structuredAlertRule)
          : mapQueryResultToState(result);

        setQueryState({
          ...nextState,
          error: null,
          loading: false,
        });
      })
      .catch((error: unknown) => {
        if (isCancelled) {
          return;
        }

        setQueryState({
          data: undefined,
          columns: undefined,
          error: error instanceof Error ? error : new Error(String(error)),
          loading: false,
        });
      });

    return () => {
      isCancelled = true;
    };
  }, [queryAdapter, querySignature, structuredAlertResultSignature]);

  return createElement(widgetComponent, {
    ...widgetProps,
    data: queryState.data,
    columns: queryState.columns,
    error: queryState.error,
    loading: queryState.loading,
  });
}

function renderTabs(node: LayoutComponent, context: RenderContext): ReactNode {
  return createElement(TabsContainer, {
    key: node.id,
    node,
    ...context,
  });
}

/**
 * Tabs needs local state, so it's a proper component.
 */
function TabsContainer({ node, ...context }: { node: LayoutComponent } & RenderContext) {
  const [activeTab, setActiveTab] = useState(0);

  const tabNodes = node.children
    .map((id) => context.layout[id])
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
          renderChildren(tabNodes[activeTab].children, context),
        )
      : null,
  );
}

function renderTab(node: LayoutComponent, context: RenderContext): ReactNode {
  // Tabs renders tab content directly — this is only called if a tab is rendered standalone
  return createElement(
    'div',
    { key: node.id, className: 'ss-tab', 'data-ss-node': node.id },
    renderChildren(node.children, context),
  );
}

function renderSpacer(node: LayoutComponent, _context: RenderContext): ReactNode {
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

function renderHeader(node: LayoutComponent, _context: RenderContext): ReactNode {
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

function renderMarkdown(node: LayoutComponent, _context: RenderContext): ReactNode {
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

function renderDivider(node: LayoutComponent, _context: RenderContext): ReactNode {
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
