/**
 * Layout renderer — walks the flat normalized layout map and renders components.
 * Starts from rootNodeId, recursively renders children.
 */
import {
  type CSSProperties,
  type ReactNode,
  createElement,
  useEffect,
  useState,
  Component,
  type ErrorInfo,
  type PropsWithChildren,
} from 'react';
import type {
  AggregationType,
  LogicalQuery,
  QueryAdapter,
  QueryFilterOperator,
  QueryResult,
} from '@supersubset/data-model';
import {
  structuredAlertRuleSchema,
  type LayoutMap,
  type LayoutComponent,
  type LayoutComponentType,
  type StructuredAlertRuleDefinition,
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
  queryAdapter?: QueryAdapter;
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
      queryAdapter,
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
  queryAdapter: QueryAdapter | undefined,
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
      queryAdapter,
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
  queryAdapter: QueryAdapter | undefined,
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
    queryAdapter,
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
  queryAdapter: QueryAdapter | undefined,
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
  queryAdapter: QueryAdapter | undefined,
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
      queryAdapter,
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
  queryAdapter: QueryAdapter | undefined,
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
      queryAdapter,
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
  queryAdapter: QueryAdapter | undefined,
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
      queryAdapter,
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
  queryAdapter: QueryAdapter | undefined,
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
      createElement(QueryBoundWidget, {
        widgetDef,
        widgetComponent: Component,
        queryAdapter,
        filters,
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

interface QueryState {
  data?: Record<string, unknown>[];
  columns?: WidgetProps['columns'];
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

const DIRECT_QUERY_OPERATORS = new Set<QueryFilterOperator>([
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'not_in',
  'like',
  'not_like',
  'is_null',
  'is_not_null',
  'between',
]);

const VALID_AGGREGATIONS = new Set<AggregationType>([
  'sum',
  'avg',
  'count',
  'count_distinct',
  'min',
  'max',
  'none',
]);

const CROSS_FILTER_PREFIX = 'cross-filter:';

function buildWidgetQuery(
  widgetDef: WidgetDefinition,
  filters: FilterDefinition[] | undefined,
  activeFilters: FilterValue[] | undefined,
  structuredAlertRule?: StructuredAlertRuleDefinition | null,
): LogicalQuery | null {
  if (structuredAlertRule) {
    const datasetId = resolveStructuredAlertDatasetId(widgetDef, structuredAlertRule);
    if (!datasetId) {
      return null;
    }

    const compiledFilters = compileActiveFiltersForQuery(datasetId, filters, activeFilters);

    return {
      datasetId,
      fields: [
        {
          fieldId: structuredAlertRule.metricFieldRef,
          aggregation: structuredAlertRule.aggregation,
        },
      ],
      ...(compiledFilters.length > 0 ? { filters: compiledFilters } : {}),
    };
  }

  const dataBinding = widgetDef.dataBinding;
  if (!dataBinding?.datasetRef || !dataBinding.fields || dataBinding.fields.length === 0) {
    return null;
  }

  const fields = dataBinding.fields.map((field) => {
    const queryField: LogicalQuery['fields'][number] = {
      fieldId: field.fieldRef,
    };

    const aggregation = normalizeAggregation(field.aggregation);
    if (aggregation) {
      queryField.aggregation = aggregation;
    }

    return queryField;
  });

  const compiledFilters = compileActiveFiltersForQuery(
    dataBinding.datasetRef,
    filters,
    activeFilters,
  );

  return {
    datasetId: dataBinding.datasetRef,
    fields,
    ...(compiledFilters.length > 0 ? { filters: compiledFilters } : {}),
  };
}

function parseStructuredAlertRule(
  widgetDef: WidgetDefinition,
): StructuredAlertRuleDefinition | null {
  const parsed = structuredAlertRuleSchema.safeParse(widgetDef.config.alertRule);
  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

function buildStructuredAlertResultSignature(
  widgetDef: WidgetDefinition,
  structuredAlertRule: StructuredAlertRuleDefinition | null,
): string {
  if (!structuredAlertRule) {
    return 'unbound';
  }

  const { titleField, messageField, severityField } = resolveStructuredAlertFieldNames(widgetDef);

  return JSON.stringify({
    structuredAlertRule,
    titleField,
    messageField,
    severityField,
  });
}

function resolveStructuredAlertFieldNames(widgetDef: WidgetDefinition): {
  titleField: string;
  messageField: string;
  severityField: string;
} {
  const mergedConfig = resolveDataBindingConfig(widgetDef);

  return {
    titleField:
      typeof mergedConfig.titleField === 'string' ? mergedConfig.titleField : 'alert_title',
    messageField:
      typeof mergedConfig.messageField === 'string' ? mergedConfig.messageField : 'alert_message',
    severityField:
      typeof mergedConfig.severityField === 'string' ? mergedConfig.severityField : 'severity',
  };
}

function resolveStructuredAlertDatasetId(
  widgetDef: WidgetDefinition,
  structuredAlertRule: StructuredAlertRuleDefinition,
): string | undefined {
  if (structuredAlertRule.datasetRef) {
    return structuredAlertRule.datasetRef;
  }

  if (widgetDef.dataBinding?.datasetRef) {
    return widgetDef.dataBinding.datasetRef;
  }

  return typeof widgetDef.config.datasetRef === 'string' ? widgetDef.config.datasetRef : undefined;
}

function mapQueryResultToState(result: QueryResult): Pick<QueryState, 'data' | 'columns'> {
  return {
    data: result.rows,
    columns: result.columns.map((column) => ({
      fieldId: column.fieldId,
      label: column.label,
      dataType: column.dataType,
    })),
  };
}

function mapStructuredAlertRuleResult(
  widgetDef: WidgetDefinition,
  result: QueryResult,
  structuredAlertRule: StructuredAlertRuleDefinition,
): Pick<QueryState, 'data' | 'columns'> {
  const { titleField, messageField, severityField } = resolveStructuredAlertFieldNames(widgetDef);

  const columns: NonNullable<WidgetProps['columns']> = [
    { fieldId: titleField, label: 'Alert Title', dataType: 'string' },
    { fieldId: messageField, label: 'Alert Message', dataType: 'string' },
    { fieldId: severityField, label: 'Severity', dataType: 'string' },
  ];

  const metricValue = resolveStructuredAlertMetricValue(result, structuredAlertRule.metricFieldRef);
  if (!matchesStructuredAlertRule(metricValue, structuredAlertRule)) {
    return { data: [], columns };
  }

  return {
    data: [
      {
        [titleField]: structuredAlertRule.alert.title,
        [messageField]: structuredAlertRule.alert.message,
        [severityField]: structuredAlertRule.alert.severity ?? 'info',
        metric_value: metricValue,
      },
    ],
    columns,
  };
}

function resolveStructuredAlertMetricValue(
  result: QueryResult,
  metricFieldRef: string,
): number | null {
  const firstRow = result.rows[0];
  if (!firstRow) {
    return null;
  }

  const firstColumnFieldId = result.columns[0]?.fieldId;
  const candidateKeys = [metricFieldRef, firstColumnFieldId].filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );

  for (const key of candidateKeys) {
    const value = normalizeNumericValue(firstRow[key]);
    if (value != null) {
      return value;
    }
  }

  return normalizeNumericValue(Object.values(firstRow)[0]);
}

function matchesStructuredAlertRule(
  metricValue: number | null,
  structuredAlertRule: StructuredAlertRuleDefinition,
): boolean {
  if (metricValue == null) {
    return false;
  }

  switch (structuredAlertRule.operator) {
    case 'eq':
      return metricValue === structuredAlertRule.threshold;
    case 'neq':
      return metricValue !== structuredAlertRule.threshold;
    case 'gt':
      return metricValue > structuredAlertRule.threshold;
    case 'gte':
      return metricValue >= structuredAlertRule.threshold;
    case 'lt':
      return metricValue < structuredAlertRule.threshold;
    case 'lte':
      return metricValue <= structuredAlertRule.threshold;
  }
}

function normalizeNumericValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function compileActiveFiltersForQuery(
  datasetId: string,
  filters: FilterDefinition[] | undefined,
  activeFilters: FilterValue[] | undefined,
): NonNullable<LogicalQuery['filters']> {
  if (!activeFilters || activeFilters.length === 0) {
    return [];
  }

  const filterDefinitions = new Map((filters ?? []).map((filter) => [filter.id, filter]));

  return activeFilters.flatMap((activeFilter) => {
    const definition = filterDefinitions.get(activeFilter.filterId);
    if (definition) {
      if (definition.datasetRef !== datasetId) {
        return [];
      }

      const compiledFilter = compileFilterValue(definition, activeFilter.value);
      return compiledFilter ? [compiledFilter] : [];
    }

    const crossFilter = parseCrossFilterId(activeFilter.filterId);
    if (!crossFilter) {
      return [];
    }

    const compiledFilter = compileCrossFilterValue(crossFilter.fieldRef, activeFilter.value);
    return compiledFilter ? [compiledFilter] : [];
  });
}

function compileFilterValue(
  definition: FilterDefinition,
  value: unknown,
): NonNullable<LogicalQuery['filters']>[number] | null {
  if (value == null) {
    return null;
  }

  if (Array.isArray(value)) {
    const values = value.filter((entry) => entry != null && entry !== '');
    if (values.length === 0) {
      return null;
    }

    return {
      fieldId: definition.fieldRef,
      operator: definition.operator === 'not_in' ? 'not_in' : 'in',
      value: values,
    };
  }

  if (isBetweenValue(value)) {
    const lower = value.start ?? value.min;
    const upper = value.end ?? value.max;

    if (lower == null && upper == null) {
      return null;
    }

    return {
      fieldId: definition.fieldRef,
      operator: 'between',
      value: [lower, upper],
    };
  }

  if (typeof value === 'string' && value.length === 0) {
    return null;
  }

  const operator = normalizeFilterOperator(definition.operator);
  if (!operator) {
    return null;
  }

  return {
    fieldId: definition.fieldRef,
    operator,
    value,
  };
}

function compileCrossFilterValue(
  fieldRef: string,
  value: unknown,
): NonNullable<LogicalQuery['filters']>[number] | null {
  if (value == null) {
    return null;
  }

  if (Array.isArray(value)) {
    const values = value.filter((entry) => entry != null && entry !== '');
    if (values.length === 0) {
      return null;
    }

    return {
      fieldId: fieldRef,
      operator: 'in',
      value: values,
    };
  }

  if (isBetweenValue(value)) {
    const lower = value.start ?? value.min;
    const upper = value.end ?? value.max;

    if (lower == null && upper == null) {
      return null;
    }

    return {
      fieldId: fieldRef,
      operator: 'between',
      value: [lower, upper],
    };
  }

  if (typeof value === 'string' && value.length === 0) {
    return null;
  }

  return {
    fieldId: fieldRef,
    operator: 'eq',
    value,
  };
}

function normalizeFilterOperator(operator: string): QueryFilterOperator | null {
  if (DIRECT_QUERY_OPERATORS.has(operator as QueryFilterOperator)) {
    return operator as QueryFilterOperator;
  }

  switch (operator) {
    case 'equals':
      return 'eq';
    case 'contains':
      return 'like';
    default:
      return null;
  }
}

function normalizeAggregation(value: string | undefined): AggregationType | undefined {
  if (!value || !VALID_AGGREGATIONS.has(value as AggregationType) || value === 'none') {
    return undefined;
  }

  return value as AggregationType;
}

function isBetweenValue(
  value: unknown,
): value is { start?: string; end?: string; min?: number; max?: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    ('start' in value || 'end' in value || 'min' in value || 'max' in value)
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
  if (!activeFilterValues || activeFilterValues.length === 0) return [];

  const result: FilterValue[] = [];
  const seenFilterIds = new Set<string>();

  if (filters && filters.length > 0) {
    const activeMap = new Map(activeFilterValues.map((fv) => [fv.filterId, fv]));

    for (const filter of filters) {
      const fv = activeMap.get(filter.id);
      if (!fv) continue;

      if (filterAppliesToWidget(filter.scope, widgetId, activePageId)) {
        result.push(fv);
        seenFilterIds.add(fv.filterId);
      }
    }
  }

  for (const activeFilter of activeFilterValues) {
    if (seenFilterIds.has(activeFilter.filterId)) {
      continue;
    }

    if (parseCrossFilterId(activeFilter.filterId)) {
      result.push(activeFilter);
    }
  }

  return result;
}

function parseCrossFilterId(filterId: string): { sourceWidgetId: string; fieldRef: string } | null {
  if (!filterId.startsWith(CROSS_FILTER_PREFIX)) {
    return null;
  }

  const remainder = filterId.slice(CROSS_FILTER_PREFIX.length);
  const separatorIndex = remainder.lastIndexOf(':');
  if (separatorIndex <= 0 || separatorIndex === remainder.length - 1) {
    return null;
  }

  return {
    sourceWidgetId: remainder.slice(0, separatorIndex),
    fieldRef: remainder.slice(separatorIndex + 1),
  };
}

function renderTabs(
  node: LayoutComponent,
  layout: LayoutMap,
  activePageId: string | undefined,
  widgets: WidgetDefinition[],
  registry: WidgetRegistry,
  theme: Record<string, unknown> | undefined,
  queryAdapter: QueryAdapter | undefined,
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
    queryAdapter,
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
  queryAdapter,
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
  queryAdapter?: QueryAdapter;
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
            queryAdapter,
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
  queryAdapter: QueryAdapter | undefined,
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
      queryAdapter,
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
  _queryAdapter: QueryAdapter | undefined,
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
  _queryAdapter: QueryAdapter | undefined,
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
  _queryAdapter: QueryAdapter | undefined,
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
  _queryAdapter: QueryAdapter | undefined,
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
