/**
 * FilterBar — renders dashboard-level filter controls from FilterDefinition[].
 * Uses plain HTML elements with inline styles for a clean, horizontal layout.
 */
import { createElement, useCallback, type ReactNode } from 'react';
import type { FilterDefinition, DatasetDefinition } from '@supersubset/schema';
import { useFilters } from '../filters/FilterEngine';

// ─── Styles ──────────────────────────────────────────────────

const BAR_STYLE: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '12px',
  padding: '10px 16px',
  background: 'var(--ss-filter-bar-bg, #f7f8fa)',
  borderRadius: '8px',
  border: '1px solid var(--ss-filter-bar-border, #e4e7eb)',
  marginBottom: '16px',
  fontFamily: 'var(--ss-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
  fontSize: '13px',
};

const CONTROL_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

const LABEL_STYLE: React.CSSProperties = {
  color: 'var(--ss-filter-label-color, #5f6368)',
  fontWeight: 500,
  fontSize: '12px',
  letterSpacing: '0.02em',
  textTransform: 'uppercase' as const,
  whiteSpace: 'nowrap' as const,
};

const INPUT_STYLE: React.CSSProperties = {
  padding: '5px 10px',
  borderRadius: '6px',
  border: '1px solid var(--ss-filter-input-border, #d1d5db)',
  background: '#fff',
  fontSize: '13px',
  color: 'var(--ss-color-text, #1f1f1f)',
  outline: 'none',
  minWidth: '120px',
};

const RESET_STYLE: React.CSSProperties = {
  marginLeft: 'auto',
  padding: '5px 12px',
  borderRadius: '6px',
  border: '1px solid var(--ss-filter-input-border, #d1d5db)',
  background: 'transparent',
  color: 'var(--ss-filter-label-color, #5f6368)',
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
  whiteSpace: 'nowrap' as const,
};

const RANGE_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
};

// ─── Props ───────────────────────────────────────────────────

export interface FilterBarProps {
  filters: FilterDefinition[];
  datasets?: DatasetDefinition[];
  /** Static option values per filter ID — host app provides these from query results */
  filterOptions?: Record<string, string[]>;
  className?: string;
}

// ─── Component ───────────────────────────────────────────────

export function FilterBar({ filters, datasets, filterOptions, className }: FilterBarProps) {
  const { state, setFilter, resetAll } = useFilters();

  if (filters.length === 0) return null;

  const hasActiveFilters = Object.keys(state.values).length > 0;

  return createElement(
    'div',
    { className: `ss-filter-bar ${className ?? ''}`.trim(), style: BAR_STYLE },
    ...filters.map((f) =>
      createElement(FilterControl, {
        key: f.id,
        filter: f,
        value: state.values[f.id],
        datasets,
        options: filterOptions?.[f.id],
        onChangeValue: (value: unknown) => setFilter(f.id, value),
      }),
    ),
    hasActiveFilters
      ? createElement(
          'button',
          {
            className: 'ss-filter-reset',
            type: 'button',
            onClick: resetAll,
            style: RESET_STYLE,
          },
          '✕ Clear filters',
        )
      : null,
  );
}

// ─── Individual Filter Control ───────────────────────────────

interface FilterControlProps {
  filter: FilterDefinition;
  value: unknown;
  datasets?: DatasetDefinition[];
  options?: string[];
  onChangeValue: (value: unknown) => void;
}

function FilterControl({ filter, value, datasets, options, onChangeValue }: FilterControlProps) {
  const label = filter.title ?? filter.fieldRef;
  const resolvedOptions = options ?? getFieldOptions(filter, datasets);
  const inputIdBase = `ss-filter-${filter.id}`;

  return createElement(
    'div',
    {
      className: 'ss-filter-control',
      style: CONTROL_STYLE,
      'data-ss-filter': filter.id,
      'data-ss-filter-type': filter.type,
    },
    createElement(
      'label',
      { className: 'ss-filter-label', style: LABEL_STYLE, htmlFor: `${inputIdBase}-primary` },
      label,
    ),
    renderInput(filter.type, value, onChangeValue, resolvedOptions, {
      inputIdBase,
      inputName: filter.id,
      label,
    }),
  );
}

function renderInput(
  type: string,
  value: unknown,
  onChange: (value: unknown) => void,
  options: string[],
  metadata: { inputIdBase: string; inputName: string; label: string },
): ReactNode {
  switch (type) {
    case 'select':
      return renderSelect(value, onChange, options, metadata);
    case 'text':
      return renderText(value, onChange, metadata);
    case 'range':
      return renderRange(value, onChange, metadata);
    case 'date':
      return renderDate(value, onChange, metadata);
    default:
      return renderText(value, onChange, metadata);
  }
}

function renderSelect(
  value: unknown,
  onChange: (value: unknown) => void,
  options: string[],
  metadata: { inputIdBase: string; inputName: string },
): ReactNode {
  return createElement(
    'select',
    {
      className: 'ss-filter-select',
      id: `${metadata.inputIdBase}-primary`,
      name: metadata.inputName,
      style: INPUT_STYLE,
      value: (value as string) ?? '',
      onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
        const v = e.target.value;
        onChange(v === '' ? undefined : v);
      },
    },
    createElement('option', { value: '' }, 'All'),
    ...options.map((opt) =>
      createElement('option', { key: opt, value: opt }, opt),
    ),
  );
}

function renderText(
  value: unknown,
  onChange: (value: unknown) => void,
  metadata: { inputIdBase: string; inputName: string },
): ReactNode {
  return createElement('input', {
    className: 'ss-filter-text',
    id: `${metadata.inputIdBase}-primary`,
    name: metadata.inputName,
    type: 'text',
    style: INPUT_STYLE,
    value: (value as string) ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      onChange(v === '' ? undefined : v);
    },
    placeholder: 'Search…',
  });
}

function renderRange(
  value: unknown,
  onChange: (value: unknown) => void,
  metadata: { inputIdBase: string; inputName: string; label: string },
): ReactNode {
  const range = (value as { min?: number; max?: number }) ?? {};
  return createElement(
    'div',
    { className: 'ss-filter-range', style: RANGE_STYLE },
    createElement('input', {
      className: 'ss-filter-range-min',
      id: `${metadata.inputIdBase}-primary`,
      name: `${metadata.inputName}-min`,
      'aria-label': `${metadata.label} minimum`,
      type: 'number',
      style: { ...INPUT_STYLE, minWidth: '80px', width: '80px' },
      value: range.min ?? '',
      placeholder: 'Min',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value === '' ? undefined : Number(e.target.value);
        onChange({ ...range, min: v });
      },
    }),
    createElement('span', { style: { color: '#9ca3af' } }, '–'),
    createElement('input', {
      className: 'ss-filter-range-max',
      name: `${metadata.inputName}-max`,
      'aria-label': `${metadata.label} maximum`,
      type: 'number',
      style: { ...INPUT_STYLE, minWidth: '80px', width: '80px' },
      value: range.max ?? '',
      placeholder: 'Max',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value === '' ? undefined : Number(e.target.value);
        onChange({ ...range, max: v });
      },
    }),
  );
}

// ─── Relative Date Presets ────────────────────────────────────

export const DATE_PRESETS: { value: string; label: string }[] = [
  { value: '', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This week' },
  { value: 'last_week', label: 'Last week' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'this_quarter', label: 'This quarter' },
  { value: 'last_quarter', label: 'Last quarter' },
  { value: 'this_year', label: 'This year' },
  { value: 'last_year', label: 'Last year' },
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'last_90_days', label: 'Last 90 days' },
  { value: 'last_365_days', label: 'Last 365 days' },
  { value: 'custom', label: 'Custom range…' },
];

/**
 * Resolve a relative date preset to a concrete { start, end } range (ISO strings).
 * Returns undefined for empty/unknown presets.
 */
export function resolveRelativeDate(preset: string, now = new Date()): { start: string; end: string } | undefined {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  switch (preset) {
    case 'today':
      return { start: iso(today), end: iso(today) };
    case 'yesterday': {
      const d = new Date(today); d.setDate(d.getDate() - 1);
      return { start: iso(d), end: iso(d) };
    }
    case 'this_week': {
      const d = new Date(today); d.setDate(d.getDate() - d.getDay());
      return { start: iso(d), end: iso(today) };
    }
    case 'last_week': {
      const end = new Date(today); end.setDate(end.getDate() - end.getDay() - 1);
      const start = new Date(end); start.setDate(start.getDate() - 6);
      return { start: iso(start), end: iso(end) };
    }
    case 'this_month':
      return { start: iso(new Date(today.getFullYear(), today.getMonth(), 1)), end: iso(today) };
    case 'last_month': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: iso(start), end: iso(end) };
    }
    case 'this_quarter': {
      const q = Math.floor(today.getMonth() / 3);
      return { start: iso(new Date(today.getFullYear(), q * 3, 1)), end: iso(today) };
    }
    case 'last_quarter': {
      const q = Math.floor(today.getMonth() / 3);
      const start = new Date(today.getFullYear(), (q - 1) * 3, 1);
      const end = new Date(today.getFullYear(), q * 3, 0);
      return { start: iso(start), end: iso(end) };
    }
    case 'this_year':
      return { start: iso(new Date(today.getFullYear(), 0, 1)), end: iso(today) };
    case 'last_year':
      return { start: iso(new Date(today.getFullYear() - 1, 0, 1)), end: iso(new Date(today.getFullYear() - 1, 11, 31)) };
    case 'last_7_days': {
      const d = new Date(today); d.setDate(d.getDate() - 6);
      return { start: iso(d), end: iso(today) };
    }
    case 'last_30_days': {
      const d = new Date(today); d.setDate(d.getDate() - 29);
      return { start: iso(d), end: iso(today) };
    }
    case 'last_90_days': {
      const d = new Date(today); d.setDate(d.getDate() - 89);
      return { start: iso(d), end: iso(today) };
    }
    case 'last_365_days': {
      const d = new Date(today); d.setDate(d.getDate() - 364);
      return { start: iso(d), end: iso(today) };
    }
    default:
      return undefined;
  }
}

function renderDate(
  value: unknown,
  onChange: (value: unknown) => void,
  metadata: { inputIdBase: string; inputName: string; label: string },
): ReactNode {
  const dateVal = value as { preset?: string; start?: string; end?: string } | string | undefined;
  const isObj = typeof dateVal === 'object' && dateVal !== null;
  const preset = isObj ? (dateVal as { preset?: string }).preset ?? '' : '';
  const isCustom = preset === 'custom';
  const customStart = isObj ? (dateVal as { start?: string }).start ?? '' : (typeof dateVal === 'string' ? dateVal : '');
  const customEnd = isObj ? (dateVal as { end?: string }).end ?? '' : '';

  return createElement(
    'div',
    { className: 'ss-filter-date', style: { display: 'flex', alignItems: 'center', gap: '6px' } },
    // Preset dropdown
    createElement(
      'select',
      {
        className: 'ss-filter-date-preset',
        id: `${metadata.inputIdBase}-primary`,
        name: `${metadata.inputName}-preset`,
        style: INPUT_STYLE,
        value: preset,
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
          const v = e.target.value;
          if (v === '') {
            onChange(undefined);
          } else if (v === 'custom') {
            onChange({ preset: 'custom', start: '', end: '' });
          } else {
            const resolved = resolveRelativeDate(v);
            onChange({ preset: v, ...(resolved ?? {}) });
          }
        },
      },
      ...DATE_PRESETS.map((p) =>
        createElement('option', { key: p.value, value: p.value }, p.label),
      ),
    ),
    // Custom date pickers (only when "Custom range…" is selected)
    isCustom
      ? createElement(
          'div',
          { style: RANGE_STYLE },
          createElement('input', {
            name: `${metadata.inputName}-start`,
            'aria-label': `${metadata.label} start date`,
            type: 'date',
            style: { ...INPUT_STYLE, minWidth: '130px' },
            value: customStart,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
              onChange({ preset: 'custom', start: e.target.value, end: customEnd });
            },
          }),
          createElement('span', { style: { color: '#9ca3af' } }, '–'),
          createElement('input', {
            name: `${metadata.inputName}-end`,
            'aria-label': `${metadata.label} end date`,
            type: 'date',
            style: { ...INPUT_STYLE, minWidth: '130px' },
            value: customEnd,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
              onChange({ preset: 'custom', start: customStart, end: e.target.value });
            },
          }),
        )
      : null,
  );
}

// ─── Field Options ───────────────────────────────────────────

/**
 * Extract distinct options for a select filter from dataset field metadata.
 * In a real scenario, options come from query results. For now we return
 * an empty array when datasets provide no enum values.
 */
function getFieldOptions(
  filter: FilterDefinition,
  datasets?: DatasetDefinition[],
): string[] {
  if (!datasets) return [];
  const ds = datasets.find((d) => d.id === filter.datasetRef);
  if (!ds) return [];
  // Field metadata doesn't carry enum values in the current schema.
  // The host app should provide options via config if needed.
  return [];
}
