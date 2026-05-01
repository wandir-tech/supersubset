import { createElement } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { DashboardDefinition } from '@supersubset/schema';
import { SupersubsetRenderer } from '../src/components/SupersubsetRenderer';
import { createWidgetRegistry, type WidgetProps } from '../src/widgets/registry';

function SummaryWidget({ title }: WidgetProps) {
  return createElement('div', null, title ?? 'Summary');
}

const baseFilters: NonNullable<DashboardDefinition['filters']> = [
  {
    id: 'region',
    title: 'Region',
    type: 'select',
    fieldRef: 'orders.region',
    datasetRef: 'orders',
    operator: 'equals',
    scope: { type: 'global' },
  },
  {
    id: 'status',
    title: 'Status',
    type: 'select',
    fieldRef: 'orders.status',
    datasetRef: 'orders',
    operator: 'equals',
    scope: { type: 'widgets', widgetIds: ['summary-1'] },
  },
];

const baseDataModel: DashboardDefinition['dataModel'] = {
  type: 'inline',
  datasets: [
    {
      id: 'orders',
      label: 'Orders',
      fields: [
        { id: 'region', label: 'Region', dataType: 'string' },
        { id: 'status', label: 'Status', dataType: 'string' },
      ],
    },
  ],
};

const baseFilterOptions = {
  region: ['East', 'West'],
  status: ['Open', 'Closed'],
};

const noFallbackDashboard: DashboardDefinition = {
  schemaVersion: '0.2.0',
  id: 'no-fallback-dashboard',
  title: 'No Fallback Dashboard',
  filters: baseFilters,
  dataModel: baseDataModel,
  pages: [
    {
      id: 'overview',
      title: 'Overview',
      rootNodeId: 'root',
      layout: {
        root: { id: 'root', type: 'root', children: ['grid'], meta: {} },
        grid: { id: 'grid', type: 'grid', children: ['summary-node'], parentId: 'root', meta: {} },
        'summary-node': {
          id: 'summary-node',
          type: 'widget',
          children: [],
          parentId: 'grid',
          meta: { widgetRef: 'summary-1', width: 12 },
        },
      },
      widgets: [
        {
          id: 'summary-1',
          type: 'summary-widget',
          title: 'Summary',
          config: {},
        },
      ],
    },
  ],
};

const subsetDashboard: DashboardDefinition = {
  schemaVersion: '0.2.0',
  id: 'subset-dashboard',
  title: 'Subset Dashboard',
  filters: baseFilters,
  dataModel: baseDataModel,
  pages: [
    {
      id: 'overview',
      title: 'Overview',
      rootNodeId: 'root',
      layout: {
        root: { id: 'root', type: 'root', children: ['grid'], meta: {} },
        grid: {
          id: 'grid',
          type: 'grid',
          children: ['filters-region-node', 'filters-all-node'],
          parentId: 'root',
          meta: {},
        },
        'filters-region-node': {
          id: 'filters-region-node',
          type: 'widget',
          children: [],
          parentId: 'grid',
          meta: { widgetRef: 'filters-region', width: 12 },
        },
        'filters-all-node': {
          id: 'filters-all-node',
          type: 'widget',
          children: [],
          parentId: 'grid',
          meta: { widgetRef: 'filters-all', width: 12 },
        },
      },
      widgets: [
        {
          id: 'filters-region',
          type: 'filter-bar',
          title: 'Region Filters',
          config: { filterIds: ['region', 'missing-filter-id'] },
        },
        {
          id: 'filters-all',
          type: 'filter-bar',
          title: 'All Filters',
          config: {},
        },
      ],
    },
  ],
};

describe('filter-bar runtime widget', () => {
  it('does not render a shell-level filter bar when filters exist but no filter-bar widget is placed', () => {
    const registry = createWidgetRegistry([['summary-widget', SummaryWidget]]);
    const { container } = render(
      createElement(SupersubsetRenderer, {
        definition: noFallbackDashboard,
        registry,
        filterOptions: baseFilterOptions,
      }),
    );

    expect(screen.getByText('Summary')).toBeTruthy();
    expect(container.querySelector('.ss-filter-bar')).toBeNull();
  });

  it('renders placed filter-bar widgets with per-widget subsets that share one filter store', () => {
    const { container } = render(
      createElement(SupersubsetRenderer, {
        definition: subsetDashboard,
        registry: createWidgetRegistry(),
        filterOptions: baseFilterOptions,
      }),
    );

    const bars = Array.from(container.querySelectorAll('.ss-filter-bar')) as HTMLElement[];

    expect(bars).toHaveLength(2);
    expect(container.querySelector('.ss-widget-unregistered')).toBeNull();
    expect(within(bars[0]).getByLabelText('Region')).toBeTruthy();
    expect(within(bars[0]).queryByLabelText('Status')).toBeNull();
    expect(within(bars[1]).getByLabelText('Region')).toBeTruthy();
    expect(within(bars[1]).getByLabelText('Status')).toBeTruthy();

    const regionSelectA = within(bars[0]).getByLabelText('Region') as HTMLSelectElement;
    const regionSelectB = within(bars[1]).getByLabelText('Region') as HTMLSelectElement;

    fireEvent.change(regionSelectA, { target: { value: 'West' } });

    expect(regionSelectA.value).toBe('West');
    expect(regionSelectB.value).toBe('West');
  });
});
