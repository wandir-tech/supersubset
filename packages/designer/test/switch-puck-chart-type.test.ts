/**
 * Tests for in-place chart type switching in the Puck designer.
 */
import { describe, it, expect } from 'vitest';
import type { ComponentData, Data } from '@puckeditor/core';
import { puckToCanonical } from '../src/adapters/puck-canonical';
import {
  buildPuckChartTypeReplacement,
  isSwitchableChartPuckType,
  puckTypeToWidgetType,
} from '../src/adapters/switch-puck-chart-type';

describe('switch-puck-chart-type', () => {
  it('identifies switchable chart puck types', () => {
    expect(isSwitchableChartPuckType('AreaChart')).toBe(true);
    expect(isSwitchableChartPuckType('BarChart')).toBe(true);
    expect(isSwitchableChartPuckType('KPICard')).toBe(false);
    expect(isSwitchableChartPuckType('Table')).toBe(false);
  });

  it('maps puck types to widget types', () => {
    expect(puckTypeToWidgetType('AreaChart')).toBe('area-chart');
    expect(puckTypeToWidgetType('BarChart')).toBe('bar-chart');
  });

  it('switches area-chart to bar-chart preserving bindings', () => {
    const current: ComponentData = {
      type: 'AreaChart',
      props: {
        id: 'plan_chart_day',
        title: 'Plans created per day',
        datasetRef: 'fact_plan_events',
        xAxisField: 'event_date',
        yAxisField: 'event_id',
        aggregation: 'count',
      },
    };

    const replacement = buildPuckChartTypeReplacement(current, 'bar-chart');
    expect(replacement).not.toBeNull();
    expect(replacement?.type).toBe('BarChart');
    expect(replacement?.props).toMatchObject({
      id: 'plan_chart_day',
      title: 'Plans created per day',
      datasetRef: 'fact_plan_events',
      xAxisField: 'event_date',
      yAxisField: 'event_id',
      aggregation: 'count',
    });
  });

  it('returns null when target type matches current type', () => {
    const current: ComponentData = {
      type: 'BarChart',
      props: { id: 'w1', title: 'Test' },
    };
    expect(buildPuckChartTypeReplacement(current, 'bar-chart')).toBeNull();
  });

  it('puckToCanonical emits updated widget type after replacement', () => {
    const areaChart: ComponentData = {
      type: 'AreaChart',
      props: {
        id: 'plan_chart_day',
        title: 'Plans created per day',
        datasetRef: 'fact_plan_events',
        xAxisField: 'event_date',
        yAxisField: 'event_id',
        aggregation: 'count',
      },
    };

    const barChart = buildPuckChartTypeReplacement(areaChart, 'bar-chart');
    expect(barChart).not.toBeNull();

    const puckData: Data = {
      root: { props: { title: 'Test Dashboard' } },
      content: [barChart!],
    };

    const dashboard = puckToCanonical(puckData, {
      dashboardId: 'test-dashboard',
      dashboardTitle: 'Test Dashboard',
    });

    const widget = dashboard.pages[0]?.widgets.find((w) => w.id === 'plan_chart_day');
    expect(widget?.type).toBe('bar-chart');
    expect(widget?.dataBinding?.datasetRef).toBe('fact_plan_events');
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
    expect(widget?.config.xField).toBe('event_date');
    expect(widget?.config.yField).toBe('count');
  });
});
