# ADR-005: Designer Information Architecture & Navigation Redesign

## Status

Proposed

## Date

2026-04-10

## Context

The Supersubset dashboard designer's current navigation and information architecture has several usability issues identified during UX review:

1. **Filters are buried**: Clicking "Data & Filters" opens a left sidebar with ChartTypePicker, FieldBindingPicker, and FilterBuilderPanel stacked vertically. Users must scroll past chart type and field binding sections to reach filters.
2. **Duplicate component browsers**: The Puck "Components" tab in the left sidebar (icon + drawer) and the "Data & Filters" panel both show chart type selection — two places to think about "what chart am I adding/configuring."
3. **Data & Filters panel opens on the wrong side**: It uses `showTools` to render a left-side panel, but Puck's property panel is on the right. Users configure widget properties on the right but data/filters on the left — spatial mismatch.
4. **InteractionEditorPanel exists but is unreachable**: The component is fully implemented but never rendered in the UI.
5. **No clear conceptual grouping**: "What goes on my dashboard" (component palette), "what does this widget show" (data binding), "how do widgets interact" (filters/interactions), and "dashboard-level settings" (import/export/code) are all mixed together.
6. **Header toolbar overload**: Export, Import, Code, Data & Filters, and Publish buttons are crammed into the Puck header without visual grouping.

### Current Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚡ Supersubset  │ Viewer │ Designer │ Preview │                 │  ← Host app bar
├─────────────────────────────────────────────────────────────────┤
│ [⊞][⊟]  Supersubset Designer  ↩↪ ⎘⎗  Export Import Code D&F  Publish │  ← Puck header
├────────┬──────────────────────────────────────────┬─────────────┤
│ Comp   │                                          │  Page       │
│ -------│         Canvas                           │  Props      │  ← Puck right panel
│ Layers │                                          │  (root or   │
│        │                                          │  selected)  │
├────────┤                                          │             │
│ D&F    │                                          │             │  ← showTools panel
│ panel  │                                          │             │     (LEFT side, wrong)
│ (scroll│                                          │             │
│  down) │                                          │             │
└────────┴──────────────────────────────────────────┴─────────────┘
```

**Problems visualized:**
- When "Data & Filters" is open, it pushes the Components/Layers sidebar AND adds a second panel on the left, making the canvas tiny (see screenshot: `screenshots/ux-review/designer-data-filters.png`)
- The ChartTypePicker in the D&F panel duplicates the chart entries in the Components drawer
- Filters require: click "Data & Filters" → scroll past Chart Type picker → scroll past Field Binding picker → reach FilterBuilderPanel

### Reference: Apache Superset's Editor IA

Superset's dashboard edit mode uses a clean mental model:

| Zone | Purpose |
|------|---------|
| **Top toolbar** | Undo/Redo, layout controls (grid snap, etc.), Save/Discard |
| **Left sidebar** | Two tabs: "Charts" (add existing charts) and "Layout" (layout elements like rows, tabs, headers) |
| **Canvas** | Drag-and-drop workspace |
| **Right panel** | Context-sensitive: shows properties of the selected component |
| **Filter bar config** | Dedicated modal/panel accessible from a top-level button — NOT buried inside another panel |
| **Dashboard settings** | Separate modal (title, slug, owners, colors) |

Key takeaway: Superset separates **"add components"** (left), **"configure selected component"** (right), and **"dashboard-level settings"** (modal/dedicated panel) into distinct spatial zones.

### Puck API Constraints

Available extension points that constrain our design:

| Extension Point | What It Controls |
|----------------|-----------------|
| `plugins` | Left sidebar tab panels (e.g., `blocksPlugin`, `outlinePlugin`). Can add custom tabs with `{ label, components, render }`. |
| `overrides.headerActions` | Inject React nodes into the right side of the Puck header bar (before Publish). |
| `overrides.drawerItem` | Customize how each component appears in the sidebar drawer. |
| `overrides.componentItem` | Customize the outline tree items. |
| `overrides.preview` | Wrap the canvas preview area. |
| `overrides.fieldTypes` | Register custom property field editors for the right panel. |
| Host wrapper | We control the DOM **around** `<Puck>`. We can render our own panels adjacent to Puck. |

**Key constraint**: We cannot modify Puck's internal right sidebar (it always shows properties of the selected component). But we CAN:
- Add custom plugin tabs to the left sidebar
- Render panels outside Puck's DOM (above, below, or beside it)
- Use `overrides.headerActions` for toolbar buttons
- Create modals/drawers that overlay the editor

## Decision

### New Information Architecture

Reorganize the designer into **four conceptual zones** with clear spatial mapping:

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚡ Supersubset  │ Viewer │ Designer │ Preview │                 │  ← Host bar (unchanged)
├─────────────────────────────────────────────────────────────────┤
│  Supersubset Designer  │  ↩ ↪  │  ⛶ Filters  │  ⚡ Interactions  │  { } Code  │ ⬆ Export  ⬇ Import │  ⊕ Publish  │
├────────┬──────────────────────────────────────────┬─────────────┤
│        │                                          │             │
│  Left  │              Canvas                      │   Right     │
│  Side  │                                          │   Side      │
│  bar   │                                          │   bar       │
│        │                                          │             │
│        │                                          │             │
│        ├──────────────────────────────────────────┤             │
│        │  Code Panel (collapsible bottom)         │             │
│        │                                          │             │
└────────┴──────────────────────────────────────────┴─────────────┘
```

### Zone 1: Left Sidebar — "What's on my dashboard?"

**Purpose**: Add components to the canvas and view the component tree.

**Tabs** (via Puck plugins):

| Tab | Contents | Notes |
|-----|----------|-------|
| **Components** | Draggable blocks grouped by category: Layout, Charts, Tables & KPIs, Content, Controls | Existing `blocksPlugin` — unchanged |
| **Layers** | Outline tree of placed components | Existing `outlinePlugin` — unchanged |

**Changes from current state:**
- **Remove** the ChartTypePicker from the left panel entirely. Chart type selection belongs in the right sidebar when a chart is selected (see Zone 3).
- **Remove** the FieldBindingPicker from the left panel. Field binding belongs in the right sidebar (see Zone 3).
- The left sidebar is now ONLY for adding new components and viewing structure — no configuration.

### Zone 2: Top Toolbar — "Dashboard-level actions"

**Purpose**: Actions that affect the whole dashboard, not a specific widget.

Laid out in the Puck header via `overrides.headerActions`, organized into **visual groups** with separator dividers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Supersubset Designer  │  ↩ ↪  │  ⛶ Filters  ⚡ Interactions  │  </> Code  ↕ Import/Export  │  ⊕ Publish  │
│                        │       │                               │                            │             │
│  [title]               │[undo] │  [dashboard-level config]     │  [developer tools]         │  [save]     │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Button groups (left to right):**

1. **Title** — Dashboard title (Puck native)
2. **History** — Undo / Redo (existing `UndoRedoToolbar`)
3. **Dashboard Config** — Filters button, Interactions button
4. **Developer Tools** — Code toggle, Import/Export
5. **Publish** — Publish button (Puck native)

**Separators**: Thin vertical dividers (`|`) between groups for visual clarity.

**Key changes:**
- "Data & Filters" button is **split** into two focused buttons: "Filters" and "Interactions"
- "Data" (ChartTypePicker + FieldBindingPicker) moves to the right sidebar context panel
- Import and Export are merged into a single "Import/Export" dropdown or kept as Export/Import but grouped together
- Buttons that open panels get an active/highlighted state when their panel is visible

### Zone 3: Right Sidebar — "Configure the selected thing"

**Purpose**: Context-sensitive configuration of whatever is currently selected.

**Behavior**: This zone uses Puck's native right sidebar for component fields, but we ALSO render additional configuration panels here. The right sidebar is organized into **collapsible sections**:

#### When nothing is selected (root/page level):
The Puck right panel shows the root fields (`Dashboard Title`). No additional panels.

#### When a chart widget is selected:
The right panel shows Puck's native property fields for that component PLUS additional sections below:

| Section | Component | Behavior |
|---------|-----------|----------|
| **Widget Properties** | Puck native fields (title, height, color scheme, etc.) | Always shown first — Puck handles this |
| **Chart Type** | `ChartTypePicker` (compact mode) | Shown when a chart component is selected. Allows switching chart type in-place. |
| **Data Binding** | `FieldBindingPicker` | Shown when a chart/table/KPI is selected. Binds dataset fields to chart axes/slots. |

**Implementation approach**: Use Puck's `overrides.fieldTypes` to register a custom field type (e.g., `type: 'chart-type-picker'`) that renders the ChartTypePicker inline in the property panel. Similarly for FieldBindingPicker. This keeps them spatially co-located with other widget properties.

**Alternative approach** (if custom field types are insufficient): Render a secondary right panel adjacent to Puck's native one, triggered by widget selection. This panel sits **below** the Puck property fields in the same right column, scrolling together.

**Key changes:**
- ChartTypePicker **moves** from left Data & Filters panel → right sidebar (contextual, per-widget)
- FieldBindingPicker **moves** from left Data & Filters panel → right sidebar (contextual, per-widget)
- Both only appear when a data-consuming widget (chart/table/KPI) is selected
- Spatial consistency: ALL widget configuration lives on the right

### Zone 4: Overlay Panels — "Dashboard-level configuration tools"

These panels are too complex for toolbar dropdowns. They open as **slide-over panels** or **modal dialogs** triggered by toolbar buttons.

#### Filters Panel

**Trigger**: "⛶ Filters" button in the toolbar.

**Behavior**: Opens a **right-side slide-over panel** (overlaying the canvas, not the sidebar) or a **modal dialog**.

**Recommended: Slide-over panel from the right**, similar to Superset's Filter Bar Configuration panel.

```
┌────────┬───────────────────────────┬────────────────┐
│  Left  │  Canvas (dimmed)          │  Filters       │
│  Side  │                           │  Panel         │
│  bar   │                           │  (slide-over)  │
│        │                           │                │
│        │                           │  [+ Add Filter]│
│        │                           │  Filter 1: ... │
│        │                           │  Filter 2: ... │
│        │                           │  [Done]        │
└────────┴───────────────────────────┴────────────────┘
```

**Panel contents** (FilterBuilderPanel, enhanced):
- Header: "Dashboard Filters" with close button
- "+ Add Filter" button at top
- List of configured filters, each expandable/collapsible:
  - Dataset + field selector
  - Operator selector
  - Default value
  - Scope selector (Global / Page / Specific widgets)
- "Done" / "Apply" button to close

**Why slide-over instead of left sidebar:**
- Filters are a dashboard-level concern, not a component palette concern
- A slide-over communicates "you're configuring a modal/temporary thing"
- Doesn't compete with the Components/Layers tabs
- Follows Superset's pattern of a dedicated filter configuration surface

#### Interactions Panel

**Trigger**: "⚡ Interactions" button in the toolbar.

**Behavior**: Opens the same slide-over treatment as Filters.

```
┌────────┬───────────────────────────┬────────────────┐
│  Left  │  Canvas (dimmed)          │  Interactions  │
│  Side  │                           │  Panel         │
│  bar   │                           │  (slide-over)  │
│        │                           │                │
│        │                           │ [+ Add Rule]   │
│        │                           │ When [Widget]  │
│        │                           │   [clicks] →   │
│        │                           │ Then [Filter]  │
│        │                           │   [target]     │
│        │                           │ [Done]         │
└────────┴───────────────────────────┴────────────────┘
```

**Panel contents** (InteractionEditorPanel — currently unrendered):
- Header: "Widget Interactions" with close button  
- "+ Add Interaction Rule" button
- List of rules, each showing trigger → action:
  - Trigger: source widget, event type (click/hover/change)
  - Action: filter/navigate/drill/external with relevant config
- "Done" / "Apply" button to close

**Why surface interactions now:**
- The InteractionEditorPanel is fully implemented but unreachable
- Interactions are a dashboard-level concern (cross-widget relationships)
- Co-locating the button next to Filters makes sense: both configure how widgets relate to each other

#### Code Panel

**Trigger**: "</> Code" button in the toolbar.

**Behavior**: Unchanged — opens as a collapsible bottom panel below the canvas. This is developer-oriented and appropriately separated from design-time configuration.

### Eliminated Duplicates

| Current Element | Action | Rationale |
|---------------|--------|-----------|
| ChartTypePicker in left "Data & Filters" panel | **Move** to right sidebar (contextual per-widget) | Chart type is a property of a selected widget, not a global tool |
| FieldBindingPicker in left "Data & Filters" panel | **Move** to right sidebar (contextual per-widget) | Data binding configures the selected widget |
| "Data & Filters" toolbar button | **Replace** with separate "Filters" and "Interactions" buttons | Eliminates the overloaded panel; each button has one purpose |
| `showTools` left panel (entire thing) | **Remove** | Its contents (ChartType, FieldBinding, Filters) move elsewhere |

### Tab/Panel Hierarchy

Clear mental model for users:

```
Level 0: Dashboard
├── Toolbar: Filters, Interactions, Import/Export, Code, Publish
│
Level 1: Canvas Composition
├── Left Sidebar: Components (add), Layers (organize)
│
Level 2: Widget Configuration  
├── Right Sidebar: Properties, Chart Type, Data Binding
│   (appears when a widget is selected)
│
Level 3: Dashboard Behaviors (overlay panels)
├── Filters Panel: Define what filters exist & their scope
├── Interactions Panel: Define cross-widget behaviors
│
Level 4: Developer Tools (overlay/bottom panel)
├── Code Panel: View/edit JSON/YAML
├── Import/Export: Load/save dashboard files
```

**Principle**: Each level has a distinct spatial location. Users never have to scroll through mixed-concern panels.

### Navigation Flow Examples

#### "I want to add a bar chart"
1. Left sidebar → Components tab → Charts → drag "Bar Chart" to canvas

#### "I want to change this chart to a pie chart"
1. Click the chart on the canvas
2. Right sidebar → Chart Type section → select "Pie / Donut"

#### "I want to bind data fields to my chart"
1. Click the chart on the canvas
2. Right sidebar → Data Binding section → pick dataset, map fields to axes

#### "I want to add a filter to my dashboard"
1. Toolbar → click "Filters" button
2. Filters slide-over opens → "+ Add Filter"
3. Configure filter (dataset, field, operator, scope)
4. Click "Done"

#### "I want Widget A to filter Widget B on click"
1. Toolbar → click "Interactions" button
2. Interactions slide-over opens → "+ Add Interaction Rule"
3. Set trigger: Widget A, click event
4. Set action: Filter, target Widget B, field
5. Click "Done"

#### "I want to see the dashboard JSON"
1. Toolbar → click "Code" button
2. Bottom panel opens showing JSON/YAML code

### Implementation Plan

#### Phase 1: Toolbar Reorganization (Low risk, high impact)
1. Replace "Data & Filters" button with separate "Filters" and "Interactions" buttons
2. Add visual group separators in `headerActions`
3. Wire "Filters" button to open FilterBuilderPanel in a slide-over
4. Wire "Interactions" button to open InteractionEditorPanel in a slide-over
5. Remove `showTools` state and the entire left Data & Filters panel

#### Phase 2: Right Sidebar Enhancement (Medium risk)
1. Register custom Puck field types for ChartTypePicker and FieldBindingPicker
2. Add these fields to chart/table/KPI block definitions in `puck-config.ts`
3. These fields appear in Puck's native right panel when a chart is selected
4. If custom field types have limitations, fall back to rendering a secondary panel below Puck's fields using `overrides.preview` or external DOM positioning

#### Phase 3: Slide-Over Panel Component (Medium risk)
1. Build a reusable `SlideOverPanel` component (right-anchored drawer with backdrop)
2. Migrate FilterBuilderPanel into it
3. Add InteractionEditorPanel into it
4. Active state highlighting on toolbar buttons

#### Phase 4: Polish (Low risk)
1. Keyboard shortcuts: `F` for Filters, `I` for Interactions, `Cmd+Shift+C` for Code
2. Panel transition animations
3. Badge counts on toolbar buttons (e.g., "Filters (3)" showing how many filters are configured)
4. Empty states with helpful guidance for Filters and Interactions panels

## Consequences

### Positive

- Filters are accessible in **one click** instead of click → scroll → scroll
- InteractionEditorPanel is finally surfaced to users
- No more duplicate chart type pickers
- Clear mental model: left = add, right = configure, overlay = dashboard-level
- Follows established patterns from Superset and other dashboard editors
- Each toolbar button has exactly one purpose

### Negative

- Requires registering custom Puck field types (needs testing with Puck API)
- Slide-over panel is a new component to build and maintain
- Users familiar with the current layout will need to re-learn (mitigated: current layout is confusing)

### Neutral

- Total toolbar button count stays approximately the same (Export, Import, Code, Data&Filters → Export, Import, Code, Filters, Interactions)
- Left sidebar tabs unchanged (Components, Layers)
- Code panel behavior unchanged (bottom toggle)

## Alternatives Considered

| Alternative | Pros | Cons | Why Rejected |
|------------|------|------|-------------|
| **Modal dialogs for Filters/Interactions** | Simple to implement, clear separation | Blocks canvas view entirely; can't see widgets while configuring filters | Slide-over allows partial canvas visibility |
| **Left sidebar tabs for Filters/Interactions** | Consistent with Components/Layers pattern | Overloads the left sidebar with too many tabs; mixes "add components" with "configure behavior" | Different conceptual level; slide-over better communicates "dashboard-level config" |
| **Keep combined "Data & Filters" but move to right side** | Minimal change | Still requires scrolling; still mixes chart type + data + filters | Doesn't solve the core IA problem |
| **Floating toolbar (ribbon-style)** | More room for controls | Complex to implement; unfamiliar pattern for dashboard editors | Over-engineering; Puck header is sufficient |

## Wireframes

### Default State (nothing selected)
```
┌──────────────────────────────────────────────────────────────────────────┐
│ ⚡ Supersubset  │ Viewer │ [Designer] │ Preview │                        │
├──────────────────────────────────────────────────────────────────────────┤
│  Supersubset Designer    ↩ ↪  │  ⛶ Filters  ⚡ Interactions  │  </> ↕  │  Publish  │
├─────────┬────────────────────────────────────────────┬──────────────────┤
│ [Comp]  │  LAYOUT                                    │  Page            │
│ [Layer] │  ┌──────────────────┐  ┌──────────────┐   │                  │
│         │  │  Row (12-col)    │  │  Column      │   │  T Dashboard     │
│ LAYOUT  │  └──────────────────┘  └──────────────┘   │    Title         │
│ Row     │                                            │  ┌────────────┐ │
│ Column  │  CHARTS                                    │  │Sales Dash  │ │
│         │  ┌─────┐ ┌─────┐ ┌─────┐                  │  └────────────┘ │
│ CHARTS  │  │Chart│ │Chart│ │Table│                   │                  │
│ Line    │  └─────┘ └─────┘ └─────┘                   │                  │
│ Bar     │                                            │                  │
│ Pie     │                                            │                  │
│ ...     │                                            │                  │
└─────────┴────────────────────────────────────────────┴──────────────────┘
```

### Chart Selected (right panel shows widget config)
```
┌──────────────────────────────────────────────────────────────────────────┐
│  Supersubset Designer    ↩ ↪  │  ⛶ Filters  ⚡ Interactions  │  </> ↕  │  Publish  │
├─────────┬────────────────────────────────────────────┬──────────────────┤
│ [Comp]  │                                            │  BarChart        │
│ [Layer] │  ┌──────────────────────────────────┐      │                  │
│         │  │  Revenue Trend [selected]         │      │  T Title         │
│ ...     │  │  ████ ███ █████ ██ ████          │      │  ┌────────────┐ │
│         │  └──────────────────────────────────┘      │  │Revenue Tre │ │
│         │                                            │  └────────────┘ │
│         │  ┌──────────────┐  ┌──────────────┐       │  # Height: 300   │
│         │  │  KPI Card    │  │  Table        │       │                  │
│         │  └──────────────┘  └──────────────┘       │  ── Chart Type ──│
│         │                                            │  [Line][Bar][Pie]│
│         │                                            │  [Scatter]...    │
│         │                                            │                  │
│         │                                            │  ── Data ────── │
│         │                                            │  Dataset: Orders │
│         │                                            │  X Axis: [date]  │
│         │                                            │  Y Axis: [rev]   │
└─────────┴────────────────────────────────────────────┴──────────────────┘
```

### Filters Panel Open (slide-over)
```
┌──────────────────────────────────────────────────────────────────────────┐
│  Supersubset Designer    ↩ ↪  │ [⛶ Filters] ⚡ Interactions  │  </> ↕  │  Publish  │
├─────────┬──────────────────────────────┬─────────────────────────────────┤
│ [Comp]  │  (canvas dimmed/blurred)     │  Dashboard Filters         ✕  │
│ [Layer] │                              │                                │
│         │                              │  [+ Add Filter]                │
│         │                              │                                │
│ ...     │                              │  ┌─ Region Filter ──────── ▾ ┐ │
│         │                              │  │ Dataset: Orders            │ │
│         │                              │  │ Field: region              │ │
│         │                              │  │ Operator: In list          │ │
│         │                              │  │ Default: (none)            │ │
│         │                              │  │ Scope: ● Global            │ │
│         │                              │  │        ○ Page  ○ Widgets   │ │
│         │                              │  │                    [🗑]    │ │
│         │                              │  └────────────────────────────┘ │
│         │                              │                                │
│         │                              │  ┌─ Category Filter ──── ▸ ┐  │
│         │                              │  └────────────────────────────┘ │
│         │                              │                                │
│         │                              │              [Done]            │
└─────────┴──────────────────────────────┴─────────────────────────────────┘
```

### Interactions Panel Open (slide-over)
```
┌──────────────────────────────────────────────────────────────────────────┐
│  Supersubset Designer    ↩ ↪  │  ⛶ Filters [⚡ Interactions] │  </> ↕  │  Publish  │
├─────────┬──────────────────────────────┬─────────────────────────────────┤
│ [Comp]  │  (canvas dimmed/blurred)     │  Widget Interactions        ✕  │
│ [Layer] │                              │                                │
│         │                              │  [+ Add Interaction Rule]      │
│ ...     │                              │                                │
│         │                              │  ┌─ Rule 1 ─────────────────┐ │
│         │                              │  │ WHEN  chart-region-sales  │ │
│         │                              │  │       [click] event       │ │
│         │                              │  │ THEN  [filter]            │ │
│         │                              │  │       → chart-revenue,    │ │
│         │                              │  │         table-orders      │ │
│         │                              │  │       field: region       │ │
│         │                              │  │                    [🗑]   │ │
│         │                              │  └──────────────────────────┘ │
│         │                              │                                │
│         │                              │              [Done]            │
└─────────┴──────────────────────────────┴─────────────────────────────────┘
```

## Component Inventory

### New Components to Build

| Component | Location | Purpose |
|-----------|----------|---------|
| `SlideOverPanel` | `packages/designer/src/components/SlideOverPanel.tsx` | Reusable right-anchored drawer with backdrop, close button, title. Used by Filters and Interactions panels. |
| `ToolbarButtonGroup` | `packages/designer/src/components/ToolbarButtonGroup.tsx` | Groups toolbar buttons with a visual separator. Accepts children. |
| `ToolbarButton` | `packages/designer/src/components/ToolbarButton.tsx` | Standardized toolbar button with active state, icon, label, optional badge count. |

### Modified Components

| Component | Change |
|-----------|--------|
| `SupersubsetDesigner` | Accept new props: `filterPanel`, `interactionPanel` (or build them in). Update `overrides.headerActions` to accept structured toolbar groups. |
| `puck-config.ts` | Add custom field types for chart blocks that render ChartTypePicker and FieldBindingPicker inline in the right panel. |
| `dev-app/main.tsx` | Remove `showTools` state and left panel. Add `showFilters` / `showInteractions` states. Wire slide-over panels. |

### Removed from Current UI

| Element | File | Removed Because |
|---------|------|----------------|
| `showTools` left panel | `dev-app/main.tsx` | Contents redistributed to right sidebar and slide-overs |
| "Data & Filters" toolbar button | `dev-app/main.tsx` | Replaced by "Filters" and "Interactions" buttons |
| ChartTypePicker in left panel | `dev-app/main.tsx` | Moved to right sidebar (per-widget context) |
| FieldBindingPicker in left panel | `dev-app/main.tsx` | Moved to right sidebar (per-widget context) |

## References

- [ADR-001: Editor Shell — Puck](001-editor-shell.md)
- [Puck study](../research/puck-study.md)
- Screenshots: `screenshots/ux-review/designer-mode.png`, `screenshots/ux-review/designer-data-filters.png`
- Apache Superset dashboard editor: Filter Bar configuration pattern, right-side property panel pattern
