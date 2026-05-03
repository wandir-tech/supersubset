import { describe, expect, it } from 'vitest';

import { dashboardSwitchingDemo, pageNavigationDemoDashboard } from './navigation-demo';

describe('navigation demo definitions', () => {
  it('uses pages for intra-dashboard navigation', () => {
    expect(pageNavigationDemoDashboard.id).toBe('demo-pages-workbook');
    expect(pageNavigationDemoDashboard.pages).toHaveLength(2);
    expect(pageNavigationDemoDashboard.interactions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: expect.objectContaining({
            type: 'navigate',
            target: { kind: 'page', pageId: 'page-detail' },
          }),
        }),
      ]),
    );
  });

  it('places shared filter bars on both pages of the workbook demo', () => {
    const [overviewPage, detailPage] = pageNavigationDemoDashboard.pages;
    const overviewFilterBar = pageNavigationDemoDashboard.pages[0]?.widgets.find(
      (widget) => widget.id === 'pages-filter-bar',
    );
    const detailFilterBar = pageNavigationDemoDashboard.pages[1]?.widgets.find(
      (widget) => widget.id === 'pages-detail-filter-bar',
    );

    expect(overviewPage?.layout['pages-filter-row']?.children).toEqual(['pages-filter-bar-host']);
    expect(overviewPage?.layout['pages-filter-bar-host']?.meta.widgetRef).toBe('pages-filter-bar');
    expect(overviewFilterBar).toMatchObject({
      type: 'filter-bar',
      title: 'Shared Workbook Filters',
      config: {},
    });

    expect(detailPage?.layout['page-detail-filter-row']?.children).toEqual([
      'page-detail-filter-bar-host',
    ]);
    expect(detailPage?.layout['page-detail-filter-bar-host']?.meta.widgetRef).toBe(
      'pages-detail-filter-bar',
    );
    expect(detailFilterBar).toMatchObject({
      type: 'filter-bar',
      title: 'Shared Workbook Filters',
      config: {},
    });
  });

  it('uses a page-scoped category filter in the workbook demo', () => {
    const categoryFilter = pageNavigationDemoDashboard.filters?.find(
      (filter) => filter.id === 'filter-category',
    );

    expect(categoryFilter).toMatchObject({
      scope: { type: 'page', pageId: 'page-overview' },
    });
  });

  it('uses unique dashboard ids for the host-switching demo', () => {
    const ids = dashboardSwitchingDemo.dashboards.map((dashboard) => dashboard.id);

    expect(new Set(ids).size).toBe(dashboardSwitchingDemo.dashboards.length);
    expect(dashboardSwitchingDemo.initialDashboardId).toBe('dashboard-executive');
    expect(dashboardSwitchingDemo.dashboards).toHaveLength(2);
  });
});
