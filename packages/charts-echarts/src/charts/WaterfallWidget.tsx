/**
 * Waterfall chart widget — simulates waterfall using ECharts stacked bar.
 * config.nameField: string — field for category labels
 * config.valueField: string — field for values (positive = increase, negative = decrease)
 * config.totalLabel?: string — if the last item should be rendered as total
 */
import { useMemo } from 'react';
import { BarChart as EChartsBar } from 'echarts/charts';
import type { WidgetProps } from '@supersubset/runtime';
import { BaseChart, echarts } from '../base/BaseChart';
import {
  extractSharedConfig,
  buildTooltipOption,
  buildGridOption,
  buildCategoryAxisOption,
  buildValueAxisOption,
  buildDataZoomOption,
  buildLabelOption,
  buildTitleOption,
} from '../base/shared-options';

echarts.use([EChartsBar]);

export function WaterfallWidget({ config, data, columns, title, height, theme }: WidgetProps) {
  const option = useMemo(() => {
    if (!data || data.length === 0) {
      return buildEmptyOption(title);
    }

    const nameField =
      (config.nameField as string | undefined) ??
      (config.categoryField as string | undefined) ??
      columns?.[0]?.fieldId ??
      '';
    const valueField = (config.valueField as string) ?? columns?.[1]?.fieldId ?? '';
    const totalLabel = config.totalLabel as string | undefined;
    const increaseColor = (config.increaseColor as string) ?? '#52c41a';
    const decreaseColor = (config.decreaseColor as string) ?? '#f5222d';
    const totalColor = (config.totalColor as string) ?? '#1890ff';
    const shared = extractSharedConfig(config);
    const label = buildLabelOption(shared);

    const categories: string[] = [];
    const baseValues: number[] = []; // invisible stacked base
    const increaseValues: (number | '-')[] = [];
    const decreaseValues: (number | '-')[] = [];
    const totalIndices: number[] = [];

    let running = 0;
    for (const row of data) {
      const name = String(row[nameField] ?? '');
      const value = Number(row[valueField] ?? 0);
      categories.push(name);

      if (totalLabel && name === totalLabel) {
        // Total bar starts from 0
        baseValues.push(0);
        increaseValues.push(running);
        decreaseValues.push('-');
        totalIndices.push(categories.length - 1);
      } else if (value >= 0) {
        baseValues.push(running);
        increaseValues.push(value);
        decreaseValues.push('-');
        running += value;
      } else {
        running += value;
        baseValues.push(running);
        increaseValues.push('-');
        decreaseValues.push(Math.abs(value));
      }
    }

    return {
      ...(buildTitleOption(title) ? { title: buildTitleOption(title) } : {}),
      tooltip: { ...buildTooltipOption(shared, 'axis'), axisPointer: { type: 'shadow' as const } },
      grid: buildGridOption(shared),
      xAxis: buildCategoryAxisOption(shared, categories),
      yAxis: buildValueAxisOption(shared, 'y'),
      dataZoom: buildDataZoomOption(shared),
      series: [
        {
          name: 'Base',
          type: 'bar' as const,
          stack: 'waterfall',
          data: baseValues,
          itemStyle: { color: 'transparent' },
          emphasis: { itemStyle: { color: 'transparent' } },
        },
        {
          name: 'Increase',
          type: 'bar' as const,
          stack: 'waterfall',
          data: increaseValues.map((v, i) =>
            totalIndices.includes(i) ? { value: v, itemStyle: { color: totalColor } } : v,
          ),
          itemStyle: { color: increaseColor },
          ...(label ? { label } : {}),
        },
        {
          name: 'Decrease',
          type: 'bar' as const,
          stack: 'waterfall',
          data: decreaseValues,
          itemStyle: { color: decreaseColor },
          ...(label ? { label } : {}),
        },
      ],
    };
  }, [config, data, columns, title]);

  return <BaseChart option={option} height={height} theme={theme} />;
}

function buildEmptyOption(title?: string) {
  return {
    title: {
      text: title ?? 'Waterfall Chart',
      subtext: 'No data available',
      left: 'center',
      top: 'center',
      textStyle: { color: '#999', fontSize: 14 },
    },
  };
}
