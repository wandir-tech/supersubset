/**
 * Treemap chart widget — wraps ECharts treemap series.
 * config.nameField: string — field for node labels
 * config.valueField: string — field for node values (area)
 * config.parentField?: string — optional field for hierarchy parent
 */
import { useMemo } from 'react';
import { TreemapChart as EChartsTreemap } from 'echarts/charts';
import type { WidgetProps } from '@supersubset/runtime';
import { BaseChart, echarts } from '../base/BaseChart';
import {
  extractSharedConfig,
  buildColorOption,
  buildTooltipOption,
  formatNumber,
  buildTitleOption,
} from '../base/shared-options';

echarts.use([EChartsTreemap]);

export function TreemapWidget({ config, data, columns, title, height }: WidgetProps) {
  const option = useMemo(() => {
    if (!data || data.length === 0) {
      return buildEmptyOption(title);
    }

    const nameField = (config.nameField as string) ?? columns?.[0]?.fieldId ?? '';
    const valueField = (config.valueField as string) ?? columns?.[1]?.fieldId ?? '';
    const parentField = config.parentField as string | undefined;
    const showUpperLabel = config.showUpperLabel === true;
    const maxDepth = (config.maxDepth as number) ?? -1;
    const borderWidth = (config.borderWidth as number) ?? 0;
    const shared = extractSharedConfig(config);
    const fmt = shared.numberFormat;

    let treeData: Array<{
      name: string;
      value: number;
      children?: Array<{ name: string; value: number }>;
    }>;

    if (parentField) {
      // Build hierarchy from parent field
      const nodeMap = new Map<
        string,
        { name: string; value: number; children: Array<{ name: string; value: number }> }
      >();
      const roots: typeof treeData = [];

      for (const row of data) {
        const name = String(row[nameField] ?? '');
        const value = Number(row[valueField] ?? 0);
        const parent = row[parentField] ? String(row[parentField]) : null;

        if (!nodeMap.has(name)) {
          nodeMap.set(name, { name, value, children: [] });
        } else {
          const existing = nodeMap.get(name)!;
          existing.value = value;
        }

        if (parent) {
          if (!nodeMap.has(parent)) {
            nodeMap.set(parent, { name: parent, value: 0, children: [] });
          }
          nodeMap.get(parent)!.children.push(nodeMap.get(name)!);
        } else {
          roots.push(nodeMap.get(name)!);
        }
      }
      treeData = roots;
    } else {
      // Flat list
      treeData = data.map((row) => ({
        name: String(row[nameField] ?? ''),
        value: Number(row[valueField] ?? 0),
      }));
    }

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
      series: [
        {
          type: 'treemap' as const,
          data: treeData,
          roam: false,
          ...(maxDepth > 0 ? { leafDepth: maxDepth } : {}),
          upperLabel: { show: showUpperLabel },
          ...(borderWidth > 0 ? { itemStyle: { borderWidth, borderColor: '#fff' } } : {}),
          label: {
            show: shared.showValues !== false,
            formatter: fmt
              ? (params: { name: string; value: number }) =>
                  `${params.name}\n${formatNumber(params.value, fmt)}`
              : '{b}',
          },
          breadcrumb: { show: true },
        },
      ],
    };
  }, [config, data, columns, title]);

  return <BaseChart option={option} height={height} />;
}

function buildEmptyOption(title?: string) {
  return {
    title: {
      text: title ?? 'Treemap',
      subtext: 'No data available',
      left: 'center',
      top: 'center',
      textStyle: { color: '#999', fontSize: 14 },
    },
  };
}
