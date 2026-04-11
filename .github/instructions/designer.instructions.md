---
description: "Use when modifying React components in packages/designer/. Covers Puck editor integration, custom blocks, property editors, and designer-to-schema serialization. Enforces designer rules: no backend deps, host-owned persistence, no iframe."
applyTo: "packages/designer/**"
---

# Designer Package Rules

- Designer must be mountable as `<SupersubsetDesigner />` with props/callbacks
- Support both controlled and uncontrolled modes
- Emit canonical DashboardDefinition via schema package — never raw Puck data
- No backend dependencies — all data comes from props/adapters
- No iframe for the core editor surface
- Host app owns persistence — designer only emits, never stores
- Use Puck APIs for drag-and-drop, block registration, property editing
- Custom field editors for data bindings go in `src/fields/`
- Puck ↔ canonical schema adapter in `src/adapters/`
- All components must accept theme tokens from host
- Write Storybook stories for every user-facing component
