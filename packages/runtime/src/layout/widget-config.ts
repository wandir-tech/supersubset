import type { WidgetDefinition } from '@supersubset/schema';

const ROLE_TO_CONFIG_KEY: Record<string, string> = {
  'x-axis': 'xField',
  'y-axis': 'yField',
  series: 'seriesField',
  value: 'valueField',
  category: 'categoryField',
  size: 'sizeField',
  'color-group': 'colorGroupField',
  'bar-y': 'barField',
  'line-y': 'lineField',
  name: 'nameField',
  parent: 'parentField',
  source: 'sourceField',
  target: 'targetField',
  comparison: 'comparisonField',
  'alert-title': 'titleField',
  'alert-message': 'messageField',
  'alert-severity': 'severityField',
  'alert-timestamp': 'timestampField',
};

const ROLE_TO_ARRAY_CONFIG_KEY: Record<string, string> = {
  'y-axis': 'yFields',
  'bar-y': 'barFields',
  'line-y': 'lineFields',
};

/** When a scalar sibling is already set (host apps often use yField), prefer it over dataBinding fieldRefs (mart ids). */
const ARRAY_SCALAR_SIBLING: Record<string, string> = {
  yFields: 'yField',
  barFields: 'barField',
  lineFields: 'lineField',
};

export function resolveDataBindingConfig(widgetDef: WidgetDefinition): Record<string, unknown> {
  const config = { ...widgetDef.config };
  if (!widgetDef.dataBinding?.fields) return config;

  const arrayCollectors: Record<string, string[]> = {};

  for (const field of widgetDef.dataBinding.fields) {
    const configKey = ROLE_TO_CONFIG_KEY[field.role];
    if (configKey && config[configKey] === undefined) {
      config[configKey] = field.fieldRef;
    }
    const arrayKey = ROLE_TO_ARRAY_CONFIG_KEY[field.role];
    if (arrayKey) {
      if (!arrayCollectors[arrayKey]) arrayCollectors[arrayKey] = [];
      arrayCollectors[arrayKey].push(field.fieldRef);
    }
  }

  for (const [key, values] of Object.entries(arrayCollectors)) {
    if (config[key] !== undefined) continue;
    const siblingKey = ARRAY_SCALAR_SIBLING[key];
    const siblingValue =
      siblingKey && typeof config[siblingKey] === 'string' ? config[siblingKey] : undefined;
    config[key] = siblingValue ? [siblingValue] : values;
  }

  if (widgetDef.dataBinding.datasetRef && !config.datasetRef) {
    config.datasetRef = widgetDef.dataBinding.datasetRef;
  }

  return config;
}
