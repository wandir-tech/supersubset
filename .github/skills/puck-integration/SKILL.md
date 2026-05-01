---
name: puck-integration
description: 'Integrate Puck visual editor as the shell for the Supersubset dashboard designer. Use when building drag-and-drop editing, custom Puck blocks, property editors, field registration, or designer-to-schema serialization. Covers Puck configuration, custom components, and host-app mounting.'
---

# Puck Integration Skill

## When to Use

- Setting up Puck as the editor shell
- Creating custom Puck blocks for Supersubset widgets
- Building property editors for widget configuration
- Wiring Puck data to/from canonical schema serialization
- Implementing drag-and-drop for dashboard widgets
- Configuring Puck for controlled/uncontrolled modes

## Puck Overview

Puck is an open-source React visual editor that provides:

- Drag-and-drop block editing
- Category-organized component palette
- Property editing panels
- Host-app integration via controlled data
- JSON-based internal data model

## Integration Architecture

```
Host App
└── <SupersubsetDesigner />
    └── <Puck>
        ├── Category: Charts
        │   ├── LineChart block
        │   ├── BarChart block
        │   └── ...
        ├── Category: Tables
        │   ├── DataTable block
        │   └── PivotTable block
        ├── Category: Content
        │   ├── Markdown block
        │   └── KPICard block
        └── Category: Controls
            ├── FilterBar block
            └── DateRange block
```

## Key Integration Points

### 1. Custom Block Definition

Each Supersubset widget becomes a Puck component with:

- `fields`: Property editor configuration
- `defaultProps`: Sensible defaults
- `render`: Preview component
- `resolveData`: Async data resolution for live preview

### 2. Data Binding

Puck's internal data model must roundtrip through:

```
Puck Data ←→ Canonical Dashboard Schema (JSON/YAML)
```

Implement adapters in `packages/designer/src/adapters/`:

- `puckToCanonical(puckData)` → DashboardDefinition
- `canonicalToPuck(dashboard)` → PuckData

### 3. Host App Integration

```tsx
<SupersubsetDesigner
  value={dashboardDefinition} // controlled mode
  onChange={handleChange} // canonical schema out
  metadata={analyticalModel} // data model for field pickers
  onSave={handleSave} // host persistence callback
  theme={hostTheme} // theming bridge
/>
```

## Procedure

1. Install Puck: `pnpm add @puckeditor/core` in `packages/designer`
2. Create component configs for each widget type
3. Build custom field editors for data bindings
4. Implement Puck ↔ canonical schema adapter
5. Wire the designer as a controlled component
6. Add import/export JSON/YAML via schema serializers
7. Test with Chrome MCP browser verification

## Key References

- [Puck docs](https://puckeditor.com/docs)
- [Puck GitHub](https://github.com/measuredco/puck)

## See Also

- `.github/skills/designer-design/SKILL.md` for visual hierarchy, theme usage, and authoring UX guidance
- `.github/instructions/designer.instructions.md` for package-level constraints
