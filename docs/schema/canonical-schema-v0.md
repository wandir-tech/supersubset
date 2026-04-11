# Canonical Schema v0

This is the practical reference for the current unreleased dashboard contract.

Supersubset persists one `DashboardDefinition` at a time. Pages are internal canvases inside that document, not separate dashboard documents.

## DashboardDefinition

Core shape:

```ts
interface DashboardDefinition {
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
```

Notes:

- `DashboardDefinition` is the atomic persistence and import/export unit.
- A page switch stays inside one dashboard document.
- Future dashboard-to-dashboard routing is deferred, but the interaction API now reserves space for it.

## Interaction Navigation

Navigate actions no longer persist as a raw `pageId`.

Current shape:

```ts
type NavigateTarget =
  | { kind: 'page'; pageId: string }
  | {
      kind: 'dashboard';
      dashboardId: string;
      filterMapping?: NavigationFilterMapping[];
      onMappingFailure?: 'error' | 'warn' | 'ignore';
    };

type InteractionAction =
  | { type: 'filter'; targetWidgetIds?: string[]; fieldRef: string }
  | { type: 'navigate'; target: NavigateTarget }
  | { type: 'external'; callbackKey: string; payload?: Record<string, unknown> }
  | { type: 'drill'; fieldRef: string; targetWidgetId?: string };
```

Current behavior:

- The designer authors page targets only.
- The runtime callback surface already accepts either target kind.
- Dashboard targets are valid schema values but host/runtime orchestration for them is not shipped yet.

Example page navigation action:

```json
{
  "id": "nav-to-gallery",
  "trigger": { "type": "click", "sourceWidgetId": "chart-region-sales" },
  "action": {
    "type": "navigate",
    "target": { "kind": "page", "pageId": "page-gallery" }
  }
}
```

## Alerts Widget

Alerts are a first-class widget type, not an ECharts chart grammar.

Current config shape:

```ts
interface AlertsWidgetConfig {
  datasetRef: string;
  titleField: string;
  messageField: string;
  severityField?: string;
  timestampField?: string;
  layout?: 'inline' | 'wrap' | 'stack';
  maxItems?: number;
  emptyState?: 'hide' | 'placeholder';
  showTimestamp?: boolean;
  defaultSeverity?: 'info' | 'success' | 'warning' | 'danger';
}
```

Rendering model:

- the widget receives rows like any other data-driven widget
- each row becomes an alert tile candidate
- the widget reads title/message/severity/timestamp fields from config
- `maxItems` caps the rendered row count

Example widget definition:

```json
{
  "id": "alerts-overview",
  "type": "alerts",
  "title": "Operations Watchlist",
  "config": {
    "datasetRef": "ds-ops-alerts",
    "titleField": "alert_title",
    "messageField": "alert_message",
    "severityField": "severity",
    "timestampField": "detected_at",
    "layout": "wrap",
    "maxItems": 3,
    "emptyState": "placeholder",
    "showTimestamp": true,
    "defaultSeverity": "info"
  }
}
```

## Semantic Theme Colors

Inline themes now support alert/status tokens in addition to the base palette.

```ts
interface ThemeColors {
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
}
```

These tokens flow into:

- CSS custom properties via `themeToCssVariables()`
- the alerts widget severity styling
- future status-oriented UI without hard-coding colors per widget

## Current Boundaries

Included now:

- structured navigate targets in schema and runtime callbacks
- alerts widget authoring, preview, runtime rendering, and round-trip support
- semantic status theme tokens

Deferred follow-up:

- runtime bundle orchestration for dashboard-to-dashboard navigation
- dashboard-target mapping UI in the designer
- reusable predicate editors for advanced mapping or rule-driven alerts