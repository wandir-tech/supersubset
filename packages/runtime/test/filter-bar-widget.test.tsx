import { createElement } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { DashboardDefinition } from '@supersubset/schema';
import { SupersubsetRenderer } from '../src/components/SupersubsetRenderer';
import { createWidgetRegistry, type WidgetProps } from '../src/widgets/registry';

function SummaryWidget({ title }: WidgetProps) {
  return createElement('div', null, title ?? 'Summary');
}

function ActiveFiltersProbe({ activeFilters }: WidgetProps) {
  return createElement(
    'div',
    { 'data-testid': 'active-filters-probe' },
    JSON.stringify(activeFilters ?? []),
  );
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

const titledVerticalLayoutDashboard: DashboardDefinition = {
  ...subsetDashboard,
  id: 'titled-vertical-layout-dashboard',
  pages: [
    {
      ...subsetDashboard.pages[0],
      widgets: [
        {
          id: 'filters-region',
          type: 'filter-bar',
          title: 'Focused Filters',
          config: { filterIds: ['region'], layout: 'vertical' },
        },
        subsetDashboard.pages[0].widgets[1],
      ],
    },
  ],
};

const pageScopedDashboard: DashboardDefinition = {
  schemaVersion: '0.2.0',
  id: 'page-scoped-dashboard',
  title: 'Page Scoped Dashboard',
  filters: [
    {
      id: 'category',
      title: 'Category',
      type: 'select',
      fieldRef: 'orders.category',
      datasetRef: 'orders',
      operator: 'equals',
      scope: { type: 'page', pageId: 'overview' },
    },
  ],
  pages: [
    {
      id: 'overview',
      title: 'Overview',
      rootNodeId: 'overview-root',
      layout: {
        'overview-root': {
          id: 'overview-root',
          type: 'root',
          children: ['overview-grid'],
          meta: {},
        },
        'overview-grid': {
          id: 'overview-grid',
          type: 'grid',
          children: ['overview-widget-node'],
          parentId: 'overview-root',
          meta: {},
        },
        'overview-widget-node': {
          id: 'overview-widget-node',
          type: 'widget',
          children: [],
          parentId: 'overview-grid',
          meta: { widgetRef: 'overview-probe', width: 12 },
        },
      },
      widgets: [
        {
          id: 'overview-probe',
          type: 'active-filters-probe',
          title: 'Overview Probe',
          config: {},
        },
      ],
    },
    {
      id: 'detail',
      title: 'Detail',
      rootNodeId: 'detail-root',
      layout: {
        'detail-root': { id: 'detail-root', type: 'root', children: ['detail-grid'], meta: {} },
        'detail-grid': {
          id: 'detail-grid',
          type: 'grid',
          children: ['detail-widget-node'],
          parentId: 'detail-root',
          meta: {},
        },
        'detail-widget-node': {
          id: 'detail-widget-node',
          type: 'widget',
          children: [],
          parentId: 'detail-grid',
          meta: { widgetRef: 'detail-probe', width: 12 },
        },
      },
      widgets: [
        {
          id: 'detail-probe',
          type: 'active-filters-probe',
          title: 'Detail Probe',
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

  it('renders filter-bar widget titles and vertical layout when configured', () => {
    const { container } = render(
      createElement(SupersubsetRenderer, {
        definition: titledVerticalLayoutDashboard,
        registry: createWidgetRegistry(),
        filterOptions: baseFilterOptions,
      }),
    );

    const regionWidget = container.querySelector(
      '[data-ss-node="filters-region-node"]',
    ) as HTMLElement;
    expect(regionWidget).toBeTruthy();
    expect(within(regionWidget).getByText('Focused Filters')).toBeTruthy();

    const regionBar = regionWidget.querySelector('.ss-filter-bar') as HTMLElement;
    expect(regionBar).toBeTruthy();
    expect(regionBar.dataset.ssFilterBarLayout).toBe('vertical');
    expect(regionBar.style.flexDirection).toBe('column');
    expect(within(regionBar).getByLabelText('Region')).toBeTruthy();
    expect(within(regionBar).queryByLabelText('Status')).toBeNull();
  });

  it('applies page-scoped filters only on the matching active page', () => {
    const registry = createWidgetRegistry([['active-filters-probe', ActiveFiltersProbe]]);

    const overviewRender = render(
      createElement(SupersubsetRenderer, {
        definition: pageScopedDashboard,
        activePage: 'overview',
        initialFilterValues: { category: 'Electronics' },
        registry,
      }),
    );

    expect(overviewRender.getByTestId('active-filters-probe').textContent).toContain('category');

    overviewRender.unmount();

    const detailRender = render(
      createElement(SupersubsetRenderer, {
        definition: pageScopedDashboard,
        activePage: 'detail',
        initialFilterValues: { category: 'Electronics' },
        registry,
      }),
    );

    expect(detailRender.getByTestId('active-filters-probe').textContent).toBe('[]');
  });
});
