import { describe, expect, it } from 'vitest';

import {
  dashboardSwitchingDemo,
  pageNavigationDemoDashboard,
} from './navigation-demo';

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

  it('uses unique dashboard ids for the host-switching demo', () => {
    const ids = dashboardSwitchingDemo.dashboards.map((dashboard) => dashboard.id);

    expect(new Set(ids).size).toBe(dashboardSwitchingDemo.dashboards.length);
    expect(dashboardSwitchingDemo.initialDashboardId).toBe('dashboard-executive');
    expect(dashboardSwitchingDemo.dashboards).toHaveLength(2);
  });
});