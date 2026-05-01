/**
 * Control block definitions for Puck editor.
 * FilterBar and other interactive controls.
 */
import type { ComponentConfig } from '@puckeditor/core';
import type { FilterDefinition } from '@supersubset/schema';
import React from 'react';
import {
  createFilterSelectionField,
  type FilterSelectionOption,
} from '../../fields/filter-selection-field';

export interface ControlBlockFactoryOptions {
  filterDefinitions?: readonly FilterDefinition[];
}

function createFilterSelectionOptions(
  filterDefinitions: readonly FilterDefinition[],
): FilterSelectionOption[] {
  return filterDefinitions.map((filter) => {
    const label = filter.title?.trim() || filter.id;
    const helperParts = [filter.id];

    if (filter.fieldRef && filter.fieldRef !== label) {
      helperParts.push(filter.fieldRef);
    }

    return {
      id: filter.id,
      label,
      helperText: helperParts.join(' • '),
    };
  });
}

function normalizeFilterIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function describeSelectedFilters(
  filterOptions: FilterSelectionOption[],
  filterIds: unknown,
): string {
  const selectedIds = normalizeFilterIds(filterIds);

  if (selectedIds.length === 0) {
    return 'Showing all authored filters';
  }

  const selectedLabels = filterOptions
    .filter((option) => selectedIds.includes(option.id))
    .map((option) => option.label);

  if (selectedLabels.length === 0) {
    return `Showing ${selectedIds.length} selected filter${selectedIds.length === 1 ? '' : 's'}`;
  }

  if (selectedLabels.length <= 2) {
    return `Showing ${selectedLabels.join(', ')}`;
  }

  return `Showing ${selectedLabels.slice(0, 2).join(', ')} +${selectedLabels.length - 2} more`;
}

export function createFilterBarBlock(options: ControlBlockFactoryOptions = {}): ComponentConfig {
  const filterOptions = createFilterSelectionOptions(options.filterDefinitions ?? []);

  return {
    label: 'Filter Bar',
    fields: {
      title: { type: 'text' as const, label: 'Title' },
      scope: {
        type: 'select' as const,
        label: 'Scope',
        options: [
          { label: 'Global', value: 'global' },
          { label: 'Page', value: 'page' },
        ],
      },
      layout: {
        type: 'radio' as const,
        label: 'Layout',
        options: [
          { label: 'Horizontal', value: 'horizontal' },
          { label: 'Vertical', value: 'vertical' },
        ],
      },
      filterIds: createFilterSelectionField(filterOptions),
    },
    defaultProps: {
      title: 'Filters',
      scope: 'global',
      layout: 'horizontal',
    },
    render: ({ title, layout, filterIds }: Record<string, unknown>) => {
      return React.createElement(
        'div',
        {
          style: {
            border: '1px dashed #b0c4de',
            borderRadius: 8,
            padding: 12,
            minHeight: 48,
            display: 'flex',
            flexDirection: layout === 'vertical' ? ('column' as const) : ('row' as const),
            alignItems: 'center',
            gap: 8,
            background: '#f0f5ff',
            fontFamily: 'sans-serif',
          },
        },
        React.createElement('span', { style: { fontSize: 18 } }, '🔍'),
        React.createElement(
          'span',
          { style: { fontWeight: 600, fontSize: 13 } },
          (title as string) || 'Filter Bar',
        ),
        React.createElement(
          'span',
          { style: { fontSize: 11, color: '#666' } },
          describeSelectedFilters(filterOptions, filterIds),
        ),
      );
    },
  };
}

export const FilterBarBlock: ComponentConfig = createFilterBarBlock();

export const CONTROL_BLOCK_NAMES = ['FilterBarBlock'] as const;

export const CONTROL_PUCK_NAME_TO_TYPE: Record<string, string> = {
  FilterBarBlock: 'filter-bar',
};
