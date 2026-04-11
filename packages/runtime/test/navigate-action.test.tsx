import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { createElement } from 'react';
import { FilterProvider, useFilters } from '../src/filters/FilterEngine';
import { DrillProvider } from '../src/interactions/DrillManager';
import {
  InteractionProvider,
  useInteractions,
} from '../src/interactions/InteractionEngine';
import type { InteractionDefinition } from '@supersubset/schema';

// ─── Test Helpers ────────────────────────────────────────────

function InteractionConsumer({
  onReady,
}: {
  onReady: (ctx: ReturnType<typeof useInteractions>) => void;
}) {
  const ctx = useInteractions();
  onReady(ctx);
  return null;
}

function renderWithProviders(
  interactions: InteractionDefinition[],
  callbacks: Record<string, unknown>,
  children: React.ReactNode,
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

// ─── Navigate Action Tests ───────────────────────────────────

describe('Navigate action', () => {
  it('click triggers navigate callback with page target', () => {
    const onNavigate = vi.fn();
    const interactions: InteractionDefinition[] = [
      {
        id: 'nav-1',
        trigger: { type: 'click', sourceWidgetId: 'chart-1' },
        action: { type: 'navigate', target: { kind: 'page', pageId: 'page-2' } },
      },
    ];

    let ctx: ReturnType<typeof useInteractions> | null = null;
    renderWithProviders(interactions, { onNavigate },
      createElement(InteractionConsumer, { onReady: (c) => { ctx = c; } }),
    );

    act(() => {
      ctx!.handleWidgetEvent({
        type: 'click',
        widgetId: 'chart-1',
        payload: {},
      });
    });

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith({
      target: { kind: 'page', pageId: 'page-2' },
      filterState: {},
    });
  });

  it('navigate carries filter state from click payload', () => {
    const onNavigate = vi.fn();
    const interactions: InteractionDefinition[] = [
      {
        id: 'nav-1',
        trigger: { type: 'click', sourceWidgetId: 'chart-1' },
        action: { type: 'navigate', target: { kind: 'page', pageId: 'details' } },
      },
    ];

    let ctx: ReturnType<typeof useInteractions> | null = null;
    renderWithProviders(interactions, { onNavigate },
      createElement(InteractionConsumer, { onReady: (c) => { ctx = c; } }),
    );

    act(() => {
      ctx!.handleWidgetEvent({
        type: 'click',
        widgetId: 'chart-1',
        payload: { region: 'North', status: 'active' },
      });
    });

    expect(onNavigate).toHaveBeenCalledWith({
      target: { kind: 'page', pageId: 'details' },
      filterState: {
        region: 'North',
        status: 'active',
      },
    });
  });

  it('navigate with no matching interaction bubbles event to host', () => {
    const onNavigate = vi.fn();
    const onWidgetEvent = vi.fn();
    const interactions: InteractionDefinition[] = [
      {
        id: 'nav-1',
        trigger: { type: 'click', sourceWidgetId: 'chart-2' },
        action: { type: 'navigate', target: { kind: 'page', pageId: 'page-2' } },
      },
    ];

    let ctx: ReturnType<typeof useInteractions> | null = null;
    renderWithProviders(interactions, { onNavigate, onWidgetEvent },
      createElement(InteractionConsumer, { onReady: (c) => { ctx = c; } }),
    );

    // Event from chart-1, but interaction is for chart-2
    act(() => {
      ctx!.handleWidgetEvent({
        type: 'click',
        widgetId: 'chart-1',
        payload: {},
      });
    });

    expect(onNavigate).not.toHaveBeenCalled();
    expect(onWidgetEvent).toHaveBeenCalledTimes(1);
    expect(onWidgetEvent).toHaveBeenCalledWith(
      expect.objectContaining({ widgetId: 'chart-1' }),
    );
  });

  it('navigate with undefined payload passes undefined', () => {
    const onNavigate = vi.fn();
    const interactions: InteractionDefinition[] = [
      {
        id: 'nav-1',
        trigger: { type: 'click', sourceWidgetId: 'chart-1' },
        action: { type: 'navigate', target: { kind: 'page', pageId: 'page-3' } },
      },
    ];

    let ctx: ReturnType<typeof useInteractions> | null = null;
    renderWithProviders(interactions, { onNavigate },
      createElement(InteractionConsumer, { onReady: (c) => { ctx = c; } }),
    );

    act(() => {
      ctx!.handleWidgetEvent({
        type: 'click',
        widgetId: 'chart-1',
      });
    });

    expect(onNavigate).toHaveBeenCalledWith({
      target: { kind: 'page', pageId: 'page-3' },
      filterState: undefined,
    });
  });
});
