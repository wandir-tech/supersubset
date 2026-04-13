/**
 * Chart block definitions for Puck editor.
 * Each chart type has a Puck ComponentConfig that defines its fields,
 * default props, and a preview renderer.
 */
import type { ComponentConfig } from '@puckeditor/core';
import React from 'react';
import { ChartPreview } from '../../preview/ChartPreview';
import { createFieldRefField, createDatasetRefField } from '../../fields/field-ref-field';

// ─── Shared Chart Field Definitions ──────────────────────────

const datasetRefField = createDatasetRefField();

const titleField = {
  type: 'text' as const,
  label: 'Title',
};

const xAxisFieldRef = createFieldRefField('X-Axis Field', ['time', 'dimension']);

const yAxisFieldRef = createFieldRefField('Y-Axis Field', ['measure']);

const seriesFieldRef = createFieldRefField('Series Field', ['dimension']);

const valueFieldRef = createFieldRefField('Value Field', ['measure']);

const categoryFieldRef = createFieldRefField('Category Field', ['dimension']);

const messageFieldRef = createFieldRefField('Message Field', ['dimension']);

const severityFieldRef = createFieldRefField('Severity Field', ['dimension']);

const timestampFieldRef = createFieldRefField('Timestamp Field', ['time']);

const aggregation = {
  type: 'select' as const,
  label: 'Aggregation',
  options: [
    { label: 'None', value: 'none' },
    { label: 'Sum', value: 'sum' },
    { label: 'Average', value: 'avg' },
    { label: 'Count', value: 'count' },
    { label: 'Min', value: 'min' },
    { label: 'Max', value: 'max' },
  ],
};

// ─── Shared Visual Fields (Superset parity) ──────────────────

const colorSchemeField = {
  type: 'select' as const,
  label: 'Color Scheme',
  options: [
    { label: 'Superset Colors', value: 'supersetColors' },
    { label: 'D3 Category 10', value: 'd3Category10' },
    { label: 'Google 10', value: 'google10' },
    { label: 'Tableau 10', value: 'tableau10' },
    { label: 'Pastel', value: 'pastel' },
    { label: 'Dark', value: 'dark' },
    { label: 'Warm', value: 'warm' },
    { label: 'Cool', value: 'cool' },
  ],
};

const showLegendField = {
  type: 'radio' as const,
  label: 'Show Legend',
  options: [
    { label: 'Auto', value: 'auto' },
    { label: 'Yes', value: 'true' },
    { label: 'No', value: 'false' },
  ],
};

const legendPositionField = {
  type: 'select' as const,
  label: 'Legend Position',
  options: [
    { label: 'Top', value: 'top' },
    { label: 'Bottom', value: 'bottom' },
    { label: 'Left', value: 'left' },
    { label: 'Right', value: 'right' },
  ],
};

const showValuesField = {
  type: 'radio' as const,
  label: 'Show Values',
  options: [{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }],
};

const numberFormatField = {
  type: 'select' as const,
  label: 'Number Format',
  options: [
    { label: 'Default', value: '' },
    { label: '1,234', value: ',.0f' },
    { label: '1,234.56', value: ',.2f' },
    { label: '$1,234', value: '$,.0f' },
    { label: '$1,234.56', value: '$,.2f' },
    { label: '12.3%', value: '.1%' },
    { label: '12.35%', value: '.2%' },
    { label: '1.2K', value: '.1s' },
    { label: '1.23K', value: '.2s' },
  ],
};

const xAxisTitleField = {
  type: 'text' as const,
  label: 'X-Axis Title',
};

const yAxisTitleField = {
  type: 'text' as const,
  label: 'Y-Axis Title',
};

const xAxisLabelRotateField = {
  type: 'select' as const,
  label: 'X-Axis Label Rotate',
  options: [
    { label: '0°', value: '0' },
    { label: '30°', value: '30' },
    { label: '45°', value: '45' },
    { label: '60°', value: '60' },
    { label: '90°', value: '90' },
  ],
};

const yAxisMinField = {
  type: 'number' as const,
  label: 'Y-Axis Min',
};

const yAxisMaxField = {
  type: 'number' as const,
  label: 'Y-Axis Max',
};

const logAxisField = {
  type: 'radio' as const,
  label: 'Log Scale (Y)',
  options: [{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }],
};

const zoomableField = {
  type: 'radio' as const,
  label: 'Zoomable',
  options: [{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }],
};

/** Shared visual fields for Cartesian charts (with x/y axes) */
const cartesianVisualFields = {
  colorScheme: colorSchemeField,
  showLegend: showLegendField,
  legendPosition: legendPositionField,
  showValues: showValuesField,
  numberFormat: numberFormatField,
  xAxisTitle: xAxisTitleField,
  yAxisTitle: yAxisTitleField,
  xAxisLabelRotate: xAxisLabelRotateField,
  yAxisMin: yAxisMinField,
  yAxisMax: yAxisMaxField,
  logAxis: logAxisField,
  zoomable: zoomableField,
};

const cartesianVisualDefaults = {
  colorScheme: 'supersetColors',
  showLegend: 'auto',
  legendPosition: 'top',
  showValues: 'false',
  numberFormat: '',
  xAxisTitle: '',
  yAxisTitle: '',
  xAxisLabelRotate: '0',
  yAxisMin: undefined as number | undefined,
  yAxisMax: undefined as number | undefined,
  logAxis: 'false',
  zoomable: 'false',
};

/** Shared visual fields for non-Cartesian charts (pie, funnel, etc.) */
const categoricalVisualFields = {
  colorScheme: colorSchemeField,
  showLegend: showLegendField,
  legendPosition: legendPositionField,
  showValues: showValuesField,
  numberFormat: numberFormatField,
};

const categoricalVisualDefaults = {
  colorScheme: 'supersetColors',
  showLegend: 'auto',
  legendPosition: 'top',
  showValues: 'false',
  numberFormat: '',
};

// ─── Chart Render — Live Preview using ECharts ───────────────

function chartRender(widgetType: string, _defaultTitle: string, fallbackIcon: string) {
  return (props: Record<string, unknown>) => {
    return React.createElement(ChartPreview, {
      widgetType,
      puckProps: props,
      fallbackIcon,
    });
  };
}

// ─── Chart Block Configs ─────────────────────────────────────

export const LineChart: ComponentConfig = {
  label: 'Line Chart',
  fields: {
    title: titleField,
    datasetRef: datasetRefField,
    xAxisField: xAxisFieldRef,
    yAxisField: yAxisFieldRef,
    seriesField: seriesFieldRef,
    aggregation,
    smooth: { type: 'radio', label: 'Smooth', options: [{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }] },
    showMarkers: { type: 'radio', label: 'Show Markers', options: [{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }] },
    markerSize: { type: 'number' as const, label: 'Marker Size' },
    step: { type: 'select' as const, label: 'Step Interpolation', options: [
      { label: 'None', value: '' },
      { label: 'Start', value: 'start' },
      { label: 'Middle', value: 'middle' },
      { label: 'End', value: 'end' },
    ] },
    connectNulls: { type: 'radio', label: 'Connect Nulls', options: [{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }] },
    ...cartesianVisualFields,
  },
  defaultProps: {
    title: 'Line Chart',
    datasetRef: '',
    xAxisField: '',
    yAxisField: '',
    seriesField: '',
    aggregation: 'none',
    smooth: 'false',
    showMarkers: 'true',
    markerSize: 4,
    step: '',
    connectNulls: 'false',
    ...cartesianVisualDefaults,
  },
  render: chartRender('line-chart', 'Line Chart', '📈'),
};

export const BarChart: ComponentConfig = {
  label: 'Bar Chart',
  fields: {
    title: titleField,
    datasetRef: datasetRefField,
    xAxisField: xAxisFieldRef,
    yAxisField: yAxisFieldRef,
    seriesField: seriesFieldRef,
    aggregation,
    orientation: {
      type: 'radio' as const,
      label: 'Orientation',
      options: [{ label: 'Vertical', value: 'vertical' }, { label: 'Horizontal', value: 'horizontal' }],
    },
    stacked: { type: 'radio', label: 'Stacked', options: [{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }] },
    barWidth: { type: 'select' as const, label: 'Bar Width', options: [
      { label: 'Auto', value: '' },
      { label: 'Slim', value: '20%' },
      { label: 'Medium', value: '40%' },
      { label: 'Wide', value: '60%' },
      { label: 'Full', value: '80%' },
    ] },
    barGap: { type: 'select' as const, label: 'Bar Gap', options: [
      { label: 'Default', value: '' },
      { label: 'None', value: '0%' },
      { label: 'Small', value: '10%' },
      { label: 'Medium', value: '30%' },
      { label: 'Large', value: '50%' },
    ] },
    borderRadius: { type: 'number' as const, label: 'Corner Radius' },
    barMinHeight: { type: 'number' as const, label: 'Bar Min Height (px)' },
    ...cartesianVisualFields,
  },
  defaultProps: {
    title: 'Bar Chart',
    datasetRef: '',
    xAxisField: '',
    yAxisField: '',
    seriesField: '',
    aggregation: 'none',
    orientation: 'vertical',
    stacked: 'false',
    barWidth: '',
    barGap: '',
    borderRadius: 0,
    barMinHeight: 0,
    ...cartesianVisualDefaults,
  },
  render: chartRender('bar-chart', 'Bar Chart', '📊'),
};

export const PieChart: ComponentConfig = {
  label: 'Pie Chart',
  fields: {
    title: titleField,
    datasetRef: datasetRefField,
    categoryField: categoryFieldRef,
    valueField: valueFieldRef,
    aggregation,
    variant: {
      type: 'select' as const,
      label: 'Variant',
      options: [
        { label: 'Pie', value: 'pie' },
        { label: 'Donut', value: 'donut' },
        { label: 'Rose', value: 'rose' },
      ],
    },
    innerRadius: { type: 'number' as const, label: 'Inner Radius (%)' },
    outerRadius: { type: 'number' as const, label: 'Outer Radius (%)' },
    labelPosition: { type: 'select' as const, label: 'Label Position', options: [
      { label: 'Outside', value: 'outside' },
      { label: 'Inside', value: 'inside' },
      { label: 'Center', value: 'center' },
      { label: 'None', value: 'none' },
    ] },
    padAngle: { type: 'number' as const, label: 'Pad Angle (°)' },
    ...categoricalVisualFields,
  },
  defaultProps: {
    title: 'Pie Chart',
    datasetRef: '',
    categoryField: '',
    valueField: '',
    aggregation: 'none',
    variant: 'pie',
    innerRadius: 0,
    outerRadius: 70,
    labelPosition: 'outside',
    padAngle: 0,
    ...categoricalVisualDefaults,
  },
  render: chartRender('pie-chart', 'Pie Chart', '🥧'),
};

export const ScatterChart: ComponentConfig = {
  label: 'Scatter Chart',
  fields: {
    title: titleField,
    datasetRef: datasetRefField,
    xAxisField: xAxisFieldRef,
    yAxisField: yAxisFieldRef,
    sizeField: createFieldRefField('Size Field', ['measure']),
    colorGroupField: createFieldRefField('Color Group Field', ['dimension']),
    symbolSize: { type: 'number' as const, label: 'Symbol Size' },
    opacity: { type: 'select' as const, label: 'Opacity', options: [
      { label: '100%', value: '1' },
      { label: '80%', value: '0.8' },
      { label: '60%', value: '0.6' },
      { label: '40%', value: '0.4' },
      { label: '20%', value: '0.2' },
    ] },
    ...cartesianVisualFields,
  },
  defaultProps: {
    title: 'Scatter Chart',
    datasetRef: '',
    xAxisField: '',
    yAxisField: '',
    sizeField: '',
    colorGroupField: '',
    symbolSize: 10,
    opacity: '0.8',
    ...cartesianVisualDefaults,
  },
  render: chartRender('scatter-chart', 'Scatter Chart', '⚬'),
};

export const AreaChart: ComponentConfig = {
  label: 'Area Chart',
  fields: {
    title: titleField,
    datasetRef: datasetRefField,
    xAxisField: xAxisFieldRef,
    yAxisField: yAxisFieldRef,
    seriesField: seriesFieldRef,
    aggregation,
    stacked: { type: 'radio', label: 'Stacked', options: [{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }] },
    areaOpacity: { type: 'select' as const, label: 'Area Opacity', options: [
      { label: '100%', value: '1' },
      { label: '70%', value: '0.7' },
      { label: '50%', value: '0.5' },
      { label: '30%', value: '0.3' },
      { label: '10%', value: '0.1' },
    ] },
    showMarkers: { type: 'radio', label: 'Show Markers', options: [{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }] },
    step: { type: 'select' as const, label: 'Step Interpolation', options: [
      { label: 'None', value: '' },
      { label: 'Start', value: 'start' },
      { label: 'Middle', value: 'middle' },
      { label: 'End', value: 'end' },
    ] },
    connectNulls: { type: 'radio', label: 'Connect Nulls', options: [{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }] },
    ...cartesianVisualFields,
  },
  defaultProps: {
    title: 'Area Chart',
    datasetRef: '',
    xAxisField: '',
    yAxisField: '',
    seriesField: '',
    aggregation: 'none',
    stacked: 'false',
    areaOpacity: '0.7',
    showMarkers: 'true',
    step: '',
    connectNulls: 'false',
    ...cartesianVisualDefaults,
  },
  render: chartRender('area-chart', 'Area Chart', '📉'),
};

export const ComboChart: ComponentConfig = {
  label: 'Combo Chart',
  fields: {
    title: titleField,
    datasetRef: datasetRefField,
    xAxisField: xAxisFieldRef,
    barField: createFieldRefField('Bar Field', ['measure']),
    lineField: createFieldRefField('Line Field', ['measure']),
    aggregation,
    lineSmooth: { type: 'radio', label: 'Smooth Lines', options: [{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }] },
    barBorderRadius: { type: 'number' as const, label: 'Bar Corner Radius' },
    ...cartesianVisualFields,
  },
  defaultProps: {
    title: 'Combo Chart',
    datasetRef: '',
    xAxisField: '',
    barField: '',
    lineField: '',
    aggregation: 'none',
    lineSmooth: 'true',
    barBorderRadius: 0,
    ...cartesianVisualDefaults,
  },
  render: chartRender('combo-chart', 'Combo Chart', '📊📈'),
};

export const HeatmapChart: ComponentConfig = {
  label: 'Heatmap',
  fields: {
    title: titleField,
    datasetRef: datasetRefField,
    xAxisField: xAxisFieldRef,
    yAxisField: yAxisFieldRef,
    valueField: valueFieldRef,
    cellBorderWidth: { type: 'number' as const, label: 'Cell Border Width' },
    cellBorderColor: {
      type: 'select' as const,
      label: 'Cell Border Color',
      options: [
        { label: 'White', value: '#fff' },
        { label: 'Light Gray', value: '#e0e0e0' },
        { label: 'Medium Gray', value: '#bdbdbd' },
        { label: 'Dark Gray', value: '#757575' },
        { label: 'None (Transparent)', value: 'transparent' },
      ],
    },
    ...cartesianVisualFields,
  },
  defaultProps: {
    title: 'Heatmap',
    datasetRef: '',
    xAxisField: '',
    yAxisField: '',
    valueField: '',
    cellBorderWidth: 1,
    cellBorderColor: '#fff',
    ...cartesianVisualDefaults,
  },
  render: chartRender('heatmap', 'Heatmap', '🟧'),
};

export const RadarChart: ComponentConfig = {
  label: 'Radar Chart',
  fields: {
    title: titleField,
    datasetRef: datasetRefField,
    categoryField: categoryFieldRef,
    valueField: valueFieldRef,
    seriesField: seriesFieldRef,
    shape: { type: 'radio' as const, label: 'Shape', options: [
      { label: 'Polygon', value: 'polygon' },
      { label: 'Circle', value: 'circle' },
    ] },
    areaFill: { type: 'radio', label: 'Area Fill', options: [{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }] },
    ...categoricalVisualFields,
  },
  defaultProps: {
    title: 'Radar Chart',
    datasetRef: '',
    categoryField: '',
    valueField: '',
    seriesField: '',
    shape: 'polygon',
    areaFill: 'true',
    ...categoricalVisualDefaults,
  },
  render: chartRender('radar-chart', 'Radar Chart', '🕸'),
};

export const FunnelChart: ComponentConfig = {
  label: 'Funnel Chart',
  fields: {
    title: titleField,
    datasetRef: datasetRefField,
    categoryField: categoryFieldRef,
    valueField: valueFieldRef,
    sort: { type: 'select' as const, label: 'Sort', options: [
      { label: 'Descending', value: 'descending' },
      { label: 'Ascending', value: 'ascending' },
      { label: 'None', value: 'none' },
    ] },
    funnelAlign: { type: 'radio' as const, label: 'Alignment', options: [
      { label: 'Center', value: 'center' },
      { label: 'Left', value: 'left' },
      { label: 'Right', value: 'right' },
    ] },
    gap: { type: 'number' as const, label: 'Gap (px)' },
    labelPosition: { type: 'select' as const, label: 'Label Position', options: [
      { label: 'Inside', value: 'inside' },
      { label: 'Outside', value: 'outside' },
      { label: 'Left', value: 'left' },
      { label: 'Right', value: 'right' },
    ] },
    ...categoricalVisualFields,
  },
  defaultProps: {
    title: 'Funnel Chart',
    datasetRef: '',
    categoryField: '',
    valueField: '',
    sort: 'descending',
    funnelAlign: 'center',
    gap: 0,
    labelPosition: 'inside',
    ...categoricalVisualDefaults,
  },
  render: chartRender('funnel-chart', 'Funnel Chart', '🔻'),
};

export const TreemapChart: ComponentConfig = {
  label: 'Treemap',
  fields: {
    title: titleField,
    datasetRef: datasetRefField,
    nameField: createFieldRefField('Name Field', ['dimension']),
    valueField: valueFieldRef,
    parentField: createFieldRefField('Parent Field', ['dimension']),
    showUpperLabel: { type: 'radio', label: 'Show Parent Labels', options: [{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }] },
    maxDepth: { type: 'number' as const, label: 'Max Depth' },
    borderWidth: { type: 'number' as const, label: 'Border Width' },
    ...categoricalVisualFields,
  },
  defaultProps: {
    title: 'Treemap',
    datasetRef: '',
    nameField: '',
    valueField: '',
    parentField: '',
    showUpperLabel: 'false',
    maxDepth: 0,
    borderWidth: 0,
    ...categoricalVisualDefaults,
  },
  render: chartRender('treemap', 'Treemap', '🟩'),
};

export const SankeyChart: ComponentConfig = {
  label: 'Sankey Diagram',
  fields: {
    title: titleField,
    datasetRef: datasetRefField,
    sourceField: createFieldRefField('Source Field', ['dimension']),
    targetField: createFieldRefField('Target Field', ['dimension']),
    valueField: valueFieldRef,
    nodeWidth: { type: 'number' as const, label: 'Node Width' },
    nodeGap: { type: 'number' as const, label: 'Node Gap' },
    orient: { type: 'radio' as const, label: 'Orientation', options: [
      { label: 'Horizontal', value: 'horizontal' },
      { label: 'Vertical', value: 'vertical' },
    ] },
    ...categoricalVisualFields,
  },
  defaultProps: {
    title: 'Sankey Diagram',
    datasetRef: '',
    sourceField: '',
    targetField: '',
    valueField: '',
    nodeWidth: 20,
    nodeGap: 8,
    orient: 'horizontal',
    ...categoricalVisualDefaults,
  },
  render: chartRender('sankey', 'Sankey Diagram', '🔀'),
};

export const WaterfallChart: ComponentConfig = {
  label: 'Waterfall Chart',
  fields: {
    title: titleField,
    datasetRef: datasetRefField,
    categoryField: categoryFieldRef,
    valueField: valueFieldRef,
    totalLabel: { type: 'text' as const, label: 'Total Label' },
    increaseColor: {
      type: 'select' as const,
      label: 'Increase Color',
      options: [
        { label: 'Green', value: '#52c41a' },
        { label: 'Blue', value: '#1890ff' },
        { label: 'Teal', value: '#13c2c2' },
      ],
    },
    decreaseColor: {
      type: 'select' as const,
      label: 'Decrease Color',
      options: [
        { label: 'Red', value: '#f5222d' },
        { label: 'Orange', value: '#fa8c16' },
        { label: 'Pink', value: '#eb2f96' },
      ],
    },
    totalColor: {
      type: 'select' as const,
      label: 'Total Color',
      options: [
        { label: 'Blue', value: '#1890ff' },
        { label: 'Gray', value: '#8c8c8c' },
        { label: 'Purple', value: '#722ed1' },
      ],
    },
    ...cartesianVisualFields,
  },
  defaultProps: {
    title: 'Waterfall Chart',
    datasetRef: '',
    categoryField: '',
    valueField: '',
    totalLabel: '',
    increaseColor: '#52c41a',
    decreaseColor: '#f5222d',
    totalColor: '#1890ff',
    ...cartesianVisualDefaults,
  },
  render: chartRender('waterfall', 'Waterfall Chart', '🏗'),
};

export const BoxPlotChart: ComponentConfig = {
  label: 'Box Plot',
  fields: {
    title: titleField,
    datasetRef: datasetRefField,
    categoryField: categoryFieldRef,
    valueField: valueFieldRef,
    boxWidth: { type: 'select' as const, label: 'Box Width', options: [
      { label: 'Auto', value: '' },
      { label: 'Narrow', value: '15' },
      { label: 'Medium', value: '30' },
      { label: 'Wide', value: '50' },
    ] },
    ...cartesianVisualFields,
  },
  defaultProps: {
    title: 'Box Plot',
    datasetRef: '',
    categoryField: '',
    valueField: '',
    boxWidth: '',
    ...cartesianVisualDefaults,
  },
  render: chartRender('box-plot', 'Box Plot', '📦'),
};

export const GaugeChart: ComponentConfig = {
  label: 'Gauge',
  fields: {
    title: titleField,
    datasetRef: datasetRefField,
    valueField: valueFieldRef,
    minValue: { type: 'number' as const, label: 'Min Value' },
    maxValue: { type: 'number' as const, label: 'Max Value' },
    startAngle: { type: 'number' as const, label: 'Start Angle (°)' },
    endAngle: { type: 'number' as const, label: 'End Angle (°)' },
    splitCount: { type: 'number' as const, label: 'Split Count' },
    roundCap: { type: 'radio', label: 'Round Cap', options: [{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }] },
    progressMode: { type: 'radio', label: 'Progress Mode', options: [{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }] },
    colorScheme: colorSchemeField,
    numberFormat: numberFormatField,
  },
  defaultProps: {
    title: 'Gauge',
    datasetRef: '',
    valueField: '',
    minValue: 0,
    maxValue: 100,
    startAngle: 225,
    endAngle: -45,
    splitCount: 10,
    roundCap: 'false',
    progressMode: 'false',
    colorScheme: 'supersetColors',
    numberFormat: '',
  },
  render: chartRender('gauge', 'Gauge', '🎯'),
};

// ─── Table & KPI ─────────────────────────────────────────────

export const AlertsWidgetBlock: ComponentConfig = {
  label: 'Alerts',
  fields: {
    title: titleField,
    datasetRef: datasetRefField,
    titleField: createFieldRefField('Alert Title Field', ['dimension']),
    messageField: messageFieldRef,
    severityField: severityFieldRef,
    timestampField: timestampFieldRef,
    layout: {
      type: 'select' as const,
      label: 'Layout',
      options: [
        { label: 'Stack', value: 'stack' },
        { label: 'Wrap', value: 'wrap' },
        { label: 'Inline', value: 'inline' },
      ],
    },
    maxItems: {
      type: 'number' as const,
      label: 'Maximum Items',
    },
    emptyState: {
      type: 'select' as const,
      label: 'Empty State',
      options: [
        { label: 'Placeholder', value: 'placeholder' },
        { label: 'Hide Widget', value: 'hide' },
      ],
    },
    showTimestamp: {
      type: 'radio' as const,
      label: 'Show Timestamp',
      options: [
        { label: 'Yes', value: 'true' },
        { label: 'No', value: 'false' },
      ],
    },
    defaultSeverity: {
      type: 'select' as const,
      label: 'Default Severity',
      options: [
        { label: 'Info', value: 'info' },
        { label: 'Success', value: 'success' },
        { label: 'Warning', value: 'warning' },
        { label: 'Danger', value: 'danger' },
      ],
    },
  },
  defaultProps: {
    title: 'Operational Alerts',
    datasetRef: 'ds-alerts',
    titleField: 'alert_title',
    messageField: 'alert_message',
    severityField: 'severity',
    timestampField: 'detected_at',
    layout: 'stack',
    maxItems: 3,
    emptyState: 'placeholder',
    showTimestamp: 'true',
    defaultSeverity: 'info',
  },
  render: chartRender('alerts', 'Alerts', '🚨'),
};

export const Table: ComponentConfig = {
  label: 'Table',
  fields: {
    title: titleField,
    datasetRef: datasetRefField,
    pageSize: { type: 'number' as const, label: 'Page Size' },
    striped: { type: 'radio', label: 'Striped', options: [{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }] },
    showRowNumbers: { type: 'radio', label: 'Row Numbers', options: [{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }] },
    showTotals: { type: 'radio', label: 'Show Totals', options: [{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }] },
    headerAlign: { type: 'select' as const, label: 'Header Alignment', options: [
      { label: 'Left', value: 'left' },
      { label: 'Center', value: 'center' },
      { label: 'Right', value: 'right' },
    ] },
    cellAlign: { type: 'select' as const, label: 'Cell Alignment', options: [
      { label: 'Left', value: 'left' },
      { label: 'Center', value: 'center' },
      { label: 'Right', value: 'right' },
    ] },
  },
  defaultProps: {
    title: 'Table',
    datasetRef: '',
    pageSize: 25,
    striped: 'true',
    showRowNumbers: 'false',
    showTotals: 'false',
    headerAlign: 'left',
    cellAlign: 'left',
  },
  render: chartRender('table', 'Table', '📋'),
};

export const KPICard: ComponentConfig = {
  label: 'KPI Card',
  fields: {
    title: titleField,
    datasetRef: datasetRefField,
    valueField: valueFieldRef,
    aggregation,
    prefix: { type: 'text' as const, label: 'Prefix (e.g. $)' },
    suffix: { type: 'text' as const, label: 'Suffix (e.g. %)' },
    comparisonField: createFieldRefField('Comparison Field', ['measure']),
    subtitleField: createFieldRefField('Subtitle Field', ['dimension']),
    fontSize: { type: 'select' as const, label: 'Font Size', options: [
      { label: 'Small', value: 'sm' },
      { label: 'Medium', value: 'md' },
      { label: 'Large', value: 'lg' },
    ] },
    trendDirection: { type: 'radio' as const, label: 'Trend Direction', options: [
      { label: 'Up = Good', value: 'up-good' },
      { label: 'Down = Good', value: 'down-good' },
    ] },
    numberFormat: numberFormatField,
    colorScheme: colorSchemeField,
  },
  defaultProps: {
    title: 'KPI',
    datasetRef: '',
    valueField: '',
    aggregation: 'none',
    prefix: '',
    suffix: '',
    comparisonField: '',
    subtitleField: '',
    fontSize: 'md',
    trendDirection: 'up-good',
    numberFormat: '',
    colorScheme: 'supersetColors',
  },
  render: chartRender('kpi-card', 'KPI Card', '🔢'),
};

// ─── All chart component names ───────────────────────────────

export const CHART_BLOCK_NAMES = [
  'LineChart',
  'BarChart',
  'PieChart',
  'ScatterChart',
  'AreaChart',
  'ComboChart',
  'HeatmapChart',
  'RadarChart',
  'FunnelChart',
  'TreemapChart',
  'SankeyChart',
  'WaterfallChart',
  'BoxPlotChart',
  'GaugeChart',
  'AlertsWidgetBlock',
  'Table',
  'KPICard',
] as const;

/** Map Puck component name → canonical widget type */
export const PUCK_NAME_TO_WIDGET_TYPE: Record<string, string> = {
  LineChart: 'line-chart',
  BarChart: 'bar-chart',
  PieChart: 'pie-chart',
  ScatterChart: 'scatter-chart',
  AreaChart: 'area-chart',
  ComboChart: 'combo-chart',
  HeatmapChart: 'heatmap',
  RadarChart: 'radar-chart',
  FunnelChart: 'funnel-chart',
  TreemapChart: 'treemap',
  SankeyChart: 'sankey',
  WaterfallChart: 'waterfall',
  BoxPlotChart: 'box-plot',
  GaugeChart: 'gauge',
  AlertsWidgetBlock: 'alerts',
  Table: 'table',
  KPICard: 'kpi-card',
};

/** Map canonical widget type → Puck component name */
export const WIDGET_TYPE_TO_PUCK_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(PUCK_NAME_TO_WIDGET_TYPE).map(([k, v]) => [v, k])
);
