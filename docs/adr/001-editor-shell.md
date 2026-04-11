# ADR-001: Editor Shell — Puck

## Status

Accepted

## Date

2026-04-08

## Context

Supersubset needs a visual drag-and-drop dashboard designer that can be embedded as a React component inside host applications. The designer must support:

- Drag-and-drop layout editing with a widget palette
- Property panels for configuring widgets
- Async data resolution for chart previews during editing
- JSON-serializable state (for canonical schema emission)
- Host-app theming and customization
- No iframe architecture

Building an editor shell from scratch would be a multi-month effort covering drag-and-drop mechanics, component registration, field editors, sidebar/canvas chrome, and undo/redo.

## Decision

Use **Puck** (MIT license, `@measured/puck`) as the editor shell for `packages/designer/`.

Puck provides:

- **Component registration** via `Config` object: `{ components: { MyWidget: { fields, render, defaultProps, resolveData } } }`
- **Drag-and-drop** built on `@dnd-kit` with zone management
- **Property editing** via built-in and custom field types
- **Async data resolution** via `resolveData` — ideal for fetching chart preview data during editing
- **Slot fields** for nested component composition (e.g., charts inside grid cells)
- **JSON-serializable state** — `<Puck>` editor state maps directly to our canonical schema
- **`overrides` API** for customizing editor chrome (sidebar, header, field renderers)
- **`<Render>` component** for readonly playback (though our runtime is independent)

### Integration architecture

```
Host App
  └── <SupersubsetDesigner />          (packages/designer)
        └── <Puck config={...} />      (@measured/puck)
              ├── Sidebar (widget palette, property panel)
              ├── Canvas (drag-drop editing surface)
              └── Custom blocks (chart widgets, layout blocks, controls)
```

Puck is wrapped — never exposed directly to host apps. The `packages/designer` public API is:
- `<SupersubsetDesigner onSave={} schema={} dataModel={} />`
- No Puck types in the public interface

### Layout approach

Puck does not provide built-in responsive grids. We will build custom layout components:
- `<Grid>` — CSS Grid container with configurable columns and breakpoints
- `<Row>` / `<Column>` — flexbox-based layout using Puck slot fields
- Breakpoints handled via CSS media queries within these components

## Consequences

### Positive

- Avoids months of editor-shell development
- Production-quality drag-and-drop out of the box
- `resolveData` is a perfect fit for chart preview during editing
- MIT license — no restrictions
- Active development (v0.21+), responsive maintainers
- Clean separation: Puck handles editor mechanics, we handle dashboard semantics

### Negative

- Puck is pre-v1.0 — API changes between minor versions are possible (mitigated by version pinning and wrapping)
- No built-in responsive grid — requires custom layout components (~300-400 lines)
- Puck's internal state shape differs from our canonical schema — requires a serialization adapter (`puckState ↔ DashboardDefinition`)

### Neutral

- Puck adds ~150KB to the designer bundle (acceptable for an editor)
- Designer package depends on Puck; runtime package does NOT

## Alternatives Considered

| Alternative | Pros | Cons | Why Rejected |
|------------|------|------|-------------|
| **Craft.js** | MIT, React-based, more control over editor chrome | Requires building all editor UI from scratch (sidebar, field editors, canvas chrome); slower release cadence (also v0.x); more boilerplate for equivalent result | More work for same outcome; kept as documented fallback |
| **GrapesJS** | Mature (v0.22), large community (22k stars), rich plugin ecosystem | HTML/CSS-centric paradigm (wrong model for data dashboards); block model is DOM elements, not React components; would fight our component-first architecture | Wrong paradigm — optimized for web pages, not data dashboards |
| **Custom from scratch** | Maximum control, no external dependency | 3-6 month effort for drag-drop, component registration, field editors, undo/redo; high risk of bugs in editor mechanics | Enormous scope; Puck provides 80% of what we need |
| **react-grid-layout** (for layout only) | Battle-tested grid with resize handles | Only handles grid layout, not the full editor; two competing drag-drop systems would conflict with Puck | Conflicts with Puck's drag-drop; grid-only, not an editor |

## References

- [Puck study](../research/puck-study.md)
- [Landscape scan — editor comparison](../research/landscape-scan.md)
- [Reuse matrix](../research/reuse-matrix.md)
- [HC-0 decision record](../status/checkpoints/hc-0-result.md)
