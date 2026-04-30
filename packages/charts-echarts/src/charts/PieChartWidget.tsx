/**
 * Pie / Donut chart widget — wraps ECharts pie series.
 * config.donut: boolean — if true, renders as donut (inner radius 40%)
 * config.nameField: string — field for slice labels
 * config.valueField: string — field for slice values
 * config.roseType: 'radius' | 'area' — optional rose/nightingale variant
 */
import { useMemo } from 'react';
import { PieChart as EChartsPie } from 'echarts/charts';
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

echarts.use([EChartsPie]);

export function PieChartWidget({ config, data, columns, title, height, theme }: WidgetProps) {
  const option = useMemo(() => {
    if (!data || data.length === 0) {
      return buildEmptyOption(title);
    }

    const nameField = (config.nameField as string) ?? columns?.[0]?.fieldId ?? '';
    const valueField = (config.valueField as string) ?? columns?.[1]?.fieldId ?? '';
    const donut = config.donut === true || config.variant === 'donut';
    const roseType =
      (config.roseType as 'radius' | 'area' | undefined) ??
      (config.variant === 'rose' ? 'radius' : undefined);
    const explicitInner = config.innerRadius != null ? Number(config.innerRadius) : null;
    const innerRadius = explicitInner != null && explicitInner > 0 ? explicitInner : donut ? 40 : 0;
    const outerRadius = config.outerRadius != null ? (config.outerRadius as number) : 70;
    const labelPosition =
      (config.labelPosition as 'outside' | 'inside' | 'center' | 'none') ?? 'outside';
    const padAngle = (config.padAngle as number) ?? 0;
    const shared = extractSharedConfig(config);

    const seriesData = data.map((row) => ({
      name: String(row[nameField] ?? ''),
      value: Number(row[valueField] ?? 0),
    }));

    const sliceNames = seriesData.map((d) => d.name);
    const hasTitle = Boolean(title);

    const labelFormatter = shared.numberFormat
      ? (params: { name: string; percent: number; value: number }) =>
          `${params.name}: ${formatNumber(params.value, shared.numberFormat!)}`
      : '{b}: {d}%';

    const labelConfig =
      labelPosition === 'none'
        ? { show: false }
        : {
            show: true,
            position: labelPosition === 'center' ? 'center' : labelPosition,
            formatter: shared.showValues === false ? '{b}' : labelFormatter,
          };

    return {
      ...(buildTitleOption(title) ? { title: buildTitleOption(title) } : {}),
      color: buildColorOption(shared),
      tooltip: {
        ...buildTooltipOption(shared, 'item'),
        formatter: shared.numberFormat
          ? (params: { name: string; value: number; percent: number }) =>
              `${params.name}: ${formatNumber(params.value, shared.numberFormat!)} (${params.percent}%)`
          : '{b}: {c} ({d}%)',
      },
      legend: buildLegendOption(shared, sliceNames, hasTitle) ?? {
        orient: 'vertical' as const,
        left: 'left',
      },
      series: [
        {
          type: 'pie' as const,
          data: seriesData,
          radius: [`${innerRadius}%`, `${outerRadius}%`],
          emphasis: {
            itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' },
          },
          label: labelConfig,
          ...(roseType ? { roseType } : {}),
          ...(padAngle > 0 ? { padAngle } : {}),
        },
      ],
    };
  }, [config, data, columns, title]);

  return <BaseChart option={option} height={height} theme={theme} />;
}

function buildEmptyOption(title?: string) {
  return {
    title: {
      text: title ?? 'Pie Chart',
      subtext: 'No data available',
      left: 'center',
      top: 'center',
      textStyle: { color: '#999', fontSize: 14 },
    },
  };
}
