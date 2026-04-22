/**
 * Gauge widget — wraps ECharts gauge series.
 * Displays a single metric as a percentage/progress gauge.
 * config.valueField: string — field for the gauge value
 * config.min: number — minimum (default 0)
 * config.max: number — maximum (default 100)
 * config.thresholds?: Array<{ value: number; color: string }> — color zones
 */
import { useMemo } from 'react';
import { GaugeChart as EChartsGauge } from 'echarts/charts';
import type { WidgetProps } from '@supersubset/runtime';
import { BaseChart, echarts } from '../base/BaseChart';
import {
  extractSharedConfig,
  buildColorOption,
  formatNumber,
  buildTitleOption,
} from '../base/shared-options';

echarts.use([EChartsGauge]);

export function GaugeWidget({ config, data, title, height, theme }: WidgetProps) {
  const option = useMemo(() => {
    const valueField = (config.valueField as string) ?? '';
    const row = data?.[0];
    const value = row ? Number(row[valueField] ?? 0) : 0;
    const min = (config.min as number) ?? (config.minValue as number) ?? 0;
    const max = (config.max as number) ?? (config.maxValue as number) ?? 100;
    const thresholds = config.thresholds as Array<{ value: number; color: string }> | undefined;
    const startAngle = (config.startAngle as number) ?? 225;
    const endAngle = (config.endAngle as number) ?? -45;
    const roundCap = config.roundCap === true || config.roundCap === 'true';
    const splitCount = (config.splitCount as number) ?? 10;
    const progressMode = config.progressMode === true || config.progressMode === 'true';
    const shared = extractSharedConfig(config);
    const colors = buildColorOption(shared);
    const fmt = shared.numberFormat;

    const axisLine: Record<string, unknown> = {};
    if (progressMode) {
      // In progress mode, the axis line is a neutral track behind the progress bar
      axisLine.lineStyle = { width: 15, color: [[1, '#e6e8eb']] };
    } else if (thresholds && thresholds.length > 0) {
      const colorStops = thresholds.map((t) => [(t.value - min) / (max - min), t.color]);
      axisLine.lineStyle = { width: 15, color: colorStops };
    } else if (colors.length >= 1) {
      // Use color from palette for the gauge pointer
      axisLine.lineStyle = { width: 15, color: [[1, colors[0]]] };
    }

    const progressColor = colors.length >= 1 ? colors[0] : '#1FA8C9';

    return {
      ...(buildTitleOption(title) ? { title: buildTitleOption(title) } : {}),
      series: [
        {
          type: 'gauge' as const,
          min,
          max,
          startAngle,
          endAngle,
          roundCap,
          splitNumber: splitCount,
          ...(progressMode
            ? { progress: { show: true, roundCap, itemStyle: { color: progressColor } } }
            : {}),
          data: [{ value, name: title ?? '' }],
          ...(thresholds || colors.length >= 1 ? { axisLine } : {}),
          detail: {
            formatter: fmt ? (v: number) => formatNumber(v, fmt) : '{value}',
            fontSize: 24,
            fontWeight: 'bold' as const,
          },
          title: {
            fontSize: 13,
            offsetCenter: [0, '70%'],
          },
        },
      ],
    };
  }, [config, data, title]);

  return <BaseChart option={option} height={height} theme={theme} />;
}
