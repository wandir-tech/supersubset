# ADR-003: Canonical Schema Format

## Status

Accepted

## Date

2026-04-08

## Context

Supersubset's product contract is the canonical dashboard schema. The designer emits it; the runtime consumes it; the host app persists it. Every package boundary in the system is defined by this schema.

Requirements from the spec:
- Human-readable
- Deterministic serialization
- Stable IDs on all nodes
- Schema version field required
- Backward-compatible migration system
- JSON and YAML are just encodings — no format-specific semantics
- Domain-agnostic: field types, dimensions, measures are user-supplied inputs (HC-0 decision)

## Decision

### 1. TypeScript interfaces as canonical types

The canonical schema is defined as TypeScript interfaces in `packages/schema/src/types/`. These are the source of truth. All other representations (Zod, JSON Schema) are derived from these types.

### 2. Zod schemas for runtime validation

Every TypeScript interface has a corresponding Zod schema in `packages/schema/src/validation/`. Zod schemas validate external inputs (imported dashboards, API payloads) and generate JSON Schema for documentation/tooling.

### 3. Schema structure

```typescript
interface DashboardDefinition {
  schemaVersion: string;         // semver, e.g. "0.2.0"
  id: string;                    // stable UUID or developer-assigned
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

interface PageDefinition {
  id: string;
  title: string;
  layout: LayoutMap;             // flat normalized map (Superset-inspired)
  rootNodeId: string;            // entry point into the layout map
  widgets: WidgetDefinition[];
}

// Flat normalized map — each component keyed by ID
type LayoutMap = Record<string, LayoutComponent>;

type LayoutComponentType =
  | 'root' | 'grid' | 'row' | 'column' | 'widget'
  | 'tabs' | 'tab' | 'spacer' | 'header' | 'divider';

interface LayoutComponent {
  id: string;
  type: LayoutComponentType;
  children: string[];            // IDs of child components
  parentId?: string;             // ID of parent component
  meta: LayoutMeta;
}

interface LayoutMeta {
  width?: number;                // grid columns (out of parent's column count)
  height?: number;               // grid row units (1 unit = base spacing)
  columns?: number;              // for grid: number of columns (default 12)
  gap?: string;                  // CSS gap between children
  widgetRef?: string;            // for widget type: references WidgetDefinition.id
  text?: string;                 // for header/tab: display text
  headerSize?: 'small' | 'medium' | 'large';
  background?: 'transparent' | 'white' | string;
  breakpoints?: BreakpointOverride[];
}
```

The flat map model (inspired by Superset's `DashboardLayout = { [key: string]: LayoutItem }`)
provides efficient drag-and-drop editing: moving a component means updating two parents'
`children` arrays instead of rebuilding subtrees. The renderer walks from `rootNodeId` through
child IDs to render the component tree.

```typescript
interface WidgetDefinition {
  id: string;
  type: string;                  // e.g. "line-chart", "bar-chart", "kpi-card", "markdown"
  title?: string;
  config: Record<string, unknown>;  // chart-type-specific configuration
  dataBinding?: DataBinding;
  filters?: FilterRef[];
  interactions?: InteractionRef[];
}

interface DataBinding {
  datasetRef: string;            // references a dataset in the data model
  fields: FieldBinding[];
}

interface FieldBinding {
  role: string;                  // e.g. "x-axis", "y-axis", "color", "size", "label", "value"
  fieldRef: string;              // references a field in the data model
  aggregation?: string;          // e.g. "sum", "avg", "count", "min", "max"
  format?: string;               // display format hint
}
```

### 4. Nesting validation rules

The schema enforces valid parent-child relationships (inspired by Superset's `isValidChild()`):

```
root    → grid, tabs
grid    → row, tabs, widget, header, divider, spacer
row     → column, widget, header, divider, spacer
column  → row, widget, tabs, header, divider, spacer
tabs    → tab
tab     → row, widget, tabs, header, divider, spacer
widget  → (no children)
header  → (no children)
divider → (no children)
spacer  → (no children)
```

Max nesting depth: 5 (root → grid → row → column → row → leaf).
Tabs/tab don't count toward depth (matching Superset's approach).

### 5. Domain-agnostic field model

Per HC-0 decision, the schema does NOT define built-in dimension types or measure taxonomies. Instead:

- `DataBinding.fields` references fields by `fieldRef` (a string key into the user-provided data model)
- `FieldBinding.role` is a string — chart types define what roles they accept
- `FieldBinding.aggregation` is a string — the query layer interprets it
- The data model adapter (external) supplies field metadata (types, labels, allowed aggregations)

The schema defines the **shape** of bindings, not the **vocabulary** of a domain.

### 5. Encoding rules

- JSON and YAML are interchangeable encodings of the same AST
- No YAML-specific features (anchors, tags) in the canonical form
- Serialization is deterministic: sorted keys, stable ID order
- Round-trip guarantee: `parse(serialize(definition))` === `definition`

### 6. Versioning and migration

- `schemaVersion` uses semver (major.minor.patch)
- Minor versions add optional fields (backward-compatible)
- Major versions may remove/rename fields (require migration)
- Migration functions in `packages/schema/src/migrations/` transform old versions to current
- Schema v0.x is explicitly unstable — breaking changes expected before v1.0

## Consequences

### Positive

- Single source of truth for all package boundaries
- TypeScript types catch contract violations at compile time
- Zod validates untrusted input at runtime
- JSON Schema enables editor tooling and documentation
- Domain-agnostic design means the schema works for any analytical domain
- Deterministic serialization enables diff-friendly storage and version control

### Negative

- `Record<string, unknown>` for widget config means less type safety inside widget configurations — mitigated by per-widget-type Zod schemas in `packages/charts-echarts`
- Domain-agnostic field model pushes validation responsibility to the data model adapter layer
- v0.x schema instability means early adopters will need migrations

### Neutral

- Widget-specific config schemas live in their respective packages, not in `packages/schema`
- The schema package exports types + validation + serializers but no React components

## Alternatives Considered

| Alternative | Pros | Cons | Why Rejected |
|------------|------|------|-------------|
| **Protobuf-first** (like Rill) | Strict typing, language-neutral, efficient wire format | Poor human readability; requires protoc toolchain; overkill for JSON/YAML-first workflow | Conflicts with human-readable requirement |
| **JSON Schema as source of truth** | Language-neutral, wide tooling support | Verbose; TypeScript types must be generated (lossy); harder to maintain than TS interfaces | TypeScript-first is more natural for a TS monorepo |
| **Domain-aware type taxonomy** (Rill-style dimensions/measures) | Richer built-in validation; guides users | Bakes in domain assumptions; conflicts with HC-0 decision that schema is domain-agnostic | HC-0 decision: domain models are user inputs |
| **Recursive tree layout** (v0.1.0 original) | Simpler schema, natural JSON nesting | Moving a component requires rebuilding subtrees; harder for drag-and-drop editing; no explicit sizing | Flat map is better for editor operations; Superset validates this pattern |
| **GraphQL SDL** | Typed, introspectable, ecosystem tooling | Wrong abstraction level — GraphQL describes API contracts, not dashboard definitions | Not a fit for the problem |

## References

- [Rill schema study — dimension/measure patterns](../research/rill-study.md)
- [Schema package rules](../../.github/instructions/schema.instructions.md)
- [HC-0 decision record](../status/checkpoints/hc-0-result.md)
- [Initial spec — canonical schema requirements](../../initial-spec.md)
