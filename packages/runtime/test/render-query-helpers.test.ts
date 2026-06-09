import { describe, expect, it } from 'vitest';
import type { WidgetDefinition } from '@supersubset/schema';
import { buildWidgetQuery } from '../src/layout/render-query-helpers';

describe('buildWidgetQuery', () => {
  it('prefers config.logicalQuery over polluted dataBinding field refs', () => {
    const widget: WidgetDefinition = {
      id: 'plan_chart_day',
      type: 'area-chart',
      title: 'Plans created per day',
      config: {
        xField: 'event_date',
        yField: 'count',
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
      },
      dataBinding: {
        datasetRef: 'fact_plan_events',
        fields: [
          { role: 'x-axis', fieldRef: 'event_date' },
          { role: 'y-axis', fieldRef: 'event_id', aggregation: 'count' },
          { role: 'value', fieldRef: 'count', aggregation: 'count' },
          { role: 'category', fieldRef: 'event_date' },
        ],
      },
    };

    expect(buildWidgetQuery(widget, undefined, undefined)).toEqual({
      datasetId: 'fact_plan_events',
      fields: [
        { fieldId: 'event_date' },
        { fieldId: 'event_id', aggregation: 'count', alias: 'count' },
      ],
      filters: [{ fieldId: 'event_type', operator: 'eq', value: 'CREATED' }],
      sort: [{ fieldId: 'event_date', direction: 'asc' }],
      limit: 90,
    });
  });

  it('adds aliases when building from dataBinding and config field names', () => {
    const widget: WidgetDefinition = {
      id: 'w1',
      type: 'bar-chart',
      config: {
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

    expect(buildWidgetQuery(widget, undefined, undefined)).toEqual({
      datasetId: 'fact_plan_events',
      fields: [
        { fieldId: 'event_date' },
        { fieldId: 'event_id', aggregation: 'count', alias: 'count' },
      ],
    });
  });
});
