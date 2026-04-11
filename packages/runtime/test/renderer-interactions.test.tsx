import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import type { DashboardDefinition } from '@supersubset/schema';
import { SupersubsetRenderer } from '../src/components/SupersubsetRenderer';
import { createWidgetRegistry, type WidgetProps } from '../src/widgets/registry';

function ClickableWidget({ widgetId, onEvent }: WidgetProps) {
  return createElement(
    'button',
    {
      type: 'button',
      onClick: () => onEvent?.({
        type: 'click',
        widgetId,
        payload: { region: 'East' },
      }),
    },
    'Trigger interaction',
  );
}

const dashboard: DashboardDefinition = {
  schemaVersion: '0.2.0',
  id: 'interaction-dashboard',
  title: 'Interaction Dashboard',
  interactions: [
    {
      id: 'navigate-on-click',
      trigger: { type: 'click', sourceWidgetId: 'widget-1' },
      action: { type: 'navigate', target: { kind: 'page', pageId: 'page-detail' } },
    },
  ],
  pages: [
    {
      id: 'page-overview',
      title: 'Overview',
      rootNodeId: 'root',
      layout: {
        root: { id: 'root', type: 'root', children: ['grid-main'], meta: {} },
        'grid-main': { id: 'grid-main', type: 'grid', children: ['widget-node'], parentId: 'root', meta: { columns: 12 } },
        'widget-node': {
          id: 'widget-node',
          type: 'widget',
          children: [],
          parentId: 'grid-main',
          meta: { widgetRef: 'widget-1', width: 12 },
        },
      },
      widgets: [
        {
          id: 'widget-1',
          type: 'clickable-widget',
          title: 'Clickable Widget',
          config: {},
        },
      ],
    },
    {
      id: 'page-detail',
      title: 'Detail',
      rootNodeId: 'detail-root',
      layout: {
        'detail-root': { id: 'detail-root', type: 'root', children: ['detail-grid'], meta: {} },
        'detail-grid': { id: 'detail-grid', type: 'grid', children: [], parentId: 'detail-root', meta: { columns: 12 } },
      },
      widgets: [],
    },
  ],
};

describe('SupersubsetRenderer interactions', () => {
  it('routes widget click events through the interaction engine', () => {
    const onNavigate = vi.fn();
    const onWidgetEvent = vi.fn();
    const registry = createWidgetRegistry([
      ['clickable-widget', ClickableWidget],
    ]);

    render(
      createElement(SupersubsetRenderer, {
        definition: dashboard,
        registry,
        onNavigate,
        onWidgetEvent,
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Trigger interaction' }));

    expect(onNavigate).toHaveBeenCalledWith({
      target: { kind: 'page', pageId: 'page-detail' },
      filterState: { region: 'East' },
    });
    expect(onWidgetEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'click',
        widgetId: 'widget-1',
        payload: { region: 'East' },
      }),
    );
  });
});