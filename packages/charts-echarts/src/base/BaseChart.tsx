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
      chart.resize();
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, [echartsTheme]);

  // Update options
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.setOption(option, { notMerge: true });
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
    />
  );
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
