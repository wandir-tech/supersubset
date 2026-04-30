import type {
  AggregationType,
  LogicalQuery,
  NormalizedDataset,
  QueryFilter,
  QueryResult,
} from '@supersubset/data-model';
import type { DashboardDefinition } from '@supersubset/schema';
import type { FilterState } from '@supersubset/runtime';
import { WORKBENCH_LOGIN_MUTATION } from './workbench-auth';
import {
  WORKBENCH_DASHBOARD_STORAGE_KEY,
  WORKBENCH_TOKEN_STORAGE_KEY,
  isDashboardDefinition,
  workbenchFilterOptions,
} from './workbench-shared';

const METADATA_BINDING_KEYS = new Set(['aggregation', 'metricFields']);
const VALID_AGGREGATIONS: ReadonlySet<AggregationType> = new Set([
  'sum',
  'avg',
  'count',
  'count_distinct',
  'min',
  'max',
  'none',
]);

export interface WidgetFixture {
  data: Record<string, unknown>[];
  columns?: QueryResult['columns'];
}

export interface QueryBundle {
  widgetData: Record<string, WidgetFixture>;
  filterOptions: Record<string, string[]>;
  queryLog: string[];
}

export interface PreviewDataRequest {
  datasetRef: string;
  fields: Record<string, string | string[] | undefined>;
}

function getBrowserStorage(storage: 'localStorage' | 'sessionStorage'): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window[storage];
}

function toFieldIdList(value: string | string[] | undefined): string[] {
  if (typeof value === 'string') {
    return value.length > 0 ? [value] : [];
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  }

  return [];
}

function flattenFieldBindings(fields: PreviewDataRequest['fields']): string[] {
  const values = Object.entries(fields).flatMap(([key, value]) => {
    if (METADATA_BINDING_KEYS.has(key)) {
      return [];
    }

    return toFieldIdList(value);
  });

  return Array.from(new Set(values));
}

function toAggregationType(value: string | undefined): AggregationType | undefined {
  if (!value || !VALID_AGGREGATIONS.has(value as AggregationType)) {
    return undefined;
  }

  return value as AggregationType;
}

function createAuthHeaders(token: string, includeJsonContentType = false): HeadersInit {
  return {
    ...(includeJsonContentType ? { 'Content-Type': 'application/json' } : {}),
    Authorization: `Bearer ${token}`,
  };
}

function readJsonStorageValue<T>(storage: Storage | null, key: string): T | null {
  if (!storage) {
    return null;
  }

  const raw = storage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function persistJsonStorageValue<T>(storage: Storage | null, key: string, value: T): void {
  if (!storage) {
    return;
  }

  storage.setItem(key, JSON.stringify(value));
}

function inferAggregation(
  fieldId: string,
  role: string,
  dataset: NormalizedDataset,
): AggregationType | undefined {
  const field = dataset.fields.find((entry) => entry.id === fieldId);

  if (field?.role === 'measure') {
    return field.defaultAggregation ?? 'sum';
  }

  if (role === 'value' || role === 'comparison' || role === 'y-axis') {
    return field?.defaultAggregation ?? 'sum';
  }

  return undefined;
}

function buildFilterQueries(
  dashboard: DashboardDefinition,
  filterValues: FilterState['values'],
): QueryFilter[] {
  const filters: QueryFilter[] = [];

  for (const definition of dashboard.filters ?? []) {
    const value = filterValues[definition.id];

    if (value == null || value === '') {
      continue;
    }

    if (definition.type === 'date' && typeof value === 'object') {
      const range = value as { start?: string; end?: string };
      if (range.start || range.end) {
        filters.push({
          fieldId: definition.fieldRef,
          operator: 'between',
          value: [range.start, range.end],
        });
      }
      continue;
    }

    if (Array.isArray(value) && value.length > 0) {
      filters.push({ fieldId: definition.fieldRef, operator: 'in', value });
      continue;
    }

    if (typeof value === 'string' && value.length > 0) {
      filters.push({ fieldId: definition.fieldRef, operator: 'eq', value });
    }
  }

  return filters;
}

function buildWidgetQuery(
  widget: DashboardDefinition['pages'][number]['widgets'][number],
  datasets: NormalizedDataset[],
  filterValues: FilterState['values'],
  dashboard: DashboardDefinition,
): LogicalQuery | null {
  const datasetRef = widget.dataBinding?.datasetRef;
  if (!datasetRef) {
    return null;
  }

  const dataset = datasets.find((entry) => entry.id === datasetRef);
  if (!dataset) {
    return null;
  }

  const dataBindingFields = widget.dataBinding?.fields ?? [];
  const queryFields = dataBindingFields.map((field) => ({
    fieldId: field.fieldRef,
    ...(inferAggregation(field.fieldRef, field.role, dataset)
      ? { aggregation: inferAggregation(field.fieldRef, field.role, dataset) }
      : {}),
  }));

  if (queryFields.length === 0) {
    return null;
  }

  return {
    datasetId: datasetRef,
    fields: queryFields,
    filters: buildFilterQueries(dashboard, filterValues),
    limit: widget.type === 'table' ? 12 : 100,
  };
}

export function readStoredWorkbenchDashboard(): DashboardDefinition | null {
  const storage = getBrowserStorage('localStorage');
  const value = readJsonStorageValue<unknown>(storage, WORKBENCH_DASHBOARD_STORAGE_KEY);
  return isDashboardDefinition(value) ? value : null;
}

export function persistWorkbenchDashboard(dashboard: DashboardDefinition): void {
  persistJsonStorageValue(
    getBrowserStorage('localStorage'),
    WORKBENCH_DASHBOARD_STORAGE_KEY,
    dashboard,
  );
}

export function readStoredWorkbenchToken(): string {
  return getBrowserStorage('sessionStorage')?.getItem(WORKBENCH_TOKEN_STORAGE_KEY) ?? '';
}

export function persistWorkbenchToken(token: string): void {
  getBrowserStorage('sessionStorage')?.setItem(WORKBENCH_TOKEN_STORAGE_KEY, token);
}

export function clearStoredWorkbenchToken(): void {
  getBrowserStorage('sessionStorage')?.removeItem(WORKBENCH_TOKEN_STORAGE_KEY);
}

export async function loginToWorkbench(email: string, password: string): Promise<string> {
  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: WORKBENCH_LOGIN_MUTATION,
      variables: { email, password },
    }),
  });

  const payload = (await response.json()) as {
    data?: { login?: { accessToken?: string } };
    errors?: Array<{ message?: string }>;
  };

  if (!response.ok) {
    throw new Error(payload.errors?.[0]?.message ?? 'Login failed.');
  }

  const token = payload.data?.login?.accessToken?.trim();
  if (!token) {
    throw new Error('Login succeeded but no access token was returned.');
  }

  return token;
}

export async function fetchWorkbenchDatasets(token: string): Promise<NormalizedDataset[]> {
  const response = await fetch('/api/analytics/supersubset/datasets', {
    method: 'GET',
    headers: createAuthHeaders(token),
  });

  const payload = (await response.json()) as { datasets?: NormalizedDataset[]; message?: string };
  if (!response.ok) {
    throw new Error(payload.message ?? 'Dataset discovery failed.');
  }

  return Array.isArray(payload.datasets) ? payload.datasets : [];
}

export async function executeWorkbenchLogicalQuery(
  token: string,
  query: LogicalQuery,
): Promise<QueryResult> {
  const response = await fetch('/api/analytics/supersubset/query', {
    method: 'POST',
    headers: createAuthHeaders(token, true),
    body: JSON.stringify(query),
  });

  const payload = (await response.json()) as QueryResult & { message?: string };
  if (!response.ok) {
    throw new Error(payload.message ?? 'Query execution failed.');
  }

  return payload;
}

export function buildWorkbenchPreviewQuery(
  datasets: NormalizedDataset[],
  request: PreviewDataRequest,
): LogicalQuery | null {
  const dataset = datasets.find((entry) => entry.id === request.datasetRef);
  if (!dataset) {
    return null;
  }

  const rawAggregation =
    typeof request.fields.aggregation === 'string' ? request.fields.aggregation : undefined;
  const aggregation = toAggregationType(rawAggregation);

  const fields = flattenFieldBindings(request.fields).map((fieldId) => {
    const field = dataset.fields.find((entry) => entry.id === fieldId);
    if (field?.role === 'measure') {
      return {
        fieldId,
        aggregation:
          aggregation && aggregation !== 'none' ? aggregation : (field.defaultAggregation ?? 'sum'),
      };
    }

    return { fieldId };
  });

  if (fields.length === 0) {
    return null;
  }

  return {
    datasetId: request.datasetRef,
    fields,
    limit: 120,
  };
}

export async function runWorkbenchViewerQueries(args: {
  dashboard: DashboardDefinition;
  datasets: NormalizedDataset[];
  token: string;
  filterValues: FilterState['values'];
}): Promise<QueryBundle> {
  const { dashboard, datasets, token, filterValues } = args;
  const widgetData: Record<string, WidgetFixture> = {};
  const queryLog: string[] = [];
  const widgets = dashboard.pages.flatMap((page) => page.widgets);

  for (const widget of widgets) {
    const query = buildWidgetQuery(widget, datasets, filterValues, dashboard);
    if (!query) {
      continue;
    }

    queryLog.push(`${widget.id}: ${JSON.stringify(query)}`);
    const result = await executeWorkbenchLogicalQuery(token, query);
    widgetData[widget.id] = {
      data: result.rows,
      columns: result.columns,
    };
  }

  return {
    widgetData,
    filterOptions: workbenchFilterOptions,
    queryLog,
  };
}
