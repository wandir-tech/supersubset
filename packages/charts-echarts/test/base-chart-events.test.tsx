import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { fireEvent, render } from '@testing-library/react';

const { chartInstance, initMock } = vi.hoisted(() => {
  const instance = {
    on: vi.fn(),
    off: vi.fn(),
    setOption: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
    isDisposed: vi.fn(() => false),
    containPixel: vi.fn(() => false),
    convertFromPixel: vi.fn(() => undefined),
  };

  return {
    chartInstance: instance,
    initMock: vi.fn(() => instance),
  };
});

vi.mock('echarts/core', () => ({
  init: initMock,
  use: vi.fn(),
}));

vi.mock('echarts/renderers', () => ({
  CanvasRenderer: {},
}));

vi.mock('echarts/components', () => ({
  DataZoomComponent: {},
  GridComponent: {},
  TooltipComponent: {},
  LegendComponent: {},
  TitleComponent: {},
  DatasetComponent: {},
}));

import { BaseChart } from '../src/base/BaseChart';

describe('BaseChart interaction events', () => {
  beforeEach(() => {
    chartInstance.on.mockClear();
    chartInstance.off.mockClear();
    chartInstance.setOption.mockClear();
    chartInstance.dispose.mockClear();
    chartInstance.containPixel.mockReset();
    chartInstance.containPixel.mockReturnValue(false);
    chartInstance.convertFromPixel.mockReset();
    chartInstance.convertFromPixel.mockReturnValue(undefined);
    chartInstance.isDisposed.mockReset();
    chartInstance.isDisposed.mockReturnValue(false);
    initMock.mockClear();

    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
  });

  it('emits click events with extracted payload data', () => {
    const onEvent = vi.fn();

    render(
      React.createElement(BaseChart, {
        option: {},
        widgetId: 'chart-1',
        onEvent,
      }),
    );

    const clickHandler = chartInstance.on.mock.calls.find(
      ([eventName]) => eventName === 'click',
    )?.[1] as (params: unknown) => void;
    expect(clickHandler).toBeTypeOf('function');

    clickHandler({
      data: {
        __ssPayload: {
          region: 'East',
          revenue: 750000,
        },
      },
    });

    expect(onEvent).toHaveBeenCalledWith({
      type: 'click',
      widgetId: 'chart-1',
      payload: {
        region: 'East',
        revenue: 750000,
      },
    });
  });

  it('falls back to generic click payload when no source payload exists', () => {
    const onEvent = vi.fn();

    render(
      React.createElement(BaseChart, {
        option: {},
        widgetId: 'chart-2',
        onEvent,
      }),
    );

    const clickHandler = chartInstance.on.mock.calls.find(
      ([eventName]) => eventName === 'click',
    )?.[1] as (params: unknown) => void;
    clickHandler({
      name: 'North',
      value: 42,
      seriesName: 'revenue',
    });

    expect(onEvent).toHaveBeenCalledWith({
      type: 'click',
      widgetId: 'chart-2',
      payload: {
        name: 'North',
        value: 42,
        seriesName: 'revenue',
      },
    });
  });

  it('converts resolved Supersubset themes before initializing ECharts', () => {
    render(
      React.createElement(BaseChart, {
        option: {},
        theme: {
          colors: {
            primary: '#1767a5',
            secondary: '#722ed1',
            background: '#f4f9ff',
            surface: '#ffffff',
            text: '#261b12',
            success: '#15803d',
            warning: '#b45309',
            danger: '#b91c1c',
            info: '#1d4ed8',
            border: '#d7e5f2',
            chartPalette: ['#1767a5', '#0d9488', '#f59e0b'],
          },
          typography: {
            fontFamily: 'Georgia, serif',
            fontSize: '14px',
            headingFontFamily: 'Avenir Next, sans-serif',
          },
          spacing: {
            unit: 8,
            widgetPadding: '16px',
            gridGap: '16px',
          },
        },
      }),
    );

    expect(initMock).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({
        color: ['#1767a5', '#0d9488', '#f59e0b'],
        textStyle: expect.objectContaining({
          fontFamily: 'Georgia, serif',
          color: '#261b12',
        }),
      }),
      expect.objectContaining({ renderer: 'canvas' }),
    );
  });

  it('defaults interactive tooltips to hover-only when emitting widget click events', () => {
    render(
      React.createElement(BaseChart, {
        option: {
          tooltip: {
            trigger: 'axis',
          },
        },
        widgetId: 'chart-3',
        onEvent: vi.fn(),
      }),
    );

    expect(chartInstance.setOption).toHaveBeenCalledWith(
      expect.objectContaining({
        tooltip: expect.objectContaining({
          trigger: 'axis',
          triggerOn: 'mousemove',
        }),
      }),
      { notMerge: true },
    );
  });

  it('preserves explicit tooltip triggerOn values for interactive charts', () => {
    render(
      React.createElement(BaseChart, {
        option: {
          tooltip: {
            trigger: 'axis',
            triggerOn: 'click',
          },
        },
        widgetId: 'chart-4',
        onEvent: vi.fn(),
      }),
    );

    expect(chartInstance.setOption).toHaveBeenCalledWith(
      expect.objectContaining({
        tooltip: expect.objectContaining({
          trigger: 'axis',
          triggerOn: 'click',
        }),
      }),
      { notMerge: true },
    );
  });

  it('falls back to the hovered datum when zrender receives the click first', async () => {
    const onEvent = vi.fn();

    const { container } = render(
      React.createElement(BaseChart, {
        option: {
          series: [
            {
              data: [
                {
                  value: 6400,
                  __ssPayload: {
                    region: 'North',
                    revenue: 6400,
                  },
                },
              ],
            },
          ],
        },
        widgetId: 'chart-5',
        onEvent,
      }),
    );

    const mouseoverHandler = chartInstance.on.mock.calls.find(
      ([eventName]) => eventName === 'mouseover',
    )?.[1] as (params: unknown) => void;
    const chartElement = container.querySelector('.ss-chart');
    expect(chartElement).toBeTruthy();

    mouseoverHandler({
      data: {
        __ssPayload: {
          region: 'North',
          revenue: 6400,
        },
      },
    });
    fireEvent.click(chartElement as Element);
    await Promise.resolve();

    expect(onEvent).toHaveBeenCalledWith({
      type: 'click',
      widgetId: 'chart-5',
      payload: {
        region: 'North',
        revenue: 6400,
      },
    });
  });

  it('maps native chart clicks back to category data when echarts click payload is unavailable', async () => {
    const onEvent = vi.fn();
    chartInstance.containPixel.mockReturnValue(true);
    chartInstance.convertFromPixel.mockReturnValue([6400, 'East']);

    const { container } = render(
      React.createElement(BaseChart, {
        option: {
          xAxis: { type: 'value' },
          yAxis: { type: 'category', data: ['North', 'South', 'East', 'West'] },
          series: [
            {
              data: [
                { value: 6400, __ssPayload: { region: 'North', revenue: 6400 } },
                { value: 5200, __ssPayload: { region: 'South', revenue: 5200 } },
                { value: 3600, __ssPayload: { region: 'East', revenue: 3600 } },
                { value: 4400, __ssPayload: { region: 'West', revenue: 4400 } },
              ],
            },
          ],
        },
        widgetId: 'chart-7',
        onEvent,
      }),
    );

    const chartElement = container.querySelector('.ss-chart');
    expect(chartElement).toBeTruthy();

    vi.spyOn(chartElement as HTMLDivElement, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 400,
      bottom: 300,
      width: 400,
      height: 300,
      toJSON: () => ({}),
    } as DOMRect);

    fireEvent.click(chartElement as Element, { clientX: 200, clientY: 120 });
    await Promise.resolve();

    expect(onEvent).toHaveBeenCalledWith({
      type: 'click',
      widgetId: 'chart-7',
      payload: {
        region: 'East',
        revenue: 3600,
      },
    });
  });

  it('skips unregistering listeners after the chart has already been disposed', () => {
    const { unmount } = render(
      React.createElement(BaseChart, {
        option: {},
        widgetId: 'chart-disposed-cleanup',
        onEvent: vi.fn(),
      }),
    );

    chartInstance.off.mockClear();
    chartInstance.isDisposed.mockReturnValue(true);

    unmount();

    expect(chartInstance.off).not.toHaveBeenCalled();
  });

  it('does not emit duplicate events when echarts click fires for the same interaction', async () => {
    const onEvent = vi.fn();

    const { container } = render(
      React.createElement(BaseChart, {
        option: {
          series: [
            {
              data: [
                {
                  value: 5200,
                  __ssPayload: {
                    region: 'South',
                    revenue: 5200,
                  },
                },
              ],
            },
          ],
        },
        widgetId: 'chart-6',
        onEvent,
      }),
    );

    const clickHandler = chartInstance.on.mock.calls.find(
      ([eventName]) => eventName === 'click',
    )?.[1] as (params: unknown) => void;
    const mouseoverHandler = chartInstance.on.mock.calls.find(
      ([eventName]) => eventName === 'mouseover',
    )?.[1] as (params: unknown) => void;
    const chartElement = container.querySelector('.ss-chart');
    expect(chartElement).toBeTruthy();

    mouseoverHandler({
      data: {
        __ssPayload: {
          region: 'South',
          revenue: 5200,
        },
      },
    });
    fireEvent.click(chartElement as Element);
    clickHandler({
      data: {
        __ssPayload: {
          region: 'South',
          revenue: 5200,
        },
      },
    });
    await Promise.resolve();

    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith({
      type: 'click',
      widgetId: 'chart-6',
      payload: {
        region: 'South',
        revenue: 5200,
      },
    });
  });

  it('skips setOption when the chart instance is already disposed', () => {
    chartInstance.isDisposed.mockReturnValue(true);

    render(
      React.createElement(BaseChart, {
        option: { title: { text: 'Disposed' } },
      }),
    );

    expect(chartInstance.setOption).not.toHaveBeenCalled();
  });
});
