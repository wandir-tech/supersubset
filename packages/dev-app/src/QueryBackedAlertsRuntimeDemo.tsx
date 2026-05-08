import { useMemo, useState, type ReactElement } from 'react';
import { SupersubsetRenderer, createWidgetRegistry } from '@supersubset/runtime';
import { registerAllCharts } from '@supersubset/charts-echarts';
import type { QueryAdapter, QueryFilter, QueryResult } from '@supersubset/data-model';
import type { DashboardDefinition, DatasetDefinition } from '@supersubset/schema';

type QueryRuntimeMode = 'success' | 'empty' | 'loading' | 'error' | 'unavailable';

const ALERT_COLUMNS: QueryResult['columns'] = [
  { fieldId: 'alert_title', label: 'Alert Title', dataType: 'string' },
  { fieldId: 'alert_message', label: 'Alert Message', dataType: 'string' },
  { fieldId: 'severity', label: 'Severity', dataType: 'string' },
  { fieldId: 'detected_at', label: 'Detected At', dataType: 'date' },
  { fieldId: 'region', label: 'Region', dataType: 'string' },
];

const ALERT_DATASET: DatasetDefinition = {
  id: 'ds-runtime-alerts',
  label: 'Runtime Alerts',
  fields: [
    { id: 'alert_title', label: 'Alert Title', dataType: 'string', role: 'dimension' },
    { id: 'alert_message', label: 'Alert Message', dataType: 'string', role: 'dimension' },
    { id: 'severity', label: 'Severity', dataType: 'string', role: 'dimension' },
    { id: 'detected_at', label: 'Detected At', dataType: 'date', role: 'time' },
    { id: 'region', label: 'Region', dataType: 'string', role: 'dimension' },
  ],
};

const ALERT_ROWS = [
  {
    alert_title: 'Gateway latency spike',
    alert_message: 'North region edge POP exceeded the 95th percentile latency budget.',
    severity: 'warning',
    detected_at: '2026-05-05 09:15 UTC',
    region: 'North',
  },
  {
    alert_title: 'Checkout backlog cleared',
    alert_message: 'South region queue depth returned to the normal operating window.',
    severity: 'success',
    detected_at: '2026-05-05 09:22 UTC',
    region: 'South',
  },
  {
    alert_title: 'Inventory sync paused',
    alert_message: 'East region catalog sync is waiting on upstream warehouse availability.',
    severity: 'danger',
    detected_at: '2026-05-05 09:31 UTC',
    region: 'East',
  },
  {
    alert_title: 'Fraud review queue elevated',
    alert_message: 'North region payment review queue crossed the escalation threshold.',
    severity: 'warning',
    detected_at: '2026-05-05 09:37 UTC',
    region: 'North',
  },
];

const RUNTIME_FILTER_OPTIONS = {
  'filter-region': ['North', 'South', 'East'],
};

const RUNTIME_ALERTS_DASHBOARD: DashboardDefinition = {
  schemaVersion: '0.2.0',
  id: 'runtime-query-alerts-demo',
  title: 'Runtime Query Alerts Demo',
  description: 'Dev-only harness for query-backed alerts screenshots.',
  dataModel: {
    type: 'inline',
    datasets: [ALERT_DATASET],
  },
  filters: [
    {
      id: 'filter-region',
      title: 'Region',
      type: 'select',
      fieldRef: 'region',
      datasetRef: 'ds-runtime-alerts',
      operator: 'equals',
      scope: { type: 'global' },
    },
  ],
  pages: [
    {
      id: 'page-runtime-alerts',
      title: 'Runtime Alerts',
      rootNodeId: 'root',
      layout: {
        root: { id: 'root', type: 'root', children: ['grid-runtime-alerts'], meta: {} },
        'grid-runtime-alerts': {
          id: 'grid-runtime-alerts',
          type: 'grid',
          children: ['header-runtime-alerts', 'w-runtime-filter-bar', 'w-runtime-alerts'],
          parentId: 'root',
          meta: { columns: 12 },
        },
        'header-runtime-alerts': {
          id: 'header-runtime-alerts',
          type: 'header',
          children: [],
          parentId: 'grid-runtime-alerts',
          meta: { text: 'Query-backed alerts runtime', headerSize: 'medium' },
        },
        'w-runtime-filter-bar': {
          id: 'w-runtime-filter-bar',
          type: 'widget',
          children: [],
          parentId: 'grid-runtime-alerts',
          meta: { widgetRef: 'runtime-filter-bar', width: 12, height: 84 },
        },
        'w-runtime-alerts': {
          id: 'w-runtime-alerts',
          type: 'widget',
          children: [],
          parentId: 'grid-runtime-alerts',
          meta: { widgetRef: 'runtime-query-alerts', width: 12, height: 280 },
        },
      },
      widgets: [
        {
          id: 'runtime-filter-bar',
          type: 'filter-bar',
          title: 'Alert filters',
          config: { filterIds: ['filter-region'] },
        },
        {
          id: 'runtime-query-alerts',
          type: 'alerts',
          title: 'Operations Watchlist',
          config: {
            layout: 'stack',
            showTimestamp: true,
            emptyState: 'placeholder',
            maxItems: 4,
            defaultSeverity: 'info',
          },
          dataBinding: {
            datasetRef: 'ds-runtime-alerts',
            fields: [
              { role: 'alert-title', fieldRef: 'alert_title' },
              { role: 'alert-message', fieldRef: 'alert_message' },
              { role: 'alert-severity', fieldRef: 'severity' },
              { role: 'alert-timestamp', fieldRef: 'detected_at' },
            ],
          },
        },
      ],
    },
  ],
  defaults: {
    activePage: 'page-runtime-alerts',
  },
};

function getRegionsFromFilters(filters: QueryFilter[] | undefined): Set<string> | null {
  if (!filters) {
    return null;
  }

  const regionFilter = filters.find((filter) => filter.fieldId === 'region');
  if (!regionFilter) {
    return null;
  }

  if (regionFilter.operator === 'eq' && typeof regionFilter.value === 'string') {
    return new Set([regionFilter.value]);
  }

  if (regionFilter.operator === 'in' && Array.isArray(regionFilter.value)) {
    return new Set(
      regionFilter.value.filter((value): value is string => typeof value === 'string'),
    );
  }

  if (regionFilter.operator === 'not_in' && Array.isArray(regionFilter.value)) {
    const excluded = new Set(
      regionFilter.value.filter((value): value is string => typeof value === 'string'),
    );
    return new Set(ALERT_ROWS.map((row) => row.region).filter((region) => !excluded.has(region)));
  }

  return null;
}

function filterAlertRows(filters: QueryFilter[] | undefined) {
  const regions = getRegionsFromFilters(filters);
  if (!regions || regions.size === 0) {
    return ALERT_ROWS;
  }

  return ALERT_ROWS.filter((row) => regions.has(row.region));
}

export function QueryBackedAlertsRuntimeDemo(): ReactElement {
  const [mode, setMode] = useState<QueryRuntimeMode>('success');
  const registry = useMemo(() => {
    const nextRegistry = createWidgetRegistry();
    registerAllCharts(nextRegistry);
    return nextRegistry;
  }, []);

  const queryAdapter = useMemo<QueryAdapter | undefined>(() => {
    if (mode === 'unavailable') {
      return undefined;
    }

    return {
      name: 'dev-query-alerts-runtime-demo',
      execute: async (query) => {
        if (mode === 'loading') {
          return new Promise<QueryResult>(() => {});
        }

        if (mode === 'error') {
          throw new Error('Host query failed');
        }

        const rows = mode === 'empty' ? [] : filterAlertRows(query.filters);

        return {
          columns: ALERT_COLUMNS,
          rows,
          totalRows: rows.length,
        };
      },
    };
  }, [mode]);

  return (
    <div
      data-testid="query-alert-runtime-demo"
      style={{
        minHeight: '100vh',
        padding: '24px',
        background: '#f8fafc',
        fontFamily:
          'var(--ss-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <section
          style={{
            border: '1px solid #dbe4ee',
            borderRadius: 14,
            padding: '18px 20px',
            background: '#ffffff',
            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.06)',
          }}
        >
          <h1 style={{ margin: 0, fontSize: 24, color: '#0f172a' }}>
            Alerts runtime screenshot harness
          </h1>
          <p style={{ margin: '10px 0 0', color: '#475569', lineHeight: 1.55 }}>
            Dev-only harness for documentation screenshots of query-backed alerts refresh, loading,
            empty, error, and unavailable states.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
            {(['success', 'empty', 'loading', 'error', 'unavailable'] as QueryRuntimeMode[]).map(
              (entry) => (
                <button
                  key={entry}
                  type="button"
                  data-testid={`alerts-runtime-mode-${entry}`}
                  onClick={() => setMode(entry)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 999,
                    border: '1px solid #cbd5e1',
                    background: mode === entry ? '#0f172a' : '#fff',
                    color: mode === entry ? '#fff' : '#0f172a',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {entry}
                </button>
              ),
            )}
          </div>
        </section>

        <SupersubsetRenderer
          definition={RUNTIME_ALERTS_DASHBOARD}
          registry={registry}
          queryAdapter={queryAdapter}
          filterOptions={RUNTIME_FILTER_OPTIONS}
        />
      </div>
    </div>
  );
}
