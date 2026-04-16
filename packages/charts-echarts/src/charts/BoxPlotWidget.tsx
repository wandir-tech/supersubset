/**
 * Box plot widget — wraps ECharts boxplot series.
 * config.categoryField: string — field for group categories
 * config.valueField: string — field for numeric values (will compute min/Q1/median/Q3/max)
 *
 * Alternatively, provide pre-computed data:
 * config.precomputed: true
 * Each row should contain: category, min, q1, median, q3, max
 */
import { useMemo } from 'react';
import { BoxplotChart as EChartsBoxplot } from 'echarts/charts';
import type { WidgetProps } from '@supersubset/runtime';
import { BaseChart, echarts } from '../base/BaseChart';
import {
  extractSharedConfig,
  buildColorOption,
  buildTooltipOption,
  buildGridOption,
  buildCategoryAxisOption,
  buildValueAxisOption,
  buildTitleOption,
} from '../base/shared-options';

echarts.use([EChartsBoxplot]);

export function BoxPlotWidget({ config, data, columns, title, height }: WidgetProps) {
  const option = useMemo(() => {
    if (!data || data.length === 0) {
      return buildEmptyOption(title);
    }

    const categoryField = (config.categoryField as string) ?? columns?.[0]?.fieldId ?? '';
    const valueField = (config.valueField as string) ?? columns?.[1]?.fieldId ?? '';
    const precomputed = config.precomputed === true;
    const boxWidth = config.boxWidth as string | undefined;
    const shared = extractSharedConfig(config);

    if (precomputed) {
      // Expect rows with min, q1, median, q3, max fields
      const categories = data.map((row) => String(row[categoryField] ?? ''));
      const boxData = data.map((row) => [
        Number(row['min'] ?? 0),
        Number(row['q1'] ?? 0),
        Number(row['median'] ?? 0),
        Number(row['q3'] ?? 0),
        Number(row['max'] ?? 0),
      ]);

      return {
        ...(buildTitleOption(title) ? { title: buildTitleOption(title) } : {}),
        ...buildBoxplotOption(categories, boxData, shared, boxWidth),
      };
    }

    // Compute stats from raw values grouped by category
    const groups = new Map<string, number[]>();
    for (const row of data) {
      const cat = String(row[categoryField] ?? '');
      const val = Number(row[valueField] ?? 0);
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(val);
    }

    const categories = Array.from(groups.keys());
    const boxData = categories.map((cat) => {
      const values = groups.get(cat)!.sort((a, b) => a - b);
      return computeBoxStats(values);
    });

    return {
      ...(buildTitleOption(title) ? { title: buildTitleOption(title) } : {}),
      ...buildBoxplotOption(categories, boxData, shared, boxWidth),
    };
  }, [config, data, columns, title]);

  return <BaseChart option={option} height={height} />;
}

function buildBoxplotOption(
  categories: string[],
  boxData: number[][],
  shared: import('../base/shared-options').SharedConfig,
  boxWidth?: string,
) {
  return {
    color: buildColorOption(shared),
    tooltip: buildTooltipOption(shared, 'item'),
    grid: buildGridOption(shared),
    xAxis: buildCategoryAxisOption(shared, categories),
    yAxis: buildValueAxisOption(shared, 'y'),
    series: [
      {
        type: 'boxplot' as const,
        data: boxData,
        ...(boxWidth ? { boxWidth: [boxWidth, boxWidth] } : {}),
      },
    ],
  };
}

function computeBoxStats(sorted: number[]): number[] {
  const n = sorted.length;
  if (n === 0) return [0, 0, 0, 0, 0];
  const min = sorted[0];
  const max = sorted[n - 1];
  const median = percentile(sorted, 0.5);
  const q1 = percentile(sorted, 0.25);
  const q3 = percentile(sorted, 0.75);
  return [min, q1, median, q3, max];
}

function percentile(sorted: number[], p: number): number {
  const idx = (sorted.length - 1) * p;
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

function buildEmptyOption(title?: string) {
  return {
    title: {
      text: title ?? 'Box Plot',
      subtext: 'No data available',
      left: 'center',
      top: 'center',
      textStyle: { color: '#999', fontSize: 14 },
    },
  };
}
