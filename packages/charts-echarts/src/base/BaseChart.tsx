/**
 * BaseChart — shared ECharts wrapper used by all chart type components.
 * Handles initialization, resize, dispose lifecycle.
 */
import { useRef, useEffect, useMemo, type CSSProperties } from 'react';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import type { WidgetEvent } from '@supersubset/runtime';
import { themeToEChartsTheme, type ResolvedTheme } from '@supersubset/theme';
import {
  DataZoomComponent,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DatasetComponent,
} from 'echarts/components';

// Register core components once
echarts.use([
  CanvasRenderer,
  DataZoomComponent,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DatasetComponent,
]);

export interface BaseChartProps {
  option: echarts.EChartsCoreOption;
  width?: number;
  height?: number;
  theme?: string | Record<string, unknown>;
  className?: string;
  style?: CSSProperties;
  widgetId?: string;
  onEvent?: (event: WidgetEvent) => void;
  buildClickPayload?: (params: unknown) => Record<string, unknown> | undefined;
}

interface ChartTestClickDetail {
  seriesIndex?: number;
  dataIndex?: number;
}

type ChartTestWindow = Window & {
  __SUPERSUBSET_ENABLE_CHART_TEST_HOOKS__?: boolean;
  __SUPERSUBSET_CHART_TEST_CLICKS__?: Array<Record<string, unknown>>;
};

export function BaseChart({
  option,
  width,
  height,
  theme,
  className,
  style,
  widgetId,
  onEvent,
  buildClickPayload,
}: BaseChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const echartsTheme = useMemo(() => toEChartsTheme(theme), [theme]);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = echarts.init(containerRef.current, echartsTheme ?? undefined, {
      renderer: 'canvas',
    });
    chartRef.current = chart;

    // ResizeObserver for responsive sizing
    const observer = new ResizeObserver(() => {
      if (chartRef.current !== chart || isChartDisposed(chart)) {
        return;
      }
      chart.resize();
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chartRef.current = null;
      chart.dispose();
    };
  }, [echartsTheme]);

  // Update options
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || isChartDisposed(chart)) return;
    chart.setOption(option, { notMerge: true });
  }, [option]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !onEvent || !widgetId) return;

    const handleClick = (params: unknown) => {
      onEvent({
        type: 'click',
        widgetId,
        payload: buildClickPayload?.(params) ?? extractClickPayload(params),
      });
    };

    chart.on('click', handleClick);
    return () => {
      chart.off('click', handleClick);
    };
  }, [buildClickPayload, echartsTheme, onEvent, widgetId]);

  useEffect(() => {
    const chart = chartRef.current;
    const container = containerRef.current;
    const debugWindow = container?.ownerDocument.defaultView as ChartTestWindow | null;
    if (!chart || !container || !onEvent || !widgetId || !isChartTestHookEnabled(debugWindow)) {
      return;
    }

    const handleTestClick = (event: Event) => {
      const detail = (event as CustomEvent<ChartTestClickDetail>).detail;
      const params = buildSyntheticClickParams(
        option,
        detail?.seriesIndex ?? 0,
        detail?.dataIndex ?? 0,
      );
      if (!params) {
        return;
      }

      if (debugWindow) {
        debugWindow.__SUPERSUBSET_CHART_TEST_CLICKS__ ??= [];
        debugWindow.__SUPERSUBSET_CHART_TEST_CLICKS__.push({
          widgetId,
          payload: buildClickPayload?.(params) ?? extractClickPayload(params),
        });
      }

      onEvent({
        type: 'click',
        widgetId,
        payload: buildClickPayload?.(params) ?? extractClickPayload(params),
      });
    };

    container.addEventListener('ss-chart-test-click', handleTestClick as EventListener);
    return () => {
      container.removeEventListener('ss-chart-test-click', handleTestClick as EventListener);
    };
  }, [buildClickPayload, onEvent, option, widgetId]);

  const containerStyle: CSSProperties = {
    width: width ? `${width}px` : '100%',
    height: height ? `${height}px` : '100%',
    minHeight: '200px',
    ...style,
  };

  return (
    <div
      ref={containerRef}
      className={`ss-chart ${className ?? ''}`.trim()}
      style={containerStyle}
      data-ss-chart-test-hook={
        onEvent &&
        widgetId &&
        isChartTestHookEnabled(typeof window !== 'undefined' ? (window as ChartTestWindow) : null)
          ? 'ready'
          : undefined
      }
    />
  );
}

function isChartTestHookEnabled(debugWindow: ChartTestWindow | null | undefined): boolean {
  return debugWindow?.__SUPERSUBSET_ENABLE_CHART_TEST_HOOKS__ === true;
}

function extractClickPayload(params: unknown): Record<string, unknown> | undefined {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return undefined;
  }

  const payload: Record<string, unknown> = {};
  const record = params as Record<string, unknown>;
  const data = record.data;

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const dataRecord = data as Record<string, unknown>;
    const sourcePayload = dataRecord.__ssPayload;
    if (sourcePayload && typeof sourcePayload === 'object' && !Array.isArray(sourcePayload)) {
      return { ...(sourcePayload as Record<string, unknown>) };
    }

    for (const [key, value] of Object.entries(dataRecord)) {
      if (!key.startsWith('__')) {
        payload[key] = value;
      }
    }
  }

  if (typeof record.name === 'string' && payload.name === undefined) {
    payload.name = record.name;
  }

  if (record.value !== undefined && payload.value === undefined) {
    payload.value = record.value;
  }

  if (typeof record.seriesName === 'string' && payload.seriesName === undefined) {
    payload.seriesName = record.seriesName;
  }

  return Object.keys(payload).length > 0 ? payload : undefined;
}

function buildSyntheticClickParams(
  option: echarts.EChartsCoreOption,
  seriesIndex: number,
  dataIndex: number,
): Record<string, unknown> | undefined {
  const seriesList = Array.isArray(option.series)
    ? option.series
    : option.series !== undefined
      ? [option.series]
      : [];
  const series = seriesList[seriesIndex];
  if (!isRecord(series) || !Array.isArray(series.data)) {
    return undefined;
  }

  const datum = series.data[dataIndex];
  if (datum === undefined) {
    return undefined;
  }

  const params: Record<string, unknown> = {
    data: datum,
  };

  if (typeof series.name === 'string') {
    params.seriesName = series.name;
  }

  if (isRecord(datum)) {
    if (datum.value !== undefined) {
      params.value = datum.value;
    }
    if (typeof datum.name === 'string') {
      params.name = datum.name;
    }
  } else {
    params.value = datum;
  }

  return params;
}

function toEChartsTheme(theme: string | Record<string, unknown> | undefined) {
  if (!theme) {
    return undefined;
  }

  if (typeof theme === 'string') {
    return theme;
  }

  return isResolvedTheme(theme) ? themeToEChartsTheme(theme) : theme;
}

function isResolvedTheme(theme: unknown): theme is ResolvedTheme {
  if (!isRecord(theme)) {
    return false;
  }

  return isRecord(theme.colors) && isRecord(theme.typography) && isRecord(theme.spacing);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Re-export echarts for use/register calls in chart modules
export { echarts };

function isChartDisposed(chart: echarts.ECharts | null): boolean {
  if (!chart) {
    return true;
  }

  const maybeChart = chart as echarts.ECharts & { isDisposed?: () => boolean };
  return typeof maybeChart.isDisposed === 'function' ? maybeChart.isDisposed() : false;
}
