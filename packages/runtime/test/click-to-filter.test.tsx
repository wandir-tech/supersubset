import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { createElement } from 'react';
import { FilterProvider, useFilters } from '../src/filters/FilterEngine';
import { DrillProvider } from '../src/interactions/DrillManager';
import {
  InteractionProvider,
  type InteractionCallbacks,
} from '../src/interactions/InteractionEngine';
import { useInteractionHandler } from '../src/interactions/useInteractionHandler';
import type { InteractionDefinition } from '@supersubset/schema';

// ─── Test Helpers ────────────────────────────────────────────

function HandlerConsumer({
  widgetId,
  onReady,
}: {
  widgetId: string;
  onReady: (handler: (event: { type: 'click' | 'hover' | 'select'; widgetId: string; payload?: Record<string, unknown> }) => void) => void;
}) {
  const handler = useInteractionHandler(widgetId);
  onReady(handler);
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
  widgetId: string,
  onReady: (handler: (event: { type: 'click' | 'hover' | 'select'; widgetId: string; payload?: Record<string, unknown> }) => void) => void,
  onFilterRead: (values: Record<string, unknown>) => void,
  initialFilterValues?: Record<string, unknown>,
) {
  return render(
    createElement(FilterProvider, {
      initialValues: initialFilterValues,
      children: createElement(DrillProvider, {
        children: createElement(InteractionProvider, {
          interactions,
          callbacks,
          children: createElement('div', null,
            createElement(HandlerConsumer, { widgetId, onReady }),
            createElement(FilterStateReader, { onRead: onFilterRead }),
          ),
        }),
      }),
    }),
  );
}

// ─── Click-to-Filter Tests ──────────────────────────────────

describe('useInteractionHandler — click-to-filter', () => {
  it('click on chart data point sets cross-filter', () => {
    const interactions: InteractionDefinition[] = [
      {
        id: 'int-1',
        trigger: { type: 'click', sourceWidgetId: 'bar-chart-1' },
        action: { type: 'filter', fieldRef: 'status', targetWidgetIds: ['table-1'] },
      },
    ];

    let handler: ((event: { type: 'click' | 'hover' | 'select'; widgetId: string; payload?: Record<string, unknown> }) => void) | null = null;
    let filterValues: Record<string, unknown> = {};

    renderWithProviders(
      interactions,
      {},
      'bar-chart-1',
      (h) => { handler = h; },
      (v) => { filterValues = v; },
    );

    act(() => {
      handler!({
        type: 'click',
        widgetId: 'bar-chart-1',
        payload: { status: 'shipped' },
      });
    });

    expect(filterValues['cross-filter:bar-chart-1:status']).toBe('shipped');
  });

  it('click on chart with no interaction just bubbles event', () => {
    const onWidgetEvent = vi.fn();

    let handler: ((event: { type: 'click' | 'hover' | 'select'; widgetId: string; payload?: Record<string, unknown> }) => void) | null = null;
    let filterValues: Record<string, unknown> = {};

    renderWithProviders(
      [], // no interactions
      { onWidgetEvent },
      'standalone-chart',
      (h) => { handler = h; },
      (v) => { filterValues = v; },
    );

    act(() => {
      handler!({
        type: 'click',
        widgetId: 'standalone-chart',
        payload: { region: 'US' },
      });
    });

    // Event bubbled to host
    expect(onWidgetEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'click',
        widgetId: 'standalone-chart',
        payload: { region: 'US' },
      }),
    );

    // No cross-filters set
    expect(Object.keys(filterValues)).toHaveLength(0);
  });

  it('multiple interactions on same widget all fire', () => {
    const onNavigate = vi.fn();
    const interactions: InteractionDefinition[] = [
      {
        id: 'int-filter',
        trigger: { type: 'click', sourceWidgetId: 'multi-widget' },
        action: { type: 'filter', fieldRef: 'category' },
      },
      {
        id: 'int-nav',
        trigger: { type: 'click', sourceWidgetId: 'multi-widget' },
        action: { type: 'navigate', target: { kind: 'page', pageId: 'detail-page' } },
      },
    ];

    let handler: ((event: { type: 'click' | 'hover' | 'select'; widgetId: string; payload?: Record<string, unknown> }) => void) | null = null;
    let filterValues: Record<string, unknown> = {};

    renderWithProviders(
      interactions,
      { onNavigate },
      'multi-widget',
      (h) => { handler = h; },
      (v) => { filterValues = v; },
    );

    act(() => {
      handler!({
        type: 'click',
        widgetId: 'multi-widget',
        payload: { category: 'electronics' },
      });
    });

    // Both fired: filter was set AND navigate was called
    expect(filterValues['cross-filter:multi-widget:category']).toBe('electronics');
    expect(onNavigate).toHaveBeenCalledWith({
      target: { kind: 'page', pageId: 'detail-page' },
      filterState: { category: 'electronics' },
    });
  });

  it('active cross-filter clears when user clicks same value again (toggle)', () => {
    const interactions: InteractionDefinition[] = [
      {
        id: 'int-1',
        trigger: { type: 'click', sourceWidgetId: 'toggle-chart' },
        action: { type: 'filter', fieldRef: 'status' },
      },
    ];

    let handler: ((event: { type: 'click' | 'hover' | 'select'; widgetId: string; payload?: Record<string, unknown> }) => void) | null = null;
    let filterValues: Record<string, unknown> = {};

    renderWithProviders(
      interactions,
      {},
      'toggle-chart',
      (h) => { handler = h; },
      (v) => { filterValues = v; },
    );

    // First click — sets the filter
    act(() => {
      handler!({
        type: 'click',
        widgetId: 'toggle-chart',
        payload: { status: 'active' },
      });
    });

    expect(filterValues['cross-filter:toggle-chart:status']).toBe('active');

    // Second click with same value — clears the filter (toggle)
    act(() => {
      handler!({
        type: 'click',
        widgetId: 'toggle-chart',
        payload: { status: 'active' },
      });
    });

    expect(filterValues['cross-filter:toggle-chart:status']).toBeUndefined();
  });

  it('useInteractionHandler enriches event with correct widgetId', () => {
    const onWidgetEvent = vi.fn();

    let handler: ((event: { type: 'click' | 'hover' | 'select'; widgetId: string; payload?: Record<string, unknown> }) => void) | null = null;

    renderWithProviders(
      [],
      { onWidgetEvent },
      'my-widget',
      (h) => { handler = h; },
      () => {},
    );

    act(() => {
      // Even if the event has a different widgetId, the handler overrides it
      handler!({
        type: 'click',
        widgetId: 'wrong-id',
        payload: { data: 'test' },
      });
    });

    expect(onWidgetEvent).toHaveBeenCalledWith(
      expect.objectContaining({ widgetId: 'my-widget' }),
    );
  });

  it('click with value payload falls back to payload.value', () => {
    const interactions: InteractionDefinition[] = [
      {
        id: 'int-1',
        trigger: { type: 'click', sourceWidgetId: 'simple-chart' },
        action: { type: 'filter', fieldRef: 'category' },
      },
    ];

    let handler: ((event: { type: 'click' | 'hover' | 'select'; widgetId: string; payload?: Record<string, unknown> }) => void) | null = null;
    let filterValues: Record<string, unknown> = {};

    renderWithProviders(
      interactions,
      {},
      'simple-chart',
      (h) => { handler = h; },
      (v) => { filterValues = v; },
    );

    // Payload uses 'value' key instead of fieldRef key
    act(() => {
      handler!({
        type: 'click',
        widgetId: 'simple-chart',
        payload: { value: 'books' },
      });
    });

    expect(filterValues['cross-filter:simple-chart:category']).toBe('books');
  });
});
