# Designer API

`@supersubset/designer` embeds the Puck-backed visual editor while keeping the canonical dashboard schema in host state.

## Main Exports

- `SupersubsetDesigner`
- `puckToCanonical()`, `canonicalToPuck()`
- `createPuckConfig()`
- `ImportExportPanel`, `CodeViewPanel`, `LivePreviewPane`
- `useUndoRedo()`, `UndoRedoToolbar`, `useUndoRedoKeyboard()`
- `ChartTypePicker`
- `FieldBindingPicker`
- `FilterBuilderPanel`
- `InteractionEditorPanel`
- `SlideOverPanel`
- `ChartPreview`
- `getSampleData()`, `SAMPLE_DATA_TYPES`
- block name maps and component icon helpers

## SupersubsetDesigner

`SupersubsetDesigner` supports controlled and uncontrolled use.

Controlled mode is the recommended host pattern:

```tsx
<SupersubsetDesigner
  value={definition}
  onChange={setDefinition}
  onPublish={saveDefinition}
  headerTitle="Supersubset Designer"
  height="100vh"
/>
```

Key props:

- `value`: current `DashboardDefinition` in controlled mode
- `onChange`: called whenever the editor emits an updated definition
- `defaultValue`: starting definition for uncontrolled mode
- `onPublish`: explicit save callback when the user publishes
- `headerTitle`: custom header label
- `height`: editor container height
- `disableIframe`: inline preview toggle for host environments that do not want iframe isolation
- `metadata`: extra host metadata passed through to Puck components
- `headerActions`: custom controls rendered in the Puck header

Host responsibilities:

- own persistence for the canonical schema
- decide which metadata and capabilities to expose
- mount the runtime separately if you need a dedicated viewer surface

## Controlled Vs Uncontrolled

Use controlled mode when the host needs predictable import/export, revisioning, autosave, or multi-surface coordination.

Use uncontrolled mode only when the editor is acting like a local form and `onPublish` is the only save boundary you need.

## Advanced Adapter Exports

Use these when you need a custom editor shell or want to work with the Puck document directly:

- `canonicalToPuck(definition)` converts a dashboard definition into Puck data
- `puckToCanonical(data)` converts edited Puck data back into a dashboard definition
- `createPuckConfig()` returns the Supersubset block configuration

These are advanced seams. Most hosts should stay on `SupersubsetDesigner` unless they need custom chrome around Puck itself.

## Utility Components

The package also exports the editor-side building blocks used in the examples:

- `ImportExportPanel` for JSON and YAML import/export
- `CodeViewPanel` for read-only schema inspection
- `LivePreviewPane` for side-by-side runtime preview
- `UndoRedoToolbar` and `useUndoRedo()` for host-controlled revision UX
- `ChartTypePicker`, `FieldBindingPicker`, `FilterBuilderPanel`, and `InteractionEditorPanel` for focused editor tooling

## Interaction Authoring Notes

The designer currently authors page-target navigation actions. The underlying schema and runtime already accept structured dashboard targets, but the designer does not expose that authoring flow yet.

## Related Docs

- [schema.md](./schema.md)
- [runtime.md](./runtime.md)
- [Getting Started](../getting-started.md)