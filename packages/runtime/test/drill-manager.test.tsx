import { describe, it, expect, vi } from 'vitest';
import { render, act, fireEvent } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import {
  DrillProvider,
  useDrill,
  type DrillContextValue,
} from '../src/interactions/DrillManager';
import { DrillBreadcrumbBar } from '../src/components/DrillBreadcrumbBar';
import { FilterProvider, useFilters } from '../src/filters/FilterEngine';
import {
  InteractionProvider,
  useInteractions,
} from '../src/interactions/InteractionEngine';
import type { InteractionDefinition } from '@supersubset/schema';
import type { WidgetEvent } from '../src/widgets/registry';

// ─── Test Helpers ────────────────────────────────────────────

function DrillConsumer({
  onReady,
}: {
  onReady: (ctx: DrillContextValue) => void;
}) {
  const ctx = useDrill();
  onReady(ctx);
  return null;
}

function renderWithDrillProvider(children: ReactNode) {
  return render(createElement(DrillProvider, null, children));
}

function renderWithAllProviders(
  interactions: InteractionDefinition[],
  callbacks: Record<string, unknown>,
  children: ReactNode,
) {
  return render(
    createElement(FilterProvider, {
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

// ─── DrillManager Unit Tests ─────────────────────────────────

describe('DrillManager', () => {
  it('starts in inactive state', () => {
    let ctx: DrillContextValue | null = null;
    renderWithDrillProvider(
      createElement(DrillConsumer, { onReady: (c) => { ctx = c; } }),
    );
    expect(ctx).not.toBeNull();
    expect(ctx!.drillState.active).toBe(false);
    expect(ctx!.drillState.breadcrumb).toEqual([]);
  });

  it('drillDown activates drill and adds breadcrumb', () => {
    let ctx: DrillContextValue | null = null;
    renderWithDrillProvider(
      createElement(DrillConsumer, { onReady: (c) => { ctx = c; } }),
    );

    act(() => {
      ctx!.drillDown('chart-1', 'category', 'Electronics');
    });

    expect(ctx!.drillState.active).toBe(true);
    expect(ctx!.drillState.sourceWidgetId).toBe('chart-1');
    expect(ctx!.drillState.fieldRef).toBe('category');
    expect(ctx!.drillState.fieldValue).toBe('Electronics');
    expect(ctx!.drillState.breadcrumb).toHaveLength(1);
    expect(ctx!.drillState.breadcrumb[0]).toEqual({
      label: 'Electronics',
      fieldRef: 'category',
      value: 'Electronics',
    });
  });

  it('multiple drillDown calls build breadcrumb trail', () => {
    let ctx: DrillContextValue | null = null;
    renderWithDrillProvider(
      createElement(DrillConsumer, { onReady: (c) => { ctx = c; } }),
    );

    act(() => {
      ctx!.drillDown('chart-1', 'category', 'Electronics');
    });
    act(() => {
      ctx!.drillDown('chart-1', 'subcategory', 'Phones');
    });

    expect(ctx!.drillState.breadcrumb).toHaveLength(2);
    expect(ctx!.drillState.fieldRef).toBe('subcategory');
    expect(ctx!.drillState.fieldValue).toBe('Phones');
    expect(ctx!.drillState.breadcrumb[0].label).toBe('Electronics');
    expect(ctx!.drillState.breadcrumb[1].label).toBe('Phones');
  });

  it('drillUp removes last breadcrumb', () => {
    let ctx: DrillContextValue | null = null;
    renderWithDrillProvider(
      createElement(DrillConsumer, { onReady: (c) => { ctx = c; } }),
    );

    act(() => {
      ctx!.drillDown('chart-1', 'category', 'Electronics');
    });
    act(() => {
      ctx!.drillDown('chart-1', 'subcategory', 'Phones');
    });
    act(() => {
      ctx!.drillUp();
    });

    expect(ctx!.drillState.active).toBe(true);
    expect(ctx!.drillState.breadcrumb).toHaveLength(1);
    expect(ctx!.drillState.fieldRef).toBe('category');
    expect(ctx!.drillState.fieldValue).toBe('Electronics');
  });

  it('drillUp from single breadcrumb returns to inactive', () => {
    let ctx: DrillContextValue | null = null;
    renderWithDrillProvider(
      createElement(DrillConsumer, { onReady: (c) => { ctx = c; } }),
    );

    act(() => {
      ctx!.drillDown('chart-1', 'category', 'Electronics');
    });
    act(() => {
      ctx!.drillUp();
    });

    expect(ctx!.drillState.active).toBe(false);
    expect(ctx!.drillState.breadcrumb).toHaveLength(0);
  });

  it('resetDrill clears all state', () => {
    let ctx: DrillContextValue | null = null;
    renderWithDrillProvider(
      createElement(DrillConsumer, { onReady: (c) => { ctx = c; } }),
    );

    act(() => {
      ctx!.drillDown('chart-1', 'category', 'Electronics');
    });
    act(() => {
      ctx!.drillDown('chart-1', 'subcategory', 'Phones');
    });
    act(() => {
      ctx!.resetDrill();
    });

    expect(ctx!.drillState.active).toBe(false);
    expect(ctx!.drillState.breadcrumb).toHaveLength(0);
    expect(ctx!.drillState.sourceWidgetId).toBe('');
  });

  it('drillTo navigates to specific breadcrumb index', () => {
    let ctx: DrillContextValue | null = null;
    renderWithDrillProvider(
      createElement(DrillConsumer, { onReady: (c) => { ctx = c; } }),
    );

    act(() => {
      ctx!.drillDown('chart-1', 'category', 'Electronics');
    });
    act(() => {
      ctx!.drillDown('chart-1', 'subcategory', 'Phones');
    });
    act(() => {
      ctx!.drillDown('chart-1', 'model', 'iPhone');
    });
    act(() => {
      ctx!.drillTo(0);
    });

    expect(ctx!.drillState.active).toBe(true);
    expect(ctx!.drillState.breadcrumb).toHaveLength(1);
    expect(ctx!.drillState.fieldRef).toBe('category');
    expect(ctx!.drillState.fieldValue).toBe('Electronics');
  });

  it('drillTo with negative index resets drill', () => {
    let ctx: DrillContextValue | null = null;
    renderWithDrillProvider(
      createElement(DrillConsumer, { onReady: (c) => { ctx = c; } }),
    );

    act(() => {
      ctx!.drillDown('chart-1', 'category', 'Electronics');
    });
    act(() => {
      ctx!.drillTo(-1);
    });

    expect(ctx!.drillState.active).toBe(false);
    expect(ctx!.drillState.breadcrumb).toHaveLength(0);
  });
});

// ─── DrillBreadcrumbBar Tests ────────────────────────────────

describe('DrillBreadcrumbBar', () => {
  it('renders nothing when drill is inactive', () => {
    const { container } = renderWithDrillProvider(
      createElement(DrillBreadcrumbBar),
    );
    expect(container.querySelector('.ss-drill-breadcrumb')).toBeNull();
  });

  it('renders breadcrumb bar when drill is active', () => {
    let ctx: DrillContextValue | null = null;
    const { container } = renderWithDrillProvider(
      createElement('div', null,
        createElement(DrillConsumer, { onReady: (c) => { ctx = c; } }),
        createElement(DrillBreadcrumbBar),
      ),
    );

    act(() => {
      ctx!.drillDown('chart-1', 'category', 'Electronics');
    });

    expect(container.querySelector('.ss-drill-breadcrumb')).not.toBeNull();
    expect(container.querySelector('.ss-drill-breadcrumb__current')?.textContent).toBe('Electronics');
  });

  it('clicking reset clears drill state', () => {
    let ctx: DrillContextValue | null = null;
    const { container } = renderWithDrillProvider(
      createElement('div', null,
        createElement(DrillConsumer, { onReady: (c) => { ctx = c; } }),
        createElement(DrillBreadcrumbBar),
      ),
    );

    act(() => {
      ctx!.drillDown('chart-1', 'category', 'Electronics');
    });

    const resetBtn = container.querySelector('.ss-drill-breadcrumb__reset') as HTMLButtonElement;
    expect(resetBtn).not.toBeNull();

    act(() => {
      fireEvent.click(resetBtn);
    });

    expect(ctx!.drillState.active).toBe(false);
  });

  it('clicking a breadcrumb link drills to that level', () => {
    let ctx: DrillContextValue | null = null;
    const { container } = renderWithDrillProvider(
      createElement('div', null,
        createElement(DrillConsumer, { onReady: (c) => { ctx = c; } }),
        createElement(DrillBreadcrumbBar),
      ),
    );

    act(() => {
      ctx!.drillDown('chart-1', 'category', 'Electronics');
    });
    act(() => {
      ctx!.drillDown('chart-1', 'subcategory', 'Phones');
    });
    act(() => {
      ctx!.drillDown('chart-1', 'model', 'iPhone');
    });

    // Click the first breadcrumb link (Electronics)
    const links = container.querySelectorAll('.ss-drill-breadcrumb__link');
    // links[0] = "All", links[1] = "Electronics", links[2] = "Phones"
    expect(links.length).toBe(3); // All + Electronics + Phones (iPhone is current, not a link)

    act(() => {
      fireEvent.click(links[1]); // Click "Electronics"
    });

    expect(ctx!.drillState.breadcrumb).toHaveLength(1);
    expect(ctx!.drillState.fieldRef).toBe('category');
  });
});

// ─── InteractionEngine Drill Integration ─────────────────────

describe('InteractionEngine — drill integration', () => {
  it('drill action fires drillDown via DrillManager', () => {
    const interactions: InteractionDefinition[] = [
      {
        id: 'drill-1',
        trigger: { type: 'click', sourceWidgetId: 'chart-1' },
        action: { type: 'drill', fieldRef: 'category' },
      },
    ];

    const onDrill = vi.fn();
    let interactionCtx: ReturnType<typeof useInteractions> | null = null;
    let drillCtx: DrillContextValue | null = null;

    renderWithAllProviders(interactions, { onDrill }, createElement('div', null,
      createElement(DrillConsumer, { onReady: (c) => { drillCtx = c; } }),
      createElement(function InteractionConsumer() {
        interactionCtx = useInteractions();
        return null;
      }),
    ));

    act(() => {
      interactionCtx!.handleWidgetEvent({
        type: 'click',
        widgetId: 'chart-1',
        payload: { category: 'Electronics' },
      });
    });

    expect(onDrill).toHaveBeenCalledWith('category', undefined);
    expect(drillCtx!.drillState.active).toBe(true);
    expect(drillCtx!.drillState.fieldValue).toBe('Electronics');
    expect(drillCtx!.drillState.breadcrumb).toHaveLength(1);
  });

  it('drill action uses payload.value as fallback', () => {
    const interactions: InteractionDefinition[] = [
      {
        id: 'drill-1',
        trigger: { type: 'click', sourceWidgetId: 'chart-1' },
        action: { type: 'drill', fieldRef: 'status' },
      },
    ];

    let drillCtx: DrillContextValue | null = null;
    let interactionCtx: ReturnType<typeof useInteractions> | null = null;

    renderWithAllProviders(interactions, {}, createElement('div', null,
      createElement(DrillConsumer, { onReady: (c) => { drillCtx = c; } }),
      createElement(function InteractionConsumer() {
        interactionCtx = useInteractions();
        return null;
      }),
    ));

    act(() => {
      interactionCtx!.handleWidgetEvent({
        type: 'click',
        widgetId: 'chart-1',
        payload: { value: 'shipped' },
      });
    });

    expect(drillCtx!.drillState.fieldValue).toBe('shipped');
  });
});
