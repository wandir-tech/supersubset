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
  config,
  dashboardFilters,
  datasets,
  filterOptions,
}: WidgetProps) {
  return createElement(FilterBar, {
    filters: resolveWidgetFilters(dashboardFilters, config),
    datasets,
    filterOptions,
    className: 'ss-widget-filter-bar',
  });
}
