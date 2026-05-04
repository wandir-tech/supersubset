/**
 * Supersubset Canonical Dashboard Schema — v0.2.0
 *
 * This is the product contract. The designer emits it; the runtime consumes it;
 * the host app persists it. JSON and YAML are interchangeable encodings.
 *
 * Layout model: flat normalized map inspired by Apache Superset's dashboard
 * layout architecture, adapted by Supersubset contributors.
 * Each layout component is keyed by ID; children are ID arrays.
 * This enables efficient drag-and-drop editing (move = update two parents).
 */

// ─── Dashboard ───────────────────────────────────────────────

export interface DashboardDefinition {
  schemaVersion: string;
  id: string;
  title: string;
  description?: string;
  pages: PageDefinition[];
  filters?: FilterDefinition[];
  interactions?: InteractionDefinition[];
  theme?: ThemeRef | InlineThemeDefinition;
  dataModel?: DataModelRef;
  defaults?: DashboardDefaults;
  permissions?: VisibilityRule[];
}

// ─── Pages ───────────────────────────────────────────────────

export interface PageDefinition {
  id: string;
  title: string;
  layout: LayoutMap;
  rootNodeId: string;
  widgets: WidgetDefinition[];
}

// ─── Layout (flat normalized map) ────────────────────────────

/**
 * A flat map of layout components keyed by ID.
 * The renderer starts from PageDefinition.rootNodeId and walks children.
 */
export type LayoutMap = Record<string, LayoutComponent>;

export type LayoutComponentType =
  | 'root'
  | 'grid'
  | 'row'
  | 'column'
  | 'widget'
  | 'tabs'
  | 'tab'
  | 'spacer'
  | 'header'
  | 'markdown'
  | 'divider';

export interface LayoutComponent {
  id: string;
  type: LayoutComponentType;
  children: string[];
  parentId?: string;
  meta: LayoutMeta;
}

export interface LayoutMeta {
  /** Width in grid columns (out of the parent grid's column count, default 12) */
  width?: number;
  /** Height in grid row units (1 unit = base spacing, e.g., 8px) */
  height?: number;
  /** CSS gap between children */
  gap?: string;
  /** Number of columns for grid-type components */
  columns?: number;
  /** Minimum height CSS value */
  minHeight?: string;
  /** Widget ID reference (for widget-type components) */
  widgetRef?: string;
  /** Display text (for header, tab, markdown components) */
  text?: string;
  /** Header size variant */
  headerSize?: 'small' | 'medium' | 'large';
  /** CSS padding */
  padding?: string;
  /** Vertical alignment for column children */
  verticalAlign?: 'top' | 'center' | 'bottom';
  /** Background style */
  background?: 'transparent' | 'white' | string;
  /** Responsive breakpoint overrides */
  breakpoints?: BreakpointOverride[];
}

export interface BreakpointOverride {
  maxWidth: number;
  columns?: number;
  hidden?: boolean;
  width?: number;
}

// ─── Layout Nesting Rules ────────────────────────────────────

/**
 * Valid parent → child relationships with max nesting depth.
 * Inspired by Superset's isValidChild() — prevents infinite nesting.
 *
 * Depth 0: root
 * Depth 1: grid (or top-level tabs)
 * Depth 2: row, tabs, header, divider, widget (direct in grid)
 * Depth 3: column, tab
 * Depth 4: row (inside column)
 * Depth 5: leaf components (widget, header, divider, spacer)
 *
 * Tabs and tab don't increase depth (like Superset).
 */
export const VALID_CHILDREN: Record<LayoutComponentType, LayoutComponentType[]> = {
  root: ['grid', 'tabs'],
  grid: ['row', 'tabs', 'widget', 'header', 'markdown', 'divider', 'spacer'],
  row: ['column', 'widget', 'header', 'markdown', 'divider', 'spacer'],
  column: ['row', 'widget', 'tabs', 'header', 'markdown', 'divider', 'spacer'],
  tabs: ['tab'],
  tab: ['row', 'widget', 'tabs', 'header', 'markdown', 'divider', 'spacer'],
  widget: [],
  header: [],
  markdown: [],
  divider: [],
  spacer: [],
};

export const MAX_NESTING_DEPTH = 5;

export const GRID_COLUMN_COUNT = 12;
export const DEFAULT_WIDGET_WIDTH = 4;
export const DEFAULT_WIDGET_HEIGHT = 50;

// ─── Widgets ─────────────────────────────────────────────────

export interface WidgetDefinition {
  id: string;
  type: string;
  title?: string;
  config: Record<string, unknown>;
  dataBinding?: DataBinding;
  filters?: FilterRef[];
  interactions?: InteractionRef[];
}

export interface DataBinding {
  datasetRef: string;
  fields: FieldBinding[];
}

export interface FieldBinding {
  role: string;
  fieldRef: string;
  aggregation?: string;
  format?: string;
  sort?: 'asc' | 'desc';
}

// ─── Filters ─────────────────────────────────────────────────

export interface FilterDefinition {
  id: string;
  title?: string;
  type: string;
  fieldRef: string;
  datasetRef: string;
  operator: string;
  defaultValue?: unknown;
  scope: FilterScope;
}

export type FilterScope =
  | { type: 'global' }
  | { type: 'page'; pageId: string }
  | { type: 'widgets'; widgetIds: string[] };

export interface FilterRef {
  filterId: string;
}

// ─── Interactions ────────────────────────────────────────────

export interface InteractionDefinition {
  id: string;
  trigger: InteractionTrigger;
  action: InteractionAction;
}

export interface InteractionTrigger {
  type: 'click' | 'hover' | 'change';
  sourceWidgetId?: string;
}

export interface NavigationFilterMapping {
  sourceFieldRef: string;
  sourceDatasetRef?: string;
  targetFilterId?: string;
  targetFieldRef?: string;
  targetDatasetRef?: string;
  transform?: 'identity';
}

export type NavigationMappingFailureMode = 'error' | 'warn' | 'ignore';

export type NavigateTarget =
  | { kind: 'page'; pageId: string }
  | {
      kind: 'dashboard';
      dashboardId: string;
      filterMapping?: NavigationFilterMapping[];
      onMappingFailure?: NavigationMappingFailureMode;
    };

export type InteractionAction =
  | { type: 'filter'; targetWidgetIds?: string[]; fieldRef: string }
  | { type: 'navigate'; target: NavigateTarget }
  | { type: 'external'; callbackKey: string; payload?: Record<string, unknown> }
  | { type: 'drill'; fieldRef: string; targetWidgetId?: string };

export interface InteractionRef {
  interactionId: string;
}

// ─── Theme ───────────────────────────────────────────────────

export interface ThemeRef {
  type: 'ref';
  themeId: string;
}

export interface InlineThemeDefinition {
  type: 'inline';
  colors?: ThemeColors;
  typography?: ThemeTypography;
  spacing?: ThemeSpacing;
  custom?: Record<string, unknown>;
}

export interface ThemeColors {
  primary?: string;
  secondary?: string;
  background?: string;
  surface?: string;
  text?: string;
  chartPalette?: string[];
  success?: string;
  warning?: string;
  danger?: string;
  info?: string;
  border?: string;
  [key: string]: unknown;
}

export interface ThemeTypography {
  fontFamily?: string;
  fontSize?: string;
  headingFontFamily?: string;
  [key: string]: unknown;
}

export interface ThemeSpacing {
  unit?: number;
  widgetPadding?: string;
  gridGap?: string;
  [key: string]: unknown;
}

// ─── Data Model Reference ────────────────────────────────────

export interface DataModelRef {
  type: 'inline' | 'external';
  datasets?: DatasetDefinition[];
  externalRef?: string;
}

export interface DatasetDefinition {
  id: string;
  label: string;
  fields: DatasetField[];
}

export interface DatasetField {
  id: string;
  label: string;
  dataType: string;
  role?: string;
  defaultAggregation?: string;
  format?: string;
}

// ─── Dashboard Defaults ──────────────────────────────────────

export interface DashboardDefaults {
  activePage?: string;
  filterValues?: Record<string, unknown>;
  timeRange?: TimeRange;
}

export interface TimeRange {
  start?: string;
  end?: string;
  grain?: string;
  relative?: string;
}

// ─── Permissions ─────────────────────────────────────────────

export interface VisibilityRule {
  targetId: string;
  targetType: 'page' | 'widget' | 'filter';
  condition: Record<string, unknown>;
}
