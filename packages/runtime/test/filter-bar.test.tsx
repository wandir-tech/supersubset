import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { FilterBar } from '../src/components/FilterBar';
import { FilterProvider } from '../src/filters/FilterEngine';
import type { FilterDefinition } from '@supersubset/schema';

// Helper: render FilterBar within FilterProvider
function renderFilterBar(
  filters: FilterDefinition[],
  opts?: {
    initialValues?: Record<string, unknown>;
    onFilterChange?: (state: { values: Record<string, unknown> }) => void;
    filterOptions?: Record<string, string[]>;
  },
) {
  return render(
    <FilterProvider
      filters={filters}
      initialValues={opts?.initialValues}
      onFilterChange={opts?.onFilterChange}
    >
      <FilterBar filters={filters} filterOptions={opts?.filterOptions} />
    </FilterProvider>,
  );
}

const selectFilter: FilterDefinition = {
  id: 'f-status',
  title: 'Status',
  type: 'select',
  fieldRef: 'status',
  datasetRef: 'ds-1',
  operator: 'eq',
  optionSource: {
    kind: 'static',
    completeness: 'complete',
    options: [
      { value: 'open', label: 'Open' },
      { value: 'closed', label: 'Closed' },
    ],
  },
  scope: { type: 'global' },
};

const textFilter: FilterDefinition = {
  id: 'f-search',
  title: 'Search',
  type: 'text',
  fieldRef: 'name',
  datasetRef: 'ds-1',
  operator: 'contains',
  scope: { type: 'global' },
};

const rangeFilter: FilterDefinition = {
  id: 'f-amount',
  title: 'Amount',
  type: 'range',
  fieldRef: 'amount',
  datasetRef: 'ds-1',
  operator: 'between',
  scope: { type: 'widgets', widgetIds: ['w-1', 'w-2'] },
};

const dateFilter: FilterDefinition = {
  id: 'f-date',
  title: 'Date',
  type: 'date',
  fieldRef: 'created_at',
  datasetRef: 'ds-1',
  operator: 'gte',
  scope: { type: 'page', pageId: 'page-1' },
};

const multiSelectFilter: FilterDefinition = {
  id: 'f-category',
  title: 'Category',
  type: 'multi-select',
  fieldRef: 'category',
  datasetRef: 'ds-1',
  operator: 'in',
  optionSource: {
    kind: 'static',
    completeness: 'complete',
    options: [
      { value: 'footwear', label: 'Footwear' },
      { value: 'apparel', label: 'Apparel' },
      { value: 'hydration', label: 'Hydration' },
    ],
  },
  scope: { type: 'global' },
};

describe('FilterBar', () => {
  it('renders a control for each filter definition', () => {
    const { container } = renderFilterBar([selectFilter, textFilter, rangeFilter, dateFilter]);

    const controls = container.querySelectorAll('.ss-filter-control');
    expect(controls).toHaveLength(4);
    expect(container.querySelector('[data-ss-filter="f-status"]')).toBeTruthy();
    expect(container.querySelector('[data-ss-filter="f-search"]')).toBeTruthy();
    expect(container.querySelector('[data-ss-filter="f-amount"]')).toBeTruthy();
    expect(container.querySelector('[data-ss-filter="f-date"]')).toBeTruthy();
  });

  it('renders a select dropdown for select-type filter', () => {
    const { container } = renderFilterBar([selectFilter]);

    const select = container.querySelector('.ss-filter-select');
    expect(select).toBeTruthy();
    expect(select?.tagName).toBe('SELECT');
  });

  it('renders authored static options without the legacy filterOptions prop', () => {
    const { container } = renderFilterBar([selectFilter]);

    const select = container.querySelector('.ss-filter-select') as HTMLSelectElement;
    const optionLabels = Array.from(select.querySelectorAll('option')).map(
      (option) => option.textContent,
    );

    expect(optionLabels).toEqual(['All', 'Open', 'Closed']);
  });

  it('prefers authored static options over legacy filterOptions fallback data', () => {
    const { container } = renderFilterBar([selectFilter], {
      filterOptions: { 'f-status': ['Wrong', 'Fallback'] },
    });

    const select = container.querySelector('.ss-filter-select') as HTMLSelectElement;
    const optionLabels = Array.from(select.querySelectorAll('option')).map(
      (option) => option.textContent,
    );

    expect(optionLabels).toEqual(['All', 'Open', 'Closed']);
  });

  it('still supports legacy filterOptions when no authored option source exists', () => {
    const { container } = renderFilterBar([{ ...selectFilter, optionSource: undefined }], {
      filterOptions: { 'f-status': ['Pending', 'Resolved'] },
    });

    const select = container.querySelector('.ss-filter-select') as HTMLSelectElement;
    const optionLabels = Array.from(select.querySelectorAll('option')).map(
      (option) => option.textContent,
    );

    expect(optionLabels).toEqual(['All', 'Pending', 'Resolved']);
  });

  it('renders a multi-select control for multi-select filters', () => {
    const { container } = renderFilterBar([multiSelectFilter]);

    const select = container.querySelector('.ss-filter-multi-select') as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(select.multiple).toBe(true);

    const optionLabels = Array.from(select.querySelectorAll('option')).map(
      (option) => option.textContent,
    );
    expect(optionLabels).toEqual(['Footwear', 'Apparel', 'Hydration']);
  });

  it('renders a text input for text-type filter', () => {
    const { container } = renderFilterBar([textFilter]);

    const input = container.querySelector('.ss-filter-text');
    expect(input).toBeTruthy();
    expect(input?.getAttribute('type')).toBe('text');
  });

  it('renders min/max inputs for range-type filter', () => {
    const { container } = renderFilterBar([rangeFilter]);

    expect(container.querySelector('.ss-filter-range-min')).toBeTruthy();
    expect(container.querySelector('.ss-filter-range-max')).toBeTruthy();
  });

  it('renders a date preset selector for date-type filter', () => {
    const { container } = renderFilterBar([dateFilter]);

    const wrapper = container.querySelector('.ss-filter-date');
    expect(wrapper).toBeTruthy();
    const select = wrapper?.querySelector('.ss-filter-date-preset') as HTMLSelectElement | null;
    expect(select).toBeTruthy();
    // Should have preset options
    const options = select?.querySelectorAll('option');
    expect(options!.length).toBeGreaterThan(5);
    // First option is "All time"
    expect(options![0].textContent).toBe('All time');
  });

  it('calls setFilter via onFilterChange when text is typed', () => {
    const onFilterChange = vi.fn();
    const { container } = renderFilterBar([textFilter], { onFilterChange });

    const input = container.querySelector('.ss-filter-text') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'hello' } });

    expect(onFilterChange).toHaveBeenCalled();
    const lastCall = onFilterChange.mock.calls[onFilterChange.mock.calls.length - 1][0];
    expect(lastCall.values['f-search']).toBe('hello');
  });

  it('emits arrays for multi-select filter changes', () => {
    const onFilterChange = vi.fn();
    const { container } = renderFilterBar([multiSelectFilter], { onFilterChange });

    const select = container.querySelector('.ss-filter-multi-select') as HTMLSelectElement;
    Array.from(select.options).forEach((option) => {
      option.selected = option.value === 'footwear' || option.value === 'hydration';
    });

    fireEvent.change(select);

    expect(onFilterChange).toHaveBeenCalled();
    const lastCall = onFilterChange.mock.calls[onFilterChange.mock.calls.length - 1][0];
    expect(lastCall.values['f-category']).toEqual(['footwear', 'hydration']);
  });

  it('renders Clear filters button when filters are active', () => {
    const onFilterChange = vi.fn();
    const { container } = renderFilterBar([textFilter], {
      initialValues: { 'f-search': 'existing' },
      onFilterChange,
    });

    const resetBtn = container.querySelector('.ss-filter-reset') as HTMLButtonElement;
    expect(resetBtn).toBeTruthy();
    expect(resetBtn.textContent).toContain('Clear filters');

    fireEvent.click(resetBtn);
    expect(onFilterChange).toHaveBeenCalledWith({ values: {} });
  });

  it('renders nothing when filters array is empty', () => {
    const { container } = renderFilterBar([]);
    expect(container.querySelector('.ss-filter-bar')).toBeNull();
  });

  it('renders label from filter title', () => {
    const { container } = renderFilterBar([selectFilter]);
    const label = container.querySelector('.ss-filter-label');
    const select = container.querySelector('.ss-filter-select');
    const selectId = select?.getAttribute('id');
    expect(label).toBeTruthy();
    expect(label?.textContent).toBe('Status');
    expect(label?.getAttribute('for')).toBe(selectId);
    expect(selectId).toContain('ss-filter-f-status-primary');
    expect(select?.getAttribute('name')).toBe('f-status');
  });

  it('falls back to fieldRef when title is missing', () => {
    const noTitleFilter: FilterDefinition = {
      ...textFilter,
      title: undefined,
    };
    const { container } = renderFilterBar([noTitleFilter]);
    const label = container.querySelector('.ss-filter-label');
    expect(label).toBeTruthy();
    expect(label?.textContent).toBe('name');
  });

  it('adds names to date inputs for form and accessibility tooling', () => {
    const { container } = renderFilterBar([dateFilter]);
    const preset = container.querySelector('.ss-filter-date-preset');
    expect(preset?.getAttribute('id')).toContain('ss-filter-f-date-primary');
    expect(preset?.getAttribute('name')).toBe('f-date-preset');
  });
});

describe('FilterBar — scope logic', () => {
  it('renders filter controls regardless of scope (scope affects widgets, not the bar)', () => {
    const widgetScopedFilter: FilterDefinition = {
      id: 'f-scoped',
      title: 'Scoped',
      type: 'text',
      fieldRef: 'field',
      datasetRef: 'ds-1',
      operator: 'eq',
      scope: { type: 'widgets', widgetIds: ['w-1'] },
    };

    const { container } = renderFilterBar([selectFilter, widgetScopedFilter]);
    const controls = container.querySelectorAll('.ss-filter-control');
    expect(controls).toHaveLength(2);
  });
});
