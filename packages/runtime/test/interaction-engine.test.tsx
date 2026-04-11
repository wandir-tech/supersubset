import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { FilterProvider, useFilters } from '../src/filters/FilterEngine';
import { DrillProvider } from '../src/interactions/DrillManager';
import {
  InteractionProvider,
  useInteractions,
  type InteractionCallbacks,
} from '../src/interactions/InteractionEngine';
import type { InteractionDefinition } from '@supersubset/schema';
import type { WidgetEvent } from '../src/widgets/registry';

// ─── Test Helpers ────────────────────────────────────────────

/** Component that captures interaction context for testing */
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

// ─── Cross-Filter Tests ─────────────────────────────────────

describe('InteractionEngine — cross-filter', () => {
  it('sets a filter when a widget click matches a filter interaction', () => {
    const interactions: InteractionDefinition[] = [
      {
        id: 'int-1',
        trigger: { type: 'click', sourceWidgetId: 'chart-1' },
        action: { type: 'filter', fieldRef: 'status', targetWidgetIds: ['chart-2'] },
      },
    ];

    let ctx: ReturnType<typeof useInteractions> | null = null;
    let filterValues: Record<string, unknown> = {};

    renderWithProviders(interactions, {}, createElement('div', null,
      createElement(InteractionConsumer, {
        onReady: (c) => { ctx = c; },
      }),
      createElement(FilterStateReader, {
        onRead: (v) => { filterValues = v; },
      }),
    ));

    expect(ctx).not.toBeNull();

    act(() => {
      ctx!.handleWidgetEvent({
        type: 'click',
        widgetId: 'chart-1',
        payload: { status: 'shipped' },
      });
    });

    // Re-render to read updated state
    expect(filterValues['cross-filter:chart-1:status']).toBe('shipped');
  });

  it('does not fire filter action when trigger type does not match', () => {
    const interactions: InteractionDefinition[] = [
      {
        id: 'int-1',
        trigger: { type: 'click', sourceWidgetId: 'chart-1' },
        action: { type: 'filter', fieldRef: 'status' },
      },
    ];

    let ctx: ReturnType<typeof useInteractions> | null = null;
    const onWidgetEvent = vi.fn();

    renderWithProviders(interactions, { onWidgetEvent }, createElement(
      InteractionConsumer,
      { onReady: (c) => { ctx = c; } },
    ));

    act(() => {
      ctx!.handleWidgetEvent({
        type: 'hover',
        widgetId: 'chart-1',
        payload: { status: 'shipped' },
      });
    });

    // hover doesn't match click trigger → bubbles as unhandled
    expect(onWidgetEvent).toHaveBeenCalled();
  });
});

// ─── Navigate Tests ──────────────────────────────────────────

describe('InteractionEngine — navigate', () => {
  it('calls onNavigate callback for navigate action', () => {
    const onNavigate = vi.fn();
    const interactions: InteractionDefinition[] = [
      {
        id: 'int-nav',
        trigger: { type: 'click', sourceWidgetId: 'nav-widget' },
        action: { type: 'navigate', target: { kind: 'page', pageId: 'page-2' } },
      },
    ];

    let ctx: ReturnType<typeof useInteractions> | null = null;

    renderWithProviders(interactions, { onNavigate }, createElement(
      InteractionConsumer,
      { onReady: (c) => { ctx = c; } },
    ));

    act(() => {
      ctx!.handleWidgetEvent({
        type: 'click',
        widgetId: 'nav-widget',
      });
    });

    expect(onNavigate).toHaveBeenCalledWith({
      target: { kind: 'page', pageId: 'page-2' },
      filterState: undefined,
    });
  });
});

// ─── External Action Tests ───────────────────────────────────

describe('InteractionEngine — external', () => {
  it('calls onExternalAction callback with merged payload', () => {
    const onExternalAction = vi.fn();
    const interactions: InteractionDefinition[] = [
      {
        id: 'int-ext',
        trigger: { type: 'click', sourceWidgetId: 'ext-widget' },
        action: {
          type: 'external',
          callbackKey: 'openDialog',
          payload: { dialog: 'detail' },
        },
      },
    ];

    let ctx: ReturnType<typeof useInteractions> | null = null;

    renderWithProviders(interactions, { onExternalAction }, createElement(
      InteractionConsumer,
      { onReady: (c) => { ctx = c; } },
    ));

    act(() => {
      ctx!.handleWidgetEvent({
        type: 'click',
        widgetId: 'ext-widget',
        payload: { recordId: '42' },
      });
    });

    expect(onExternalAction).toHaveBeenCalledWith('openDialog', {
      dialog: 'detail',
      recordId: '42',
    });
  });
});

// ─── Drill Tests ─────────────────────────────────────────────

describe('InteractionEngine — drill', () => {
  it('calls onDrill callback', () => {
    const onDrill = vi.fn();
    const interactions: InteractionDefinition[] = [
      {
        id: 'int-drill',
        trigger: { type: 'click', sourceWidgetId: 'drillable-chart' },
        action: { type: 'drill', fieldRef: 'region', targetWidgetId: 'detail-table' },
      },
    ];

    let ctx: ReturnType<typeof useInteractions> | null = null;

    renderWithProviders(interactions, { onDrill }, createElement(
      InteractionConsumer,
      { onReady: (c) => { ctx = c; } },
    ));

    act(() => {
      ctx!.handleWidgetEvent({
        type: 'click',
        widgetId: 'drillable-chart',
      });
    });

    expect(onDrill).toHaveBeenCalledWith('region', 'detail-table');
  });
});

// ─── Bubble to Host Tests ────────────────────────────────────

describe('InteractionEngine — event bubbling', () => {
  it('bubbles event to host onWidgetEvent when no interaction matches', () => {
    const onWidgetEvent = vi.fn();

    let ctx: ReturnType<typeof useInteractions> | null = null;

    renderWithProviders([], { onWidgetEvent }, createElement(
      InteractionConsumer,
      { onReady: (c) => { ctx = c; } },
    ));

    const event: WidgetEvent = {
      type: 'click',
      widgetId: 'some-widget',
      payload: { foo: 'bar' },
    };

    act(() => {
      ctx!.handleWidgetEvent(event);
    });

    expect(onWidgetEvent).toHaveBeenCalledWith(event);
  });

  it('bubbles event to host even when interactions are handled', () => {
    const onWidgetEvent = vi.fn();
    const interactions: InteractionDefinition[] = [
      {
        id: 'int-1',
        trigger: { type: 'click', sourceWidgetId: 'chart-1' },
        action: { type: 'filter', fieldRef: 'status' },
      },
    ];

    let ctx: ReturnType<typeof useInteractions> | null = null;

    renderWithProviders(interactions, { onWidgetEvent }, createElement(
      InteractionConsumer,
      { onReady: (c) => { ctx = c; } },
    ));

    act(() => {
      ctx!.handleWidgetEvent({
        type: 'click',
        widgetId: 'chart-1',
        payload: { status: 'active' },
      });
    });

    expect(onWidgetEvent).toHaveBeenCalled();
  });
});

// ─── getInteractionsForWidget ────────────────────────────────

describe('InteractionEngine — getInteractionsForWidget', () => {
  it('returns interactions for a specific widget', () => {
    const interactions: InteractionDefinition[] = [
      {
        id: 'int-1',
        trigger: { type: 'click', sourceWidgetId: 'chart-1' },
        action: { type: 'filter', fieldRef: 'status' },
      },
      {
        id: 'int-2',
        trigger: { type: 'click', sourceWidgetId: 'chart-2' },
        action: { type: 'navigate', target: { kind: 'page', pageId: 'page-2' } },
      },
    ];

    let ctx: ReturnType<typeof useInteractions> | null = null;

    renderWithProviders(interactions, {}, createElement(
      InteractionConsumer,
      { onReady: (c) => { ctx = c; } },
    ));

    const forChart1 = ctx!.getInteractionsForWidget('chart-1');
    expect(forChart1).toHaveLength(1);
    expect(forChart1[0].id).toBe('int-1');

    const forChart3 = ctx!.getInteractionsForWidget('chart-3');
    expect(forChart3).toHaveLength(0);
  });
});
