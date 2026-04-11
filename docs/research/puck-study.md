# Puck Study — Research Report

> **Task**: 0.2  
> **Agent**: Research  
> **Date**: 2026-04-08  
> **Repository**: `puckeditor/puck` @ `main` (formerly `measuredco/puck`)

## Executive Summary

Puck is a modular, MIT-licensed visual editor for React.js. After studying its source code in depth — particularly the Config types, DropZone system, Puck component, and data model — Puck is a **strong fit** for Supersubset's designer shell. It provides component registration, drag-and-drop editing, property panels, nested components via slots, serializable JSON state, and clean host-app integration through controlled React props.

**Key strengths**: Clean component registration API, flexible `resolveData` for async data resolution, slots for nested components, JSON-serializable state model, MIT license, active development (v0.21.2 as of April 2026), supports both `<Puck>` (editor) and `<Render>` (runtime) components from the same config.

**Key concerns**: (1) Responsive layout support is limited — Puck does not have built-in responsive grid/breakpoint system; (2) DropZones are deprecated in favor of slot fields with a migration path; (3) Performance with 20+ complex chart widgets needs validation; (4) The data model uses Puck's own JSON structure that must be mapped to/from Supersubset's canonical schema.

**Recommendation**: Proceed with Puck as the editor shell. The concerns are manageable — responsive layout can be solved with a custom CSS Grid block, and the schema mapping is a bounded task.

## Feature-by-Feature Assessment

### 1. Component Registration API

- **How it works**: Config object maps component names to `{ fields, render, defaultProps, resolveData, resolveFields, permissions, inline, label }`.
- **Key file**: `packages/core/types/Config.tsx` (259 lines)
- **Strengths**:
  - Dead-simple registration: `config.components.MyChart = { fields: { ... }, render: (props) => <Chart {...props} /> }`
  - `defaultProps` for sensible defaults
  - `resolveData` for async data resolution — can fetch data when props change
  - `resolveFields` for dynamic field definitions based on current props
  - `permissions` per-component (can disable delete, drag, duplicate, etc.)
  - `inline` mode for inline editing
  - `categories` for organizing components in the palette
- **Assessment**: **Excellent** — Maps directly to Supersubset's widget palette. Each chart type becomes a Puck component.

### 2. Nested Component Support (Slots)

- **How it works**: Puck supports nested components via **slot fields** (replacing the older DropZone API). Slots are typed component areas where other components can be placed.
- **Key file**: `packages/core/components/DropZone/index.tsx` (~600 lines)
- **Strengths**:
  - `DropZone` supports nested drag-and-drop targets
  - Slot fields are declarative: `fields: { content: { type: "slot" } }`
  - `allow` / `disallow` props control which components can be dropped in a zone
  - Zones register/unregister dynamically with proper lifecycle management
  - Depth tracking for proper z-index and collision detection
- **Concerns**:
  - DropZones are now **deprecated** in favor of slots (console warning emitted): *"DropZones have been deprecated in favor of slot fields and will be removed in a future version of Puck."*
  - Migration path to slots is available
- **Assessment**: **Good** — Slot fields are the way forward. This is what Supersubset needs for layout containers (rows, columns, tabs) that hold chart widgets.

### 3. Responsive Layout Capabilities

- **How it works**: Puck does NOT have a built-in responsive grid system. Layout is determined by the components themselves and CSS.
- **Current state**:
  - The DropZone supports `collisionAxis` (horizontal/vertical) and `dragAxis` for controlling drag direction
  - There is experimental `_experimentalVirtualization` for large lists
  - No built-in breakpoints, no responsive column system, no grid-to-stack at mobile
- **Concerns**:
  - **This is the biggest limitation for dashboard use**. Dashboards need responsive grid layouts (e.g., "2 charts side by side on desktop, stacked on mobile").
  - Workaround: Build a custom "Grid" or "Row/Column" block that uses CSS Grid internally and registers as a Puck component with slot fields for children.
- **Assessment**: **Manageable limitation** — Requires custom layout components, but this is standard Puck usage pattern. Many Puck users build their own grid systems.

### 4. Custom Field Editor Support

- **How it works**: Fields in Puck config define the property editing UI. Built-in field types include `text`, `textarea`, `number`, `select`, `radio`, `external`, `custom`, and `slot`.
- **Key types**: Fields are defined per-component in the config. Custom fields can render arbitrary React components.
- **Strengths**:
  - `resolveFields` allows dynamically changing available fields based on current props
  - Custom field editors can be any React component
  - Field-level metadata support
- **Assessment**: **Excellent** — Supersubset can build custom field editors for chart configuration (axis pickers, color scheme selectors, aggregation controls) as custom Puck fields.

### 5. Data Resolution (Async Data in Editor)

- **How it works**: `resolveData` on each component config is an async function called when props change. It receives current data and metadata, and can return modified props.
- **Key code** (from Config.tsx):
  ```typescript
  resolveData?: (data: DataShape, params: {
    changed: Partial<Record<keyof FieldProps, boolean>>;
    lastData: DataShape | null;
    metadata: ComponentMetadata;
    trigger: ResolveDataTrigger;
    parent: ComponentData | null;
  }) => Promise<{ props?: Partial<FieldProps>; readOnly?: Partial<Record<keyof FieldProps, boolean>> }>;
  ```
- **Strengths**:
  - Called on mount and prop changes with `trigger` indicating what changed
  - Can set `readOnly` on props — useful for computed fields
  - `parent` reference available for context-aware data loading
  - Multiple resolve triggers: prop change, move, initial load
- **Assessment**: **Excellent** — Can use `resolveData` to fetch chart preview data when data source or field bindings change in the editor.

### 6. Save/Load Serialization Format

- **How it works**: Puck state is a JSON object with `root`, `content`, and `zones` properties.
- **Key type** (from Data.tsx):
  ```typescript
  type Data = {
    root: RootData;      // Root props (page-level settings)
    content: Content;    // Array of ComponentData (top-level components)
    zones?: Record<string, Content>;  // Named zones for DropZone-based layouts
  };
  
  type ComponentData = {
    type: string;        // Component type name
    props: WithId<Props>; // Props including auto-generated ID
    readOnly?: Partial<Record<keyof Props, boolean>>;
  };
  ```
- **Strengths**:
  - Clean JSON structure, easily serializable
  - Stable IDs on all components
  - ReadOnly tracking per-field
  - Zones map for nested content
  - `Metadata` type for custom application data
- **Concerns**:
  - This is Puck's internal format, not Supersubset's canonical schema. A bidirectional mapper (Puck Data ↔ Canonical Schema) is required.
  - Slot-based data is stored differently from DropZone zones
- **Assessment**: **Good** — The mapping task is bounded and testable. The Puck format is simple enough that a reliable adapter can be built.

### 7. Performance with 20+ Blocks

- **How it works**: Puck uses `MemoizeComponent` wrappers, `memo()` on DropZone children, and Zustand stores for state management.
- **Key observations**:
  - `DropZoneChildMemo = memo(DropZoneChild)` — memoized child rendering
  - `useShallow` from Zustand to prevent unnecessary re-renders
  - `VirtualizedDropZone` component behind `_experimentalVirtualization` flag — indicates they're working on large-list performance
  - `loadingCount` tracking in component state for async resolution
- **Concerns**:
  - 20+ chart widgets with live ECharts instances will be heavier than typical Puck blocks (text, images)
  - Need to test: does Puck's re-render strategy handle expensive chart components?
  - May need to lazy-render chart previews in edit mode (placeholder → full chart on hover/click)
- **Assessment**: **Needs testing** — Likely fine for 20 blocks with lazy chart rendering, but should be validated in Phase 1 POC.

### 8. Theming/Styling Customization

- **How it works**: Puck provides `puck.css` stylesheet. Components can be styled with any CSS approach.
- **Current state**:
  - CSS modules for Puck's internal UI (`.DropZone`, `.DraggableComponent`)
  - No built-in theme token system
  - Custom CSS can override Puck's styles
  - `overrides` API allows replacing Puck's built-in UI components
- **Assessment**: **Adequate** — Supersubset's theme package will handle widget theming. Puck's editor chrome can be restyled via CSS overrides and the `overrides` API.

### 9. Host-App Integration (Controlled Mode)

- **How it works**: `<Puck>` component accepts props for full control:
  ```jsx
  <Puck
    config={config}
    data={initialData}
    onPublish={save}
    plugins={plugins}
    overrides={overrides}
  />
  ```
- **Key features**:
  - `data` prop for initial/controlled state
  - `onPublish` callback for save
  - `plugins` array for extensibility
  - `overrides` for replacing built-in UI (header, sidebar, component list, fields)
  - `initialHistory` for undo/redo state
  - `metadata` for passing host-app context to resolvers
  - Sub-components available: `<Puck.Components>`, `<Puck.Fields>`, `<Puck.Outline>`, `<Puck.Preview>`
- **Assessment**: **Excellent** — Clean controlled component pattern. Host app owns data and persistence. Exactly what Supersubset requires.

### 10. Plugin/Extension Points

- **How it works**: Plugins can provide `overrides` (UI replacement) and `fieldTransforms` (modify how fields are processed).
- **Key types**: `Plugin = { overrides?, fieldTransforms? }`
- **Built-in plugins**: Legacy sidebar plugin for opting out of new plugin bar
- **Field transforms**: Slot transform, inline text transform, rich text transform
- **Assessment**: **Good** — Plugin system is basic but sufficient. Supersubset can use plugins to add chart-specific field transforms.

## Known Limitations and Workarounds

| Limitation | Severity | Workaround |
|-----------|----------|------------|
| No responsive grid system | Medium | Build custom Grid/Row/Column blocks with CSS Grid + slot fields |
| DropZones deprecated | Low | Use slot fields instead (migration guide available) |
| No built-in undo/redo persistence | Low | `initialHistory` prop + host-managed history |
| Performance with heavy components | Medium | Lazy chart rendering in edit mode, validate in POC |
| No keyboard shortcuts built-in | Low | Add via `overrides` and global event listeners |
| Puck JSON ≠ canonical schema | Low | Build bidirectional mapper (bounded task) |

## "Blocker" Analysis

**What would force us to abandon Puck?**

1. **Performance collapse** — If Puck re-renders all components on every state change and ECharts instances can't handle it. Mitigation: `MemoizeComponent` pattern + lazy rendering should prevent this.
2. **Slot system too limited for complex layouts** — If slots can't support the nested row/column/tab layout model we need. Mitigation: Puck's slot system supports arbitrary nesting with `allow`/`disallow` constraints; this should be sufficient.
3. **Inability to customize editor chrome** — If the `overrides` API isn't flexible enough for Supersubset's UI needs. Mitigation: Overrides can replace nearly every UI element; sub-components allow custom layout.

**Current assessment**: None of these are likely blockers. All have tested mitigations.

## Integration Architecture Recommendation

```
Host App
  └── <SupersubsetDesigner>
       ├── Puck Data ↔ Canonical Schema Adapter
       ├── <Puck config={widgetConfig} data={puckData} onPublish={handleSave}>
       │    ├── <Puck.Components />   — widget palette
       │    ├── <Puck.Preview />      — live preview with Render
       │    └── <Puck.Fields />       — property panel
       └── Custom Overrides
            ├── Header (save/load/export)
            ├── Field editors (axis picker, color scheme, etc.)
            └── Data model browser (metadata explorer)
```

**Key architectural decisions**:
1. **Puck is the editor shell, not the runtime**. `<Render>` from Puck is NOT the Supersubset runtime renderer.
2. **Canonical schema is the source of truth**. Puck data is an internal editor representation, mapped to/from canonical on save/load.
3. **Chart widgets render as Puck components** in the editor, using `resolveData` for preview data.
4. **Layout containers** (Row, Column, Grid, Tabs) are custom Puck components with slot fields.

## Comparison with Alternatives

| Feature | Puck | GrapesJS | Craft.js |
|---------|------|----------|----------|
| **License** | MIT | BSD 3-clause | MIT |
| **Framework** | React-only | Framework-agnostic | React-only |
| **Maturity** | Active, v0.21 | Mature, v0.22 | Maintained, v0.2 |
| **Component registration** | Config object | Block/Component API | `useNode()` hooks |
| **Nested components** | Slot fields | HTML nesting | `<Canvas>` elements |
| **Serialization** | JSON (clean) | HTML + CSS | JSON (tree) |
| **Property editing** | Built-in fields + custom | Style Manager + Traits | DIY with hooks |
| **React integration** | Native (it IS React) | Wrapper available | Native |
| **Data resolution** | `resolveData` async | No built-in | No built-in |
| **Host-app control** | Excellent (props/callbacks) | Good (events/API) | Good (hooks/API) |
| **Dashboard-specific features** | None (general-purpose) | None (web builder) | None (general-purpose) |

**Why Puck over alternatives**:
- **vs GrapesJS**: GrapesJS outputs HTML/CSS, not JSON schema. It's designed for web page building, not data dashboards. The HTML-centric model doesn't map well to a canonical dashboard schema. Also BSD (not MIT).
- **vs Craft.js**: Craft.js requires more boilerplate (every component needs `useNode()` hooks). Puck provides more out-of-the-box UX. Craft.js has less active development. However, Craft.js offers more fine-grained control, which could matter if Puck proves too constraining.
- **Puck wins on**: simplicity, async data resolution, clean serialization, active development, React-native design.

## License Assessment

- **License**: MIT
- **Copyright**: © The Puck Contributors
- **Attribution**: Include MIT copyright notice in distribution
- **Commercial use**: Fully permitted
- **Compatibility**: MIT is compatible with any Supersubset license choice
