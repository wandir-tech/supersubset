import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';

let capturedProps: Record<string, unknown> | null = null;

vi.mock('../src/base/BaseChart', () => ({
  BaseChart: (props: Record<string, unknown>) => {
    capturedProps = props;
    return React.createElement('div', { 'data-testid': 'base-chart' });
  },
  echarts: {
    use: vi.fn(),
  },
}));

import { BarChartWidget } from '../src/charts/BarChartWidget';

describe('BarChartWidget interactions', () => {
  beforeEach(() => {
    capturedProps = null;
  });

  it('embeds source row payload for click interactions', () => {
    const onEvent = vi.fn();

    render(
      React.createElement(BarChartWidget, {
        widgetId: 'bar-1',
        widgetType: 'bar-chart',
        title: 'Sales by Region',
        config: { xField: 'region', yFields: ['revenue'] },
        data: [{ region: 'East', revenue: 750000 }],
        onEvent,
      }),
    );

    expect(capturedProps?.widgetId).toBe('bar-1');
    expect(capturedProps?.onEvent).toBe(onEvent);

    const option = capturedProps?.option as { series: Array<{ data: Array<Record<string, unknown>> }> };
    const point = option.series[0].data[0];

    expect(point.value).toBe(750000);
    expect(point.__ssPayload).toEqual({
      region: 'East',
      revenue: 750000,
    });
  });
});