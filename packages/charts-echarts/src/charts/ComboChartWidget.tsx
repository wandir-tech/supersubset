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
import {
  resolveBarFields,
  resolveCategoryField,
  resolveLineFields,
} from '../base/resolve-field-keys';

echarts.use([EChartsBar, EChartsLine]);

function readConfigString(config: Record<string, unknown>, key: string): string | undefined {
  const value = config[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function applyCumulativeLineSeries(
  data: Array<Record<string, unknown>>,
  config: Record<string, unknown>,
  barFields: string[],
  lineFields: string[],
): { data: Array<Record<string, unknown>>; lineFields: string[] } {
  const cumulativeFromField = readConfigString(config, 'cumulativeFromField');
  const lineField = readConfigString(config, 'lineField');
  if (!cumulativeFromField || !lineField) {
    return { data, lineFields };
  }

  let cumulative = 0;
  const enriched = data.map((row) => {
    const rawIncrement =
      row[cumulativeFromField] ?? (barFields[0] != null ? row[barFields[0]] : undefined);
    const increment =
      typeof rawIncrement === 'number'
        ? rawIncrement
        : rawIncrement == null
          ? 0
          : Number(rawIncrement) || 0;
    cumulative += increment;
    return { ...row, [lineField]: cumulative };
  });

  return {
    data: enriched,
    lineFields: lineFields.length > 0 ? lineFields : [lineField],
  };
}

export function ComboChartWidget({ config, data, columns, title, height, theme }: WidgetProps) {
  const option = useMemo(() => {
    if (!data || data.length === 0) {
      return buildEmptyOption(title);
    }

    const xField = resolveCategoryField(config, columns);
    const barFields = resolveBarFields(config, columns);
    let lineFields = resolveLineFields(config, columns);
    const { data: chartData, lineFields: effectiveLineFields } = applyCumulativeLineSeries(
      data,
      config,
      barFields,
      lineFields,
    );
    lineFields = effectiveLineFields;
    const stacked = config.stacked === true;
    const lineSmooth = config.lineSmooth !== false;
    const barBorderRadius = (config.barBorderRadius as number) ?? 0;
    const barLabel = readConfigString(config, 'barLabel');
    const lineLabel = readConfigString(config, 'lineLabel');
    const shared = extractSharedConfig(config);
    const label = buildLabelOption(shared);

    const categoryData = chartData.map((row) => String(row[xField] ?? ''));
    const allFields = [
      ...barFields.map((field) => barLabel ?? field),
      ...lineFields.map((field) => lineLabel ?? field),
    ];
    const hasTitle = Boolean(title);
    const legend = buildLegendOption(shared, allFields, hasTitle);

    const barSeries = barFields.map((field) => ({
      name: barLabel ?? field,
      type: 'bar' as const,
      data: chartData.map((row) => row[field]),
      yAxisIndex: 0,
      ...(label ? { label } : {}),
      ...(stacked ? { stack: 'bars' } : {}),
      ...(barBorderRadius > 0 ? { itemStyle: { borderRadius: barBorderRadius } } : {}),
    }));

    const lineSeries = lineFields.map((field) => ({
      name: lineLabel ?? field,
      type: 'line' as const,
      data: chartData.map((row) => row[field]),
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

  return <BaseChart option={option} height={height} theme={theme} />;
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
