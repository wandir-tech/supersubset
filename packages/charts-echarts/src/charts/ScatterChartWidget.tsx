/**
 * Scatter chart widget — wraps ECharts scatter series.
 * config.xField: string — field for x-axis values
 * config.yField: string — field for y-axis values
 * config.sizeField?: string — optional field for bubble size
 * config.colorField?: string — optional field for color grouping
 */
import { useMemo } from 'react';
import { ScatterChart as EChartsScatter } from 'echarts/charts';
import { VisualMapComponent } from 'echarts/components';
import type { WidgetProps } from '@supersubset/runtime';
import { BaseChart, echarts } from '../base/BaseChart';
import {
  extractSharedConfig,
  buildColorOption,
  buildLegendOption,
  buildTooltipOption,
  buildGridOption,
  buildValueAxisOption,
  buildDataZoomOption,
  buildLabelOption,
  buildTitleOption,
} from '../base/shared-options';

echarts.use([EChartsScatter, VisualMapComponent]);

export function ScatterChartWidget({ config, data, columns, title, height }: WidgetProps) {
  const option = useMemo(() => {
    if (!data || data.length === 0) {
      return buildEmptyOption(title);
    }

    const xField = (config.xField as string) ?? columns?.[0]?.fieldId ?? '';
    const yField = (config.yField as string) ?? columns?.[1]?.fieldId ?? '';
    const sizeField = config.sizeField as string | undefined;
    const colorField = config.colorField as string | undefined;
    const symbolSizeVal = (config.symbolSize as number) ?? 10;
    const opacity = (config.opacity as number) ?? 0.8;
    const shared = extractSharedConfig(config);
    const label = buildLabelOption(shared);
    const hasTitle = Boolean(title);

    const xAxisOpt = { ...buildValueAxisOption(shared, 'x'), name: shared.xAxisTitle || xField };
    const yAxisOpt = { ...buildValueAxisOption(shared, 'y'), name: shared.yAxisTitle || yField };

    const sizeMapper = sizeField
      ? (val: unknown[]) => Math.sqrt(Number(val[2] ?? 1)) * 2
      : symbolSizeVal;

    // Group by colorField if specified
    if (colorField) {
      const groups = new Map<string, Array<[number, number, number?]>>();
      for (const row of data) {
        const group = String(row[colorField] ?? 'Other');
        const point: [number, number, number?] = [
          Number(row[xField] ?? 0),
          Number(row[yField] ?? 0),
        ];
        if (sizeField) point.push(Number(row[sizeField] ?? 1));
        if (!groups.has(group)) groups.set(group, []);
        groups.get(group)!.push(point);
      }

      const groupNames = Array.from(groups.keys());
      const legend = buildLegendOption(shared, groupNames, hasTitle);

      return {
        ...(buildTitleOption(title) ? { title: buildTitleOption(title) } : {}),
        color: buildColorOption(shared),
        tooltip: buildTooltipOption(shared, 'item'),
        legend,
        grid: buildGridOption(shared, { hasTitle, hasLegend: Boolean(legend) }),
        xAxis: xAxisOpt,
        yAxis: yAxisOpt,
        dataZoom: buildDataZoomOption(shared),
        series: Array.from(groups.entries()).map(([name, points]) => ({
          name,
          type: 'scatter' as const,
          data: points,
          symbolSize: sizeMapper,
          itemStyle: { opacity },
          ...(label ? { label } : {}),
        })),
      };
    }

    // Single series
    const scatterData = data.map((row) => {
      const point: number[] = [Number(row[xField] ?? 0), Number(row[yField] ?? 0)];
      if (sizeField) point.push(Number(row[sizeField] ?? 1));
      return point;
    });

    return {
      ...(buildTitleOption(title) ? { title: buildTitleOption(title) } : {}),
      color: buildColorOption(shared),
      tooltip: buildTooltipOption(shared, 'item'),
      grid: buildGridOption(shared, { hasTitle, hasLegend: false }),
      xAxis: xAxisOpt,
      yAxis: yAxisOpt,
      dataZoom: buildDataZoomOption(shared),
      series: [
        {
          type: 'scatter' as const,
          data: scatterData,
          symbolSize: sizeMapper,
          itemStyle: { opacity },
          ...(label ? { label } : {}),
        },
      ],
    };
  }, [config, data, columns, title]);

  return <BaseChart option={option} height={height} />;
}

function buildEmptyOption(title?: string) {
  return {
    title: {
      text: title ?? 'Scatter Chart',
      subtext: 'No data available',
      left: 'center',
      top: 'center',
      textStyle: { color: '#999', fontSize: 14 },
    },
  };
}
