import { z } from 'zod';
import { VALID_CHILDREN } from '../types/dashboard';
import type { LayoutComponentType } from '../types/dashboard';

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function safeRecord<V extends z.ZodTypeAny>(valueSchema: V) {
  return z.record(z.string(), valueSchema).transform((obj) => {
    const result: Record<string, z.output<V>> = Object.create(null);
    for (const [key, value] of Object.entries(obj)) {
      if (!DANGEROUS_KEYS.has(key)) {
        result[key] = value;
      }
    }
    return result;
  });
}

// ─── Layout (flat normalized map) ────────────────────────────

const breakpointOverrideSchema = z.object({
  maxWidth: z.number().positive(),
  columns: z.number().int().positive().optional(),
  hidden: z.boolean().optional(),
  width: z.number().int().positive().optional(),
});

const layoutComponentTypeSchema = z.enum([
  'root',
  'grid',
  'row',
  'column',
  'widget',
  'tabs',
  'tab',
  'spacer',
  'header',
  'markdown',
  'divider',
]);

const layoutMetaSchema = z.object({
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  gap: z.string().optional(),
  columns: z.number().int().positive().optional(),
  minHeight: z.string().optional(),
  widgetRef: z.string().optional(),
  padding: z.string().optional(),
  verticalAlign: z.enum(['top', 'center', 'bottom']).optional(),
  text: z.string().optional(),
  headerSize: z.enum(['small', 'medium', 'large']).optional(),
  background: z.string().optional(),
  breakpoints: z.array(breakpointOverrideSchema).optional(),
});

const layoutComponentSchema = z.object({
  id: z.string().min(1),
  type: layoutComponentTypeSchema,
  children: z.array(z.string()),
  parentId: z.string().optional(),
  meta: layoutMetaSchema,
});

const layoutMapSchema = z.record(z.string(), layoutComponentSchema);

/**
 * Validate nesting rules: check that every child type is valid for its parent type.
 * Returns an array of error messages (empty = valid).
 */
export function validateNesting(
  layout: Record<string, { type: string; children: string[] }>,
): string[] {
  const errors: string[] = [];
  for (const [id, component] of Object.entries(layout)) {
    const parentType = component.type as LayoutComponentType;
    const allowedChildren = VALID_CHILDREN[parentType];
    if (!allowedChildren) continue;
    for (const childId of component.children) {
      const child = layout[childId];
      if (!child) {
        errors.push(`Component "${id}" references missing child "${childId}"`);
        continue;
      }
      const childType = child.type as LayoutComponentType;
      if (!allowedChildren.includes(childType)) {
        errors.push(
          `Invalid nesting: "${childType}" cannot be a child of "${parentType}" (component "${id}" → "${childId}")`,
        );
      }
    }
  }
  return errors;
}

// ─── Field Binding ───────────────────────────────────────────

const fieldBindingSchema = z.object({
  role: z.string().min(1),
  fieldRef: z.string().min(1),
  aggregation: z.string().optional(),
  format: z.string().optional(),
  sort: z.enum(['asc', 'desc']).optional(),
});

const dataBindingSchema = z.object({
  datasetRef: z.string().min(1),
  fields: z.array(fieldBindingSchema),
});

// ─── Filters ─────────────────────────────────────────────────

const filterScopeSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('global') }),
  z.object({ type: z.literal('page'), pageId: z.string().min(1) }),
  z.object({ type: z.literal('widgets'), widgetIds: z.array(z.string().min(1)) }),
]);

const filterRefSchema = z.object({
  filterId: z.string().min(1),
});

const filterOptionDefinitionSchema = z.object({
  value: z.string().min(1),
  label: z.string().optional(),
  disabled: z.boolean().optional(),
});

const filterOptionSourceSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('static'),
    options: z.array(filterOptionDefinitionSchema),
    completeness: z.enum(['complete', 'curated']).optional(),
  }),
  z.object({
    kind: z.literal('field'),
    strategy: z.enum(['preload', 'search']),
    maxOptions: z.number().int().positive().optional(),
    minSearchChars: z.number().int().min(0).optional(),
  }),
]);

const filterDefinitionSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  type: z.string().min(1),
  fieldRef: z.string().min(1),
  datasetRef: z.string().min(1),
  operator: z.string().min(1),
  defaultValue: z.unknown().optional(),
  optionSource: filterOptionSourceSchema.optional(),
  scope: filterScopeSchema,
});

// ─── Interactions ────────────────────────────────────────────

const interactionTriggerSchema = z.object({
  type: z.enum(['click', 'hover', 'change']),
  sourceWidgetId: z.string().optional(),
});

const navigationFilterMappingSchema = z.object({
  sourceFieldRef: z.string().min(1),
  sourceDatasetRef: z.string().min(1).optional(),
  targetFilterId: z.string().min(1).optional(),
  targetFieldRef: z.string().min(1).optional(),
  targetDatasetRef: z.string().min(1).optional(),
  transform: z.enum(['identity']).optional(),
});

const navigateTargetSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('page'),
    pageId: z.string().min(1),
  }),
  z.object({
    kind: z.literal('dashboard'),
    dashboardId: z.string().min(1),
    filterMapping: z.array(navigationFilterMappingSchema).optional(),
    onMappingFailure: z.enum(['error', 'warn', 'ignore']).optional(),
  }),
]);

const interactionActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('filter'),
    targetWidgetIds: z.array(z.string()).optional(),
    fieldRef: z.string().min(1),
  }),
  z.object({
    type: z.literal('navigate'),
    target: navigateTargetSchema,
  }),
  z.object({
    type: z.literal('external'),
    callbackKey: z.string().min(1),
    payload: safeRecord(z.unknown()).optional(),
  }),
  z.object({
    type: z.literal('drill'),
    fieldRef: z.string().min(1),
    targetWidgetId: z.string().optional(),
  }),
]);

const interactionDefinitionSchema = z.object({
  id: z.string().min(1),
  trigger: interactionTriggerSchema,
  action: interactionActionSchema,
});

const interactionRefSchema = z.object({
  interactionId: z.string().min(1),
});

// ─── Widget ──────────────────────────────────────────────────

const widgetDefinitionSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  title: z.string().optional(),
  config: safeRecord(z.unknown()),
  dataBinding: dataBindingSchema.optional(),
  filters: z.array(filterRefSchema).optional(),
  interactions: z.array(interactionRefSchema).optional(),
});

// ─── Theme ───────────────────────────────────────────────────

const themeColorsSchema = z.object({
  primary: z.string().optional(),
  secondary: z.string().optional(),
  background: z.string().optional(),
  surface: z.string().optional(),
  text: z.string().optional(),
  chartPalette: z.array(z.string()).optional(),
  success: z.string().optional(),
  warning: z.string().optional(),
  danger: z.string().optional(),
  info: z.string().optional(),
  border: z.string().optional(),
});

const themeTypographySchema = z.object({
  fontFamily: z.string().optional(),
  fontSize: z.string().optional(),
  headingFontFamily: z.string().optional(),
});

const themeSpacingSchema = z.object({
  unit: z.number().optional(),
  widgetPadding: z.string().optional(),
  gridGap: z.string().optional(),
});

const themeRefSchema = z.object({
  type: z.literal('ref'),
  themeId: z.string().min(1),
});

const inlineThemeSchema = z.object({
  type: z.literal('inline'),
  colors: themeColorsSchema.optional(),
  typography: themeTypographySchema.optional(),
  spacing: themeSpacingSchema.optional(),
  custom: safeRecord(z.unknown()).optional(),
});

const themeSchema = z.discriminatedUnion('type', [themeRefSchema, inlineThemeSchema]);

// ─── Data Model Reference ────────────────────────────────────

const datasetFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  dataType: z.string().min(1),
  role: z.string().optional(),
  defaultAggregation: z.string().optional(),
  format: z.string().optional(),
});

const datasetDefinitionSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  fields: z.array(datasetFieldSchema),
});

const dataModelRefSchema = z.object({
  type: z.enum(['inline', 'external']),
  datasets: z.array(datasetDefinitionSchema).optional(),
  externalRef: z.string().optional(),
});

// ─── Defaults ────────────────────────────────────────────────

const timeRangeSchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  grain: z.string().optional(),
  relative: z.string().optional(),
});

const dashboardDefaultsSchema = z.object({
  activePage: z.string().optional(),
  filterValues: safeRecord(z.unknown()).optional(),
  timeRange: timeRangeSchema.optional(),
});

// ─── Permissions ─────────────────────────────────────────────

const visibilityRuleSchema = z.object({
  targetId: z.string().min(1),
  targetType: z.enum(['page', 'widget', 'filter']),
  condition: safeRecord(z.unknown()),
});

// ─── Page ────────────────────────────────────────────────────

const pageDefinitionSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  layout: layoutMapSchema,
  rootNodeId: z.string().min(1),
  widgets: z.array(widgetDefinitionSchema),
});

// ─── Dashboard ───────────────────────────────────────────────

export const dashboardDefinitionSchema = z.object({
  schemaVersion: z.string().min(1),
  id: z.string().min(1),
  title: z.string(),
  description: z.string().optional(),
  pages: z.array(pageDefinitionSchema).min(1),
  filters: z.array(filterDefinitionSchema).optional(),
  interactions: z.array(interactionDefinitionSchema).optional(),
  theme: themeSchema.optional(),
  dataModel: dataModelRefSchema.optional(),
  defaults: dashboardDefaultsSchema.optional(),
  permissions: z.array(visibilityRuleSchema).optional(),
});

// ─── Named exports for sub-schemas ──────────────────────────

export {
  pageDefinitionSchema,
  layoutMapSchema,
  layoutComponentSchema,
  layoutMetaSchema,
  layoutComponentTypeSchema,
  widgetDefinitionSchema,
  dataBindingSchema,
  fieldBindingSchema,
  filterDefinitionSchema,
  filterOptionDefinitionSchema,
  filterOptionSourceSchema,
  filterScopeSchema,
  interactionDefinitionSchema,
  interactionActionSchema,
  themeSchema,
  dataModelRefSchema,
  datasetDefinitionSchema,
  datasetFieldSchema,
  dashboardDefaultsSchema,
  visibilityRuleSchema,
};
