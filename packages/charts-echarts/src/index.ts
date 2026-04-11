// @supersubset/charts-echarts — ECharts chart widgets for Supersubset

// Base chart component (for advanced/custom chart usage)
export { BaseChart, type BaseChartProps } from './base/BaseChart';

// Shared chart option builders
export {
  extractSharedConfig,
  buildColorOption,
  buildLegendOption,
  buildTooltipOption,
  buildGridOption,
  buildCategoryAxisOption,
  buildValueAxisOption,
  buildDataZoomOption,
  buildLabelOption,
  getColorPalette,
  getAvailablePalettes,
  formatNumber,
  type SharedConfig,
} from './base/shared-options';

// Chart widgets
export { LineChartWidget } from './charts/LineChartWidget';
export { BarChartWidget } from './charts/BarChartWidget';
export { TableWidget } from './charts/TableWidget';
export { KPICardWidget } from './charts/KPICardWidget';
export { PieChartWidget } from './charts/PieChartWidget';
export { ScatterChartWidget } from './charts/ScatterChartWidget';
export { AreaChartWidget } from './charts/AreaChartWidget';
export { GaugeWidget } from './charts/GaugeWidget';
export { FunnelChartWidget } from './charts/FunnelChartWidget';
export { RadarChartWidget } from './charts/RadarChartWidget';
export { TreemapWidget } from './charts/TreemapWidget';
export { HeatmapWidget } from './charts/HeatmapWidget';
export { ComboChartWidget } from './charts/ComboChartWidget';
export { WaterfallWidget } from './charts/WaterfallWidget';
export { SankeyWidget } from './charts/SankeyWidget';
export { BoxPlotWidget } from './charts/BoxPlotWidget';
export { MarkdownWidget } from './charts/MarkdownWidget';
export { AlertsWidget } from './charts/AlertsWidget';

// Convenience: register all bundled widgets into a registry
import type { WidgetRegistry } from '@supersubset/runtime';
import { LineChartWidget } from './charts/LineChartWidget';
import { BarChartWidget } from './charts/BarChartWidget';
import { TableWidget } from './charts/TableWidget';
import { KPICardWidget } from './charts/KPICardWidget';
import { PieChartWidget } from './charts/PieChartWidget';
import { ScatterChartWidget } from './charts/ScatterChartWidget';
import { AreaChartWidget } from './charts/AreaChartWidget';
import { GaugeWidget } from './charts/GaugeWidget';
import { FunnelChartWidget } from './charts/FunnelChartWidget';
import { RadarChartWidget } from './charts/RadarChartWidget';
import { TreemapWidget } from './charts/TreemapWidget';
import { HeatmapWidget } from './charts/HeatmapWidget';
import { ComboChartWidget } from './charts/ComboChartWidget';
import { WaterfallWidget } from './charts/WaterfallWidget';
import { SankeyWidget } from './charts/SankeyWidget';
import { BoxPlotWidget } from './charts/BoxPlotWidget';
import { MarkdownWidget } from './charts/MarkdownWidget';
import { AlertsWidget } from './charts/AlertsWidget';

/**
 * Register all bundled chart widgets into a WidgetRegistry.
 * Call this in your host app setup.
 */
export function registerAllCharts(registry: WidgetRegistry): void {
  registry.register('line-chart', LineChartWidget);
  registry.register('bar-chart', BarChartWidget);
  registry.register('table', TableWidget);
  registry.register('kpi-card', KPICardWidget);
  registry.register('pie-chart', PieChartWidget);
  registry.register('scatter-chart', ScatterChartWidget);
  registry.register('area-chart', AreaChartWidget);
  registry.register('gauge', GaugeWidget);
  registry.register('funnel-chart', FunnelChartWidget);
  registry.register('radar-chart', RadarChartWidget);
  registry.register('treemap', TreemapWidget);
  registry.register('heatmap', HeatmapWidget);
  registry.register('combo-chart', ComboChartWidget);
  registry.register('waterfall', WaterfallWidget);
  registry.register('sankey', SankeyWidget);
  registry.register('box-plot', BoxPlotWidget);
  registry.register('markdown', MarkdownWidget);
  registry.register('alerts', AlertsWidget);
}
