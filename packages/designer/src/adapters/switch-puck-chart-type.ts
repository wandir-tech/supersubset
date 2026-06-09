/**
 * Switch an existing Puck chart block to another chart type while preserving
 * compatible field bindings and visual props.
 */
import type { ComponentData } from '@puckeditor/core';
import * as chartBlocks from '../blocks/charts';
import { repairChartAxisPropsRecord } from './puck-canonical';
import {
  CHART_BLOCK_NAMES,
  PUCK_NAME_TO_WIDGET_TYPE,
  WIDGET_TYPE_TO_PUCK_NAME,
} from '../blocks/charts';

/** Puck chart blocks that support in-place type switching (excludes table/KPI/alerts). */
export const SWITCHABLE_CHART_PUCK_NAMES = new Set(
  CHART_BLOCK_NAMES.filter((name) => !['AlertsWidgetBlock', 'Table', 'KPICard'].includes(name)),
);

const PRESERVED_CHART_PROP_KEYS = new Set([
  'id',
  'title',
  'datasetRef',
  'xAxisField',
  'yAxisField',
  'seriesField',
  'valueField',
  'categoryField',
  'nameField',
  'parentField',
  'sourceField',
  'targetField',
  'comparisonField',
  'sizeField',
  'colorGroupField',
  'barField',
  'lineField',
  'messageField',
  'severityField',
  'timestampField',
  'titleField',
  'aggregation',
  // Host runtime + designer preview still rely on legacy config keys in Puck props.
  'xField',
  'yField',
  'logicalQuery',
  'colorScheme',
  'showLegend',
  'legendPosition',
  'showValues',
  'numberFormat',
  'xAxisTitle',
  'yAxisTitle',
  'xAxisLabelRotate',
  'yAxisMin',
  'yAxisMax',
  'logAxis',
  'zoomable',
  'orientation',
  'stacked',
  'horizontal',
  'smooth',
  'showMarkers',
  'markerSize',
  'step',
  'connectNulls',
  'areaOpacity',
  'showArea',
  'variant',
  'donut',
  'filterIds',
]);

export function isSwitchableChartPuckType(puckType: string): boolean {
  return SWITCHABLE_CHART_PUCK_NAMES.has(puckType as (typeof CHART_BLOCK_NAMES)[number]);
}

export function puckTypeToWidgetType(puckType: string): string | undefined {
  return PUCK_NAME_TO_WIDGET_TYPE[puckType];
}

export function widgetTypeToPuckType(widgetType: string): string | undefined {
  return WIDGET_TYPE_TO_PUCK_NAME[widgetType];
}

function getBlockDefaultProps(puckName: string): Record<string, unknown> {
  const block = (chartBlocks as Record<string, { defaultProps?: Record<string, unknown> }>)[
    puckName
  ];
  return { ...(block?.defaultProps ?? {}) };
}

function mergeChartPropsForTypeSwitch(
  currentProps: Record<string, unknown>,
  targetDefaults: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...targetDefaults };

  for (const [key, value] of Object.entries(currentProps)) {
    if (!PRESERVED_CHART_PROP_KEYS.has(key)) continue;
    if (value === undefined || value === '') continue;
    merged[key] = value;
  }

  if (currentProps.id !== undefined) {
    merged.id = currentProps.id;
  }
  if (currentProps.title !== undefined) {
    merged.title = currentProps.title;
  }

  return merged;
}

function applyTargetChartFieldDefaults(
  props: Record<string, unknown>,
  targetPuckName: string,
): void {
  if (targetPuckName === 'PieChart') {
    if (!props.categoryField && !props.nameField) {
      props.categoryField = props.xField ?? props.xAxisField ?? props.nameField;
    }
    if (!props.valueField) {
      props.valueField = props.yField ?? props.yAxisField;
    }
  }

  if (
    targetPuckName === 'BarChart' ||
    targetPuckName === 'LineChart' ||
    targetPuckName === 'AreaChart'
  ) {
    if (!props.xField) {
      props.xField = props.categoryField ?? props.nameField ?? props.xAxisField;
    }
    if (!props.yField) {
      props.yField = props.valueField ?? props.yAxisField;
    }
  }
}

/**
 * Build replacement Puck component data for a chart type switch.
 * Returns null when the target type matches the current type or is unsupported.
 */
export function buildPuckChartTypeReplacement(
  current: ComponentData,
  targetWidgetType: string,
): ComponentData | null {
  const targetPuckName = widgetTypeToPuckType(targetWidgetType);
  if (!targetPuckName || !isSwitchableChartPuckType(targetPuckName)) {
    return null;
  }

  const currentWidgetType = puckTypeToWidgetType(current.type);
  if (!currentWidgetType || currentWidgetType === targetWidgetType) {
    return null;
  }

  if (!isSwitchableChartPuckType(current.type)) {
    return null;
  }

  const targetDefaults = getBlockDefaultProps(targetPuckName);
  const currentProps = (current.props ?? {}) as Record<string, unknown>;
  const merged = mergeChartPropsForTypeSwitch(currentProps, targetDefaults);
  applyTargetChartFieldDefaults(merged, targetPuckName);
  repairChartAxisPropsRecord(merged);

  const widgetId =
    typeof current.props?.id === 'string' && current.props.id.length > 0 ? current.props.id : null;
  if (!widgetId) {
    return null;
  }

  return {
    type: targetPuckName,
    props: {
      ...merged,
      id: widgetId,
    },
  };
}
