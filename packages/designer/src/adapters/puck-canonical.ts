/**
 * Bidirectional adapter: Puck Data ↔ Canonical DashboardDefinition.
 *
 * puckToCanonical(): Convert Puck editor data → DashboardDefinition (for save/export)
 * canonicalToPuck(): Convert DashboardDefinition → Puck data (for load/import)
 */
import type { Data, ComponentData } from '@puckeditor/core';
import type {
  DashboardDefinition,
  PageDefinition,
  LayoutMap,
  LayoutComponent,
  WidgetDefinition,
  FieldBinding,
} from '@supersubset/schema';
import { PUCK_NAME_TO_WIDGET_TYPE, WIDGET_TYPE_TO_PUCK_NAME } from '../blocks/charts';
import { CONTENT_PUCK_NAME_TO_TYPE } from '../blocks/content';
import { CONTROL_PUCK_NAME_TO_TYPE } from '../blocks/controls';
import { LAYOUT_PUCK_NAME_TO_TYPE } from '../blocks/layout';
import {
  ALERT_RULE_DESIGNER_KEYS,
  buildStructuredAlertRuleConfig,
  buildStructuredAlertRuleDraft,
} from './alert-rule-helpers';

// All component type maps merged
const puckNameToType: Record<string, string> = {
  ...PUCK_NAME_TO_WIDGET_TYPE,
  ...CONTENT_PUCK_NAME_TO_TYPE,
  ...CONTROL_PUCK_NAME_TO_TYPE,
};

const typeToPuckName: Record<string, string> = {
  ...WIDGET_TYPE_TO_PUCK_NAME,
  ...Object.fromEntries(Object.entries(CONTENT_PUCK_NAME_TO_TYPE).map(([k, v]) => [v, k])),
  ...Object.fromEntries(Object.entries(CONTROL_PUCK_NAME_TO_TYPE).map(([k, v]) => [v, k])),
};

// ─── Puck → Canonical ───────────────────────────────────────

/**
 * Convert Puck editor data to a canonical DashboardDefinition.
 */
export function puckToCanonical(
  puckData: Data,
  options?: {
    dashboardId?: string;
    dashboardTitle?: string;
    baseDashboard?: DashboardDefinition;
    pageIndex?: number;
    pageId?: string;
    pageTitle?: string;
  },
): DashboardDefinition {
  const rootProps = puckData.root?.props ?? (puckData.root as Record<string, unknown>) ?? {};
  const title =
    options?.dashboardTitle ??
    ((rootProps as Record<string, unknown>).title as string) ??
    'Untitled Dashboard';

  const layout: LayoutMap = {};
  const widgets: WidgetDefinition[] = [];

  // Recursively walk content items (slot children may live in data.zones at runtime)
  const childIds = processContentItems(
    (puckData.content ?? []) as ComponentData[],
    'grid-main',
    layout,
    widgets,
    puckData.zones as PuckZones | undefined,
  );

  // Root layout node
  const rootId = 'root';
  layout[rootId] = {
    id: rootId,
    type: 'root',
    children: ['grid-main'],
    meta: {},
  };

  // Grid wrapping all children
  layout['grid-main'] = {
    id: 'grid-main',
    type: 'grid',
    children: childIds,
    parentId: rootId,
    meta: { columns: 12 },
  };

  // Update parent refs
  for (const childId of childIds) {
    if (layout[childId]) {
      layout[childId] = { ...layout[childId], parentId: 'grid-main' };
    }
  }

  const targetPageIndex = options?.pageIndex ?? 0;
  const baseDashboard = options?.baseDashboard;
  const existingPage = baseDashboard?.pages?.[targetPageIndex];

  const nextPage: PageDefinition = {
    id: options?.pageId ?? existingPage?.id ?? 'page-1',
    title: options?.pageTitle ?? existingPage?.title ?? 'Page 1',
    layout,
    rootNodeId: rootId,
    widgets,
  };

  if (baseDashboard) {
    const pages = [...baseDashboard.pages];
    if (pages[targetPageIndex]) {
      pages[targetPageIndex] = nextPage;
    } else {
      pages.push(nextPage);
    }

    return {
      ...baseDashboard,
      schemaVersion: baseDashboard.schemaVersion ?? '0.2.0',
      id: options?.dashboardId ?? baseDashboard.id ?? generateId(),
      title,
      pages,
    };
  }

  return {
    schemaVersion: '0.2.0',
    id: options?.dashboardId ?? generateId(),
    title,
    pages: [nextPage],
  };
}

// ─── Canonical → Puck ───────────────────────────────────────

/**
 * Convert a canonical DashboardDefinition to Puck editor data.
 * Uses the first page of the dashboard.
 */
export function canonicalToPuck(
  dashboard: DashboardDefinition,
  options?: { pageIndex?: number },
): Data {
  const pageIndex = options?.pageIndex ?? 0;
  const page = dashboard.pages[pageIndex];
  if (!page) {
    return { root: { props: {} }, content: [] };
  }

  const rootNode = page.layout[page.rootNodeId];
  if (!rootNode) {
    return { root: { props: {} }, content: [] };
  }

  // Walk layout tree, reconstructing nested Puck content
  const content = layoutChildrenToPuck(rootNode.children, page.layout, page.widgets);

  return {
    root: { props: {} },
    content,
  };
}

// ─── Helpers ─────────────────────────────────────────────────

function generateId(): string {
  return `ss-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

const layoutTypeToPuckName: Record<string, string> = {
  row: 'RowBlock',
  column: 'ColumnBlock',
};

/** Puck ColumnBlock uses CSS alignSelf values; canonical schema uses top/center/bottom. */
const PUCK_TO_CANONICAL_VERTICAL_ALIGN: Record<string, 'top' | 'center' | 'bottom' | undefined> = {
  start: 'top',
  top: 'top',
  center: 'center',
  end: 'bottom',
  bottom: 'bottom',
  stretch: undefined,
};

const CANONICAL_TO_PUCK_VERTICAL_ALIGN: Record<string, string> = {
  top: 'start',
  center: 'center',
  bottom: 'end',
};

function puckVerticalAlignToCanonical(value: unknown): 'top' | 'center' | 'bottom' | undefined {
  if (typeof value !== 'string') return undefined;
  return PUCK_TO_CANONICAL_VERTICAL_ALIGN[value];
}

function canonicalVerticalAlignToPuck(value: unknown): string {
  if (typeof value !== 'string') return 'stretch';
  return CANONICAL_TO_PUCK_VERTICAL_ALIGN[value] ?? 'stretch';
}

/**
 * Recursively walk Puck content items and build layout nodes + widgets.
 * Handles RowBlock/ColumnBlock nesting by creating row/column layout nodes.
 */
type PuckZones = Record<string, ComponentData[]>;

const PUCK_SLOT_FIELD_NAMES = ['content'] as const;

/** Read slot children from inline props or Puck runtime zones (`parentId:slotField`). */
function readPuckSlotContent(
  props: Record<string, unknown>,
  itemId: string | undefined,
  zones: PuckZones | undefined,
  slotField = 'content',
): ComponentData[] {
  const inline = props[slotField];
  if (Array.isArray(inline) && inline.length > 0) {
    return inline as ComponentData[];
  }

  if (itemId && zones) {
    const fromZone = zones[`${itemId}:${slotField}`];
    if (Array.isArray(fromZone)) {
      return fromZone;
    }
  }

  return Array.isArray(inline) ? (inline as ComponentData[]) : [];
}

function processContentItems(
  items: ComponentData[],
  parentLayoutId: string,
  layout: LayoutMap,
  widgets: WidgetDefinition[],
  zones?: PuckZones,
): string[] {
  const childIds: string[] = [];

  for (const item of items) {
    const puckType = item.type;
    const props = (item.props ?? {}) as Record<string, unknown>;
    const itemId = (props.id as string) ?? generateId();

    // Layout block (RowBlock, ColumnBlock) → recurse into slot content
    const layoutBlockType = LAYOUT_PUCK_NAME_TO_TYPE[puckType];
    if (layoutBlockType) {
      const layoutId = `layout-${itemId}`;
      const slotContent = readPuckSlotContent(props, itemId, zones);
      const nestedChildIds = processContentItems(slotContent, layoutId, layout, widgets, zones);

      layout[layoutId] = {
        id: layoutId,
        type: layoutBlockType as LayoutComponent['type'],
        children: nestedChildIds,
        parentId: parentLayoutId,
        meta: buildLayoutBlockMeta(puckType, props),
      };
      childIds.push(layoutId);
      continue;
    }

    const widgetType = puckNameToType[puckType];
    if (!widgetType) continue;

    const isWidget = !!PUCK_NAME_TO_WIDGET_TYPE[puckType] || !!CONTROL_PUCK_NAME_TO_TYPE[puckType];

    if (isWidget) {
      const { id: _id, ...widgetProps } = props;
      const widget = buildWidgetDefinition(itemId, widgetType, widgetProps);
      widgets.push(widget);

      const layoutId = `layout-${itemId}`;
      layout[layoutId] = {
        id: layoutId,
        type: 'widget',
        children: [],
        parentId: parentLayoutId,
        meta: {
          widgetRef: itemId,
          width: 12,
        },
      };
      childIds.push(layoutId);
    } else {
      const layoutType = CONTENT_PUCK_NAME_TO_TYPE[puckType] as LayoutComponent['type'];
      const layoutId = `layout-${itemId}`;
      const { id: _id, ...contentProps } = props;

      layout[layoutId] = {
        id: layoutId,
        type: layoutType || 'header',
        children: [],
        parentId: parentLayoutId,
        meta: {
          text: contentProps.text as string,
          headerSize: contentProps.size as 'small' | 'medium' | 'large',
          ...buildContentMeta(puckType, contentProps),
        },
      };
      childIds.push(layoutId);
    }
  }

  return childIds;
}

/**
 * Walk canonical layout children and reconstruct nested Puck content.
 * Preserves row/column nesting instead of flattening.
 */
function layoutChildrenToPuck(
  childIds: string[],
  layout: LayoutMap,
  widgets: WidgetDefinition[],
): ComponentData[] {
  const content: ComponentData[] = [];

  for (const childId of childIds) {
    const node = layout[childId];
    if (!node) continue;

    // Grid nodes are transparent — recurse through their children
    if (node.type === 'grid' || node.type === 'root') {
      content.push(...layoutChildrenToPuck(node.children, layout, widgets));
      continue;
    }

    // Row or column → reconstruct as RowBlock/ColumnBlock with nested content
    const puckLayoutName = layoutTypeToPuckName[node.type];
    if (puckLayoutName) {
      const nestedContent =
        node.type === 'row'
          ? rowChildrenToPuck(node.children, layout, widgets)
          : layoutChildrenToPuck(node.children, layout, widgets);
      content.push({
        type: puckLayoutName,
        props: {
          id: node.id,
          content: nestedContent,
          ...layoutNodeToPuckProps(node),
        },
      } as ComponentData);
      continue;
    }

    // Widget node
    if (node.type === 'widget' && node.meta.widgetRef) {
      const widget = widgets.find((w) => w.id === node.meta.widgetRef);
      if (!widget) continue;
      const puckName = typeToPuckName[widget.type];
      if (!puckName) continue;

      content.push({
        type: puckName,
        props: {
          id: widget.id,
          title: widget.title ?? '',
          ...widgetConfigToPuckProps(widget),
        },
      } as ComponentData);
      continue;
    }

    // Content block (header, divider, spacer)
    if (['header', 'divider', 'spacer'].includes(node.type)) {
      const puckName = typeToPuckName[node.type];
      if (!puckName) continue;

      content.push({
        type: puckName,
        props: {
          id: node.id,
          ...layoutMetaToPuckProps(node),
        },
      } as ComponentData);
    }
  }

  return content;
}

function rowChildrenToPuck(
  childIds: string[],
  layout: LayoutMap,
  widgets: WidgetDefinition[],
): ComponentData[] {
  const content: ComponentData[] = [];

  for (const childId of childIds) {
    const child = layout[childId];
    if (!child) continue;

    if (child.type === 'column') {
      content.push(...layoutChildrenToPuck([childId], layout, widgets));
      continue;
    }

    const rawWidth = child.meta.width;
    const span =
      typeof rawWidth === 'number' && Number.isFinite(rawWidth)
        ? Math.min(12, Math.max(1, rawWidth))
        : 12;

    content.push({
      type: 'ColumnBlock',
      props: {
        id: `column-${child.id}`,
        span,
        verticalAlign: 'stretch',
        content: layoutChildrenToPuck([childId], layout, widgets),
      },
    } as ComponentData);
  }

  return content;
}

function buildLayoutBlockMeta(
  puckType: string,
  props: Record<string, unknown>,
): Record<string, unknown> {
  const meta: Record<string, unknown> = {};
  if (puckType === 'RowBlock') {
    if (props.gap !== undefined) meta.gap = props.gap;
    if (props.padding !== undefined) meta.padding = props.padding;
    if (props.minHeight !== undefined) meta.minHeight = props.minHeight;
    if (props.background) meta.background = props.background;
  }
  if (puckType === 'ColumnBlock') {
    if (props.span !== undefined) meta.width = props.span;
    const verticalAlign = puckVerticalAlignToCanonical(props.verticalAlign);
    if (verticalAlign) meta.verticalAlign = verticalAlign;
  }
  return meta;
}

function layoutNodeToPuckProps(node: LayoutComponent): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  if (node.type === 'row') {
    if (node.meta.gap !== undefined) props.gap = node.meta.gap;
    if (node.meta.padding !== undefined) props.padding = node.meta.padding;
    if (node.meta.minHeight !== undefined) props.minHeight = node.meta.minHeight;
    if (node.meta.background) props.background = node.meta.background;
  }
  if (node.type === 'column') {
    if (node.meta.width !== undefined) props.span = node.meta.width;
    if (node.meta.verticalAlign) {
      props.verticalAlign = canonicalVerticalAlignToPuck(node.meta.verticalAlign);
    }
  }
  return props;
}

const TABLE_BOOLEAN_CONFIG_KEYS = new Set(['striped', 'showRowNumbers', 'showTotals']);

const BOOLEAN_CONFIG_KEYS = new Set([
  ...TABLE_BOOLEAN_CONFIG_KEYS,
  'showTimestamp',
  'smooth',
  'stacked',
  'showLegend',
  'showValues',
  'logAxis',
  'zoomable',
  'showMarkers',
  'connectNulls',
  'lineSmooth',
  'areaFill',
  'showUpperLabel',
  'roundCap',
  'progressMode',
]);

const NUMERIC_CONFIG_KEYS = new Set([
  'maxItems',
  'ruleThreshold',
  'xAxisLabelRotate',
  'yAxisMin',
  'yAxisMax',
  'markerSize',
  'areaOpacity',
  'borderRadius',
  'barMinHeight',
  'innerRadius',
  'outerRadius',
  'padAngle',
  'symbolSize',
  'opacity',
  'barBorderRadius',
  'cellBorderWidth',
  'gap',
  'maxDepth',
  'nodeWidth',
  'nodeGap',
  'startAngle',
  'endAngle',
  'splitCount',
  'pageSize',
]);

const PUCK_STRING_NUMERIC_CONFIG_KEYS = new Set(['xAxisLabelRotate', 'areaOpacity', 'opacity']);

function normalizeBooleanRadioValue(value: unknown): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

function unwrapPuckOptionValue(value: unknown): unknown {
  if (value && typeof value === 'object' && 'value' in value) {
    return unwrapPuckOptionValue((value as { value: unknown }).value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}') && trimmed.includes('"value"')) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (parsed && typeof parsed === 'object' && 'value' in parsed) {
          return unwrapPuckOptionValue((parsed as { value: unknown }).value);
        }
      } catch {
        // Keep the original string when the value is not a serialized option payload.
      }
    }
  }

  return value;
}

/** Flatten Puck select/radio values like `'{"value":"count"}'` → `'count'`. */
function normalizePuckOptionProps(props: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null) {
      continue;
    }
    const unwrapped = unwrapPuckOptionValue(value);
    if (unwrapped !== value) {
      props[key] = unwrapped;
    }
  }
}

function normalizeNumericConfigValue(value: unknown): unknown {
  const unwrapped = unwrapPuckOptionValue(value);
  if (typeof unwrapped === 'number' && Number.isFinite(unwrapped)) {
    return unwrapped;
  }

  if (typeof unwrapped === 'string' && unwrapped.trim() !== '') {
    const parsed = Number(unwrapped);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return unwrapped;
}

function normalizeConfigEntries(key: string, value: unknown): Array<[string, unknown]> {
  const unwrappedValue = unwrapPuckOptionValue(value);

  if (key === 'orientation') {
    if (unwrappedValue === 'horizontal') return [['horizontal', true]];
    if (unwrappedValue === 'vertical') return [['horizontal', false]];
    return [];
  }

  if (key === 'variant') {
    if (unwrappedValue === 'donut') return [['donut', true]];
    if (unwrappedValue === 'pie') return [['donut', false]];
    if (unwrappedValue === 'rose') return [['roseType', 'radius']];
    return [];
  }

  const booleanNormalized = BOOLEAN_CONFIG_KEYS.has(key)
    ? normalizeBooleanRadioValue(unwrappedValue)
    : unwrappedValue;
  const numericNormalized = NUMERIC_CONFIG_KEYS.has(key)
    ? normalizeNumericConfigValue(booleanNormalized)
    : booleanNormalized;

  return [[key, numericNormalized]];
}

function buildWidgetDefinition(
  id: string,
  widgetType: string,
  props: Record<string, unknown>,
): WidgetDefinition {
  const widget: WidgetDefinition = {
    id,
    type: widgetType,
    title: (props.title as string) ?? '',
    config: {},
  };

  // Extract data binding fields
  const datasetRef = props.datasetRef as string;
  if (datasetRef) {
    const fields: FieldBinding[] = [];

    // Map common field props to field bindings
    const fieldMappings: Array<[string, string]> = [
      ['xAxisField', 'x-axis'],
      ['yAxisField', 'y-axis'],
      ['seriesField', 'series'],
      ['valueField', 'value'],
      ['categoryField', 'category'],
      ['sizeField', 'size'],
      ['colorGroupField', 'color-group'],
      ['barField', 'bar-y'],
      ['lineField', 'line-y'],
      ['nameField', 'name'],
      ['parentField', 'parent'],
      ['sourceField', 'source'],
      ['targetField', 'target'],
      ['comparisonField', 'comparison'],
      ['titleField', 'alert-title'],
      ['messageField', 'alert-message'],
      ['severityField', 'alert-severity'],
      ['timestampField', 'alert-timestamp'],
    ];

    const METRIC_BINDING_ROLES = new Set([
      'y-axis',
      'value',
      'bar-y',
      'line-y',
      'size',
      'comparison',
    ]);

    for (const [propKey, role] of fieldMappings) {
      const fieldRef = props[propKey] as string;
      if (fieldRef) {
        fields.push({
          role,
          fieldRef,
          aggregation:
            METRIC_BINDING_ROLES.has(role) && props.aggregation && props.aggregation !== 'none'
              ? (props.aggregation as string)
              : undefined,
        });
      }
    }

    supplementDataBindingFieldsFromLegacyProps(props, fields);

    // Always create dataBinding when datasetRef is present (even without fields,
    // e.g. Table widget needs datasetRef to know which dataset to query)
    widget.dataBinding = { datasetRef, fields };
  }

  // Transfer all remaining props to config except known non-config keys.
  // Using a blacklist ensures new fields are never silently dropped.
  const NON_CONFIG_KEYS = new Set([
    'title', // → widget.title
    'datasetRef', // → dataBinding.datasetRef
    'aggregation', // → field binding .aggregation
    'puck', // Puck internal prop
    // Puck-specific field names that differ from config key names;
    // the runtime translates dataBinding roles back to config keys.
    'xAxisField',
    'yAxisField',
  ]);
  for (const [key, value] of Object.entries(props)) {
    if (widgetType === 'filter-bar' && key === 'filterIds') {
      const filterIds = normalizeStringArray(value);

      if (filterIds.length > 0) {
        widget.config[key] = filterIds;
      }

      continue;
    }

    if (!NON_CONFIG_KEYS.has(key) && value !== undefined && value !== '') {
      for (const [configKey, normalizedValue] of normalizeConfigEntries(key, value)) {
        if (normalizedValue !== undefined && normalizedValue !== '') {
          widget.config[configKey] = normalizedValue;
        }
      }
    }
  }

  if (widgetType === 'alerts') {
    const isStructuredAlertMode = widget.config.alertMode === 'structured';
    const structuredAlertRuleDraft = buildStructuredAlertRuleDraft(widget.config);
    const structuredAlertRule = buildStructuredAlertRuleConfig(widget.config);

    for (const key of ALERT_RULE_DESIGNER_KEYS) {
      delete widget.config[key];
    }

    if (isStructuredAlertMode) {
      widget.config.alertMode = 'structured';

      if (structuredAlertRuleDraft) {
        widget.config.alertRuleDraft = structuredAlertRuleDraft;
      }

      if (structuredAlertRule) {
        widget.config.alertRule = structuredAlertRule;
      }
    }
  }

  mirrorHostRuntimeConfigFields(widget);

  return widget;
}

interface LogicalQueryFieldLike {
  fieldId: string;
  aggregation?: string;
  alias?: string;
}

interface LogicalQueryLike {
  datasetId: string;
  fields: LogicalQueryFieldLike[];
}

interface ResolvedFieldBinding {
  fieldRef: string;
  aggregation?: string;
}

const HOST_CONFIG_FIELD_MIRROR: Array<[string, string]> = [
  ['x-axis', 'xField'],
  ['y-axis', 'yField'],
  ['bar-y', 'barField'],
  ['line-y', 'lineField'],
  ['category', 'categoryField'],
  ['value', 'valueField'],
];

/** Host apps (e.g. Tripmatch) read xField/yField from widget.config at runtime. */
function mirrorHostRuntimeConfigFields(widget: WidgetDefinition): void {
  if (!widget.dataBinding) {
    return;
  }

  for (const [role, configKey] of HOST_CONFIG_FIELD_MIRROR) {
    const binding = widget.dataBinding.fields.find((field) => field.role === role);
    if (!binding) {
      continue;
    }
    widget.config[configKey] = hostConfigValueForBinding(binding);
  }

  // Pie / part-to-whole charts use nameField in Tripmatch runtime.
  if (
    widget.type === 'pie-chart' &&
    typeof widget.config.categoryField === 'string' &&
    !widget.config.nameField
  ) {
    widget.config.nameField = widget.config.categoryField;
  }
}

function hostConfigValueForBinding(binding: FieldBinding): string {
  if (binding.aggregation && binding.aggregation !== 'none') {
    return hostAliasForAggregatedBinding(binding) ?? binding.fieldRef;
  }
  return binding.fieldRef;
}

function hostAliasForAggregatedBinding(binding: FieldBinding): string | undefined {
  if (binding.aggregation === 'count') {
    return 'count';
  }
  return undefined;
}

function readLogicalQueryFromWidgetConfig(
  config: Record<string, unknown>,
): LogicalQueryLike | null {
  const logicalQuery = config.logicalQuery;
  if (!logicalQuery || typeof logicalQuery !== 'object' || Array.isArray(logicalQuery)) {
    return null;
  }

  const record = logicalQuery as Record<string, unknown>;
  if (typeof record.datasetId !== 'string') {
    return null;
  }

  const fields: LogicalQueryFieldLike[] = [];
  if (Array.isArray(record.fields)) {
    for (const field of record.fields) {
      if (!field || typeof field !== 'object' || Array.isArray(field)) {
        continue;
      }
      const fieldRecord = field as Record<string, unknown>;
      if (typeof fieldRecord.fieldId !== 'string') {
        continue;
      }
      const nextField: LogicalQueryFieldLike = { fieldId: fieldRecord.fieldId };
      if (typeof fieldRecord.aggregation === 'string') {
        nextField.aggregation = fieldRecord.aggregation;
      }
      if (typeof fieldRecord.alias === 'string') {
        nextField.alias = fieldRecord.alias;
      }
      fields.push(nextField);
    }
  }

  return { datasetId: record.datasetId, fields };
}

function resolveLegacyConfigFieldRef(
  rawRef: string,
  logicalQuery: LogicalQueryLike,
): ResolvedFieldBinding | null {
  const queryField = logicalQuery.fields.find(
    (field) => field.alias === rawRef || field.fieldId === rawRef,
  );

  if (queryField) {
    return {
      fieldRef: queryField.fieldId,
      ...(queryField.aggregation ? { aggregation: queryField.aggregation } : {}),
    };
  }

  return { fieldRef: rawRef };
}

function dataBindingHasPopulatedRole(
  dataBinding: WidgetDefinition['dataBinding'],
  role: string,
): boolean {
  return !!dataBinding?.fields.some(
    (field) =>
      field.role === role && typeof field.fieldRef === 'string' && field.fieldRef.length > 0,
  );
}

function readLogicalQueryFromProps(props: Record<string, unknown>): LogicalQueryLike | null {
  const logicalQuery = props.logicalQuery;
  if (!logicalQuery || typeof logicalQuery !== 'object' || Array.isArray(logicalQuery)) {
    return null;
  }

  return readLogicalQueryFromWidgetConfig({ logicalQuery });
}

function ensureCartesianAxisPuckProps(
  props: Record<string, unknown>,
  config: Record<string, unknown>,
): void {
  const logicalQuery = readLogicalQueryFromWidgetConfig(config) ?? readLogicalQueryFromProps(props);

  if (!props.xAxisField) {
    const rawX = config.xField ?? props.xField;
    if (typeof rawX === 'string' && rawX.length > 0) {
      if (logicalQuery) {
        const resolved = resolveLegacyConfigFieldRef(rawX, logicalQuery);
        props.xAxisField = resolved?.fieldRef ?? rawX;
      } else {
        props.xAxisField = rawX;
      }
    }
  }

  if (!props.yAxisField) {
    const rawY = config.yField ?? props.yField;
    if (typeof rawY === 'string' && rawY.length > 0) {
      if (logicalQuery) {
        const resolved = resolveLegacyConfigFieldRef(rawY, logicalQuery);
        if (resolved) {
          props.yAxisField = resolved.fieldRef;
          if (resolved.aggregation && (!props.aggregation || props.aggregation === 'none')) {
            props.aggregation = resolved.aggregation;
          }
        }
      } else {
        props.yAxisField = rawY;
      }
    }
  }
}

function supplementDataBindingFieldsFromLegacyProps(
  props: Record<string, unknown>,
  fields: FieldBinding[],
): void {
  const logicalQuery = readLogicalQueryFromProps(props);
  const populatedRoles = new Set(
    fields
      .filter((field) => typeof field.fieldRef === 'string' && field.fieldRef.length > 0)
      .map((field) => field.role),
  );

  const legacyMappings: Array<[string, string, string]> = [
    ['xAxisField', 'xField', 'x-axis'],
    ['yAxisField', 'yField', 'y-axis'],
  ];

  for (const [puckKey, configKey, role] of legacyMappings) {
    if (populatedRoles.has(role)) {
      continue;
    }

    const fromPuck = props[puckKey];
    if (typeof fromPuck === 'string' && fromPuck.length > 0) {
      fields.push({
        role,
        fieldRef: fromPuck,
        ...(role === 'y-axis' && props.aggregation && props.aggregation !== 'none'
          ? { aggregation: props.aggregation as string }
          : {}),
      });
      continue;
    }

    const rawRef = props[configKey];
    if (typeof rawRef !== 'string' || rawRef.length === 0) {
      continue;
    }

    if (logicalQuery) {
      const resolved = resolveLegacyConfigFieldRef(rawRef, logicalQuery);
      if (resolved) {
        fields.push({
          role,
          fieldRef: resolved.fieldRef,
          ...(role === 'y-axis' && resolved.aggregation
            ? { aggregation: resolved.aggregation }
            : {}),
        });
      }
      continue;
    }

    fields.push({ role, fieldRef: rawRef });
  }

  if (!logicalQuery) {
    return;
  }

  if (!fieldBindingListHasPopulatedRole(fields, 'x-axis')) {
    const dimension = logicalQuery.fields.find((field) => !field.aggregation);
    if (dimension) {
      fields.push({ role: 'x-axis', fieldRef: dimension.fieldId });
    }
  }

  if (!fieldBindingListHasPopulatedRole(fields, 'y-axis')) {
    const metric = logicalQuery.fields.find(
      (field) => field.aggregation && field.aggregation !== 'none',
    );
    if (metric) {
      fields.push({
        role: 'y-axis',
        fieldRef: metric.fieldId,
        aggregation: metric.aggregation,
      });
    }
  }
}

function fieldBindingListHasPopulatedRole(fields: FieldBinding[], role: string): boolean {
  return fields.some(
    (field) =>
      field.role === role && typeof field.fieldRef === 'string' && field.fieldRef.length > 0,
  );
}

function buildContentMeta(
  puckType: string,
  props: Record<string, unknown>,
): Record<string, unknown> {
  const meta: Record<string, unknown> = {};
  if (puckType === 'DividerBlock') {
    meta.color = props.color;
    meta.thickness = props.thickness;
  }
  if (puckType === 'SpacerBlock') {
    meta.height = props.height;
  }
  if (puckType === 'MarkdownBlock') {
    meta.text = props.content;
  }
  return meta;
}

function widgetConfigToPuckProps(widget: WidgetDefinition): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  const logicalQuery = readLogicalQueryFromWidgetConfig(widget.config);

  // Reconstruct data binding fields
  if (widget.dataBinding) {
    props.datasetRef = widget.dataBinding.datasetRef;

    const roleToPropKey: Record<string, string> = {
      'x-axis': 'xAxisField',
      'y-axis': 'yAxisField',
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

    for (const field of widget.dataBinding.fields) {
      const propKey = roleToPropKey[field.role];
      if (propKey) {
        props[propKey] = field.fieldRef;
      }
      if (
        field.aggregation &&
        field.aggregation !== 'none' &&
        (field.role === 'y-axis' || field.role === 'value')
      ) {
        props.aggregation = field.aggregation;
      }
    }
  }

  if (!props.datasetRef) {
    if (typeof widget.config.datasetRef === 'string') {
      props.datasetRef = widget.config.datasetRef;
    } else if (logicalQuery?.datasetId) {
      props.datasetRef = logicalQuery.datasetId;
    }
  }

  const logicalQueryForFallback = logicalQuery;

  // Fallback: map field-ref keys stored in widget.config to Puck props
  // (for legacy/hand-authored dashboards that don't use dataBinding)
  const configFieldFallbacks: Array<[string, string, string]> = [
    // Standard keys (config key → Puck prop → dataBinding role)
    ['valueField', 'valueField', 'value'],
    ['comparisonField', 'comparisonField', 'comparison'],
    ['categoryField', 'categoryField', 'category'],
    ['sourceField', 'sourceField', 'source'],
    ['targetField', 'targetField', 'target'],
    ['sizeField', 'sizeField', 'size'],
    ['colorGroupField', 'colorGroupField', 'color-group'],
    ['nameField', 'nameField', 'name'],
    ['parentField', 'parentField', 'parent'],
    ['datasetRef', 'datasetRef', ''],
    ['xField', 'xAxisField', 'x-axis'],
    ['yField', 'yAxisField', 'y-axis'],
  ];

  for (const [configKey, puckProp, role] of configFieldFallbacks) {
    if (props[puckProp]) {
      continue;
    }
    if (role && widget.dataBinding && dataBindingHasPopulatedRole(widget.dataBinding, role)) {
      continue;
    }

    const rawRef = widget.config[configKey];
    if (typeof rawRef !== 'string' || rawRef.length === 0) {
      continue;
    }

    if (logicalQueryForFallback && (configKey === 'xField' || configKey === 'yField')) {
      const resolved = resolveLegacyConfigFieldRef(rawRef, logicalQueryForFallback);
      if (resolved) {
        props[puckProp] = resolved.fieldRef;
        if (resolved.aggregation && configKey === 'yField') {
          props.aggregation = resolved.aggregation;
        }
      }
      continue;
    }

    props[puckProp] = rawRef;
  }

  // Handle array-valued fields (yFields, barFields, lineFields)
  if (
    !props.yAxisField &&
    Array.isArray(widget.config.yFields) &&
    widget.config.yFields.length > 0
  ) {
    props.yAxisField = widget.config.yFields[0];
  }
  if (
    !props.barField &&
    Array.isArray(widget.config.barFields) &&
    widget.config.barFields.length > 0
  ) {
    props.barField = widget.config.barFields[0];
  }
  if (
    !props.lineField &&
    Array.isArray(widget.config.lineFields) &&
    widget.config.lineFields.length > 0
  ) {
    props.lineField = widget.config.lineFields[0];
  }

  // Spread config props (skip host axis aliases — mapped to Puck field props via ensureCartesianAxisPuckProps)
  const HOST_AXIS_ALIAS_KEYS = new Set(['xField', 'yField']);

  for (const [key, value] of Object.entries(widget.config)) {
    if (HOST_AXIS_ALIAS_KEYS.has(key)) {
      continue;
    }
    if (
      widget.type === 'alerts' &&
      (key === 'alertMode' || key === 'alertRule' || key === 'alertRuleDraft')
    ) {
      continue;
    }

    if (key === 'filterIds') {
      const filterIds = normalizeStringArray(value);

      if (filterIds.length > 0) {
        props[key] = filterIds;
      }

      continue;
    }

    if (key === 'horizontal' && typeof value === 'boolean') {
      props.orientation = value ? 'horizontal' : 'vertical';
      continue;
    }

    if (key === 'donut' && typeof value === 'boolean') {
      if (props.variant === undefined) {
        props.variant = value ? 'donut' : 'pie';
      }
      continue;
    }

    if (key === 'roseType') {
      if (value) {
        props.variant = 'rose';
      } else if (props.variant === undefined) {
        props.variant = 'pie';
      }
      continue;
    }

    if (BOOLEAN_CONFIG_KEYS.has(key) && typeof value === 'boolean') {
      props[key] = value ? 'true' : 'false';
      continue;
    }

    if (PUCK_STRING_NUMERIC_CONFIG_KEYS.has(key) && typeof value === 'number') {
      props[key] = String(value);
      continue;
    }

    props[key] = value;
  }

  if (widget.type === 'alerts') {
    const alertRule = widget.config.alertRule;
    const alertRuleDraft = widget.config.alertRuleDraft;
    const structuredAlertRule =
      isRecord(alertRule) && alertRule.mode === 'structured' ? alertRule : null;
    const structuredAlertRuleDraft =
      isRecord(alertRuleDraft) && alertRuleDraft.mode === 'structured' ? alertRuleDraft : null;
    const structuredAlertState = structuredAlertRuleDraft ?? structuredAlertRule;
    const isStructuredAlertMode =
      widget.config.alertMode === 'structured' || !!structuredAlertState;

    props.alertMode = isStructuredAlertMode ? 'structured' : 'data-binding';

    if (structuredAlertState) {
      if (typeof structuredAlertState.metricFieldRef === 'string') {
        props.ruleMetricField = structuredAlertState.metricFieldRef;
      }
      if (typeof structuredAlertState.aggregation === 'string') {
        props.ruleAggregation = structuredAlertState.aggregation;
      }
      if (typeof structuredAlertState.operator === 'string') {
        props.ruleOperator = structuredAlertState.operator;
      }
      if (typeof structuredAlertState.threshold === 'number') {
        props.ruleThreshold = structuredAlertState.threshold;
      }

      const alert = isRecord(structuredAlertState.alert) ? structuredAlertState.alert : null;
      if (alert && typeof alert.title === 'string') {
        props.ruleTitle = alert.title;
      }
      if (alert && typeof alert.message === 'string') {
        props.ruleMessage = alert.message;
      }
      if (alert && typeof alert.severity === 'string') {
        props.ruleSeverity = alert.severity;
      }
    }
  }

  ensureCartesianAxisPuckProps(props, widget.config);
  normalizePuckOptionProps(props);

  return props;
}

interface LogicalQueryFieldShape {
  fieldId: string;
  aggregation?: string;
}

function readLogicalQueryFieldsFromProps(props: Record<string, unknown>): LogicalQueryFieldShape[] {
  const logicalQuery = readLogicalQueryFromProps(props);
  return logicalQuery?.fields ?? [];
}

/**
 * Repair chart axis Puck props from logicalQuery when axis fields were lost
 * (e.g. Puck defaultProps merge or chart-type switch dropped yAxisField).
 */
export function repairChartAxisPropsInPuckData(data: Data): Data {
  const beforeSnapshot = collectChartAxisBindingSnapshot(data);
  const zones = data.zones ? { ...(data.zones as PuckZones) } : undefined;
  const content = Array.isArray(data.content)
    ? repairChartAxisPropsInPuckItems(data.content as ComponentData[], zones)
    : data.content;

  const next = {
    ...data,
    content,
    ...(zones ? { zones } : {}),
  };

  if (collectChartAxisBindingSnapshot(next) === beforeSnapshot) {
    return data;
  }

  return next;
}

function repairChartAxisPropsInPuckItems(
  items: ComponentData[],
  zones?: PuckZones,
): ComponentData[] {
  return items.map((item) => {
    const props: Record<string, unknown> = { ...(item.props ?? {}) };
    const itemId = typeof props.id === 'string' ? props.id : undefined;

    if (isChartPuckType(item.type)) {
      repairChartAxisPropsRecord(props);
    }

    for (const slotField of PUCK_SLOT_FIELD_NAMES) {
      const zoneKey = itemId ? `${itemId}:${slotField}` : undefined;
      if (zoneKey && zones?.[zoneKey]) {
        zones[zoneKey] = repairChartAxisPropsInPuckItems(zones[zoneKey], zones);
      } else if (Array.isArray(props[slotField])) {
        props[slotField] = repairChartAxisPropsInPuckItems(
          props[slotField] as ComponentData[],
          zones,
        );
      }
    }

    return { ...item, props } as ComponentData;
  });
}

function isChartPuckType(puckType: string): boolean {
  return (
    puckType.endsWith('Chart') ||
    puckType === 'KPICard' ||
    puckType === 'Table' ||
    puckType === 'AlertsWidgetBlock'
  );
}

interface ChartAxisBindingSnapshot {
  id: string;
  type: string;
  xAxisField?: unknown;
  yAxisField?: unknown;
  categoryField?: unknown;
  valueField?: unknown;
  aggregation?: unknown;
}

function collectChartAxisBindingSnapshots(
  items: ComponentData[] | undefined,
  out: ChartAxisBindingSnapshot[],
  zones?: PuckZones,
): void {
  if (!Array.isArray(items)) {
    return;
  }

  for (const item of items) {
    const props = (item.props ?? {}) as Record<string, unknown>;
    const itemId = typeof props.id === 'string' ? props.id : undefined;

    if (isChartPuckType(item.type)) {
      out.push({
        id: String(props.id ?? ''),
        type: item.type,
        xAxisField: props.xAxisField,
        yAxisField: props.yAxisField,
        categoryField: props.categoryField,
        valueField: props.valueField,
        aggregation: props.aggregation,
      });
    }

    for (const slotField of PUCK_SLOT_FIELD_NAMES) {
      const children = readPuckSlotContent(props, itemId, zones, slotField);
      if (children.length > 0) {
        collectChartAxisBindingSnapshots(children, out, zones);
      }
    }
  }
}

/** Stable string for comparing chart axis bindings before/after repair. */
export function collectChartAxisBindingSnapshot(data: Data): string {
  const snapshots: ChartAxisBindingSnapshot[] = [];
  const zones = data.zones as PuckZones | undefined;
  collectChartAxisBindingSnapshots(data.content as ComponentData[] | undefined, snapshots, zones);
  return JSON.stringify(snapshots);
}

export function repairChartAxisPropsRecord(props: Record<string, unknown>): void {
  normalizePuckOptionProps(props);
  ensureCartesianAxisPuckProps(props, props);

  const fields = readLogicalQueryFieldsFromProps(props);
  if (fields.length === 0) {
    return;
  }

  if (!props.yAxisField) {
    const metric = fields.find((field) => field.aggregation && field.aggregation !== 'none');
    if (metric) {
      props.yAxisField = metric.fieldId;
      if (!props.aggregation || props.aggregation === 'none') {
        props.aggregation = metric.aggregation;
      }
    }
  }

  if (!props.xAxisField) {
    const dimension = fields.find((field) => !field.aggregation);
    if (dimension) {
      props.xAxisField = dimension.fieldId;
    }
  }

  if (!props.categoryField) {
    const category = fields.find((field) => !field.aggregation);
    if (category) {
      props.categoryField = category.fieldId;
    }
  }

  if (!props.valueField) {
    const value = fields.find((field) => field.aggregation && field.aggregation !== 'none');
    if (value) {
      props.valueField = value.fieldId;
      if (!props.aggregation || props.aggregation === 'none') {
        props.aggregation = value.aggregation;
      }
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function layoutMetaToPuckProps(node: LayoutComponent): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  if (node.meta.text) props.text = node.meta.text;
  if (node.meta.headerSize) props.size = node.meta.headerSize;
  if (node.meta.height) props.height = node.meta.height;
  return props;
}

/** Puck resolveData — repairs axis bindings before fields panel / preview read props. */
export async function chartAxisResolveData(data: {
  props: Record<string, unknown>;
}): Promise<{ props: Record<string, unknown> }> {
  const props = { ...(data.props ?? {}) };
  repairChartAxisPropsRecord(props);

  const unchanged =
    props.xAxisField === data.props?.xAxisField &&
    props.yAxisField === data.props?.yAxisField &&
    props.aggregation === data.props?.aggregation;

  if (unchanged) {
    return { props: data.props };
  }

  return { props };
}
