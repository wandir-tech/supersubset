import { createElement } from 'react';
import type { FilterDefinition } from '@supersubset/schema';
import { FilterBar } from '../components/FilterBar';
import type { WidgetProps } from './registry';

function resolveWidgetFilters(
  dashboardFilters: FilterDefinition[] | undefined,
  config: Record<string, unknown>,
): FilterDefinition[] {
  if (!dashboardFilters || dashboardFilters.length === 0) {
    return [];
  }

  const rawFilterIds = config.filterIds;
  const filterIds = Array.isArray(rawFilterIds)
    ? rawFilterIds.filter((value): value is string => typeof value === 'string')
    : undefined;

  if (filterIds === undefined) {
    return dashboardFilters;
  }

  if (filterIds.length === 0) {
    return [];
  }

  const selectedIds = new Set(filterIds);
  return dashboardFilters.filter((filter) => selectedIds.has(filter.id));
}

export function FilterBarWidget({
  title,
  config,
  dashboardFilters,
  datasets,
  filterOptions,
}: WidgetProps) {
  const filters = resolveWidgetFilters(dashboardFilters, config);
  if (filters.length === 0) {
    return null;
  }

  const layout = config.layout === 'vertical' ? 'vertical' : 'horizontal';
  const resolvedTitle = typeof title === 'string' ? title.trim() : '';

  return createElement(
    'div',
    {
      className: 'ss-filter-bar-widget',
      style: { display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' },
    },
    resolvedTitle
      ? createElement(
          'div',
          {
            className: 'ss-filter-bar-widget-title',
            style: { fontSize: '13px', fontWeight: 600, color: 'var(--ss-color-text, #1f1f1f)' },
          },
          resolvedTitle,
        )
      : null,
    createElement(FilterBar, {
      filters,
      datasets,
      filterOptions,
      className: 'ss-widget-filter-bar',
      layout,
    }),
  );
}
