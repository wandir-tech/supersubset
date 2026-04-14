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
  DataBinding,
  FieldBinding,
} from '@supersubset/schema';
import { PUCK_NAME_TO_WIDGET_TYPE, WIDGET_TYPE_TO_PUCK_NAME } from '../blocks/charts';
import { CONTENT_PUCK_NAME_TO_TYPE } from '../blocks/content';
import { CONTROL_PUCK_NAME_TO_TYPE } from '../blocks/controls';
import { LAYOUT_PUCK_NAME_TO_TYPE } from '../blocks/layout';

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

  // Recursively walk content items
  const childIds = processContentItems(
    (puckData.content ?? []) as ComponentData[],
    'grid-main',
    layout,
    widgets,
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

const layoutTypeToPuckName: Record<string, string> = {
  row: 'RowBlock',
  column: 'ColumnBlock',
};

/**
 * Recursively walk Puck content items and build layout nodes + widgets.
 * Handles RowBlock/ColumnBlock nesting by creating row/column layout nodes.
 */
function processContentItems(
  items: ComponentData[],
  parentLayoutId: string,
  layout: LayoutMap,
  widgets: WidgetDefinition[],
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
      const slotContent = (props.content as ComponentData[]) ?? [];
      const nestedChildIds = processContentItems(slotContent, layoutId, layout, widgets);

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
      const nestedContent = layoutChildrenToPuck(node.children, layout, widgets);
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
    if (props.verticalAlign) meta.verticalAlign = props.verticalAlign;
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
    if (node.meta.verticalAlign) props.verticalAlign = node.meta.verticalAlign;
  }
  return props;
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

    for (const [propKey, role] of fieldMappings) {
      const fieldRef = props[propKey] as string;
      if (fieldRef) {
        fields.push({
          role,
          fieldRef,
          aggregation:
            props.aggregation && props.aggregation !== 'none'
              ? (props.aggregation as string)
              : undefined,
        });
      }
    }

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
    if (!NON_CONFIG_KEYS.has(key) && value !== undefined && value !== '') {
      widget.config[key] = value;
    }
  }

  return widget;
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
      if (field.aggregation) {
        props.aggregation = field.aggregation;
      }
    }
  }

  // Fallback: map field-ref keys stored in widget.config to Puck props
  // (for legacy/hand-authored dashboards that don't use dataBinding)
  const configFieldFallbacks: Array<[string, string]> = [
    // Standard keys (config key → Puck prop)
    ['valueField', 'valueField'],
    ['comparisonField', 'comparisonField'],
    ['categoryField', 'categoryField'],
    ['sourceField', 'sourceField'],
    ['targetField', 'targetField'],
    ['sizeField', 'sizeField'],
    ['colorGroupField', 'colorGroupField'],
    ['nameField', 'nameField'],
    ['parentField', 'parentField'],
    ['datasetRef', 'datasetRef'],
    // Alternative legacy keys
    ['xField', 'xAxisField'],
    ['yField', 'yAxisField'],
  ];

  for (const [configKey, puckProp] of configFieldFallbacks) {
    if (!props[puckProp] && widget.config[configKey]) {
      props[puckProp] = widget.config[configKey];
    }
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

  // Spread config props
  for (const [key, value] of Object.entries(widget.config)) {
    props[key] = value;
  }

  return props;
}

function layoutMetaToPuckProps(node: LayoutComponent): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  if (node.meta.text) props.text = node.meta.text;
  if (node.meta.headerSize) props.size = node.meta.headerSize;
  if (node.meta.height) props.height = node.meta.height;
  return props;
}
