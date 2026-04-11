/**
 * Line chart widget — wraps ECharts line/area series.
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

export function LineChartWidget({ config, data, columns, title, height, widgetId, onEvent }: WidgetProps) {
  const option = useMemo(() => {
    if (!data || data.length === 0) {
      return buildEmptyOption(title);
    }

    const xField = (config.xField as string) ?? columns?.[0]?.fieldId;
    const yFields = (config.yFields as string[]) ?? columns?.slice(1).map((c) => c.fieldId) ?? [];
    const showArea = config.area === true;
    const showMarkers = config.showMarkers !== false;
    const markerSize = (config.markerSize as number) ?? 4;
    const step = config.step as 'start' | 'middle' | 'end' | false | undefined;
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
      xAxis: buildCategoryAxisOption(shared, data.map((row) => String(row[xField ?? ''] ?? ''))),
      yAxis: buildValueAxisOption(shared, 'y'),
      dataZoom: buildDataZoomOption(shared),
      series: yFields.map((field) => ({
        name: field,
        type: 'line' as const,
        data: data.map((row) => ({
          value: row[field],
          __ssPayload: {
            ...row,
            ...(xField ? { [xField]: row[xField] } : {}),
            [field]: row[field],
          },
        })),
        smooth: config.smooth === true,
        step: step || undefined,
        connectNulls,
        showSymbol: showMarkers,
        symbolSize: markerSize,
        areaStyle: showArea ? {} : undefined,
        ...(label ? { label } : {}),
      })),
    };
  }, [config, data, columns, title]);

  return <BaseChart option={option} height={height} widgetId={widgetId} onEvent={onEvent} />;
}

function buildEmptyOption(title?: string) {
  return {
    title: {
      text: title ?? 'Line Chart',
      subtext: 'No data available',
      left: 'center',
      top: 'center',
      textStyle: { color: '#999', fontSize: 14 },
    },
  };
}
