/**
 * Bar chart widget — wraps ECharts bar series.
 * Supports vertical bars, horizontal bars, and stacked bars.
 */
import { useMemo } from 'react';
import { BarChart as EChartsBar } from 'echarts/charts';
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

echarts.use([EChartsBar]);

export function BarChartWidget({ config, data, columns, title, height, widgetId, onEvent }: WidgetProps) {
  const option = useMemo(() => {
    if (!data || data.length === 0) {
      return buildEmptyOption(title);
    }

    const xField = (config.xField as string) ?? columns?.[0]?.fieldId;
    const yFields = (config.yFields as string[]) ?? columns?.slice(1).map((c) => c.fieldId) ?? [];
    const horizontal = config.horizontal === true;
    const stacked = config.stacked === true;
    const barWidth = config.barWidth as string | number | undefined;
    const barGap = config.barGap as string | undefined;
    const borderRadius = (config.borderRadius as number) ?? 0;
    const barMinHeight = (config.barMinHeight as number) ?? 0;
    const shared = extractSharedConfig(config);
    const label = buildLabelOption(shared);
    const hasTitle = Boolean(title);
    const legend = buildLegendOption(shared, yFields, hasTitle);

    const categoryData = data.map((row) => String(row[xField ?? ''] ?? ''));
    const catAxis = buildCategoryAxisOption(shared, categoryData, horizontal ? 'y' : 'x');
    const valAxis = buildValueAxisOption(shared, horizontal ? 'x' : 'y');

    return {
      ...(buildTitleOption(title) ? { title: buildTitleOption(title) } : {}),
      color: buildColorOption(shared),
      tooltip: buildTooltipOption(shared, 'axis'),
      legend,
      grid: buildGridOption(shared, { hasTitle, hasLegend: Boolean(legend) }),
      xAxis: horizontal ? valAxis : catAxis,
      yAxis: horizontal ? catAxis : valAxis,
      dataZoom: buildDataZoomOption(shared),
      series: yFields.map((field) => ({
        name: field,
        type: 'bar' as const,
        data: data.map((row) => ({
          value: row[field],
          __ssPayload: {
            ...row,
            ...(xField ? { [xField]: row[xField] } : {}),
            [field]: row[field],
          },
        })),
        stack: stacked ? 'total' : undefined,
        barWidth: barWidth || undefined,
        barGap: barGap || undefined,
        barMinHeight: barMinHeight || undefined,
        itemStyle: borderRadius > 0 ? { borderRadius } : undefined,
        ...(label ? { label } : {}),
      })),
    };
  }, [config, data, columns, title]);

  return <BaseChart option={option} height={height} widgetId={widgetId} onEvent={onEvent} />;
}

function buildEmptyOption(title?: string) {
  return {
    title: {
      text: title ?? 'Bar Chart',
      subtext: 'No data available',
      left: 'center',
      top: 'center',
      textStyle: { color: '#999', fontSize: 14 },
    },
  };
}
