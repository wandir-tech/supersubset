/**
 * Combo (dual-axis) chart widget — renders mixed bar + line on the same chart.
 * config.xField: string — category axis field
 * config.barFields: string[] — fields rendered as bars (left y-axis)
 * config.lineFields: string[] — fields rendered as lines (right y-axis)
 * config.stacked: boolean — stack bars
 */
import { useMemo } from 'react';
import { BarChart as EChartsBar, LineChart as EChartsLine } from 'echarts/charts';
import type { WidgetProps } from '@supersubset/runtime';
import { BaseChart, echarts } from '../base/BaseChart';
import {
  extractSharedConfig,
  buildColorOption,
  buildLegendOption,
  buildTooltipOption,
  buildGridOption,
  buildCategoryAxisOption,
  buildValueAxisOption,
  buildDataZoomOption,
  buildLabelOption,
  buildTitleOption,
} from '../base/shared-options';

echarts.use([EChartsBar, EChartsLine]);

export function ComboChartWidget({ config, data, columns, title, height }: WidgetProps) {
  const option = useMemo(() => {
    if (!data || data.length === 0) {
      return buildEmptyOption(title);
    }

    const xField = (config.xField as string) ?? columns?.[0]?.fieldId ?? '';
    const barFields = (config.barFields as string[]) ?? [];
    const lineFields = (config.lineFields as string[]) ?? [];
    const stacked = config.stacked === true;
    const lineSmooth = config.lineSmooth !== false;
    const barBorderRadius = (config.barBorderRadius as number) ?? 0;
    const shared = extractSharedConfig(config);
    const label = buildLabelOption(shared);

    const categoryData = data.map((row) => String(row[xField] ?? ''));
    const allFields = [...barFields, ...lineFields];
    const hasTitle = Boolean(title);
    const legend = buildLegendOption(shared, allFields, hasTitle);

    const barSeries = barFields.map((field) => ({
      name: field,
      type: 'bar' as const,
      data: data.map((row) => row[field]),
      ...(stacked ? { stack: 'bars' } : {}),
      yAxisIndex: 0,
      ...(barBorderRadius > 0 ? { itemStyle: { borderRadius: barBorderRadius } } : {}),
      ...(label ? { label } : {}),
    }));

    const lineSeries = lineFields.map((field) => ({
      name: field,
      type: 'line' as const,
      data: data.map((row) => row[field]),
      yAxisIndex: lineFields.length > 0 ? 1 : 0,
      smooth: lineSmooth,
      ...(label ? { label } : {}),
    }));

    const grid = buildGridOption(shared, { hasTitle, hasLegend: Boolean(legend) });
    // Extra right margin for dual axis
    grid.right = '8%';

    return {
      ...(buildTitleOption(title) ? { title: buildTitleOption(title) } : {}),
      color: buildColorOption(shared),
      tooltip: buildTooltipOption(shared, 'axis'),
      legend,
      grid,
      xAxis: buildCategoryAxisOption(shared, categoryData),
      yAxis: [
        { ...buildValueAxisOption(shared, 'y'), position: 'left' as const },
        ...(lineFields.length > 0 ? [{ type: 'value' as const, position: 'right' as const }] : []),
      ],
      dataZoom: buildDataZoomOption(shared),
      series: [...barSeries, ...lineSeries],
    };
  }, [config, data, columns, title]);

  return <BaseChart option={option} height={height} />;
}

function buildEmptyOption(title?: string) {
  return {
    title: {
      text: title ?? 'Combo Chart',
      subtext: 'No data available',
      left: 'center',
      top: 'center',
      textStyle: { color: '#999', fontSize: 14 },
    },
  };
}
