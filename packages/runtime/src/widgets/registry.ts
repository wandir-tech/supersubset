/**
 * Widget registry — dynamic registration and lookup of widget components.
 * Chart packages register their components here; the runtime looks them up by type string.
 */
import type { ComponentType } from 'react';
import type { FilterValue } from '../filters/FilterEngine';

/**
 * Props passed to every widget component by the runtime.
 */
export interface WidgetProps {
  /** The widget definition from the dashboard schema */
  widgetId: string;
  widgetType: string;
  title?: string;
  config: Record<string, unknown>;
  /** Query result data (rows) — provided by the runtime after query execution */
  data?: Record<string, unknown>[];
  /** Column metadata from query results */
  columns?: Array<{ fieldId: string; label: string; dataType: string }>;
  /** Resolved theme for chart styling */
  theme?: Record<string, unknown>;
  /** Container width in pixels (set by layout engine) */
  width?: number;
  /** Container height in pixels (set by layout engine) */
  height?: number;
  /** Loading state */
  loading?: boolean;
  /** Error from query execution */
  error?: Error | null;
  /** Active filters that apply to this widget */
  activeFilters?: FilterValue[];
  /** Callback for widget interactions (click, hover, etc.) */
  onEvent?: (event: WidgetEvent) => void;
}

export interface WidgetEvent {
  type: 'click' | 'hover' | 'select';
  widgetId: string;
  payload?: Record<string, unknown>;
}

export type WidgetComponent = ComponentType<WidgetProps>;

/**
 * Widget registry — maps widget type strings to React components.
 */
export class WidgetRegistry {
  private widgets = new Map<string, WidgetComponent>();

  register(type: string, component: WidgetComponent): void {
    this.widgets.set(type, component);
  }

  get(type: string): WidgetComponent | undefined {
    return this.widgets.get(type);
  }

  has(type: string): boolean {
    return this.widgets.has(type);
  }

  getRegisteredTypes(): string[] {
    return Array.from(this.widgets.keys());
  }

  unregister(type: string): boolean {
    return this.widgets.delete(type);
  }
}

/**
 * Create a new WidgetRegistry, optionally pre-populated with widgets.
 */
export function createWidgetRegistry(
  entries?: Array<[string, WidgetComponent]>
): WidgetRegistry {
  const registry = new WidgetRegistry();
  if (entries) {
    for (const [type, component] of entries) {
      registry.register(type, component);
    }
  }
  return registry;
}
