/**
 * Funnel chart widget — wraps ECharts funnel series.
 * config.nameField: string — field for stage labels
 * config.valueField: string — field for stage values
 * config.sort: 'descending' | 'ascending' | 'none' (default descending)
 */
import { useMemo } from 'react';
import { FunnelChart as EChartsFunnel } from 'echarts/charts';
import type { WidgetProps } from '@supersubset/runtime';
import { BaseChart, echarts } from '../base/BaseChart';
import {
  extractSharedConfig,
  buildColorOption,
  buildLegendOption,
  buildTooltipOption,
  formatNumber,
  buildTitleOption,
} from '../base/shared-options';

echarts.use([EChartsFunnel]);

export function FunnelChartWidget({ config, data, columns, title, height, theme }: WidgetProps) {
  const option = useMemo(() => {
    if (!data || data.length === 0) {
      return buildEmptyOption(title);
    }

    const nameField = (config.nameField as string) ?? columns?.[0]?.fieldId ?? '';
    const valueField = (config.valueField as string) ?? columns?.[1]?.fieldId ?? '';
    const sort = (config.sort as string) ?? 'descending';
    const funnelAlign = (config.funnelAlign as 'center' | 'left' | 'right') ?? 'center';
    const gap = (config.gap as number) ?? 0;
    const labelPosition =
      (config.labelPosition as 'inside' | 'outside' | 'left' | 'right') ?? 'inside';
    const shared = extractSharedConfig(config);
    const fmt = shared.numberFormat;

    const funnelData = data.map((row) => ({
      name: String(row[nameField] ?? ''),
      value: Number(row[valueField] ?? 0),
    }));

    const stageNames = funnelData.map((d) => d.name);
    const hasTitle = Boolean(title);

    return {
      ...(buildTitleOption(title) ? { title: buildTitleOption(title) } : {}),
      color: buildColorOption(shared),
      tooltip: {
        ...buildTooltipOption(shared, 'item'),
        formatter: fmt
          ? (params: { name: string; value: number }) =>
              `${params.name}: ${formatNumber(params.value, fmt)}`
          : '{b}: {c}',
      },
      legend: buildLegendOption(shared, stageNames, hasTitle) ?? {
        orient: 'vertical' as const,
        left: 'left',
      },
      series: [
        {
          type: 'funnel' as const,
          data: funnelData,
          sort: sort as 'descending' | 'ascending' | 'none',
          funnelAlign,
          gap,
          left: '10%',
          top: 60,
          bottom: 60,
          width: '80%',
          label: {
            show: shared.showValues !== false,
            position: labelPosition,
            formatter: fmt
              ? (params: { name: string; value: number }) =>
                  `${params.name}\n${formatNumber(params.value, fmt)}`
              : '{b}\n{c}',
          },
          emphasis: {
            label: { fontSize: 16 },
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
      text: title ?? 'Funnel Chart',
      subtext: 'No data available',
      left: 'center',
      top: 'center',
      textStyle: { color: '#999', fontSize: 14 },
    },
  };
}
