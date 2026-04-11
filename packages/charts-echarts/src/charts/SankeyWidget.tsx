/**
 * Sankey diagram widget — wraps ECharts sankey series.
 * config.sourceField: string — field for source node name
 * config.targetField: string — field for target node name
 * config.valueField: string — field for flow value
 */
import { useMemo } from 'react';
import { SankeyChart as EChartsSankey } from 'echarts/charts';
import type { WidgetProps } from '@supersubset/runtime';
import { BaseChart, echarts } from '../base/BaseChart';
import {
  extractSharedConfig,
  buildColorOption,
  buildTooltipOption,
  buildTitleOption,
} from '../base/shared-options';

echarts.use([EChartsSankey]);

export function SankeyWidget({ config, data, columns, title, height }: WidgetProps) {
  const option = useMemo(() => {
    if (!data || data.length === 0) {
      return buildEmptyOption(title);
    }

    const sourceField = (config.sourceField as string) ?? columns?.[0]?.fieldId ?? '';
    const targetField = (config.targetField as string) ?? columns?.[1]?.fieldId ?? '';
    const valueField = (config.valueField as string) ?? columns?.[2]?.fieldId ?? '';
    const nodeWidth = (config.nodeWidth as number) ?? 20;
    const nodeGap = (config.nodeGap as number) ?? 8;
    const orient = (config.orient as 'horizontal' | 'vertical') ?? 'horizontal';
    const shared = extractSharedConfig(config);

    // Collect unique nodes
    const nodeSet = new Set<string>();
    const links = data.map((row) => {
      const source = String(row[sourceField] ?? '');
      const target = String(row[targetField] ?? '');
      nodeSet.add(source);
      nodeSet.add(target);
      return { source, target, value: Number(row[valueField] ?? 0) };
    });
    const nodes = Array.from(nodeSet).map((name) => ({ name }));

    return {
      ...(buildTitleOption(title) ? { title: buildTitleOption(title) } : {}),
      color: buildColorOption(shared),
      tooltip: buildTooltipOption(shared, 'item'),
      series: [
        {
          type: 'sankey' as const,
          data: nodes,
          links,
          nodeWidth,
          nodeGap,
          orient,
          emphasis: { focus: 'adjacency' as const },
          lineStyle: { color: 'gradient' as const, curveness: 0.5 },
        },
      ],
    };
  }, [config, data, columns, title]);

  return <BaseChart option={option} height={height} />;
}

function buildEmptyOption(title?: string) {
  return {
    title: {
      text: title ?? 'Sankey Diagram',
      subtext: 'No data available',
      left: 'center',
      top: 'center',
      textStyle: { color: '#999', fontSize: 14 },
    },
  };
}
