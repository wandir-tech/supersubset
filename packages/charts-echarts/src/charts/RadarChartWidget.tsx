/**
 * Radar chart widget — wraps ECharts radar series.
 * config.indicators: Array<{ name: string; max?: number }> — radar axes
 * config.nameField?: string — field for series grouping
 * config.valueFields: string[] — fields mapped to indicator axes
 */
import { useMemo } from 'react';
import { RadarChart as EChartsRadar } from 'echarts/charts';
import type { WidgetProps } from '@supersubset/runtime';
import { BaseChart, echarts } from '../base/BaseChart';
import {
  extractSharedConfig,
  buildColorOption,
  buildLegendOption,
  buildTooltipOption,
  buildTitleOption,
} from '../base/shared-options';

echarts.use([EChartsRadar]);

export function RadarChartWidget({ config, data, columns, title, height }: WidgetProps) {
  const option = useMemo(() => {
    if (!data || data.length === 0) {
      return buildEmptyOption(title);
    }

    const valueFields = (config.valueFields as string[]) ??
      columns?.map((c) => c.fieldId) ?? [];
    const nameField = config.nameField as string | undefined;
    const shape = (config.shape as 'polygon' | 'circle') ?? 'polygon';
    const areaFill = config.areaFill !== false;
    const shared = extractSharedConfig(config);

    // Build indicators from field names or explicit config
    const configIndicators = config.indicators as Array<{ name: string; max?: number }> | undefined;
    const indicators = configIndicators ?? valueFields.map((f) => {
      // Auto-detect max from data
      const maxVal = Math.max(...data.map((row) => Number(row[f] ?? 0)));
      return { name: f, max: Math.ceil(maxVal * 1.2) || 100 };
    });

    // Build series data — one series per row (or grouped by nameField)
    const seriesData = data.map((row) => ({
      name: nameField ? String(row[nameField] ?? '') : undefined,
      value: valueFields.map((f) => Number(row[f] ?? 0)),
      ...(areaFill ? { areaStyle: { opacity: 0.3 } } : {}),
    }));

    const seriesNames = nameField
      ? seriesData.map((d) => d.name).filter((n): n is string => !!n)
      : undefined;
    const hasTitle = Boolean(title);

    return {
      ...(buildTitleOption(title) ? { title: buildTitleOption(title) } : {}),
      color: buildColorOption(shared),
      tooltip: buildTooltipOption(shared, 'item'),
      legend: buildLegendOption(shared, seriesNames, hasTitle),
      radar: { indicator: indicators, shape },
      series: [
        {
          type: 'radar' as const,
          data: seriesData,
        },
      ],
    };
  }, [config, data, columns, title]);

  return <BaseChart option={option} height={height} />;
}

function buildEmptyOption(title?: string) {
  return {
    title: {
      text: title ?? 'Radar Chart',
      subtext: 'No data available',
      left: 'center',
      top: 'center',
      textStyle: { color: '#999', fontSize: 14 },
    },
  };
}
