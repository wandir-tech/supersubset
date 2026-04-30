/**
 * Puck custom field factories for field-reference dropdowns.
 *
 * Instead of plain `type: 'text'` inputs, these render `<select>` dropdowns
 * populated from the DatasetContext with available fields, optionally filtered
 * by FieldRole (dimension, measure, time, key).
 */
import React from 'react';
import type { FieldRole } from '@supersubset/data-model';
import { useDatasets } from '../context/DatasetContext';

// ─── Field selector component used inside Puck custom fields ─

const FIELD_LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#64748b',
  marginBottom: 4,
};

function FieldRefSelect({
  value,
  onChange,
  id,
  name,
  label,
  acceptRoles,
  readOnly,
}: {
  value: string;
  onChange: (value: string) => void;
  id: string;
  name: string;
  label: string;
  acceptRoles?: FieldRole[];
  readOnly?: boolean;
}) {
  const datasets = useDatasets();

  // Flatten all fields from all datasets, optionally filtered by role
  const options = React.useMemo(() => {
    const result: { value: string; label: string; dataset: string; role: FieldRole }[] = [];
    for (const ds of datasets) {
      for (const field of ds.fields) {
        if (acceptRoles && acceptRoles.length > 0 && !acceptRoles.includes(field.role)) {
          continue;
        }
        result.push({
          value: field.id,
          label: field.label,
          dataset: ds.label,
          role: field.role,
        });
      }
    }
    return result;
  }, [datasets, acceptRoles]);

  // If no datasets are available, fall back to a text input
  if (datasets.length === 0) {
    return React.createElement(
      'label',
      { htmlFor: id, style: { display: 'block' } },
      React.createElement('span', { style: FIELD_LABEL_STYLE }, label),
      React.createElement('input', {
        type: 'text',
        id,
        name,
        value: value ?? '',
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
        placeholder: `Enter ${label.toLowerCase()}…`,
        readOnly,
        'aria-label': label,
        style: {
          width: '100%',
          padding: '6px 10px',
          borderRadius: 6,
          border: '1px solid #d9d9d9',
          fontSize: 13,
          boxSizing: 'border-box' as const,
        },
      }),
    );
  }

  const showDatasetPrefix = datasets.length > 1;

  return React.createElement(
    'label',
    { htmlFor: id, style: { display: 'block' } },
    React.createElement('span', { style: FIELD_LABEL_STYLE }, label),
    React.createElement(
      'select',
      {
        id,
        name,
        value: value ?? '',
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value),
        disabled: readOnly,
        'aria-label': label,
        'data-testid': `field-ref-${name}`,
        style: {
          width: '100%',
          padding: '6px 10px',
          borderRadius: 6,
          border: '1px solid #d9d9d9',
          fontSize: 13,
          boxSizing: 'border-box' as const,
          background: '#fff',
        },
      },
      React.createElement('option', { value: '' }, `Select ${label.toLowerCase()}…`),
      ...options.map((opt) =>
        React.createElement(
          'option',
          { key: `${opt.dataset}-${opt.value}`, value: opt.value },
          showDatasetPrefix ? `${opt.dataset} › ${opt.label}` : opt.label,
        ),
      ),
    ),
  );
}

// ─── Dataset selector component for datasetRef fields ────────

function DatasetRefSelect({
  value,
  onChange,
  id,
  name,
  readOnly,
}: {
  value: string;
  onChange: (value: string) => void;
  id: string;
  name: string;
  readOnly?: boolean;
}) {
  const datasets = useDatasets();

  if (datasets.length === 0) {
    return React.createElement(
      'label',
      { htmlFor: id, style: { display: 'block' } },
      React.createElement('span', { style: FIELD_LABEL_STYLE }, 'Dataset'),
      React.createElement('input', {
        type: 'text',
        id,
        name,
        value: value ?? '',
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
        placeholder: 'Enter dataset reference…',
        readOnly,
        'aria-label': 'Dataset Reference',
        style: {
          width: '100%',
          padding: '6px 10px',
          borderRadius: 6,
          border: '1px solid #d9d9d9',
          fontSize: 13,
          boxSizing: 'border-box' as const,
        },
      }),
    );
  }

  return React.createElement(
    'label',
    { htmlFor: id, style: { display: 'block' } },
    React.createElement('span', { style: FIELD_LABEL_STYLE }, 'Dataset'),
    React.createElement(
      'select',
      {
        id,
        name,
        value: value ?? '',
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value),
        disabled: readOnly,
        'aria-label': 'Dataset Reference',
        'data-testid': `field-ref-${name}`,
        style: {
          width: '100%',
          padding: '6px 10px',
          borderRadius: 6,
          border: '1px solid #d9d9d9',
          fontSize: 13,
          boxSizing: 'border-box' as const,
          background: '#fff',
        },
      },
      React.createElement('option', { value: '' }, 'Select dataset…'),
      ...datasets.map((ds) =>
        React.createElement('option', { key: ds.id, value: ds.id }, ds.label),
      ),
    ),
  );
}

// ─── Factory functions ───────────────────────────────────────

/**
 * Create a Puck custom field that renders a dropdown of available fields.
 * Falls back to a plain text input when no datasets are provided.
 */
export function createFieldRefField(label: string, acceptRoles?: FieldRole[]) {
  return {
    type: 'custom' as const,
    label,
    render: ({
      value,
      onChange,
      id,
      name,
      readOnly,
    }: {
      value: string;
      onChange: (val: string) => void;
      id: string;
      name: string;
      readOnly?: boolean;
    }) =>
      React.createElement(FieldRefSelect, {
        value,
        onChange,
        id,
        name,
        label,
        acceptRoles,
        readOnly,
      }),
  };
}

/**
 * Create a Puck custom field for dataset reference selection.
 */
export function createDatasetRefField() {
  return {
    type: 'custom' as const,
    label: 'Dataset Reference',
    render: ({
      value,
      onChange,
      id,
      name,
      readOnly,
    }: {
      value: string;
      onChange: (val: string) => void;
      id: string;
      name: string;
      readOnly?: boolean;
    }) =>
      React.createElement(DatasetRefSelect, {
        value,
        onChange,
        id,
        name,
        readOnly,
      }),
  };
}
