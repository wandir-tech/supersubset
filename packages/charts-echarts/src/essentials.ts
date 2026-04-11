import type { WidgetRegistry } from '@supersubset/runtime';
import { LineChartWidget } from './charts/LineChartWidget';
import { BarChartWidget } from './charts/BarChartWidget';
import { PieChartWidget } from './charts/PieChartWidget';
import { TableWidget } from './charts/TableWidget';
import { KPICardWidget } from './charts/KPICardWidget';

export { LineChartWidget } from './charts/LineChartWidget';
export { BarChartWidget } from './charts/BarChartWidget';
export { PieChartWidget } from './charts/PieChartWidget';
export { TableWidget } from './charts/TableWidget';
export { KPICardWidget } from './charts/KPICardWidget';

/**
 * Register the most common widget set for host apps that do not need the full chart catalog.
 * This keeps consumer bundles smaller than using registerAllCharts().
 */
export function registerEssentialWidgets(registry: WidgetRegistry): void {
  registry.register('line-chart', LineChartWidget);
  registry.register('bar-chart', BarChartWidget);
  registry.register('pie-chart', PieChartWidget);
  registry.register('table', TableWidget);
  registry.register('kpi-card', KPICardWidget);
}