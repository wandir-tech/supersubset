/**
 * ChartPreview — renders a live mini-chart inside the Puck editor canvas.
 *
 * Uses sample data + ECharts widgets from charts-echarts to show a representative
 * preview of each chart type. Falls back to a placeholder if rendering fails.
 *
 * This component maps Puck block props → WidgetProps config shape expected by
 * each chart widget.
 */
import React, { useMemo, useState, useEffect, type ComponentType } from 'react';
import type { WidgetProps } from '@supersubset/runtime';
import { getSampleData } from '../data/sample-data';
import { usePreviewData, type PreviewDataRequest } from '../context/PreviewDataContext';

// Lazy-import chart widgets to keep them tree-shakeable when not used
import {
  LineChartWidget,
  BarChartWidget,
  PieChartWidget,
  ScatterChartWidget,
  AreaChartWidget,
  ComboChartWidget,
  HeatmapWidget,
  RadarChartWidget,
  FunnelChartWidget,
  TreemapWidget,
  SankeyWidget,
  WaterfallWidget,
  BoxPlotWidget,
  GaugeWidget,
  TableWidget,
  KPICardWidget,
} from '@supersubset/charts-echarts';

// ─── Widget Type → Component Mapping ─────────────────────────

const WIDGET_COMPONENTS: Record<string, ComponentType<WidgetProps>> = {
  'line-chart': LineChartWidget,
  'bar-chart': BarChartWidget,
  'pie-chart': PieChartWidget,
  'scatter-chart': ScatterChartWidget,
  'area-chart': AreaChartWidget,
  'combo-chart': ComboChartWidget,
  heatmap: HeatmapWidget,
  'radar-chart': RadarChartWidget,
  'funnel-chart': FunnelChartWidget,
  treemap: TreemapWidget,
  sankey: SankeyWidget,
  waterfall: WaterfallWidget,
  'box-plot': BoxPlotWidget,
  gauge: GaugeWidget,
  table: TableWidget,
  'kpi-card': KPICardWidget,
};

// ─── Puck Props → WidgetProps Config Mapping ─────────────────

/** Default config for sample data rendering when user hasn't set fields yet */
const DEFAULT_CONFIGS: Record<string, Record<string, unknown>> = {
  'line-chart': { xField: 'month', yFields: ['revenue', 'orders'], smooth: true },
  'bar-chart': { xField: 'category', yFields: ['sales', 'target'] },
  'pie-chart': { nameField: 'category', valueField: 'value' },
  'scatter-chart': { xField: 'x', yField: 'y', sizeField: 'size' },
  'area-chart': { xField: 'month', yFields: ['revenue', 'orders'], area: true, smooth: true },
  'combo-chart': { xField: 'month', barFields: ['bar'], lineFields: ['line'] },
  heatmap: { xField: 'x', yField: 'y', valueField: 'value' },
  'radar-chart': {
    nameField: 'name',
    valueFields: ['Speed', 'Strength', 'Defense', 'Magic', 'Agility', 'Luck'],
  },
  'funnel-chart': { nameField: 'stage', valueField: 'value' },
  treemap: { nameField: 'name', valueField: 'value', parentField: 'parent' },
  sankey: { sourceField: 'source', targetField: 'target', valueField: 'value' },
  waterfall: { categoryField: 'category', valueField: 'value' },
  'box-plot': { categoryField: 'category' },
  gauge: { valueField: 'value', min: 0, max: 100 },
  table: {},
  'kpi-card': { valueField: 'value', comparisonField: 'comparison' },
  alerts: {
    titleField: 'alert_title',
    messageField: 'alert_message',
    severityField: 'severity',
    timestampField: 'detected_at',
    layout: 'stack',
    maxItems: 3,
    emptyState: 'placeholder',
    showTimestamp: true,
    defaultSeverity: 'info',
  },
};

type AlertSeverity = 'info' | 'success' | 'warning' | 'danger';
type AlertLayout = 'stack' | 'wrap' | 'inline';

const ALERT_LAYOUT_STYLES: Record<AlertLayout, React.CSSProperties> = {
  stack: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  wrap: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
  },
  inline: {
    display: 'flex',
    flexWrap: 'nowrap',
    gap: 12,
    overflowX: 'auto',
    paddingBottom: 4,
  },
};

const ALERT_SEVERITY_STYLES: Record<
  AlertSeverity,
  { accent: string; background: string; border: string }
> = {
  info: {
    accent: '#1d4ed8',
    background: '#eff6ff',
    border: '#bfdbfe',
  },
  success: {
    accent: '#15803d',
    background: '#f0fdf4',
    border: '#bbf7d0',
  },
  warning: {
    accent: '#b45309',
    background: '#fffbeb',
    border: '#fde68a',
  },
  danger: {
    accent: '#b91c1c',
    background: '#fef2f2',
    border: '#fecaca',
  },
};

function normalizeAlertSeverity(value: unknown, fallback: AlertSeverity = 'info'): AlertSeverity {
  if (value === 'info' || value === 'success' || value === 'warning' || value === 'danger') {
    return value;
  }

  return fallback;
}

function readAlertText(row: Record<string, unknown>, fieldName: unknown): string {
  if (typeof fieldName !== 'string' || fieldName.length === 0) {
    return '';
  }

  const value = row[fieldName];
  return typeof value === 'string' ? value : '';
}

interface AlertsPreviewProps {
  title: string;
  data: Record<string, unknown>[];
  config: Record<string, unknown>;
  fallbackIcon: string;
}

function AlertsPreview({ title, data, config, fallbackIcon }: AlertsPreviewProps) {
  const titleField = typeof config.titleField === 'string' ? config.titleField : 'alert_title';
  const messageField =
    typeof config.messageField === 'string' ? config.messageField : 'alert_message';
  const severityField =
    typeof config.severityField === 'string' ? config.severityField : 'severity';
  const timestampField =
    typeof config.timestampField === 'string' ? config.timestampField : 'detected_at';
  const layout = config.layout === 'wrap' || config.layout === 'inline' ? config.layout : 'stack';
  const maxItems =
    typeof config.maxItems === 'number' && config.maxItems > 0 ? config.maxItems : data.length;
  const emptyState = config.emptyState === 'hide' ? 'hide' : 'placeholder';
  const showTimestamp = config.showTimestamp !== false;
  const defaultSeverity = normalizeAlertSeverity(config.defaultSeverity, 'info');
  const visibleAlerts = data.slice(0, maxItems);

  if (visibleAlerts.length === 0 && emptyState === 'hide') {
    return null;
  }

  return (
    <div
      style={{
        borderRadius: 8,
        background: '#ffffff',
        minHeight: 180,
        padding: 16,
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
      >
        <strong style={{ color: '#0f172a', fontSize: 15 }}>{title}</strong>
        <span style={{ color: '#64748b', fontSize: 12 }}>
          {visibleAlerts.length}
          {' active'}
        </span>
      </div>
      {visibleAlerts.length === 0 ? (
        <div
          style={{
            border: '1px dashed #cbd5e1',
            borderRadius: 8,
            padding: 18,
            color: '#64748b',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            minHeight: 120,
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: 28 }}>{fallbackIcon}</span>
          <span style={{ fontSize: 13 }}>No alerts are firing in the sample feed.</span>
        </div>
      ) : (
        <div style={ALERT_LAYOUT_STYLES[layout]}>
          {visibleAlerts.map((row, index) => {
            const severity = normalizeAlertSeverity(row[severityField], defaultSeverity);
            const severityStyle = ALERT_SEVERITY_STYLES[severity];
            const alertTitle = readAlertText(row, titleField) || `Alert ${index + 1}`;
            const alertMessage = readAlertText(row, messageField) || 'No alert message configured.';
            const timestamp = readAlertText(row, timestampField);

            return (
              <div
                key={`${alertTitle}-${index}`}
                style={{
                  flex: layout === 'stack' ? '1 1 100%' : '1 1 240px',
                  minWidth: layout === 'inline' ? 240 : undefined,
                  borderRadius: 10,
                  border: `1px solid ${severityStyle.border}`,
                  background: severityStyle.background,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <strong style={{ color: '#0f172a', fontSize: 14 }}>{alertTitle}</strong>
                    <span style={{ color: '#334155', fontSize: 12, lineHeight: 1.45 }}>
                      {alertMessage}
                    </span>
                  </div>
                  <span
                    style={{
                      borderRadius: 999,
                      background: '#ffffff',
                      color: severityStyle.accent,
                      border: `1px solid ${severityStyle.border}`,
                      padding: '3px 8px',
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 0.4,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {severity}
                  </span>
                </div>
                {showTimestamp && timestamp ? (
                  <span style={{ color: '#64748b', fontSize: 11 }}>{timestamp}</span>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Map Puck block props to the chart widget's config format.
 * Uses defaults from DEFAULT_CONFIGS when user hasn't set fields.
 */
function buildWidgetConfig(
  widgetType: string,
  puckProps: Record<string, unknown>,
): Record<string, unknown> {
  const defaults = DEFAULT_CONFIGS[widgetType] ?? {};

  // Map common Puck field names → widget config keys
  const config: Record<string, unknown> = { ...defaults };

  // Pass through raw boolean/number config values from dashboard JSON.
  // When a dashboard is first loaded into Puck, its config values retain their
  // original types (boolean/number). Puck radio/select fields produce string
  // values only after user interaction, which the string-based handlers below
  // will override.
  for (const key of Object.keys(puckProps)) {
    const val = puckProps[key];
    if (typeof val === 'boolean' || typeof val === 'number') {
      config[key] = val;
    }
  }

  // Override defaults if user has set actual field references (non-empty strings)
  const s = (v: unknown) => (typeof v === 'string' && v.length > 0 ? v : undefined);
  if (s(puckProps.xAxisField)) config.xField = puckProps.xAxisField;
  if (s(puckProps.yAxisField)) {
    config.yFields = [puckProps.yAxisField as string];
    config.yField = puckProps.yAxisField;
  }
  if (s(puckProps.seriesField)) config.seriesField = puckProps.seriesField;
  if (s(puckProps.categoryField)) {
    config.nameField = puckProps.categoryField;
    config.categoryField = puckProps.categoryField;
  }
  if (s(puckProps.valueField)) config.valueField = puckProps.valueField;
  if (s(puckProps.sizeField)) config.sizeField = puckProps.sizeField;
  if (s(puckProps.colorGroupField)) config.colorGroupField = puckProps.colorGroupField;
  if (s(puckProps.aggregation)) config.aggregation = puckProps.aggregation;
  if (s(puckProps.nameField)) config.nameField = puckProps.nameField;
  if (s(puckProps.parentField)) config.parentField = puckProps.parentField;
  else if (widgetType === 'treemap') delete config.parentField;
  if (s(puckProps.sourceField)) config.sourceField = puckProps.sourceField;
  if (s(puckProps.targetField)) config.targetField = puckProps.targetField;
  if (s(puckProps.barField)) config.barFields = [puckProps.barField as string];
  if (s(puckProps.lineField)) config.lineFields = [puckProps.lineField as string];
  if (s(puckProps.comparisonField)) config.comparisonField = puckProps.comparisonField;
  if (s(puckProps.titleField)) config.titleField = puckProps.titleField;
  if (s(puckProps.messageField)) config.messageField = puckProps.messageField;
  if (s(puckProps.severityField)) config.severityField = puckProps.severityField;
  if (s(puckProps.timestampField)) config.timestampField = puckProps.timestampField;
  if (s(puckProps.layout)) config.layout = puckProps.layout;
  if (puckProps.maxItems != null && puckProps.maxItems !== '')
    config.maxItems = Number(puckProps.maxItems);
  if (s(puckProps.emptyState)) config.emptyState = puckProps.emptyState;
  if (puckProps.showTimestamp === 'true') config.showTimestamp = true;
  else if (puckProps.showTimestamp === 'false') config.showTimestamp = false;
  if (s(puckProps.defaultSeverity)) config.defaultSeverity = puckProps.defaultSeverity;
  if (puckProps.smooth === 'true') config.smooth = true;
  else if (puckProps.smooth === 'false') config.smooth = false;
  if (puckProps.stacked === 'true') config.stacked = true;
  else if (puckProps.stacked === 'false') config.stacked = false;
  if (puckProps.orientation === 'horizontal') config.horizontal = true;
  else if (puckProps.orientation === 'vertical') config.horizontal = false;

  // Shared visual controls (Phase 2.A.1)
  if (s(puckProps.colorScheme)) config.colorScheme = puckProps.colorScheme;
  if (puckProps.showLegend === 'true') config.showLegend = true;
  else if (puckProps.showLegend === 'false') config.showLegend = false;
  if (s(puckProps.legendPosition)) config.legendPosition = puckProps.legendPosition;
  if (puckProps.showValues === 'true') config.showValues = true;
  else if (puckProps.showValues === 'false') config.showValues = false;
  if (s(puckProps.numberFormat)) config.numberFormat = puckProps.numberFormat;
  if (s(puckProps.xAxisTitle)) config.xAxisTitle = puckProps.xAxisTitle;
  if (s(puckProps.yAxisTitle)) config.yAxisTitle = puckProps.yAxisTitle;
  if (s(puckProps.xAxisLabelRotate) && puckProps.xAxisLabelRotate !== '0') {
    config.xAxisLabelRotate = Number(puckProps.xAxisLabelRotate);
  }
  if (puckProps.yAxisMin != null && puckProps.yAxisMin !== '')
    config.yAxisMin = Number(puckProps.yAxisMin);
  if (puckProps.yAxisMax != null && puckProps.yAxisMax !== '')
    config.yAxisMax = Number(puckProps.yAxisMax);
  if (puckProps.logAxis === 'true') config.logAxis = true;
  else if (puckProps.logAxis === 'false') config.logAxis = false;
  if (puckProps.zoomable === 'true') config.zoomable = true;
  else if (puckProps.zoomable === 'false') config.zoomable = false;

  // Per-chart controls (Phase 2.A.2–2.A.17)
  // Line / Area
  if (puckProps.showMarkers === 'true') config.showMarkers = true;
  else if (puckProps.showMarkers === 'false') config.showMarkers = false;
  if (puckProps.markerSize != null && puckProps.markerSize !== '')
    config.markerSize = Number(puckProps.markerSize);
  if (s(puckProps.step)) config.step = puckProps.step;
  if (puckProps.connectNulls === 'true') config.connectNulls = true;
  else if (puckProps.connectNulls === 'false') config.connectNulls = false;
  if (s(puckProps.areaOpacity)) config.areaOpacity = Number(puckProps.areaOpacity);
  // Bar
  if (s(puckProps.barWidth)) config.barWidth = puckProps.barWidth;
  if (s(puckProps.barGap)) config.barGap = puckProps.barGap;
  if (
    puckProps.borderRadius != null &&
    puckProps.borderRadius !== '' &&
    Number(puckProps.borderRadius) > 0
  )
    config.borderRadius = Number(puckProps.borderRadius);
  if (puckProps.barMinHeight != null && Number(puckProps.barMinHeight) > 0)
    config.barMinHeight = Number(puckProps.barMinHeight);
  // Pie
  if (puckProps.innerRadius != null && puckProps.innerRadius !== '')
    config.innerRadius = Number(puckProps.innerRadius);
  if (puckProps.outerRadius != null && puckProps.outerRadius !== '')
    config.outerRadius = Number(puckProps.outerRadius);
  if (s(puckProps.labelPosition)) config.labelPosition = puckProps.labelPosition;
  if (puckProps.padAngle != null && Number(puckProps.padAngle) > 0)
    config.padAngle = Number(puckProps.padAngle);
  if (puckProps.variant === 'donut') config.donut = true;
  else if (puckProps.variant === 'pie') config.donut = false;
  if (puckProps.variant === 'rose') config.roseType = 'radius';
  // Scatter
  if (puckProps.symbolSize != null && puckProps.symbolSize !== '')
    config.symbolSize = Number(puckProps.symbolSize);
  if (s(puckProps.opacity)) config.opacity = Number(puckProps.opacity);
  // Combo
  if (puckProps.lineSmooth === 'false') config.lineSmooth = false;
  if (puckProps.barBorderRadius != null && Number(puckProps.barBorderRadius) > 0)
    config.barBorderRadius = Number(puckProps.barBorderRadius);
  // Heatmap
  if (puckProps.cellBorderWidth != null && puckProps.cellBorderWidth !== '')
    config.cellBorderWidth = Number(puckProps.cellBorderWidth);
  if (s(puckProps.cellBorderColor)) config.cellBorderColor = puckProps.cellBorderColor;
  // Radar
  if (s(puckProps.shape)) config.shape = puckProps.shape;
  if (puckProps.areaFill === 'false') config.areaFill = false;
  // Funnel
  if (s(puckProps.sort)) config.sort = puckProps.sort;
  if (s(puckProps.funnelAlign)) config.funnelAlign = puckProps.funnelAlign;
  if (puckProps.gap != null && Number(puckProps.gap) > 0) config.gap = Number(puckProps.gap);
  // Treemap
  if (puckProps.showUpperLabel === 'true') config.showUpperLabel = true;
  else if (puckProps.showUpperLabel === 'false') config.showUpperLabel = false;
  if (puckProps.maxDepth != null && Number(puckProps.maxDepth) > 0)
    config.maxDepth = Number(puckProps.maxDepth);
  if (puckProps.borderWidth != null && Number(puckProps.borderWidth) > 0)
    config.borderWidth = Number(puckProps.borderWidth);
  // Sankey
  if (puckProps.nodeWidth != null && puckProps.nodeWidth !== '')
    config.nodeWidth = Number(puckProps.nodeWidth);
  if (puckProps.nodeGap != null && puckProps.nodeGap !== '')
    config.nodeGap = Number(puckProps.nodeGap);
  if (s(puckProps.orient)) config.orient = puckProps.orient;
  // Waterfall
  if (s(puckProps.totalLabel)) config.totalLabel = puckProps.totalLabel;
  if (s(puckProps.increaseColor)) config.increaseColor = puckProps.increaseColor;
  if (s(puckProps.decreaseColor)) config.decreaseColor = puckProps.decreaseColor;
  if (s(puckProps.totalColor)) config.totalColor = puckProps.totalColor;
  // BoxPlot
  if (s(puckProps.boxWidth)) config.boxWidth = puckProps.boxWidth;
  // Gauge
  if (puckProps.startAngle != null && puckProps.startAngle !== '')
    config.startAngle = Number(puckProps.startAngle);
  if (puckProps.endAngle != null && puckProps.endAngle !== '')
    config.endAngle = Number(puckProps.endAngle);
  if (puckProps.roundCap === 'true') config.roundCap = true;
  else if (puckProps.roundCap === 'false') config.roundCap = false;
  if (puckProps.splitCount != null && puckProps.splitCount !== '')
    config.splitCount = Number(puckProps.splitCount);
  if (puckProps.progressMode === 'true') config.progressMode = true;
  else if (puckProps.progressMode === 'false') config.progressMode = false;
  // Table
  if (puckProps.striped === 'true') config.striped = true;
  else if (puckProps.striped === 'false') config.striped = false;
  if (puckProps.showRowNumbers === 'true') config.showRowNumbers = true;
  else if (puckProps.showRowNumbers === 'false') config.showRowNumbers = false;
  if (puckProps.showTotals === 'true') config.showTotals = true;
  else if (puckProps.showTotals === 'false') config.showTotals = false;
  if (s(puckProps.headerAlign)) config.headerAlign = puckProps.headerAlign;
  if (s(puckProps.cellAlign)) config.cellAlign = puckProps.cellAlign;
  // KPI
  if (s(puckProps.subtitleField)) config.subtitleField = puckProps.subtitleField;
  if (s(puckProps.fontSize)) config.fontSize = puckProps.fontSize;
  if (s(puckProps.trendDirection)) config.trendDirection = puckProps.trendDirection;
  if (s(puckProps.prefix)) config.prefix = puckProps.prefix;
  if (s(puckProps.suffix)) config.suffix = puckProps.suffix;
  if (s(puckProps.format)) config.format = puckProps.format;

  return config;
}

// ─── Sample Data Remapping ───────────────────────────────────

/**
 * Build a mapping from config field names → original sample data keys.
 *
 * When a user picks "units" as Y-axis, the config says yFields: ['units'],
 * but sample data rows only have { month, revenue, orders }. We remap
 * sample data keys so 'revenue' → 'units', keeping the chart working.
 */
function buildFieldRemap(
  widgetType: string,
  config: Record<string, unknown>,
): Record<string, string> {
  const defaults = DEFAULT_CONFIGS[widgetType] ?? {};
  const remap: Record<string, string> = {};

  const addRemap = (configKey: string, defaultKey: string | undefined) => {
    const userVal = config[configKey];
    if (
      typeof userVal === 'string' &&
      userVal.length > 0 &&
      typeof defaultKey === 'string' &&
      defaultKey !== userVal
    ) {
      remap[defaultKey] = userVal;
    }
  };

  const addArrayRemap = (configKey: string, defaultKey: string | undefined, index: number) => {
    const arr = config[configKey];
    if (Array.isArray(arr) && arr[index] && typeof arr[index] === 'string') {
      const userVal = arr[index] as string;
      if (typeof defaultKey === 'string' && defaultKey !== userVal) {
        remap[defaultKey] = userVal;
      }
    }
  };

  addRemap('xField', defaults.xField as string | undefined);
  // yFields: first element maps to first default yField
  const defaultYFields = defaults.yFields as string[] | undefined;
  if (defaultYFields) {
    addArrayRemap('yFields', defaultYFields[0], 0);
  }
  addRemap('yField', defaults.yField as string | undefined);
  addRemap('valueField', defaults.valueField as string | undefined);
  addRemap('nameField', defaults.nameField as string | undefined);
  addRemap('categoryField', defaults.categoryField as string | undefined);
  addRemap('sizeField', defaults.sizeField as string | undefined);
  addRemap('sourceField', defaults.sourceField as string | undefined);
  addRemap('targetField', defaults.targetField as string | undefined);
  addRemap('indicatorField', defaults.indicatorField as string | undefined);
  addRemap('comparisonField', defaults.comparisonField as string | undefined);
  // Combo chart
  const defaultBarFields = defaults.barFields as string[] | undefined;
  if (defaultBarFields) addArrayRemap('barFields', defaultBarFields[0], 0);
  const defaultLineFields = defaults.lineFields as string[] | undefined;
  if (defaultLineFields) addArrayRemap('lineFields', defaultLineFields[0], 0);

  return remap;
}

/**
 * Apply key remapping to sample data rows.
 * Returns original data unchanged if no remapping is needed.
 */
function remapSampleData(
  data: Record<string, unknown>[],
  fieldRemap: Record<string, string>,
): Record<string, unknown>[] {
  const entries = Object.entries(fieldRemap);
  if (entries.length === 0) return data;

  return data.map((row) => {
    const newRow: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      const newKey = fieldRemap[key] ?? key;
      newRow[newKey] = value;
    }
    return newRow;
  });
}

// ─── Chart Preview Component ─────────────────────────────────

/**
 * Extract a flat map of field roles → field ids **from user-bound puckProps only**.
 *
 * Critical: this MUST NOT pull in values from DEFAULT_CONFIGS, because those
 * defaults are placeholder names from sample data (e.g. `comparisonField:
 * 'comparison'`, `yFields: ['revenue', 'orders']`) that do not exist in the
 * host's actual datasets. Including them makes the preview POST fields the
 * backend doesn't recognize, which yields 400s and silent fallback to sample.
 *
 * When the user hasn't bound any field yet, this returns `{}` and the caller
 * skips the fetch entirely — the chart then renders static sample data, which
 * is the intended "placeholder" state until real bindings exist.
 */
function extractFieldsFromUserProps(
  puckProps: Record<string, unknown>,
): Record<string, string | string[] | undefined> {
  const str = (v: unknown) => (typeof v === 'string' && v.length > 0 ? v : undefined);
  const fields: Record<string, string | string[] | undefined> = {};
  const metricFieldIds = new Set<string>();

  const xAxisField = str(puckProps.xAxisField);
  if (xAxisField) fields.xField = xAxisField;

  const yAxisField = str(puckProps.yAxisField);
  if (yAxisField) {
    fields.yFields = [yAxisField];
    fields.yField = yAxisField;
    metricFieldIds.add(yAxisField);
  }

  const nameField = str(puckProps.nameField);
  if (nameField) fields.nameField = nameField;

  const valueField = str(puckProps.valueField);
  if (valueField) {
    fields.valueField = valueField;
    metricFieldIds.add(valueField);
  }

  const categoryField = str(puckProps.categoryField);
  if (categoryField) {
    fields.categoryField = categoryField;
    if (!fields.nameField) fields.nameField = categoryField;
  }

  const sizeField = str(puckProps.sizeField);
  if (sizeField) {
    fields.sizeField = sizeField;
    metricFieldIds.add(sizeField);
  }

  const sourceField = str(puckProps.sourceField);
  if (sourceField) fields.sourceField = sourceField;

  const targetField = str(puckProps.targetField);
  if (targetField) fields.targetField = targetField;

  const seriesField = str(puckProps.seriesField);
  if (seriesField) fields.seriesField = seriesField;

  const colorGroupField = str(puckProps.colorGroupField);
  if (colorGroupField) fields.colorGroupField = colorGroupField;

  const barField = str(puckProps.barField);
  if (barField) {
    fields.barFields = [barField];
    metricFieldIds.add(barField);
  }

  const lineField = str(puckProps.lineField);
  if (lineField) {
    fields.lineFields = [lineField];
    metricFieldIds.add(lineField);
  }

  const comparisonField = str(puckProps.comparisonField);
  if (comparisonField) {
    fields.comparisonField = comparisonField;
    metricFieldIds.add(comparisonField);
  }

  const parentField = str(puckProps.parentField);
  if (parentField) fields.parentField = parentField;

  const aggregation = str(puckProps.aggregation);
  if (aggregation) fields.aggregation = aggregation;

  if (metricFieldIds.size > 0) {
    fields.metricFields = Array.from(metricFieldIds);
  }

  return fields;
}

const NON_BINDING_KEYS = new Set(['aggregation', 'metricFields']);

function hasUserBoundAnyField(fields: Record<string, string | string[] | undefined>): boolean {
  for (const [key, value] of Object.entries(fields)) {
    if (NON_BINDING_KEYS.has(key)) continue;
    if (value === undefined) continue;
    if (Array.isArray(value) ? value.length > 0 : value.length > 0) {
      return true;
    }
  }
  return false;
}

interface ChartPreviewProps {
  widgetType: string;
  puckProps: Record<string, unknown>;
  fallbackIcon: string;
}

/**
 * Renders a live ECharts preview using real data from the host app when
 * available, or static sample data as a fallback.
 */
export function ChartPreview({ widgetType, puckProps, fallbackIcon }: ChartPreviewProps) {
  const Component = WIDGET_COMPONENTS[widgetType];
  const sampleData = useMemo(() => getSampleData(widgetType), [widgetType]);
  const fetchPreviewData = usePreviewData();
  const config = useMemo(() => buildWidgetConfig(widgetType, puckProps), [widgetType, puckProps]);

  // Build the data request from the user's explicit bindings only.
  // IMPORTANT: we read from `puckProps` (user input) not `config` (merged with
  // sample-data defaults) so we never POST field names that don't exist in
  // the host's dataset.
  const datasetRef = (puckProps.datasetRef as string) || '';
  const dataRequest = useMemo<PreviewDataRequest | null>(() => {
    if (!fetchPreviewData || !datasetRef) return null;
    const userFields = extractFieldsFromUserProps(puckProps);
    if (!hasUserBoundAnyField(userFields)) return null;
    return { datasetRef, fields: userFields };
  }, [fetchPreviewData, datasetRef, puckProps]);

  // Fetch real data from host when available
  const [hostData, setHostData] = useState<Record<string, unknown>[] | null>(null);
  useEffect(() => {
    if (!dataRequest || !fetchPreviewData) {
      setHostData(null);
      return;
    }
    let cancelled = false;
    const result = fetchPreviewData(dataRequest);
    if (result instanceof Promise) {
      result
        .then((rows) => {
          if (!cancelled) setHostData(rows);
        })
        .catch(() => {
          if (!cancelled) setHostData(null);
        });
    } else {
      setHostData(result);
    }
    return () => {
      cancelled = true;
    };
  }, [dataRequest, fetchPreviewData]);

  // Use host data when available, otherwise fall back to remapped sample data
  const fieldRemap = useMemo(() => buildFieldRemap(widgetType, config), [widgetType, config]);
  const fallbackData = useMemo(
    () => (sampleData ? remapSampleData(sampleData.data, fieldRemap) : []),
    [sampleData, fieldRemap],
  );
  const previewData = hostData && hostData.length > 0 ? hostData : fallbackData;

  const displayTitle = (puckProps.title as string) || widgetType;

  if (widgetType === 'alerts' && (sampleData || hostData)) {
    return (
      <AlertsPreview
        title={displayTitle}
        data={previewData}
        config={config}
        fallbackIcon={fallbackIcon}
      />
    );
  }

  if (!Component || (!sampleData && !hostData)) {
    return React.createElement(
      'div',
      {
        style: {
          border: '1px dashed #d9d9d9',
          borderRadius: 8,
          padding: 16,
          minHeight: 160,
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          background: '#fafafa',
          fontFamily: 'sans-serif',
        },
      },
      React.createElement('span', { style: { fontSize: 32 } }, fallbackIcon),
      React.createElement('span', { style: { fontWeight: 600, fontSize: 14 } }, displayTitle),
      React.createElement('span', { style: { fontSize: 12, color: '#999' } }, widgetType),
    );
  }

  const widgetProps: WidgetProps = {
    widgetId: `preview-${widgetType}`,
    widgetType,
    title: displayTitle,
    config,
    data: previewData,
    columns: sampleData?.columns?.map((c) => ({
      fieldId: fieldRemap[c.key] ?? c.key,
      label: c.title,
      dataType: 'string',
    })),
    height: widgetType === 'kpi-card' ? 120 : 200,
  };

  return React.createElement(
    'div',
    {
      style: {
        borderRadius: 8,
        overflow: 'hidden',
        background: '#fff',
        minHeight: widgetType === 'kpi-card' ? 120 : 200,
      },
    },
    React.createElement(
      ErrorBoundary,
      {
        fallback: React.createElement(
          'div',
          { style: { padding: 16, color: '#999', textAlign: 'center' as const } },
          React.createElement('span', { style: { fontSize: 24 } }, fallbackIcon),
          React.createElement(
            'div',
            { style: { fontSize: 12, marginTop: 4 } },
            'Preview unavailable',
          ),
        ),
      },
      React.createElement(Component, widgetProps),
    ),
  );
}

// ─── Simple Error Boundary ───────────────────────────────────

interface ErrorBoundaryProps {
  fallback: React.ReactNode;
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
