/**
 * Central Puck Config for the Supersubset Designer.
 * Defines all components and categories for the editor sidebar.
 */
import type { Config } from '@puckeditor/core';
import React from 'react';

import * as chartBlocks from '../blocks/charts';
import * as contentBlocks from '../blocks/content';
import * as controlBlocks from '../blocks/controls';
import * as layoutBlocks from '../blocks/layout';

/**
 * Build the complete Puck Config with all Supersubset blocks.
 */
export function createPuckConfig(): Config {
  return {
    root: {
      defaultProps: {},
      render: ({ children }: Record<string, unknown>) => {
        return React.createElement(
          'div',
          {
            style: {
              fontFamily: 'var(--ss-font-family, sans-serif)',
              padding: 16,
              minHeight: '100%',
            },
          },
          children as React.ReactNode
        );
      },
    },
    components: {
      // Charts
      LineChart: chartBlocks.LineChart,
      BarChart: chartBlocks.BarChart,
      PieChart: chartBlocks.PieChart,
      ScatterChart: chartBlocks.ScatterChart,
      AreaChart: chartBlocks.AreaChart,
      ComboChart: chartBlocks.ComboChart,
      HeatmapChart: chartBlocks.HeatmapChart,
      RadarChart: chartBlocks.RadarChart,
      FunnelChart: chartBlocks.FunnelChart,
      TreemapChart: chartBlocks.TreemapChart,
      SankeyChart: chartBlocks.SankeyChart,
      WaterfallChart: chartBlocks.WaterfallChart,
      BoxPlotChart: chartBlocks.BoxPlotChart,
      GaugeChart: chartBlocks.GaugeChart,
      AlertsWidgetBlock: chartBlocks.AlertsWidgetBlock,
      Table: chartBlocks.Table,
      KPICard: chartBlocks.KPICard,
      // Content
      HeaderBlock: contentBlocks.HeaderBlock,
      MarkdownBlock: contentBlocks.MarkdownBlock,
      DividerBlock: contentBlocks.DividerBlock,
      SpacerBlock: contentBlocks.SpacerBlock,
      // Controls
      FilterBarBlock: controlBlocks.FilterBarBlock,
      // Layout
      RowBlock: layoutBlocks.RowBlock,
      ColumnBlock: layoutBlocks.ColumnBlock,
    },
    categories: {
      layout: {
        title: 'Layout',
        components: ['RowBlock', 'ColumnBlock'],
        defaultExpanded: true,
      },
      charts: {
        title: 'Charts',
        components: [
          'LineChart',
          'BarChart',
          'PieChart',
          'AreaChart',
          'ComboChart',
          'ScatterChart',
          'HeatmapChart',
          'RadarChart',
          'FunnelChart',
          'TreemapChart',
          'SankeyChart',
          'WaterfallChart',
          'BoxPlotChart',
          'GaugeChart',
        ],
        defaultExpanded: true,
      },
      tables: {
        title: 'Tables, KPIs & Alerts',
        components: ['Table', 'KPICard', 'AlertsWidgetBlock'],
        defaultExpanded: true,
      },
      content: {
        title: 'Content',
        components: ['HeaderBlock', 'MarkdownBlock', 'DividerBlock', 'SpacerBlock'],
        defaultExpanded: false,
      },
      controls: {
        title: 'Controls',
        components: ['FilterBarBlock'],
        defaultExpanded: false,
      },
    },
  };
}
