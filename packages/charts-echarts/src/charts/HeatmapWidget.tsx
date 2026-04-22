/**
 * Heatmap chart widget — wraps ECharts heatmap series.
 * config.xField: string — field for x-axis categories
 * config.yField: string — field for y-axis categories
 * config.valueField: string — field for cell intensity
 */
import { useMemo } from 'react';
import { HeatmapChart as EChartsHeatmap } from 'echarts/charts';
import { VisualMapComponent } from 'echarts/components';
import type { WidgetProps } from '@supersubset/runtime';
import { BaseChart, echarts } from '../base/BaseChart';
import {
  extractSharedConfig,
  buildColorOption,
  buildTooltipOption,
  buildGridOption,
  formatNumber,
  buildTitleOption,
} from '../base/shared-options';

echarts.use([EChartsHeatmap, VisualMapComponent]);

export function HeatmapWidget({ config, data, columns, title, height, theme }: WidgetProps) {
  const option = useMemo(() => {
    if (!data || data.length === 0) {
      return buildEmptyOption(title);
    }

    const xField = (config.xField as string) ?? columns?.[0]?.fieldId ?? '';
    const yField = (config.yField as string) ?? columns?.[1]?.fieldId ?? '';
    const valueField = (config.valueField as string) ?? columns?.[2]?.fieldId ?? '';
    const cellBorderWidth = (config.cellBorderWidth as number) ?? 1;
    const cellBorderColor = (config.cellBorderColor as string) ?? '#fff';
    const shared = extractSharedConfig(config);
    const colors = buildColorOption(shared);

    // Collect unique categories
    const xCategories = [...new Set(data.map((row) => String(row[xField] ?? '')))];
    const yCategories = [...new Set(data.map((row) => String(row[yField] ?? '')))];

    // Build heatmap data as [xIdx, yIdx, value]
    let minVal = Infinity;
    let maxVal = -Infinity;
    const heatmapData = data.map((row) => {
      const x = xCategories.indexOf(String(row[xField] ?? ''));
      const y = yCategories.indexOf(String(row[yField] ?? ''));
      const v = Number(row[valueField] ?? 0);
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
      return [x, y, v];
    });

    const fmt = shared.numberFormat;

    return {
      ...(buildTitleOption(title) ? { title: buildTitleOption(title) } : {}),
      tooltip: {
        ...buildTooltipOption(shared, 'item'),
        position: 'top',
        formatter: (params: { data: number[] }) => {
          const [xi, yi, v] = params.data;
          const val = fmt ? formatNumber(v, fmt) : String(v);
          return `${xCategories[xi]} × ${yCategories[yi]}: ${val}`;
        },
      },
      grid: buildGridOption(shared),
      xAxis: {
        type: 'category' as const,
        data: xCategories,
        splitArea: { show: true },
        name: shared.xAxisTitle,
      },
      yAxis: {
        type: 'category' as const,
        data: yCategories,
        splitArea: { show: true },
        name: shared.yAxisTitle,
      },
      visualMap: {
        min: minVal === Infinity ? 0 : minVal,
        max: maxVal === -Infinity ? 100 : maxVal,
        calculable: true,
        orient: 'horizontal' as const,
        left: 'center',
        bottom: '0%',
        ...(colors.length >= 2 ? { inRange: { color: [colors[0], colors[1]] } } : {}),
      },
      series: [
        {
          type: 'heatmap' as const,
          data: heatmapData,
          label: {
            show: shared.showValues !== false,
            ...(fmt
              ? { formatter: (params: { data: number[] }) => formatNumber(params.data[2], fmt) }
              : {}),
          },
          itemStyle: {
            borderWidth: cellBorderWidth,
            borderColor: cellBorderColor,
          },
          emphasis: {
            itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' },
          },
        },
      ],
    };
  }, [config, data, columns, title]);

  return <BaseChart option={option} height={height} theme={theme} />;
}

function buildEmptyOption(title?: string) {
  return {
    title: {
      text: title ?? 'Heatmap',
      subtext: 'No data available',
      left: 'center',
      top: 'center',
      textStyle: { color: '#999', fontSize: 14 },
    },
  };
}
