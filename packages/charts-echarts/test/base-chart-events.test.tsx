import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';

const { chartInstance, initMock } = vi.hoisted(() => {
  const instance = {
    on: vi.fn(),
    off: vi.fn(),
    setOption: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
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
});
