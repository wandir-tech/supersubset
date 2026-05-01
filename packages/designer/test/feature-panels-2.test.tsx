/**
 * Tests for ChartTypePicker, FieldBindingPicker, FilterBuilderPanel.
 *
 * Phase 2 features: 2.7, 2.8, 2.9.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { NormalizedDataset, NormalizedField } from '@supersubset/data-model';

// ─── Mock @supersubset/data-model (types only — no runtime code) ─────

vi.mock('@supersubset/data-model', () => ({}));

import { ChartTypePicker, CHART_TYPE_OPTIONS } from '../src/components/ChartTypePicker';
import {
  FieldBindingPicker,
  type BindingSlot,
  type FieldBinding,
} from '../src/components/FieldBindingPicker';
import {
  FilterBuilderPanel,
  FILTER_OPERATORS,
  type FilterDefinition,
} from '../src/components/FilterBuilderPanel';

// ─── Test fixtures ───────────────────────────────────────────

const MOCK_FIELDS: NormalizedField[] = [
  { id: 'order_date', label: 'Order Date', dataType: 'date', role: 'time' },
  { id: 'category', label: 'Category', dataType: 'string', role: 'dimension' },
  { id: 'region', label: 'Region', dataType: 'string', role: 'dimension' },
  {
    id: 'revenue',
    label: 'Revenue',
    dataType: 'number',
    role: 'measure',
    defaultAggregation: 'sum',
  },
  {
    id: 'quantity',
    label: 'Quantity',
    dataType: 'integer',
    role: 'measure',
    defaultAggregation: 'sum',
  },
  { id: 'customer_id', label: 'Customer ID', dataType: 'string', role: 'key' },
];

const MOCK_DATASET: NormalizedDataset = {
  id: 'ds-orders',
  label: 'Orders',
  fields: MOCK_FIELDS,
  source: { type: 'table', ref: 'orders' },
};

const MOCK_DATASET_2: NormalizedDataset = {
  id: 'ds-products',
  label: 'Products',
  fields: [
    { id: 'product_name', label: 'Product Name', dataType: 'string', role: 'dimension' },
    { id: 'price', label: 'Price', dataType: 'number', role: 'measure' },
  ],
  source: { type: 'table', ref: 'products' },
};

// ═══════════════════════════════════════════════════════════════
// ChartTypePicker
// ═══════════════════════════════════════════════════════════════

describe('ChartTypePicker', () => {
  afterEach(cleanup);

  it('renders all 16 chart types by default', () => {
    render(<ChartTypePicker onChange={vi.fn()} />);
    // Each chart type has a button with its label
    for (const opt of CHART_TYPE_OPTIONS) {
      expect(screen.getByText(opt.label)).toBeTruthy();
    }
  });

  it('calls onChange when a chart type is clicked', () => {
    const onChange = vi.fn();
    render(<ChartTypePicker onChange={onChange} />);
    fireEvent.click(screen.getByText('Line'));
    expect(onChange).toHaveBeenCalledWith('line-chart');
  });

  it('highlights the selected chart type', () => {
    render(<ChartTypePicker onChange={vi.fn()} value="bar-chart" />);
    const barBtn = screen.getByTestId('chart-type-bar-chart');
    expect(barBtn.dataset.selected).toBe('true');
  });

  it('filters chart types by search query', () => {
    render(<ChartTypePicker onChange={vi.fn()} />);
    fireEvent.change(screen.getByTestId('chart-search'), {
      target: { value: 'pie' },
    });
    expect(screen.getByText('Pie / Donut')).toBeTruthy();
    expect(screen.queryByText('Line')).toBeNull();
  });

  it('shows "no match" when search has no results', () => {
    render(<ChartTypePicker onChange={vi.fn()} />);
    fireEvent.change(screen.getByTestId('chart-search'), {
      target: { value: 'zzzzz' },
    });
    expect(screen.getByTestId('chart-no-results')).toBeTruthy();
  });

  it('supports compact mode', () => {
    render(<ChartTypePicker onChange={vi.fn()} compact />);
    // Just verify it renders - compact mode hides descriptions
    expect(screen.getByTestId('chart-type-picker')).toBeTruthy();
  });

  it('wires chart search accessibility attributes', () => {
    render(<ChartTypePicker onChange={vi.fn()} />);
    const search = screen.getByTestId('chart-search');
    expect(search.getAttribute('id')).toBe('ss-chart-type-search');
    expect(search.getAttribute('name')).toBe('chartTypeSearch');
    expect(search.getAttribute('aria-label')).toBe('Search chart types');
  });

  it('groups by category', () => {
    render(<ChartTypePicker onChange={vi.fn()} />);
    expect(screen.getByText('Basic Charts')).toBeTruthy();
    expect(screen.getByText('Statistical')).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// FieldBindingPicker
// ═══════════════════════════════════════════════════════════════

describe('FieldBindingPicker', () => {
  afterEach(cleanup);

  it('renders fields grouped by role', () => {
    render(<FieldBindingPicker datasets={[MOCK_DATASET]} selectedDatasetId="ds-orders" />);
    expect(screen.getByTestId('field-binding-picker')).toBeTruthy();
    // Should see role groups
    expect(screen.getByText(/Times \(1\)/)).toBeTruthy();
    expect(screen.getByText(/Dimensions \(2\)/)).toBeTruthy();
    expect(screen.getByText(/Measures \(2\)/)).toBeTruthy();
    expect(screen.getByText(/Keys \(1\)/)).toBeTruthy();
  });

  it('shows all field labels', () => {
    render(<FieldBindingPicker datasets={[MOCK_DATASET]} selectedDatasetId="ds-orders" />);
    expect(screen.getByText('Order Date')).toBeTruthy();
    expect(screen.getByText('Category')).toBeTruthy();
    expect(screen.getByText('Revenue')).toBeTruthy();
    expect(screen.getByText('Customer ID')).toBeTruthy();
  });

  it('fires onFieldSelect when a field is clicked', () => {
    const onFieldSelect = vi.fn();
    render(
      <FieldBindingPicker
        datasets={[MOCK_DATASET]}
        selectedDatasetId="ds-orders"
        onFieldSelect={onFieldSelect}
      />,
    );
    fireEvent.click(screen.getByTestId('field-revenue'));
    expect(onFieldSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'revenue', role: 'measure' }),
      'ds-orders',
    );
  });

  it('filters fields by search', () => {
    render(<FieldBindingPicker datasets={[MOCK_DATASET]} selectedDatasetId="ds-orders" />);
    fireEvent.change(screen.getByTestId('field-search'), {
      target: { value: 'rev' },
    });
    expect(screen.getByText('Revenue')).toBeTruthy();
    expect(screen.queryByText('Category')).toBeNull();
  });

  it('shows dataset selector when multiple datasets', () => {
    const onDatasetChange = vi.fn();
    render(
      <FieldBindingPicker
        datasets={[MOCK_DATASET, MOCK_DATASET_2]}
        selectedDatasetId="ds-orders"
        onDatasetChange={onDatasetChange}
      />,
    );
    const select = screen.getByTestId('dataset-select');
    expect(select).toBeTruthy();
    fireEvent.change(select, { target: { value: 'ds-products' } });
    expect(onDatasetChange).toHaveBeenCalledWith('ds-products');
  });

  it('wires dataset and search controls for accessibility', () => {
    render(
      <FieldBindingPicker
        datasets={[MOCK_DATASET, MOCK_DATASET_2]}
        selectedDatasetId="ds-orders"
      />,
    );

    const datasetSelect = screen.getByTestId('dataset-select');
    expect(datasetSelect.getAttribute('id')).toBe('ss-field-binding-dataset-select');
    expect(datasetSelect.getAttribute('name')).toBe('fieldBindingDataset');
    expect(datasetSelect.getAttribute('aria-label')).toBe('Select dataset');

    const fieldSearch = screen.getByTestId('field-search');
    expect(fieldSearch.getAttribute('id')).toBe('ss-field-binding-search');
    expect(fieldSearch.getAttribute('name')).toBe('fieldBindingSearch');
    expect(fieldSearch.getAttribute('aria-label')).toBe('Search fields');
  });

  it('does not show dataset selector for single dataset', () => {
    render(<FieldBindingPicker datasets={[MOCK_DATASET]} selectedDatasetId="ds-orders" />);
    expect(screen.queryByTestId('dataset-select')).toBeNull();
  });

  it('toggles role group expand/collapse', () => {
    render(<FieldBindingPicker datasets={[MOCK_DATASET]} selectedDatasetId="ds-orders" />);
    // Initially expanded — field visible
    expect(screen.getByText('Revenue')).toBeTruthy();
    // Collapse measures
    fireEvent.click(screen.getByTestId('role-toggle-measure'));
    expect(screen.queryByText('Revenue')).toBeNull();
    // Re-expand
    fireEvent.click(screen.getByTestId('role-toggle-measure'));
    expect(screen.getByText('Revenue')).toBeTruthy();
  });

  it('shows binding slots with quick-bind buttons', () => {
    const slots: BindingSlot[] = [
      { role: 'x-axis', label: 'X Axis', acceptRoles: ['dimension', 'time'] },
      { role: 'y-axis', label: 'Y Axis', acceptRoles: ['measure'], multiple: true },
    ];
    render(
      <FieldBindingPicker
        datasets={[MOCK_DATASET]}
        selectedDatasetId="ds-orders"
        slots={slots}
        bindings={[]}
        onBindingsChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId('binding-slots')).toBeTruthy();
    // Dimension fields should show X Axis bind button (not Y Axis)
    expect(screen.getByTestId('bind-category-x-axis')).toBeTruthy();
    expect(screen.queryByTestId('bind-category-y-axis')).toBeNull();
    // Measure fields should show Y Axis (not X Axis)
    expect(screen.getByTestId('bind-revenue-y-axis')).toBeTruthy();
    expect(screen.queryByTestId('bind-revenue-x-axis')).toBeNull();
  });

  it('binds and unbinds fields', () => {
    const onBindingsChange = vi.fn();
    const slots: BindingSlot[] = [
      { role: 'x-axis', label: 'X Axis', acceptRoles: ['dimension', 'time'] },
    ];
    const { rerender } = render(
      <FieldBindingPicker
        datasets={[MOCK_DATASET]}
        selectedDatasetId="ds-orders"
        slots={slots}
        bindings={[]}
        onBindingsChange={onBindingsChange}
      />,
    );
    // Bind category to x-axis
    fireEvent.click(screen.getByTestId('bind-category-x-axis'));
    expect(onBindingsChange).toHaveBeenCalledWith([
      { role: 'x-axis', fieldId: 'category', datasetId: 'ds-orders' },
    ]);

    // Rerender with binding applied, then unbind
    const bindings: FieldBinding[] = [
      { role: 'x-axis', fieldId: 'category', datasetId: 'ds-orders' },
    ];
    rerender(
      <FieldBindingPicker
        datasets={[MOCK_DATASET]}
        selectedDatasetId="ds-orders"
        slots={slots}
        bindings={bindings}
        onBindingsChange={onBindingsChange}
      />,
    );
    fireEvent.click(screen.getByTestId('unbind-x-axis-category'));
    expect(onBindingsChange).toHaveBeenLastCalledWith([]);
  });

  it('shows empty state when no datasets', () => {
    render(<FieldBindingPicker datasets={[]} />);
    expect(screen.getByTestId('no-datasets')).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// FilterBuilderPanel
// ═══════════════════════════════════════════════════════════════

describe('FilterBuilderPanel', () => {
  afterEach(cleanup);

  it('renders empty state', () => {
    render(<FilterBuilderPanel filters={[]} onChange={vi.fn()} datasets={[MOCK_DATASET]} />);
    expect(screen.getByTestId('no-filters')).toBeTruthy();
    expect(screen.getByText('Filters (0)')).toBeTruthy();
  });

  it('adds a new filter', () => {
    const onChange = vi.fn();
    render(<FilterBuilderPanel filters={[]} onChange={onChange} datasets={[MOCK_DATASET]} />);
    fireEvent.click(screen.getByTestId('add-filter'));
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'select',
        datasetRef: 'ds-orders',
        operator: 'equals',
        scope: { type: 'global' },
      }),
    ]);
  });

  it('renders filter editor with all controls', () => {
    const filter: FilterDefinition = {
      id: 'f1',
      title: 'Region Filter',
      type: 'select',
      fieldRef: 'region',
      datasetRef: 'ds-orders',
      operator: 'equals',
      scope: { type: 'global' },
    };
    render(<FilterBuilderPanel filters={[filter]} onChange={vi.fn()} datasets={[MOCK_DATASET]} />);
    expect(screen.getByTestId('filter-editor-f1')).toBeTruthy();
    expect(screen.getByTestId('filter-title-f1')).toBeTruthy();
    expect(screen.getByTestId('filter-dataset-f1')).toBeTruthy();
    expect(screen.getByTestId('filter-field-f1')).toBeTruthy();
    expect(screen.getByTestId('filter-operator-f1')).toBeTruthy();
    expect(screen.getByTestId('filter-default-f1')).toBeTruthy();
    expect(screen.getByTestId('filter-type-f1')).toBeTruthy();
  });

  it('wires filter controls with labels and names', () => {
    const filter: FilterDefinition = {
      id: 'f1',
      type: 'select',
      fieldRef: 'region',
      datasetRef: 'ds-orders',
      operator: 'equals',
      scope: { type: 'page', pageId: 'page-1' },
    };
    render(
      <FilterBuilderPanel
        filters={[filter]}
        onChange={vi.fn()}
        datasets={[MOCK_DATASET]}
        pageIds={['page-1', 'page-2']}
      />,
    );

    const datasetLabel = screen.getByText('Dataset');
    const datasetSelect = screen.getByTestId('filter-dataset-f1');
    expect(datasetLabel.getAttribute('for')).toBe('ss-filter-dataset-f1');
    expect(datasetSelect.getAttribute('id')).toBe('ss-filter-dataset-f1');
    expect(datasetSelect.getAttribute('name')).toBe('filter-dataset-f1');

    const pageSelect = screen.getByTestId('filter-scope-page-select-f1');
    expect(pageSelect.getAttribute('id')).toBe('ss-filter-scope-page-f1');
    expect(pageSelect.getAttribute('name')).toBe('filter-scope-page-f1');
    expect(pageSelect.getAttribute('aria-label')).toBe('Filter scope page');
  });

  it('updates filter title', () => {
    const onChange = vi.fn();
    const filter: FilterDefinition = {
      id: 'f1',
      type: 'select',
      fieldRef: 'region',
      datasetRef: 'ds-orders',
      operator: 'equals',
      scope: { type: 'global' },
    };
    render(<FilterBuilderPanel filters={[filter]} onChange={onChange} datasets={[MOCK_DATASET]} />);
    fireEvent.change(screen.getByTestId('filter-title-f1'), {
      target: { value: 'My Filter' },
    });
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'f1', title: 'My Filter' }),
    ]);
  });

  it('changes dataset and resets field', () => {
    const onChange = vi.fn();
    const filter: FilterDefinition = {
      id: 'f1',
      type: 'select',
      fieldRef: 'region',
      datasetRef: 'ds-orders',
      operator: 'equals',
      scope: { type: 'global' },
    };
    render(
      <FilterBuilderPanel
        filters={[filter]}
        onChange={onChange}
        datasets={[MOCK_DATASET, MOCK_DATASET_2]}
      />,
    );
    fireEvent.change(screen.getByTestId('filter-dataset-f1'), {
      target: { value: 'ds-products' },
    });
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        datasetRef: 'ds-products',
        fieldRef: '',
        operator: 'equals',
      }),
    ]);
  });

  it('changes operator', () => {
    const onChange = vi.fn();
    const filter: FilterDefinition = {
      id: 'f1',
      type: 'select',
      fieldRef: 'region',
      datasetRef: 'ds-orders',
      operator: 'equals',
      scope: { type: 'global' },
    };
    render(<FilterBuilderPanel filters={[filter]} onChange={onChange} datasets={[MOCK_DATASET]} />);
    fireEvent.change(screen.getByTestId('filter-operator-f1'), {
      target: { value: 'contains' },
    });
    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ operator: 'contains' })]);
  });

  it('deletes a filter', () => {
    const onChange = vi.fn();
    const filters: FilterDefinition[] = [
      {
        id: 'f1',
        type: 'select',
        fieldRef: 'region',
        datasetRef: 'ds-orders',
        operator: 'equals',
        scope: { type: 'global' },
      },
      {
        id: 'f2',
        type: 'select',
        fieldRef: 'category',
        datasetRef: 'ds-orders',
        operator: 'in',
        scope: { type: 'global' },
      },
    ];
    render(<FilterBuilderPanel filters={filters} onChange={onChange} datasets={[MOCK_DATASET]} />);
    fireEvent.click(screen.getByTestId('filter-delete-f1'));
    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ id: 'f2' })]);
  });

  it('changes scope to page', () => {
    const onChange = vi.fn();
    const filter: FilterDefinition = {
      id: 'f1',
      type: 'select',
      fieldRef: 'region',
      datasetRef: 'ds-orders',
      operator: 'equals',
      scope: { type: 'global' },
    };
    render(
      <FilterBuilderPanel
        filters={[filter]}
        onChange={onChange}
        datasets={[MOCK_DATASET]}
        pageIds={['page-1', 'page-2']}
      />,
    );
    fireEvent.click(screen.getByTestId('filter-scope-page-f1'));
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        scope: { type: 'page', pageId: 'page-1' },
      }),
    ]);
  });

  it('changes scope to widgets and toggles widget selection', () => {
    const onChange = vi.fn();
    const filter: FilterDefinition = {
      id: 'f1',
      type: 'select',
      fieldRef: 'region',
      datasetRef: 'ds-orders',
      operator: 'equals',
      scope: { type: 'widgets', widgetIds: [] },
    };
    render(
      <FilterBuilderPanel
        filters={[filter]}
        onChange={onChange}
        datasets={[MOCK_DATASET]}
        widgetIds={['w1', 'w2', 'w3']}
      />,
    );
    // Widget checkboxes should be visible
    fireEvent.click(screen.getByTestId('filter-scope-widget-w1-f1'));
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        scope: { type: 'widgets', widgetIds: ['w1'] },
      }),
    ]);
  });

  it('sets default value', () => {
    const onChange = vi.fn();
    const filter: FilterDefinition = {
      id: 'f1',
      type: 'select',
      fieldRef: 'region',
      datasetRef: 'ds-orders',
      operator: 'equals',
      scope: { type: 'global' },
    };
    render(<FilterBuilderPanel filters={[filter]} onChange={onChange} datasets={[MOCK_DATASET]} />);
    fireEvent.change(screen.getByTestId('filter-default-f1'), {
      target: { value: 'West' },
    });
    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ defaultValue: 'West' })]);
  });

  it('changes control type', () => {
    const onChange = vi.fn();
    const filter: FilterDefinition = {
      id: 'f1',
      type: 'select',
      fieldRef: 'region',
      datasetRef: 'ds-orders',
      operator: 'equals',
      scope: { type: 'global' },
    };
    render(<FilterBuilderPanel filters={[filter]} onChange={onChange} datasets={[MOCK_DATASET]} />);
    fireEvent.change(screen.getByTestId('filter-type-f1'), {
      target: { value: 'date' },
    });
    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ type: 'date' })]);
  });

  it('normalizes legacy unsupported control types on mount', () => {
    const onChange = vi.fn();
    const filter: FilterDefinition = {
      id: 'f1',
      type: 'multi-select',
      fieldRef: 'region',
      datasetRef: 'ds-orders',
      operator: 'equals',
      scope: { type: 'global' },
    };
    render(<FilterBuilderPanel filters={[filter]} onChange={onChange} datasets={[MOCK_DATASET]} />);

    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ type: 'select' })]);
    expect((screen.getByTestId('filter-type-f1') as HTMLSelectElement).value).toBe('select');
  });

  it('does not renormalize equivalent legacy filters when props churn', () => {
    const initialOnChange = vi.fn();
    const rerenderOnChange = vi.fn();
    const filter: FilterDefinition = {
      id: 'f1',
      type: 'multi-select',
      fieldRef: 'region',
      datasetRef: 'ds-orders',
      operator: 'equals',
      scope: { type: 'global' },
    };
    const { rerender } = render(
      <FilterBuilderPanel
        filters={[filter]}
        onChange={initialOnChange}
        datasets={[MOCK_DATASET]}
      />,
    );

    expect(initialOnChange).toHaveBeenCalledTimes(1);

    rerender(
      <FilterBuilderPanel
        filters={[{ ...filter }]}
        onChange={rerenderOnChange}
        datasets={[MOCK_DATASET]}
      />,
    );

    expect(rerenderOnChange).not.toHaveBeenCalled();
  });

  it('does not emit onChange for supported filters when props churn', () => {
    const initialOnChange = vi.fn();
    const rerenderOnChange = vi.fn();
    const filter: FilterDefinition = {
      id: 'f1',
      type: 'select',
      fieldRef: 'region',
      datasetRef: 'ds-orders',
      operator: 'equals',
      scope: { type: 'global' },
    };
    const { rerender } = render(
      <FilterBuilderPanel
        filters={[filter]}
        onChange={initialOnChange}
        datasets={[MOCK_DATASET]}
      />,
    );

    expect(initialOnChange).not.toHaveBeenCalled();

    rerender(
      <FilterBuilderPanel
        filters={[{ ...filter }]}
        onChange={rerenderOnChange}
        datasets={[MOCK_DATASET]}
      />,
    );

    expect(rerenderOnChange).not.toHaveBeenCalled();
  });

  it('only renders runtime-supported control types', () => {
    const filter: FilterDefinition = {
      id: 'f1',
      type: 'select',
      fieldRef: 'region',
      datasetRef: 'ds-orders',
      operator: 'equals',
      scope: { type: 'global' },
    };
    render(<FilterBuilderPanel filters={[filter]} onChange={vi.fn()} datasets={[MOCK_DATASET]} />);

    const optionValues = Array.from(
      screen.getByTestId('filter-type-f1').querySelectorAll('option'),
    ).map((option) => option.getAttribute('value'));

    expect(optionValues).toEqual(['select', 'range', 'date', 'text']);
  });

  it('has correct operator list', () => {
    expect(FILTER_OPERATORS.length).toBeGreaterThanOrEqual(10);
    expect(FILTER_OPERATORS.find((o) => o.value === 'equals')).toBeTruthy();
    expect(FILTER_OPERATORS.find((o) => o.value === 'between')).toBeTruthy();
    expect(FILTER_OPERATORS.find((o) => o.value === 'is_null')).toBeTruthy();
  });
});
