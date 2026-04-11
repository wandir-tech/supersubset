import { describe, it, expect } from 'vitest';
import { WidgetRegistry, createWidgetRegistry } from '../src/widgets/registry';
import type { WidgetProps } from '../src/widgets/registry';

// Simple mock widgets for testing
const MockLine = ((_props: WidgetProps) => null) as React.FC<WidgetProps>;
const MockBar = ((_props: WidgetProps) => null) as React.FC<WidgetProps>;
const MockKPI = ((_props: WidgetProps) => null) as React.FC<WidgetProps>;

describe('WidgetRegistry', () => {
  it('registers and retrieves a widget', () => {
    const registry = new WidgetRegistry();
    registry.register('line-chart', MockLine);
    expect(registry.get('line-chart')).toBe(MockLine);
  });

  it('returns undefined for unregistered type', () => {
    const registry = new WidgetRegistry();
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('has() returns correct boolean', () => {
    const registry = new WidgetRegistry();
    registry.register('bar-chart', MockBar);
    expect(registry.has('bar-chart')).toBe(true);
    expect(registry.has('pie-chart')).toBe(false);
  });

  it('lists registered types', () => {
    const registry = new WidgetRegistry();
    registry.register('line-chart', MockLine);
    registry.register('bar-chart', MockBar);
    expect(registry.getRegisteredTypes()).toEqual(['line-chart', 'bar-chart']);
  });

  it('unregisters a widget', () => {
    const registry = new WidgetRegistry();
    registry.register('kpi', MockKPI);
    expect(registry.has('kpi')).toBe(true);
    registry.unregister('kpi');
    expect(registry.has('kpi')).toBe(false);
  });

  it('overwrites existing registration', () => {
    const registry = new WidgetRegistry();
    registry.register('chart', MockLine);
    registry.register('chart', MockBar);
    expect(registry.get('chart')).toBe(MockBar);
  });
});

describe('createWidgetRegistry', () => {
  it('creates an empty registry', () => {
    const registry = createWidgetRegistry();
    expect(registry.getRegisteredTypes()).toEqual([]);
  });

  it('creates a pre-populated registry', () => {
    const registry = createWidgetRegistry([
      ['line-chart', MockLine],
      ['bar-chart', MockBar],
    ]);
    expect(registry.has('line-chart')).toBe(true);
    expect(registry.has('bar-chart')).toBe(true);
    expect(registry.getRegisteredTypes()).toHaveLength(2);
  });
});
