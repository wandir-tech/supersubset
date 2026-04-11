import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LayoutRenderer } from '../src/layout/LayoutRenderer';
import { createWidgetRegistry } from '../src/widgets/registry';
import type { WidgetProps } from '../src/widgets/registry';
import type { LayoutMap, WidgetDefinition } from '@supersubset/schema';

// Mock widget component
function MockWidget({ title, widgetType }: WidgetProps) {
  return <div data-testid={`widget-${widgetType}`}>{title ?? widgetType}</div>;
}

const registry = createWidgetRegistry([
  ['kpi-card', MockWidget],
  ['line-chart', MockWidget],
]);

describe('LayoutRenderer', () => {
  it('renders a simple grid with one widget', () => {
    const layout: LayoutMap = {
      root: { id: 'root', type: 'root', children: ['grid-1'], meta: {} },
      'grid-1': { id: 'grid-1', type: 'grid', children: ['w-1'], parentId: 'root', meta: { columns: 12 } },
      'w-1': {
        id: 'w-1',
        type: 'widget',
        children: [],
        parentId: 'grid-1',
        meta: { widgetRef: 'kpi-1', width: 4, height: 50 },
      },
    };
    const widgets: WidgetDefinition[] = [
      { id: 'kpi-1', type: 'kpi-card', title: 'Revenue', config: {} },
    ];

    const { container } = render(
      <LayoutRenderer
        layout={layout}
        rootNodeId="root"
        widgets={widgets}
        registry={registry}
      />,
    );

    expect(container.querySelector('.ss-layout-root')).toBeTruthy();
    expect(container.querySelector('.ss-grid')).toBeTruthy();
    expect(container.querySelector('.ss-widget')).toBeTruthy();
    expect(screen.getByTestId('widget-kpi-card')).toBeTruthy();
    expect(screen.getByText('Revenue')).toBeTruthy();
  });

  it('renders row with multiple widgets using width proportions', () => {
    const layout: LayoutMap = {
      root: { id: 'root', type: 'root', children: ['grid-1'], meta: {} },
      'grid-1': { id: 'grid-1', type: 'grid', children: ['row-1'], parentId: 'root', meta: {} },
      'row-1': { id: 'row-1', type: 'row', children: ['w-1', 'w-2'], parentId: 'grid-1', meta: {} },
      'w-1': { id: 'w-1', type: 'widget', children: [], parentId: 'row-1', meta: { widgetRef: 'chart-1', width: 8 } },
      'w-2': { id: 'w-2', type: 'widget', children: [], parentId: 'row-1', meta: { widgetRef: 'chart-2', width: 4 } },
    };
    const widgets: WidgetDefinition[] = [
      { id: 'chart-1', type: 'line-chart', title: 'Sales Trend', config: {} },
      { id: 'chart-2', type: 'kpi-card', title: 'Total', config: {} },
    ];

    render(
      <LayoutRenderer layout={layout} rootNodeId="root" widgets={widgets} registry={registry} />,
    );

    expect(screen.getByText('Sales Trend')).toBeTruthy();
    expect(screen.getByText('Total')).toBeTruthy();
  });

  it('shows message for missing widget ref', () => {
    const layout: LayoutMap = {
      root: { id: 'root', type: 'root', children: ['grid-1'], meta: {} },
      'grid-1': { id: 'grid-1', type: 'grid', children: ['w-1'], parentId: 'root', meta: {} },
      'w-1': { id: 'w-1', type: 'widget', children: [], parentId: 'grid-1', meta: { widgetRef: 'nonexistent' } },
    };

    const { container } = render(
      <LayoutRenderer layout={layout} rootNodeId="root" widgets={[]} registry={registry} />,
    );

    expect(container.querySelector('.ss-widget-missing')).toBeTruthy();
  });

  it('shows message for unregistered widget type', () => {
    const layout: LayoutMap = {
      root: { id: 'root', type: 'root', children: ['grid-1'], meta: {} },
      'grid-1': { id: 'grid-1', type: 'grid', children: ['w-1'], parentId: 'root', meta: {} },
      'w-1': { id: 'w-1', type: 'widget', children: [], parentId: 'grid-1', meta: { widgetRef: 'x-1' } },
    };
    const widgets: WidgetDefinition[] = [
      { id: 'x-1', type: 'unknown-chart-type', config: {} },
    ];

    const { container } = render(
      <LayoutRenderer layout={layout} rootNodeId="root" widgets={widgets} registry={registry} />,
    );

    expect(container.querySelector('.ss-widget-unregistered')).toBeTruthy();
  });

  it('renders header and divider components', () => {
    const layout: LayoutMap = {
      root: { id: 'root', type: 'root', children: ['grid-1'], meta: {} },
      'grid-1': { id: 'grid-1', type: 'grid', children: ['h-1', 'div-1'], parentId: 'root', meta: {} },
      'h-1': { id: 'h-1', type: 'header', children: [], parentId: 'grid-1', meta: { text: 'Dashboard Title', headerSize: 'large' } },
      'div-1': { id: 'div-1', type: 'divider', children: [], parentId: 'grid-1', meta: {} },
    };

    const { container } = render(
      <LayoutRenderer layout={layout} rootNodeId="root" widgets={[]} registry={registry} />,
    );

    expect(container.querySelector('h1')).toBeTruthy();
    expect(container.querySelector('h1')?.textContent).toBe('Dashboard Title');
    expect(container.querySelector('hr')).toBeTruthy();
  });

  it('renders missing root node message', () => {
    const { container } = render(
      <LayoutRenderer layout={{}} rootNodeId="nonexistent" widgets={[]} registry={registry} />,
    );

    expect(container.querySelector('.ss-layout-error')).toBeTruthy();
  });

  it('renders spacer with correct height', () => {
    const layout: LayoutMap = {
      root: { id: 'root', type: 'root', children: ['grid-1'], meta: {} },
      'grid-1': { id: 'grid-1', type: 'grid', children: ['sp-1'], parentId: 'root', meta: {} },
      'sp-1': { id: 'sp-1', type: 'spacer', children: [], parentId: 'grid-1', meta: { height: 48 } },
    };

    const { container } = render(
      <LayoutRenderer layout={layout} rootNodeId="root" widgets={[]} registry={registry} />,
    );

    const spacer = container.querySelector('.ss-spacer');
    expect(spacer).toBeTruthy();
  });
});
