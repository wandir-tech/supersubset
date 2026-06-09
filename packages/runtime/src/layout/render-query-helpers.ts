import type { AggregationType, LogicalQuery, QueryResult } from '@supersubset/data-model';
import {
  structuredAlertRuleSchema,
  type FilterDefinition,
  type StructuredAlertRuleDefinition,
  type WidgetDefinition,
} from '@supersubset/schema';
import type { WidgetProps } from '../widgets/registry';
import { filterAppliesToWidget, type FilterValue } from '../filters/FilterEngine';
import { compileFilterDefinitionValue } from '../filters/date-filter-utils';
import { resolveDataBindingConfig } from './widget-config';

export interface QueryDataState {
  data?: Record<string, unknown>[];
  columns?: WidgetProps['columns'];
}

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

export function buildWidgetQuery(
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

  const configQuery = readConfigLogicalQuery(widgetDef);
  if (configQuery) {
    return mergeActiveFiltersIntoQuery(configQuery, filters, activeFilters);
  }

  const dataBinding = widgetDef.dataBinding;
  if (!dataBinding?.datasetRef || !dataBinding.fields || dataBinding.fields.length === 0) {
    return null;
  }

  const mergedConfig = resolveDataBindingConfig(widgetDef);
  const fields = buildQueryFieldsFromDataBinding(dataBinding.fields, mergedConfig);

  if (fields.length === 0) {
    return null;
  }

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

/** Host-embedded dashboards (e.g. Tripmatch) often store the executable query on config. */
function readConfigLogicalQuery(widgetDef: WidgetDefinition): LogicalQuery | null {
  const raw = widgetDef.config?.logicalQuery;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const record = raw as Record<string, unknown>;
  if (typeof record.datasetId !== 'string' || record.datasetId.length === 0) {
    return null;
  }

  if (!Array.isArray(record.fields) || record.fields.length === 0) {
    return null;
  }

  const fields: LogicalQuery['fields'] = [];
  for (const entry of record.fields) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      continue;
    }
    const field = entry as Record<string, unknown>;
    if (typeof field.fieldId !== 'string' || field.fieldId.length === 0) {
      continue;
    }

    const queryField: LogicalQuery['fields'][number] = {
      fieldId: field.fieldId,
    };
    const aggregation = normalizeAggregation(
      typeof field.aggregation === 'string' ? field.aggregation : undefined,
    );
    if (aggregation) {
      queryField.aggregation = aggregation;
    }
    if (typeof field.alias === 'string' && field.alias.length > 0) {
      queryField.alias = field.alias;
    }
    fields.push(queryField);
  }

  if (fields.length === 0) {
    return null;
  }

  const query: LogicalQuery = {
    datasetId: record.datasetId,
    fields,
  };

  if (Array.isArray(record.filters)) {
    const parsedFilters = parseQueryFilters(record.filters);
    if (parsedFilters.length > 0) {
      query.filters = parsedFilters;
    }
  }

  if (Array.isArray(record.sort)) {
    const parsedSort = parseQuerySort(record.sort);
    if (parsedSort.length > 0) {
      query.sort = parsedSort;
    }
  }

  if (typeof record.limit === 'number' && Number.isFinite(record.limit)) {
    query.limit = record.limit;
  }

  if (typeof record.offset === 'number' && Number.isFinite(record.offset)) {
    query.offset = record.offset;
  }

  if (record.distinct === true) {
    query.distinct = true;
  }

  return query;
}

function mergeActiveFiltersIntoQuery(
  base: LogicalQuery,
  filters: FilterDefinition[] | undefined,
  activeFilters: FilterValue[] | undefined,
): LogicalQuery {
  const compiledFilters = compileActiveFiltersForQuery(base.datasetId, filters, activeFilters);

  if (compiledFilters.length === 0) {
    return base;
  }

  return {
    ...base,
    filters: [...(base.filters ?? []), ...compiledFilters],
  };
}

function buildQueryFieldsFromDataBinding(
  bindings: NonNullable<WidgetDefinition['dataBinding']>['fields'],
  config: Record<string, unknown>,
): LogicalQuery['fields'] {
  const seenRoles = new Set<string>();
  const fields: LogicalQuery['fields'] = [];

  for (const field of bindings) {
    if (!field?.fieldRef || seenRoles.has(field.role)) {
      continue;
    }

    seenRoles.add(field.role);

    const queryField: LogicalQuery['fields'][number] = {
      fieldId: field.fieldRef,
    };

    const aggregation = normalizeAggregation(field.aggregation);
    if (aggregation) {
      queryField.aggregation = aggregation;
    }

    const alias = aliasForDataBindingField(field.role, config);
    if (alias && alias !== field.fieldRef) {
      queryField.alias = alias;
    }

    fields.push(queryField);
  }

  return fields;
}

function aliasForDataBindingField(
  role: string,
  config: Record<string, unknown>,
): string | undefined {
  switch (role) {
    case 'y-axis':
      return readConfigString(config, 'yField');
    case 'value':
      return readConfigString(config, 'valueField') ?? readConfigString(config, 'metricField');
    case 'category':
      return readConfigString(config, 'nameField');
    case 'bar-y':
      return readConfigString(config, 'barField');
    case 'line-y':
      return readConfigString(config, 'lineField');
    default:
      return undefined;
  }
}

function readConfigString(config: Record<string, unknown>, key: string): string | undefined {
  const value = config[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function parseQueryFilters(raw: unknown[]): NonNullable<LogicalQuery['filters']> {
  const filters: NonNullable<LogicalQuery['filters']> = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      continue;
    }
    const filter = entry as Record<string, unknown>;
    if (typeof filter.fieldId !== 'string' || typeof filter.operator !== 'string') {
      continue;
    }
    filters.push({
      fieldId: filter.fieldId,
      operator: filter.operator as NonNullable<LogicalQuery['filters']>[number]['operator'],
      ...(filter.value !== undefined ? { value: filter.value } : {}),
    });
  }

  return filters;
}

function parseQuerySort(raw: unknown[]): NonNullable<LogicalQuery['sort']> {
  const sort: NonNullable<LogicalQuery['sort']> = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      continue;
    }
    const item = entry as Record<string, unknown>;
    if (typeof item.fieldId !== 'string') {
      continue;
    }
    if (item.direction !== 'asc' && item.direction !== 'desc') {
      continue;
    }
    sort.push({ fieldId: item.fieldId, direction: item.direction });
  }

  return sort;
}

export function parseStructuredAlertRule(
  widgetDef: WidgetDefinition,
): StructuredAlertRuleDefinition | null {
  const parsed = structuredAlertRuleSchema.safeParse(widgetDef.config.alertRule);
  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

export function buildStructuredAlertResultSignature(
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

export function mapQueryResultToState(result: QueryResult): QueryDataState {
  return {
    data: result.rows,
    columns: result.columns.map((column) => ({
      fieldId: column.fieldId,
      label: column.label,
      dataType: column.dataType,
    })),
  };
}

export function mapStructuredAlertRuleResult(
  widgetDef: WidgetDefinition,
  result: QueryResult,
  structuredAlertRule: StructuredAlertRuleDefinition,
): QueryDataState {
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

export function computeActiveFilters(
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

      const compiledFilter = compileFilterDefinitionValue(definition, activeFilter.value);
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

function compileCrossFilterValue(
  fieldRef: string,
  value: unknown,
): NonNullable<LogicalQuery['filters']>[number] | null {
  const syntheticDefinition: FilterDefinition = {
    id: `cross-filter:${fieldRef}`,
    type: 'cross-filter',
    datasetRef: '__cross_filter__',
    fieldRef,
    operator: 'equals',
    scope: { type: 'global' },
  };

  return compileFilterDefinitionValue(syntheticDefinition, value);
}

function normalizeAggregation(value: string | undefined): AggregationType | undefined {
  if (!value || !VALID_AGGREGATIONS.has(value as AggregationType) || value === 'none') {
    return undefined;
  }

  return value as AggregationType;
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
