import { describe, expect, it } from 'vitest';

import { demoDashboard } from './demo-dashboard';

describe('demo dashboard fixture', () => {
  it('places both all-filter and subset filter-bar widgets on the overview page', () => {
    const overviewPage = demoDashboard.pages.find((page) => page.id === 'page-overview');

    expect(overviewPage).toBeDefined();

    const allFiltersBar = overviewPage?.widgets.find((widget) => widget.id === 'filters-all');
    const regionFiltersBar = overviewPage?.widgets.find((widget) => widget.id === 'filters-region');
    const rowFilterBars = overviewPage?.layout['row-filter-bars'];

    expect(rowFilterBars?.children).toEqual(['w-filter-bar-all', 'w-filter-bar-region']);
    expect(overviewPage?.layout['w-filter-bar-all']?.meta.widgetRef).toBe('filters-all');
    expect(overviewPage?.layout['w-filter-bar-region']?.meta.widgetRef).toBe('filters-region');

    expect(allFiltersBar?.type).toBe('filter-bar');
    expect(
      (allFiltersBar?.config as { filterIds?: string[] } | undefined)?.filterIds,
    ).toBeUndefined();

    expect(regionFiltersBar).toMatchObject({
      type: 'filter-bar',
      config: { filterIds: ['filter-region'] },
    });
  });
});
