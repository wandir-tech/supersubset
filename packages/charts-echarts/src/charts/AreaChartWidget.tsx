/**
 * Area chart widget — wraps ECharts line series with stacked areas.
 * While LineChartWidget supports area via config.area, this widget is optimized
 * for stacked area charts (multiple series stacked on top of each other).
 * config.xField: string — category axis field
 * config.yFields: string[] — value fields (stacked)
 * config.smooth: boolean — smooth lines
 * config.stacked: boolean (default true) — stack areas
 */
import { useMemo } from 'react';
import { LineChart as EChartsLine } from 'echarts/charts';
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

echarts.use([EChartsLine]);

export function AreaChartWidget({ config, data, columns, title, height, theme }: WidgetProps) {
  const option = useMemo(() => {
    if (!data || data.length === 0) {
      return buildEmptyOption(title);
    }

    const xField = (config.xField as string) ?? columns?.[0]?.fieldId ?? '';
    const yFields = (config.yFields as string[]) ?? columns?.slice(1).map((c) => c.fieldId) ?? [];
    const smooth = config.smooth === true;
    const stacked = config.stacked !== false; // default true for area chart
    const areaOpacity = (config.areaOpacity as number) ?? 0.7;
    const step = config.step as 'start' | 'middle' | 'end' | false | undefined;
    const showMarkers = config.showMarkers !== false;
    const connectNulls = config.connectNulls === true;
    const shared = extractSharedConfig(config);
    const label = buildLabelOption(shared);
    const hasTitle = Boolean(title);
    const legend = buildLegendOption(shared, yFields, hasTitle);

    return {
      ...(buildTitleOption(title) ? { title: buildTitleOption(title) } : {}),
      color: buildColorOption(shared),
      tooltip: buildTooltipOption(shared, 'axis'),
      legend,
      grid: buildGridOption(shared, { hasTitle, hasLegend: Boolean(legend) }),
      xAxis: {
        ...buildCategoryAxisOption(
          shared,
          data.map((row) => String(row[xField] ?? '')),
        ),
        boundaryGap: false,
      },
      yAxis: buildValueAxisOption(shared, 'y'),
      dataZoom: buildDataZoomOption(shared),
      series: yFields.map((field) => ({
        name: field,
        type: 'line' as const,
        data: data.map((row) => row[field]),
        smooth,
        connectNulls,
        showSymbol: showMarkers,
        areaStyle: { opacity: areaOpacity },
        emphasis: { focus: 'series' as const },
        ...(label ? { label } : {}),
        ...(step ? { step } : {}),
        ...(stacked ? { stack: 'total' } : {}),
      })),
    };
  }, [config, data, columns, title]);

  return <BaseChart option={option} height={height} theme={theme} />;
}

function buildEmptyOption(title?: string) {
  return {
    title: {
      text: title ?? 'Area Chart',
      subtext: 'No data available',
      left: 'center',
      top: 'center',
      textStyle: { color: '#999', fontSize: 14 },
    },
  };
}
