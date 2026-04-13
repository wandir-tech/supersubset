// @supersubset/designer — Dashboard visual editor backed by Puck

// Main component
export {
  SupersubsetDesigner,
  type SupersubsetDesignerProps,
} from './components/SupersubsetDesigner';

// Puck ↔ Canonical adapter (for advanced usage / custom editors)
export { puckToCanonical, canonicalToPuck } from './adapters/puck-canonical';

// Puck config (for advanced customization)
export { createPuckConfig } from './config/puck-config';

// Block name constants
export { CHART_BLOCK_NAMES, PUCK_NAME_TO_WIDGET_TYPE, WIDGET_TYPE_TO_PUCK_NAME } from './blocks/charts';
export { CONTENT_BLOCK_NAMES, CONTENT_PUCK_NAME_TO_TYPE } from './blocks/content';
export { CONTROL_BLOCK_NAMES, CONTROL_PUCK_NAME_TO_TYPE } from './blocks/controls';
export { LAYOUT_BLOCK_NAMES, LAYOUT_PUCK_NAME_TO_TYPE } from './blocks/layout';

// Icons
export { getComponentIcon, ICON_COMPONENT_NAMES } from './icons/component-icons';

// Sample data
export { getSampleData, SAMPLE_DATA_TYPES } from './data/sample-data';
export type { SampleDataSet } from './data/sample-data';

// Chart preview (for advanced customization)
export { ChartPreview } from './preview/ChartPreview';

// Preview data provider (host-supplied data for chart previews)
export {
  PreviewDataProvider,
  usePreviewData,
  type FetchPreviewData,
  type PreviewDataRequest,
  type PreviewDataContextValue,
} from './context/PreviewDataContext';

// Import/Export panel
export { ImportExportPanel, type ImportExportPanelProps } from './components/ImportExportPanel';

// Code view panel
export { CodeViewPanel, type CodeViewPanelProps } from './components/CodeViewPanel';

// Live preview pane
export { LivePreviewPane, type LivePreviewPaneProps } from './components/LivePreviewPane';

// Undo/Redo
export {
  useUndoRedo,
  UndoRedoToolbar,
  useUndoRedoKeyboard,
  type UndoRedoState,
  type UseUndoRedoOptions,
  type UndoRedoToolbarProps,
} from './components/UndoRedo';

// Chart type picker
export {
  ChartTypePicker,
  CHART_TYPE_OPTIONS,
  type ChartTypePickerProps,
  type ChartTypeOption,
} from './components/ChartTypePicker';

// Field binding picker / Data model browser
export {
  FieldBindingPicker,
  type FieldBindingPickerProps,
  type FieldBinding,
  type BindingSlot,
} from './components/FieldBindingPicker';

// Filter builder
export {
  FilterBuilderPanel,
  FILTER_OPERATORS,
  type FilterBuilderPanelProps,
  type FilterDefinition,
  type FilterScope,
} from './components/FilterBuilderPanel';

// Interaction editor
export {
  InteractionEditorPanel,
  type InteractionEditorPanelProps,
  type InteractionDefinition,
  type InteractionTrigger,
  type InteractionAction,
} from './components/InteractionEditorPanel';

// Slide-over panel
export {
  SlideOverPanel,
  type SlideOverPanelProps,
} from './components/SlideOverPanel';

// Dataset context (for custom field editors and advanced usage)
export { DatasetProvider, useDatasets } from './context/DatasetContext';

// Puck custom field factories
export { createFieldRefField, createDatasetRefField } from './fields/field-ref-field';
