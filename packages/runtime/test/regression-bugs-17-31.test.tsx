/**
 * Regression tests for runtime bugs #18, #26, #27, #29, #31.
 * Each test is designed to FAIL against pre-fix code.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { LayoutRenderer } from '../src/layout/LayoutRenderer';
import { createWidgetRegistry } from '../src/widgets/registry';
import type { WidgetProps } from '../src/widgets/registry';
import type { LayoutMap, WidgetDefinition } from '@supersubset/schema';
import { FilterProvider, useFilters } from '../src/filters/FilterEngine';
import { DrillProvider, useDrill, type DrillContextValue } from '../src/interactions/DrillManager';
import {
  InteractionProvider,
  useInteractions,
  type InteractionCallbacks,
} from '../src/interactions/InteractionEngine';
import type { InteractionDefinition } from '@supersubset/schema';

// ─── Test Helpers ────────────────────────────────────────────

function MockWidget({ title, widgetType, config }: WidgetProps) {
  return (
    <div data-testid={`widget-${widgetType}`} data-config={JSON.stringify(config)}>
      {title ?? widgetType}
    </div>
  );
}

function CrashingWidget(_props: WidgetProps): JSX.Element {
  throw new Error('Widget render explosion');
}

const registry = createWidgetRegistry([
  ['kpi-card', MockWidget],
  ['line-chart', MockWidget],
  ['crashing', CrashingWidget],
]);

// ─── #27: Circular layout reference causes stack overflow ────

describe('LayoutRenderer — #27 circular layout detection', () => {
  it('detects circular references and renders error instead of stack overflow', () => {
    // Create a circular reference: grid-1 → w-1 → grid-1 (via children)
    const layout: LayoutMap = {
      root: { id: 'root', type: 'root', children: ['grid-1'], meta: {} },
      'grid-1': { id: 'grid-1', type: 'grid', children: ['col-1'], parentId: 'root', meta: {} },
      'col-1': { id: 'col-1', type: 'column', children: ['grid-1'], parentId: 'grid-1', meta: {} },
    };

    // Should NOT throw (infinite recursion). Should render gracefully.
    const { container } = render(
      <LayoutRenderer layout={layout} rootNodeId="root" widgets={[]} registry={registry} />,
    );

    // Should contain a circular reference error message
    expect(container.textContent).toContain('Circular reference');
  });

  it('handles deeply nested layouts within depth limit', () => {
    // Build a linear chain of 10 nested grids — should work fine
    const layout: LayoutMap = {
      root: { id: 'root', type: 'root', children: ['g-0'], meta: {} },
    };
    for (let i = 0; i < 10; i++) {
      const nextId = i < 9 ? `g-${i + 1}` : 'w-leaf';
      layout[`g-${i}`] = {
        id: `g-${i}`,
        type: 'grid',
        children: [nextId],
        parentId: i === 0 ? 'root' : `g-${i - 1}`,
        meta: {},
      };
    }
    layout['w-leaf'] = {
      id: 'w-leaf',
      type: 'widget',
      children: [],
      parentId: 'g-9',
      meta: { widgetRef: 'kpi-1' },
    };

    const widgets: WidgetDefinition[] = [
      { id: 'kpi-1', type: 'kpi-card', title: 'Deep Widget', config: {} },
    ];

    const { container } = render(
      <LayoutRenderer layout={layout} rootNodeId="root" widgets={widgets} registry={registry} />,
    );

    expect(container.textContent).toContain('Deep Widget');
    expect(container.textContent).not.toContain('depth limit');
  });
});

// ─── #26: Widget crash brings down entire dashboard ──────────

describe('LayoutRenderer — #26 error boundary isolates widget crashes', () => {
  it('renders error fallback when a widget throws, other widgets survive', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const layout: LayoutMap = {
      root: { id: 'root', type: 'root', children: ['grid-1'], meta: {} },
      'grid-1': { id: 'grid-1', type: 'grid', children: ['w-ok', 'w-crash'], parentId: 'root', meta: {} },
      'w-ok': { id: 'w-ok', type: 'widget', children: [], parentId: 'grid-1', meta: { widgetRef: 'ok-1' } },
      'w-crash': { id: 'w-crash', type: 'widget', children: [], parentId: 'grid-1', meta: { widgetRef: 'crash-1' } },
    };
    const widgets: WidgetDefinition[] = [
      { id: 'ok-1', type: 'kpi-card', title: 'Healthy KPI', config: {} },
      { id: 'crash-1', type: 'crashing', title: 'Broken Widget', config: {} },
    ];

    // Before fix: this would throw and the entire render would fail.
    const { container } = render(
      <LayoutRenderer layout={layout} rootNodeId="root" widgets={widgets} registry={registry} />,
    );

    // The healthy widget should still render
    expect(container.textContent).toContain('Healthy KPI');
    // The crashing widget should show error state, not crash the page
    expect(container.querySelector('.ss-widget-error')).toBeTruthy();
    expect(container.textContent).toContain('could not render');

    consoleSpy.mockRestore();
  });
});

// ─── #18: dataBinding fields not translated to widget config ─

describe('LayoutRenderer — #18 dataBinding → config translation', () => {
  it('translates dataBinding field roles into config keys for widget props', () => {
    const layout: LayoutMap = {
      root: { id: 'root', type: 'root', children: ['grid-1'], meta: {} },
      'grid-1': { id: 'grid-1', type: 'grid', children: ['w-1'], parentId: 'root', meta: {} },
      'w-1': { id: 'w-1', type: 'widget', children: [], parentId: 'grid-1', meta: { widgetRef: 'chart-1' } },
    };
    const widgets: WidgetDefinition[] = [
      {
        id: 'chart-1',
        type: 'line-chart',
        title: 'Sales Trend',
        config: { smooth: true },
        dataBinding: {
          datasetRef: 'sales',
          fields: [
            { role: 'x-axis', fieldRef: 'month' },
            { role: 'y-axis', fieldRef: 'revenue', aggregation: 'sum' },
            { role: 'series', fieldRef: 'region' },
          ],
        },
      },
    ];

    const { container } = render(
      <LayoutRenderer layout={layout} rootNodeId="root" widgets={widgets} registry={registry} />,
    );

    // The MockWidget receives config as data-config attribute
    const widgetEl = container.querySelector('[data-testid="widget-line-chart"]');
    expect(widgetEl).toBeTruthy();

    const config = JSON.parse(widgetEl!.getAttribute('data-config')!);
    // Before fix: these would be undefined because renderWidget passed widgetDef.config as-is
    expect(config.xField).toBe('month');
    expect(config.yField).toBe('revenue');
    expect(config.seriesField).toBe('region');
    expect(config.datasetRef).toBe('sales');
    // Original config should be preserved
    expect(config.smooth).toBe(true);
  });

  it('does not overwrite existing config keys with dataBinding translations', () => {
    const layout: LayoutMap = {
      root: { id: 'root', type: 'root', children: ['grid-1'], meta: {} },
      'grid-1': { id: 'grid-1', type: 'grid', children: ['w-1'], parentId: 'root', meta: {} },
      'w-1': { id: 'w-1', type: 'widget', children: [], parentId: 'grid-1', meta: { widgetRef: 'chart-1' } },
    };
    const widgets: WidgetDefinition[] = [
      {
        id: 'chart-1',
        type: 'line-chart',
        title: 'Chart',
        // Config already has xField set explicitly
        config: { xField: 'date' },
        dataBinding: {
          datasetRef: 'sales',
          fields: [
            { role: 'x-axis', fieldRef: 'month' },
          ],
        },
      },
    ];

    const { container } = render(
      <LayoutRenderer layout={layout} rootNodeId="root" widgets={widgets} registry={registry} />,
    );

    const widgetEl = container.querySelector('[data-testid="widget-line-chart"]');
    const config = JSON.parse(widgetEl!.getAttribute('data-config')!);
    // Existing config key should be preserved, not overwritten
    expect(config.xField).toBe('date');
  });
});

// ─── #29: Cross-filter toggle fails for object values ────────

function InteractionConsumer({
  onReady,
}: {
  onReady: (ctx: ReturnType<typeof useInteractions>) => void;
}) {
  const ctx = useInteractions();
  onReady(ctx);
  return null;
}

function FilterStateReader({
  onRead,
}: {
  onRead: (values: Record<string, unknown>) => void;
}) {
  const { state } = useFilters();
  onRead(state.values);
  return null;
}

function renderWithProviders(
  interactions: InteractionDefinition[],
  callbacks: InteractionCallbacks,
  children: ReactNode,
  initialFilterValues?: Record<string, unknown>,
) {
  return render(
    createElement(FilterProvider, {
      initialValues: initialFilterValues,
      children: createElement(DrillProvider, {
        children: createElement(InteractionProvider, {
          interactions,
          callbacks,
          children,
        }),
      }),
    }),
  );
}

describe('InteractionEngine — #29 cross-filter toggle with object values', () => {
  it('toggles off when the same object value is clicked again', () => {
    const interactions: InteractionDefinition[] = [
      {
        id: 'int-1',
        trigger: { type: 'click', sourceWidgetId: 'chart-1' },
        action: { type: 'filter', fieldRef: 'location' },
      },
    ];

    let ctx: ReturnType<typeof useInteractions> | null = null;
    let filterValues: Record<string, unknown> = {};

    renderWithProviders(interactions, {}, createElement('div', null,
      createElement(InteractionConsumer, { onReady: (c) => { ctx = c; } }),
      createElement(FilterStateReader, { onRead: (v) => { filterValues = v; } }),
    ));

    // First click: set filter with an object value
    act(() => {
      ctx!.handleWidgetEvent({
        type: 'click',
        widgetId: 'chart-1',
        payload: { location: { city: 'NYC', state: 'NY' } },
      });
    });
    expect(filterValues['cross-filter:chart-1:location']).toEqual({ city: 'NYC', state: 'NY' });

    // Second click with same object value: should toggle OFF
    // Before fix: strict === comparison for objects always fails → filter never toggles off
    act(() => {
      ctx!.handleWidgetEvent({
        type: 'click',
        widgetId: 'chart-1',
        payload: { location: { city: 'NYC', state: 'NY' } },
      });
    });
    expect(filterValues['cross-filter:chart-1:location']).toBeUndefined();
  });

  it('toggles off when the same array value is clicked again', () => {
    const interactions: InteractionDefinition[] = [
      {
        id: 'int-1',
        trigger: { type: 'click', sourceWidgetId: 'chart-1' },
        action: { type: 'filter', fieldRef: 'tags' },
      },
    ];

    let ctx: ReturnType<typeof useInteractions> | null = null;
    let filterValues: Record<string, unknown> = {};

    renderWithProviders(interactions, {}, createElement('div', null,
      createElement(InteractionConsumer, { onReady: (c) => { ctx = c; } }),
      createElement(FilterStateReader, { onRead: (v) => { filterValues = v; } }),
    ));

    act(() => {
      ctx!.handleWidgetEvent({
        type: 'click',
        widgetId: 'chart-1',
        payload: { tags: ['a', 'b'] },
      });
    });
    expect(filterValues['cross-filter:chart-1:tags']).toEqual(['a', 'b']);

    act(() => {
      ctx!.handleWidgetEvent({
        type: 'click',
        widgetId: 'chart-1',
        payload: { tags: ['a', 'b'] },
      });
    });
    // Before fix: would still be ['a', 'b'] because ['a','b'] !== ['a','b']
    expect(filterValues['cross-filter:chart-1:tags']).toBeUndefined();
  });
});

// ─── #31: DrillManager breadcrumb shows [object Object] ──────

function DrillConsumer({
  onReady,
}: {
  onReady: (ctx: DrillContextValue) => void;
}) {
  const ctx = useDrill();
  onReady(ctx);
  return null;
}

describe('DrillManager — #31 breadcrumb label for object values', () => {
  it('formats object values as joined string instead of [object Object]', () => {
    let ctx: DrillContextValue | null = null;

    render(
      createElement(DrillProvider, null,
        createElement(DrillConsumer, { onReady: (c) => { ctx = c; } }),
      ),
    );

    act(() => {
      ctx!.drillDown('chart-1', 'location', { city: 'NYC', state: 'NY' });
    });

    const label = ctx!.drillState.breadcrumb[0].label;
    // Before fix: would be "[object Object]"
    expect(label).not.toContain('[object Object]');
    expect(label).toContain('NYC');
    expect(label).toContain('NY');
  });

  it('still handles simple string values correctly', () => {
    let ctx: DrillContextValue | null = null;

    render(
      createElement(DrillProvider, null,
        createElement(DrillConsumer, { onReady: (c) => { ctx = c; } }),
      ),
    );

    act(() => {
      ctx!.drillDown('chart-1', 'category', 'Electronics');
    });

    expect(ctx!.drillState.breadcrumb[0].label).toBe('Electronics');
  });

  it('handles numeric values', () => {
    let ctx: DrillContextValue | null = null;

    render(
      createElement(DrillProvider, null,
        createElement(DrillConsumer, { onReady: (c) => { ctx = c; } }),
      ),
    );

    act(() => {
      ctx!.drillDown('chart-1', 'year', 2026);
    });

    expect(ctx!.drillState.breadcrumb[0].label).toBe('2026');
  });
});
