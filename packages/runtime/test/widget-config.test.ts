import { describe, expect, it } from 'vitest';
import type { WidgetDefinition } from '@supersubset/schema';
import { resolveDataBindingConfig } from '../src/layout/widget-config';

describe('resolveDataBindingConfig', () => {
  it('prefers scalar yField over dataBinding y-axis fieldRef when building yFields', () => {
    const widget: WidgetDefinition = {
      id: 'plan_chart_day',
      type: 'area-chart',
      title: 'Plans created per day',
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

    expect(resolveDataBindingConfig(widget)).toMatchObject({
      xField: 'event_date',
      yField: 'count',
      yFields: ['count'],
    });
  });
});
