---
description: "Use when modifying React components in packages/runtime/. Covers the rendering engine, layout system, widget registry, filter engine, and lifecycle hooks. Enforces runtime rules: independent from designer, pluggable adapters, no backend deps."
applyTo: "packages/runtime/**"
---

# Runtime Package Rules

- Runtime must be mountable as `<SupersubsetRenderer />` with props/callbacks
- Runtime must NOT import from `packages/designer/`
- Accept canonical DashboardDefinition and QueryAdapter as props
- Widget registry must support dynamic registration
- Filter engine must propagate state across widgets without prop drilling
- All widgets must handle loading/error/empty states
- Layout engine must support grid, flex, tabs, stack containers
- Expose lifecycle hooks: onLoad, onError, onFilterChange, onWidgetClick
- No backend dependencies — queries go through adapter interface
- Test with fixture dashboard definitions
