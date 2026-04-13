/**
 * Tests for field-ref-field custom Puck fields.
 *
 * Covers:
 * - FieldRefSelect renders a <select> when datasets are available
 * - FieldRefSelect falls back to <input> when no datasets
 * - Role-based filtering (time, dimension, measure, key)
 * - onChange fires with correct value on selection
 * - DatasetRefSelect renders datasets as options
 * - Pre-selected values are preserved in the dropdown
 * - All fields appear for unfiltered (no acceptRoles) selectors
 * - Multi-dataset mode prefixes dataset label
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { NormalizedDataset } from '@supersubset/data-model';
import { DatasetProvider } from '../src/context/DatasetContext';
import { createFieldRefField, createDatasetRefField } from '../src/fields/field-ref-field';

afterEach(cleanup);

// ─── Test fixtures ───────────────────────────────────────────

const ORDERS_DATASET: NormalizedDataset = {
  id: 'ds-orders',
  label: 'Orders',
  fields: [
    { id: 'order_date', label: 'Order Date', dataType: 'date', role: 'time' },
    { id: 'category', label: 'Category', dataType: 'string', role: 'dimension' },
    { id: 'region', label: 'Region', dataType: 'string', role: 'dimension' },
    { id: 'revenue', label: 'Revenue', dataType: 'number', role: 'measure', defaultAggregation: 'sum' },
    { id: 'quantity', label: 'Quantity', dataType: 'integer', role: 'measure', defaultAggregation: 'sum' },
    { id: 'order_id', label: 'Order ID', dataType: 'string', role: 'key' },
  ],
};

const PRODUCTS_DATASET: NormalizedDataset = {
  id: 'ds-products',
  label: 'Products',
  fields: [
    { id: 'product_name', label: 'Product Name', dataType: 'string', role: 'dimension' },
    { id: 'price', label: 'Price', dataType: 'number', role: 'measure' },
    { id: 'stock', label: 'Stock', dataType: 'integer', role: 'measure' },
    { id: 'created_at', label: 'Created At', dataType: 'datetime', role: 'time' },
  ],
};

const SINGLE_DATASET = [ORDERS_DATASET];
const MULTI_DATASETS = [ORDERS_DATASET, PRODUCTS_DATASET];

// ─── Helpers ─────────────────────────────────────────────────

function renderFieldRef(
  fieldDef: ReturnType<typeof createFieldRefField>,
  value: string,
  onChange: (val: string) => void,
  datasets: NormalizedDataset[],
) {
  return render(
    React.createElement(
      DatasetProvider,
      { datasets },
      fieldDef.render({ value, onChange, id: 'test-id', name: 'testField', readOnly: false })
    )
  );
}

function renderDatasetRef(
  fieldDef: ReturnType<typeof createDatasetRefField>,
  value: string,
  onChange: (val: string) => void,
  datasets: NormalizedDataset[],
) {
  return render(
    React.createElement(
      DatasetProvider,
      { datasets },
      fieldDef.render({ value, onChange, id: 'test-id', name: 'testDataset', readOnly: false })
    )
  );
}

// ─── createFieldRefField — basic rendering ───────────────────

describe('createFieldRefField', () => {
  it('returns a custom field type with a render function', () => {
    const field = createFieldRefField('X-Axis Field');
    expect(field.type).toBe('custom');
    expect(field.label).toBe('X-Axis Field');
    expect(field.render).toBeTypeOf('function');
  });

  it('renders a <select> when datasets are provided', () => {
    const field = createFieldRefField('X-Axis Field');
    const onChange = vi.fn();
    renderFieldRef(field, '', onChange, SINGLE_DATASET);

    const select = screen.getByRole('combobox', { name: 'X-Axis Field' });
    expect(select.tagName).toBe('SELECT');
  });

  it('falls back to <input> when no datasets are provided', () => {
    const field = createFieldRefField('X-Axis Field');
    const onChange = vi.fn();
    renderFieldRef(field, '', onChange, []);

    const input = screen.getByRole('textbox', { name: 'X-Axis Field' });
    expect(input.tagName).toBe('INPUT');
  });

  it('preserves pre-selected value in dropdown', () => {
    const field = createFieldRefField('X-Axis Field', ['time', 'dimension']);
    const onChange = vi.fn();
    renderFieldRef(field, 'order_date', onChange, SINGLE_DATASET);

    const select = screen.getByRole('combobox', { name: 'X-Axis Field' }) as HTMLSelectElement;
    expect(select.value).toBe('order_date');
  });

  it('fires onChange with the new field id when selection changes', () => {
    const field = createFieldRefField('X-Axis Field', ['time', 'dimension']);
    const onChange = vi.fn();
    renderFieldRef(field, 'order_date', onChange, SINGLE_DATASET);

    const select = screen.getByRole('combobox', { name: 'X-Axis Field' });
    fireEvent.change(select, { target: { value: 'category' } });
    expect(onChange).toHaveBeenCalledWith('category');
  });

  it('fires onChange when clearing selection back to empty', () => {
    const field = createFieldRefField('Y-Axis Field', ['measure']);
    const onChange = vi.fn();
    renderFieldRef(field, 'revenue', onChange, SINGLE_DATASET);

    const select = screen.getByRole('combobox', { name: 'Y-Axis Field' });
    fireEvent.change(select, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith('');
  });
});

// ─── Role-based filtering ────────────────────────────────────

describe('createFieldRefField — role filtering', () => {
  it('X-Axis [time, dimension] shows time and dimension fields only', () => {
    const field = createFieldRefField('X-Axis Field', ['time', 'dimension']);
    const onChange = vi.fn();
    renderFieldRef(field, '', onChange, SINGLE_DATASET);

    const select = screen.getByRole('combobox', { name: 'X-Axis Field' });
    const options = Array.from(select.querySelectorAll('option')).map(
      (o) => (o as HTMLOptionElement).value
    );

    // Should include time and dimension fields
    expect(options).toContain('order_date');  // time
    expect(options).toContain('category');    // dimension
    expect(options).toContain('region');      // dimension

    // Should NOT include measure or key fields
    expect(options).not.toContain('revenue');   // measure
    expect(options).not.toContain('quantity');  // measure
    expect(options).not.toContain('order_id'); // key
  });

  it('Y-Axis [measure] shows only measure fields', () => {
    const field = createFieldRefField('Y-Axis Field', ['measure']);
    const onChange = vi.fn();
    renderFieldRef(field, '', onChange, SINGLE_DATASET);

    const select = screen.getByRole('combobox', { name: 'Y-Axis Field' });
    const options = Array.from(select.querySelectorAll('option')).map(
      (o) => (o as HTMLOptionElement).value
    );

    expect(options).toContain('revenue');
    expect(options).toContain('quantity');
    expect(options).not.toContain('order_date');
    expect(options).not.toContain('category');
    expect(options).not.toContain('order_id');
  });

  it('Series [dimension] shows only dimension fields', () => {
    const field = createFieldRefField('Series Field', ['dimension']);
    const onChange = vi.fn();
    renderFieldRef(field, '', onChange, SINGLE_DATASET);

    const select = screen.getByRole('combobox', { name: 'Series Field' });
    const options = Array.from(select.querySelectorAll('option')).map(
      (o) => (o as HTMLOptionElement).value
    );

    expect(options).toContain('category');
    expect(options).toContain('region');
    expect(options).not.toContain('revenue');
    expect(options).not.toContain('order_date');
  });

  it('Timestamp [time] shows only time fields', () => {
    const field = createFieldRefField('Timestamp Field', ['time']);
    const onChange = vi.fn();
    renderFieldRef(field, '', onChange, SINGLE_DATASET);

    const select = screen.getByRole('combobox', { name: 'Timestamp Field' });
    const options = Array.from(select.querySelectorAll('option')).map(
      (o) => (o as HTMLOptionElement).value
    );

    expect(options).toContain('order_date');
    expect(options).not.toContain('category');
    expect(options).not.toContain('revenue');
  });

  it('no acceptRoles shows ALL fields (unfiltered)', () => {
    const field = createFieldRefField('Any Field');
    const onChange = vi.fn();
    renderFieldRef(field, '', onChange, SINGLE_DATASET);

    const select = screen.getByRole('combobox', { name: 'Any Field' });
    const options = Array.from(select.querySelectorAll('option'))
      .map((o) => (o as HTMLOptionElement).value)
      .filter((v) => v !== ''); // exclude placeholder

    expect(options).toHaveLength(ORDERS_DATASET.fields.length);
    expect(options).toContain('order_date');
    expect(options).toContain('category');
    expect(options).toContain('revenue');
    expect(options).toContain('quantity');
    expect(options).toContain('order_id');
  });
});

// ─── Multi-dataset support ───────────────────────────────────

describe('createFieldRefField — multi-dataset', () => {
  it('shows fields from all datasets', () => {
    const field = createFieldRefField('Value Field', ['measure']);
    const onChange = vi.fn();
    renderFieldRef(field, '', onChange, MULTI_DATASETS);

    const select = screen.getByRole('combobox', { name: 'Value Field' });
    const optionTexts = Array.from(select.querySelectorAll('option')).map(
      (o) => (o as HTMLOptionElement).textContent
    );

    // Multi-dataset mode: shows "Dataset › Field"
    expect(optionTexts).toContain('Orders › Revenue');
    expect(optionTexts).toContain('Orders › Quantity');
    expect(optionTexts).toContain('Products › Price');
    expect(optionTexts).toContain('Products › Stock');
  });

  it('single-dataset mode shows field labels without prefix', () => {
    const field = createFieldRefField('Value Field', ['measure']);
    const onChange = vi.fn();
    renderFieldRef(field, '', onChange, SINGLE_DATASET);

    const select = screen.getByRole('combobox', { name: 'Value Field' });
    const optionTexts = Array.from(select.querySelectorAll('option')).map(
      (o) => (o as HTMLOptionElement).textContent
    );

    expect(optionTexts).toContain('Revenue');
    expect(optionTexts).toContain('Quantity');
    expect(optionTexts).not.toContain('Orders › Revenue');
  });

  it('can select a field from the second dataset', () => {
    const field = createFieldRefField('Value Field', ['measure']);
    const onChange = vi.fn();
    renderFieldRef(field, '', onChange, MULTI_DATASETS);

    const select = screen.getByRole('combobox', { name: 'Value Field' });
    fireEvent.change(select, { target: { value: 'price' } });
    expect(onChange).toHaveBeenCalledWith('price');
  });
});

// ─── createDatasetRefField ───────────────────────────────────

describe('createDatasetRefField', () => {
  it('returns a custom field type with a render function', () => {
    const field = createDatasetRefField();
    expect(field.type).toBe('custom');
    expect(field.label).toBe('Dataset Reference');
    expect(field.render).toBeTypeOf('function');
  });

  it('renders a dropdown with all available datasets', () => {
    const field = createDatasetRefField();
    const onChange = vi.fn();
    renderDatasetRef(field, '', onChange, MULTI_DATASETS);

    const select = screen.getByRole('combobox', { name: 'Dataset Reference' });
    const options = Array.from(select.querySelectorAll('option')).map(
      (o) => (o as HTMLOptionElement).value
    );

    expect(options).toContain('ds-orders');
    expect(options).toContain('ds-products');
  });

  it('preserves pre-selected dataset', () => {
    const field = createDatasetRefField();
    const onChange = vi.fn();
    renderDatasetRef(field, 'ds-orders', onChange, MULTI_DATASETS);

    const select = screen.getByRole('combobox', { name: 'Dataset Reference' }) as HTMLSelectElement;
    expect(select.value).toBe('ds-orders');
  });

  it('fires onChange when dataset is changed', () => {
    const field = createDatasetRefField();
    const onChange = vi.fn();
    renderDatasetRef(field, 'ds-orders', onChange, MULTI_DATASETS);

    const select = screen.getByRole('combobox', { name: 'Dataset Reference' });
    fireEvent.change(select, { target: { value: 'ds-products' } });
    expect(onChange).toHaveBeenCalledWith('ds-products');
  });

  it('falls back to <input> when no datasets', () => {
    const field = createDatasetRefField();
    const onChange = vi.fn();
    renderDatasetRef(field, '', onChange, []);

    const input = screen.getByRole('textbox', { name: 'Dataset Reference' });
    expect(input.tagName).toBe('INPUT');
  });
});

// ─── Value switching (would catch the "quantity shows nothing" issue) ─

describe('createFieldRefField — value switching', () => {
  it('switching from revenue to quantity updates the select value', () => {
    const field = createFieldRefField('Y-Axis Field', ['measure']);
    const onChange = vi.fn();
    const { rerender } = renderFieldRef(field, 'revenue', onChange, SINGLE_DATASET);

    // Initial: revenue selected
    let select = screen.getByRole('combobox', { name: 'Y-Axis Field' }) as HTMLSelectElement;
    expect(select.value).toBe('revenue');

    // Simulate Puck re-rendering with new value after onChange
    rerender(
      React.createElement(
        DatasetProvider,
        { datasets: SINGLE_DATASET },
        field.render({ value: 'quantity', onChange, id: 'test-id', name: 'testField', readOnly: false })
      )
    );

    select = screen.getByRole('combobox', { name: 'Y-Axis Field' }) as HTMLSelectElement;
    expect(select.value).toBe('quantity');
  });

  it('switching X-Axis from order_date to category works', () => {
    const field = createFieldRefField('X-Axis Field', ['time', 'dimension']);
    const onChange = vi.fn();
    renderFieldRef(field, 'order_date', onChange, SINGLE_DATASET);

    const select = screen.getByRole('combobox', { name: 'X-Axis Field' });

    // Category should be in the dropdown
    const optionValues = Array.from(select.querySelectorAll('option')).map(
      (o) => (o as HTMLOptionElement).value
    );
    expect(optionValues).toContain('category');

    // Change to category
    fireEvent.change(select, { target: { value: 'category' } });
    expect(onChange).toHaveBeenCalledWith('category');
  });

  it('all measure fields are selectable for Y-Axis', () => {
    const field = createFieldRefField('Y-Axis Field', ['measure']);
    const onChange = vi.fn();
    renderFieldRef(field, '', onChange, SINGLE_DATASET);

    const select = screen.getByRole('combobox', { name: 'Y-Axis Field' });

    // Both revenue and quantity should be available
    for (const measureId of ['revenue', 'quantity']) {
      fireEvent.change(select, { target: { value: measureId } });
      expect(onChange).toHaveBeenCalledWith(measureId);
    }
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});

// ─── Regression: field labels visible ────────────────────────

describe('createFieldRefField — labels are rendered', () => {
  it('renders a visible label above the select when datasets exist', () => {
    const field = createFieldRefField('X-Axis Field', ['time', 'dimension']);
    const onChange = vi.fn();
    renderFieldRef(field, '', onChange, SINGLE_DATASET);

    // The label text must be in the document
    expect(screen.getByText('X-Axis Field')).toBeTruthy();
  });

  it('renders a visible label above the input when no datasets exist', () => {
    const field = createFieldRefField('Y-Axis Field', ['measure']);
    const onChange = vi.fn();
    renderFieldRef(field, '', onChange, []);

    expect(screen.getByText('Y-Axis Field')).toBeTruthy();
  });

  it('renders each field-ref label distinctly', () => {
    const xField = createFieldRefField('X-Axis Field', ['time', 'dimension']);
    const yField = createFieldRefField('Y-Axis Field', ['measure']);
    const seriesField = createFieldRefField('Series Field', ['dimension']);
    const onChange = vi.fn();

    const { container } = render(
      React.createElement(
        DatasetProvider,
        { datasets: SINGLE_DATASET },
        React.createElement(
          'div',
          null,
          xField.render({ value: '', onChange, id: 'x', name: 'xAxisField', readOnly: false }),
          yField.render({ value: '', onChange, id: 'y', name: 'yAxisField', readOnly: false }),
          seriesField.render({ value: '', onChange, id: 's', name: 'seriesField', readOnly: false }),
        ),
      ),
    );

    expect(screen.getByText('X-Axis Field')).toBeTruthy();
    expect(screen.getByText('Y-Axis Field')).toBeTruthy();
    expect(screen.getByText('Series Field')).toBeTruthy();

    // Each label should be a <span> inside a <label>
    const labels = container.querySelectorAll('label');
    expect(labels.length).toBeGreaterThanOrEqual(3);
  });
});

describe('createDatasetRefField — labels are rendered', () => {
  it('renders "Dataset" label above the select', () => {
    const field = createDatasetRefField();
    const onChange = vi.fn();
    renderDatasetRef(field, '', onChange, SINGLE_DATASET);

    expect(screen.getByText('Dataset')).toBeTruthy();
  });

  it('renders "Dataset" label above the input when no datasets', () => {
    const field = createDatasetRefField();
    const onChange = vi.fn();
    renderDatasetRef(field, '', onChange, []);

    expect(screen.getByText('Dataset')).toBeTruthy();
  });
});
