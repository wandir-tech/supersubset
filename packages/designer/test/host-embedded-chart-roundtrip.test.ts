/**
 * Round-trip tests for host-embedded dashboards (Tripmatch analytics seed shape).
 */
import { describe, it, expect } from 'vitest';
import type { DashboardDefinition } from '@supersubset/schema';
import { dashboardDefinitionSchema } from '@supersubset/schema';
import {
  canonicalToPuck,
  puckToCanonical,
  repairChartAxisPropsInPuckData,
  collectChartAxisBindingSnapshot,
} from '../src/adapters/puck-canonical';
import { buildPuckChartTypeReplacement } from '../src/adapters/switch-puck-chart-type';

const PLAN_CHART_DAY_WIDGET = {
  id: 'plan_chart_day',
  type: 'area-chart',
  title: 'Plans created per day',
  dataBinding: {
    datasetRef: 'fact_plan_events',
    fields: [
      { role: 'x-axis', fieldRef: 'event_date' },
      { role: 'y-axis', fieldRef: 'event_id', aggregation: 'count' },
    ],
  },
  config: {
    logicalQuery: {
      datasetId: 'fact_plan_events',
      fields: [
        { fieldId: 'event_date' },
        { fieldId: 'event_id', aggregation: 'count', alias: 'count' },
      ],
      filters: [{ fieldId: 'event_type', operator: 'eq', value: 'CREATED' }],
      sort: [{ fieldId: 'event_date', direction: 'asc' }],
      limit: 90,
    },
    xField: 'event_date',
    yField: 'count',
  },
};

function makeDashboard(widget: Record<string, unknown>): DashboardDefinition {
  return makeDashboardWithLayout(widget, 'flat');
}

/** Tripmatch seed uses row → widget slots (not flat grid → widget). */
function makeRowLayoutDashboard(widget: Record<string, unknown>): DashboardDefinition {
  return makeDashboardWithLayout(widget, 'row');
}

/** Matches buildPage('plan', ...) row 2 — two chart widgets side by side. */
function makeTripmatchPlanChartsRowDashboard(
  primaryWidget: Record<string, unknown>,
): DashboardDefinition {
  const secondaryWidget = {
    id: 'plan_chart_type',
    type: 'pie-chart',
    title: 'Plans by type',
    config: {
      logicalQuery: PLAN_CHART_DAY_WIDGET.config.logicalQuery,
      nameField: 'plan_type',
      valueField: 'count',
    },
  };

  return {
    schemaVersion: '0.2.0',
    id: 'tripmatch-analytics',
    title: 'Tripmatch analytics',
    pages: [
      {
        id: 'plan-activity',
        title: 'Plan activity',
        rootNodeId: 'plan_root',
        layout: {
          plan_root: { id: 'plan_root', type: 'root', children: ['plan_grid'], meta: {} },
          plan_grid: {
            id: 'plan_grid',
            type: 'grid',
            children: ['plan_row_2'],
            parentId: 'plan_root',
            meta: { columns: 12, gap: '16px' },
          },
          plan_row_2: {
            id: 'plan_row_2',
            type: 'row',
            children: ['plan_slot_2_0', 'plan_slot_2_1'],
            meta: {},
          },
          plan_slot_2_0: {
            id: 'plan_slot_2_0',
            type: 'widget',
            children: [],
            meta: { widgetRef: 'plan_chart_day', width: 6, height: 32 },
          },
          plan_slot_2_1: {
            id: 'plan_slot_2_1',
            type: 'widget',
            children: [],
            meta: { widgetRef: 'plan_chart_type', width: 6, height: 32 },
          },
        },
        widgets: [primaryWidget as never, secondaryWidget as never],
      },
    ],
  };
}

function makeDashboardWithLayout(
  widget: Record<string, unknown>,
  layout: 'flat' | 'row',
): DashboardDefinition {
  const rowLayout =
    layout === 'row'
      ? {
          root: { id: 'root', type: 'root', children: ['grid-main'], meta: {} },
          'grid-main': {
            id: 'grid-main',
            type: 'grid',
            children: ['row-0'],
            parentId: 'root',
            meta: { columns: 12 },
          },
          'row-0': {
            id: 'row-0',
            type: 'row',
            children: ['slot-1', 'slot-2'],
            parentId: 'grid-main',
            meta: {},
          },
          'slot-1': {
            id: 'slot-1',
            type: 'widget',
            parentId: 'row-0',
            children: [],
            meta: { widgetRef: 'plan_chart_day', width: 6 },
          },
          'slot-2': {
            id: 'slot-2',
            type: 'widget',
            parentId: 'row-0',
            children: [],
            meta: { widgetRef: 'plan_chart_type', width: 6 },
          },
        }
      : {
          root: { id: 'root', type: 'root', children: ['grid-main'], meta: {} },
          'grid-main': {
            id: 'grid-main',
            type: 'grid',
            children: ['slot-1'],
            parentId: 'root',
            meta: { columns: 12 },
          },
          'slot-1': {
            id: 'slot-1',
            type: 'widget',
            parentId: 'grid-main',
            children: [],
            meta: { widgetRef: 'plan_chart_day', width: 6 },
          },
        };

  return {
    schemaVersion: '0.2.0',
    id: 'tripmatch-analytics',
    title: 'Tripmatch analytics',
    pages: [
      {
        id: 'plan-activity',
        title: 'Plan activity',
        rootNodeId: 'root',
        layout: rowLayout,
        widgets: [widget as never],
      },
    ],
  };
}

function findChartProps(content: unknown[]): Record<string, unknown> | undefined {
  for (const item of content) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    if (record.type === 'AreaChart' || record.type === 'BarChart') {
      return record.props as Record<string, unknown>;
    }
    const props = record.props as Record<string, unknown> | undefined;
    const nested = props?.content;
    if (Array.isArray(nested)) {
      const found = findChartProps(nested);
      if (found) return found;
    }
    const rowContent = props?.content;
    if (Array.isArray(rowContent)) {
      for (const rowItem of rowContent) {
        if (!rowItem || typeof rowItem !== 'object') continue;
        const rowProps = (rowItem as Record<string, unknown>).props as
          | Record<string, unknown>
          | undefined;
        const columnContent = rowProps?.content;
        if (Array.isArray(columnContent)) {
          const found = findChartProps(columnContent);
          if (found) return found;
        }
      }
    }
  }
  return undefined;
}

describe('host-embedded chart round-trip', () => {
  it('loads normalized browser JSON for plan_chart_day in tripmatch row layout', () => {
    const browserWidget = {
      id: 'plan_chart_day',
      type: 'area-chart',
      title: 'Plans created per day',
      config: {
        logicalQuery: PLAN_CHART_DAY_WIDGET.config.logicalQuery,
        xField: 'event_date',
        yField: 'count',
      },
      dataBinding: {
        datasetRef: 'fact_plan_events',
        fields: [
          { role: 'x-axis', fieldRef: 'event_date' },
          { role: 'y-axis', fieldRef: 'event_id', aggregation: 'count' },
        ],
      },
    };
    const puck = canonicalToPuck(makeTripmatchPlanChartsRowDashboard(browserWidget));
    const props = findChartProps((puck.content ?? []) as unknown[]);
    expect(props?.xAxisField).toBe('event_date');
    expect(props?.yAxisField).toBe('event_id');
    expect(props?.aggregation).toBe('count');
  });

  it('loads seed-only config in row layout (Tripmatch buildPage shape)', () => {
    const seedWidget = {
      id: 'plan_chart_day',
      type: 'area-chart',
      title: 'Plans created per day',
      config: {
        logicalQuery: PLAN_CHART_DAY_WIDGET.config.logicalQuery,
        xField: 'event_date',
        yField: 'count',
      },
    };
    const puck = canonicalToPuck(makeRowLayoutDashboard(seedWidget));
    const props = findChartProps((puck.content ?? []) as unknown[]);
    expect(props?.xAxisField).toBe('event_date');
    expect(props?.yAxisField).toBe('event_id');
    expect(props?.aggregation).toBe('count');
  });

  it('chart type switch keeps logicalQuery and host aliases when yAxisField is empty', () => {
    const puck = canonicalToPuck(makeDashboard(PLAN_CHART_DAY_WIDGET));
    const areaProps = findChartProps((puck.content ?? []) as unknown[]);
    expect(areaProps).toBeDefined();

    const areaItem = {
      type: 'AreaChart',
      props: {
        ...areaProps,
        yAxisField: undefined,
        xAxisField: 'event_date',
        xField: 'event_date',
        yField: 'count',
        logicalQuery: PLAN_CHART_DAY_WIDGET.config.logicalQuery,
        datasetRef: 'fact_plan_events',
        aggregation: 'count',
      },
    };

    const bar = buildPuckChartTypeReplacement(areaItem as never, 'bar-chart');
    expect(bar?.props.xAxisField).toBe('event_date');
    expect(bar?.props.xField).toBe('event_date');
    expect(bar?.props.yField).toBe('count');
    expect(bar?.props.logicalQuery).toEqual(PLAN_CHART_DAY_WIDGET.config.logicalQuery);

    const published = puckToCanonical(
      { root: { props: {} }, content: [bar!] },
      {
        dashboardId: 'tripmatch-analytics',
        baseDashboard: makeDashboard(PLAN_CHART_DAY_WIDGET),
      },
    );

    const widget = published.pages[0]?.widgets.find((w) => w.id === 'plan_chart_day');
    expect(widget?.type).toBe('bar-chart');
    expect(widget?.config.xField).toBe('event_date');
    expect(widget?.config.yField).toBe('count');
    expect(widget?.config.logicalQuery).toEqual(PLAN_CHART_DAY_WIDGET.config.logicalQuery);
  });

  it('loads seed-only config (no dataBinding) into puck axis props', () => {
    const seedWidget = {
      id: 'plan_chart_day',
      type: 'area-chart',
      title: 'Plans created per day',
      config: {
        logicalQuery: PLAN_CHART_DAY_WIDGET.config.logicalQuery,
        xField: 'event_date',
        yField: 'count',
      },
    };
    const puck = canonicalToPuck(makeDashboard(seedWidget));
    const props = findChartProps((puck.content ?? []) as unknown[]);
    expect(props?.xAxisField).toBe('event_date');
    expect(props?.yAxisField).toBe('event_id');
    expect(props?.aggregation).toBe('count');
  });

  it('repairs incomplete dataBinding missing y-axis on load', () => {
    const partialWidget = {
      ...PLAN_CHART_DAY_WIDGET,
      dataBinding: {
        datasetRef: 'fact_plan_events',
        fields: [{ role: 'x-axis', fieldRef: 'event_date' }],
      },
    };
    const puck = canonicalToPuck(makeDashboard(partialWidget));
    const props = findChartProps((puck.content ?? []) as unknown[]);
    expect(props?.xAxisField).toBe('event_date');
    expect(props?.yAxisField).toBe('event_id');
    expect(props?.aggregation).toBe('count');
  });

  it('publish preserves host fields when puck yAxisField was empty but config yField alias exists', () => {
    const puck = canonicalToPuck(
      makeDashboard({
        ...PLAN_CHART_DAY_WIDGET,
        dataBinding: {
          datasetRef: 'fact_plan_events',
          fields: [{ role: 'x-axis', fieldRef: 'event_date' }],
        },
      }),
    );
    const chart = puck.content?.[0];
    expect(chart).toBeDefined();
    const props = { ...(chart!.props as Record<string, unknown>) };
    delete props.yAxisField;
    props.logicalQuery = PLAN_CHART_DAY_WIDGET.config.logicalQuery;

    const published = puckToCanonical(
      { root: { props: {} }, content: [{ ...chart!, props }] },
      {
        dashboardId: 'tripmatch-analytics',
        baseDashboard: makeDashboard(PLAN_CHART_DAY_WIDGET),
      },
    );

    const widget = published.pages[0]?.widgets.find((w) => w.id === 'plan_chart_day');
    expect(widget?.config.xField).toBe('event_date');
    expect(widget?.config.yField).toBe('count');
    expect(widget?.dataBinding?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'y-axis', fieldRef: 'event_id', aggregation: 'count' }),
      ]),
    );
  });

  it('loads legacy xField/yField aliases into puck props with resolved y-axis field', () => {
    const puck = canonicalToPuck(makeDashboard(PLAN_CHART_DAY_WIDGET));
    const chart = puck.content?.[0];
    expect(chart?.props.xAxisField).toBe('event_date');
    expect(chart?.props.yAxisField).toBe('event_id');
    expect(chart?.props.aggregation).toBe('count');
  });

  it('publish preserves host xField/yField and dataBinding after puck round-trip', () => {
    const puck = canonicalToPuck(makeDashboard(PLAN_CHART_DAY_WIDGET));
    const published = puckToCanonical(puck, {
      dashboardId: 'tripmatch-analytics',
      dashboardTitle: 'Tripmatch analytics',
      baseDashboard: makeDashboard(PLAN_CHART_DAY_WIDGET),
    });

    const widget = published.pages[0]?.widgets.find((w) => w.id === 'plan_chart_day');
    expect(widget?.type).toBe('area-chart');
    expect(widget?.config.xField).toBe('event_date');
    expect(widget?.config.yField).toBe('count');
    expect(widget?.dataBinding?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'x-axis', fieldRef: 'event_date' }),
        expect.objectContaining({
          role: 'y-axis',
          fieldRef: 'event_id',
          aggregation: 'count',
        }),
      ]),
    );
  });

  it('chart type switch preserves x/y bindings and host config fields on publish', () => {
    const puck = canonicalToPuck(makeDashboard(PLAN_CHART_DAY_WIDGET));
    const area = puck.content?.[0];
    expect(area).toBeDefined();

    const bar = buildPuckChartTypeReplacement(area!, 'bar-chart');
    expect(bar?.type).toBe('BarChart');
    expect(bar?.props.xAxisField).toBe('event_date');
    expect(bar?.props.yAxisField).toBe('event_id');
    expect(bar?.props.aggregation).toBe('count');

    const published = puckToCanonical(
      { root: { props: {} }, content: [bar!] },
      {
        dashboardId: 'tripmatch-analytics',
        baseDashboard: makeDashboard(PLAN_CHART_DAY_WIDGET),
      },
    );

    const widget = published.pages[0]?.widgets.find((w) => w.id === 'plan_chart_day');
    expect(widget?.type).toBe('bar-chart');
    expect(widget?.config.xField).toBe('event_date');
    expect(widget?.config.yField).toBe('count');
  });

  it('repairs puck chart props from logicalQuery when yAxisField was cleared', () => {
    const puck = canonicalToPuck(makeDashboard(PLAN_CHART_DAY_WIDGET));
    const area = findChartProps((puck.content ?? []) as unknown[]);
    expect(area).toBeDefined();

    const broken = repairChartAxisPropsInPuckData({
      root: { props: {} },
      content: [
        {
          type: 'AreaChart',
          props: {
            ...area,
            yAxisField: undefined,
            logicalQuery: PLAN_CHART_DAY_WIDGET.config.logicalQuery,
            datasetRef: 'fact_plan_events',
            aggregation: 'count',
          },
        },
      ],
    });

    const fixed = findChartProps((broken.content ?? []) as unknown[]);
    expect(fixed?.yAxisField).toBe('event_id');
    expect(fixed?.xAxisField).toBe('event_date');
  });

  it('repairs yAxisField when chart lives in Puck runtime zones', () => {
    const logicalQuery = PLAN_CHART_DAY_WIDGET.config.logicalQuery;
    const puckZonesData = {
      root: { props: {} },
      content: [{ type: 'RowBlock', props: { id: 'plan_row_2' } }],
      zones: {
        'plan_row_2:content': [
          { type: 'ColumnBlock', props: { id: 'plan_slot_2_0', span: 6 } },
          { type: 'ColumnBlock', props: { id: 'plan_slot_2_1', span: 6 } },
        ],
        'plan_slot_2_0:content': [
          {
            type: 'AreaChart',
            props: {
              id: 'plan_chart_day',
              title: 'Plans created per day',
              datasetRef: 'fact_plan_events',
              xAxisField: 'event_date',
              xField: 'event_date',
              yField: 'count',
              logicalQuery,
            },
          },
        ],
      },
    };

    const before = collectChartAxisBindingSnapshot(puckZonesData);
    expect(JSON.parse(before)[0]?.yAxisField).toBeUndefined();

    const repaired = repairChartAxisPropsInPuckData(puckZonesData);
    const chartProps = (repaired.zones?.['plan_slot_2_0:content']?.[0]?.props ?? {}) as Record<
      string,
      unknown
    >;
    expect(chartProps.yAxisField).toBe('event_id');
    expect(chartProps.aggregation).toBe('count');

    const published = puckToCanonical(repaired, {
      dashboardId: 'tripmatch-analytics',
      baseDashboard: makeTripmatchPlanChartsRowDashboard(PLAN_CHART_DAY_WIDGET),
    });
    const widget = published.pages[0]?.widgets.find((w) => w.id === 'plan_chart_day');
    expect(widget?.config.xField).toBe('event_date');
    expect(widget?.config.yField).toBe('count');
  });

  it('repairChartAxisPropsInPuckData is idempotent for zone-stored charts', () => {
    const logicalQuery = PLAN_CHART_DAY_WIDGET.config.logicalQuery;
    const puckZonesData = {
      root: { props: {} },
      content: [{ type: 'RowBlock', props: { id: 'plan_row_2' } }],
      zones: {
        'plan_slot_2_0:content': [
          {
            type: 'AreaChart',
            props: {
              id: 'plan_chart_day',
              datasetRef: 'fact_plan_events',
              xField: 'event_date',
              yField: 'count',
              logicalQuery,
            },
          },
        ],
      },
    };

    const once = repairChartAxisPropsInPuckData(puckZonesData);
    const twice = repairChartAxisPropsInPuckData(once);
    expect(collectChartAxisBindingSnapshot(once)).toBe(collectChartAxisBindingSnapshot(twice));
  });

  it('collectChartAxisBindingSnapshot detects axis repair delta', () => {
    const puck = canonicalToPuck(makeDashboard(PLAN_CHART_DAY_WIDGET));
    const areaProps = findChartProps((puck.content ?? []) as unknown[]);
    expect(areaProps).toBeDefined();

    const brokenData = {
      root: puck.root,
      content: [
        {
          type: 'AreaChart',
          props: {
            ...areaProps,
            yAxisField: '',
            logicalQuery: PLAN_CHART_DAY_WIDGET.config.logicalQuery,
            xField: 'event_date',
            yField: 'count',
            datasetRef: 'fact_plan_events',
          },
        },
      ],
    };
    const brokenSnapshot = collectChartAxisBindingSnapshot(brokenData);
    const fixed = repairChartAxisPropsInPuckData(brokenData);
    const after = collectChartAxisBindingSnapshot(fixed);
    expect(brokenSnapshot).not.toBe(after);
    expect(JSON.parse(after)[0]?.yAxisField).toBe('event_id');
  });

  it('publish round-trip omits invalid stretch verticalAlign from column meta', () => {
    const puck = canonicalToPuck(makeTripmatchPlanChartsRowDashboard(PLAN_CHART_DAY_WIDGET));
    const published = puckToCanonical(puck, {
      dashboardId: 'tripmatch-analytics',
      dashboardTitle: 'Tripmatch analytics',
      baseDashboard: makeTripmatchPlanChartsRowDashboard(PLAN_CHART_DAY_WIDGET),
    });

    expect(() => dashboardDefinitionSchema.parse(published)).not.toThrow();

    for (const node of Object.values(published.pages[0].layout)) {
      const verticalAlign = node.meta?.verticalAlign;
      if (verticalAlign !== undefined) {
        expect(['top', 'center', 'bottom']).toContain(verticalAlign);
      }
    }
  });
});
