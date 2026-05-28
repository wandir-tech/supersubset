/**
 * FilterBar — renders dashboard-level filter controls from FilterDefinition[].
 * Uses plain HTML elements with inline styles for a clean, horizontal layout.
 */
import { createElement, useEffect, useId, useState, type ReactNode } from 'react';
import { resolveFilterOptionsWithAdapter, type QueryAdapter } from '@supersubset/data-model';
import type {
  FilterDefinition,
  DatasetDefinition,
  FilterOptionDefinition,
} from '@supersubset/schema';
import { useFilters } from '../filters/FilterEngine';
import {
  DATE_PRESETS,
  generateWeeklyDateRangeOptions,
  resolveRelativeDate,
} from '../filters/date-filter-utils';

// ─── Styles ──────────────────────────────────────────────────

type FilterBarLayout = 'horizontal' | 'vertical';

const BAR_BASE_STYLE: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  padding: '10px 16px',
  background: 'var(--ss-filter-bar-bg, #f7f8fa)',
  borderRadius: '8px',
  border: '1px solid var(--ss-filter-bar-border, #e4e7eb)',
  marginBottom: '16px',
  fontFamily:
    'var(--ss-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
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
  /** Legacy static option values per filter ID — compatibility fallback provided by the host */
  filterOptions?: Record<string, string[]>;
  /**
   * Host-provided query adapter used to resolve field-backed filter options.
   * If absent, field-backed filters render an unavailable state.
   */
  queryAdapter?: QueryAdapter;
  className?: string;
  layout?: FilterBarLayout;
}

interface ResolvedFilterOption {
  value: string;
  label: string;
  disabled?: boolean;
}

type ResolvedFilterOptionsState =
  | { kind: 'ready'; options: ResolvedFilterOption[] }
  | { kind: 'loading' }
  | { kind: 'unavailable'; message: string }
  | { kind: 'error'; message: string };

function getBarStyle(layout: FilterBarLayout): React.CSSProperties {
  if (layout === 'vertical') {
    return {
      ...BAR_BASE_STYLE,
      flexDirection: 'column',
      flexWrap: 'nowrap',
      alignItems: 'stretch',
    };
  }

  return {
    ...BAR_BASE_STYLE,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  };
}

function getResetStyle(layout: FilterBarLayout): React.CSSProperties {
  if (layout === 'vertical') {
    return {
      ...RESET_STYLE,
      marginLeft: 0,
      marginTop: '4px',
      alignSelf: 'flex-start',
    };
  }

  return RESET_STYLE;
}

// ─── Component ───────────────────────────────────────────────

export function FilterBar({
  filters,
  datasets,
  filterOptions,
  queryAdapter,
  className,
  layout = 'horizontal',
}: FilterBarProps) {
  const { state, setFilter, resetAll } = useFilters();
  const inputIdPrefix = useId();

  if (filters.length === 0) return null;

  const hasActiveFilters = Object.keys(state.values).length > 0;

  return createElement(
    'div',
    {
      className: `ss-filter-bar ${className ?? ''}`.trim(),
      style: getBarStyle(layout),
      'data-ss-filter-bar-layout': layout,
    },
    ...filters.map((f) =>
      createElement(FilterControl, {
        key: f.id,
        filter: f,
        value: state.values[f.id],
        queryAdapter,
        inputIdPrefix,
        legacyOptions: filterOptions?.[f.id],
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
            style: getResetStyle(layout),
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
  queryAdapter?: QueryAdapter;
  inputIdPrefix: string;
  legacyOptions?: string[];
  onChangeValue: (value: unknown) => void;
}

function FilterControl({
  filter,
  value,
  queryAdapter,
  inputIdPrefix,
  legacyOptions,
  onChangeValue,
}: FilterControlProps) {
  const label = filter.title ?? filter.fieldRef;
  const resolvedOptionsState = useResolveFilterOptions(filter, queryAdapter, legacyOptions);
  const inputIdBase = `${inputIdPrefix}-ss-filter-${filter.id}`;

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
    renderInput(filter, value, onChangeValue, resolvedOptionsState, {
      inputIdBase,
      inputName: filter.id,
      label,
    }),
  );
}

function renderInput(
  filter: FilterDefinition,
  value: unknown,
  onChange: (value: unknown) => void,
  optionsState: ResolvedFilterOptionsState,
  metadata: { inputIdBase: string; inputName: string; label: string },
): ReactNode {
  switch (filter.type) {
    case 'select':
      return renderSelect(value, onChange, optionsState, metadata);
    case 'multi-select':
      return renderMultiSelect(value, onChange, optionsState, metadata);
    case 'text':
      return renderText(value, onChange, metadata);
    case 'range':
      return renderRange(value, onChange, metadata);
    case 'date':
      return renderDate(filter, value, onChange, metadata);
    default:
      return renderText(value, onChange, metadata);
  }
}

function renderSelect(
  value: unknown,
  onChange: (value: unknown) => void,
  optionsState: ResolvedFilterOptionsState,
  metadata: { inputIdBase: string; inputName: string },
): ReactNode {
  const placeholder = placeholderForState(optionsState);
  const isInteractive = optionsState.kind === 'ready';
  const options =
    placeholder !== undefined
      ? [{ value: '', label: placeholder, disabled: true }]
      : (optionsState as { kind: 'ready'; options: ResolvedFilterOption[] }).options;

  return createElement(
    'select',
    {
      className: 'ss-filter-select',
      id: `${metadata.inputIdBase}-primary`,
      name: metadata.inputName,
      style: INPUT_STYLE,
      value: isInteractive ? ((value as string) ?? '') : '',
      disabled: !isInteractive,
      'data-ss-filter-options-state': optionsState.kind,
      onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
        const v = e.target.value;
        onChange(v === '' ? undefined : v);
      },
    },
    isInteractive ? createElement('option', { value: '' }, 'All') : null,
    ...options.map((opt) =>
      createElement(
        'option',
        { key: opt.value, value: opt.value, disabled: opt.disabled },
        opt.label,
      ),
    ),
  );
}

function renderMultiSelect(
  value: unknown,
  onChange: (value: unknown) => void,
  optionsState: ResolvedFilterOptionsState,
  metadata: { inputIdBase: string; inputName: string },
): ReactNode {
  const placeholder = placeholderForState(optionsState);
  const isInteractive = optionsState.kind === 'ready';
  const options =
    placeholder !== undefined
      ? [{ value: '', label: placeholder, disabled: true }]
      : (optionsState as { kind: 'ready'; options: ResolvedFilterOption[] }).options;
  const selectedValues = Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
    : typeof value === 'string' && value.length > 0
      ? [value]
      : [];

  return createElement(
    'select',
    {
      className: 'ss-filter-multi-select',
      id: `${metadata.inputIdBase}-primary`,
      name: metadata.inputName,
      multiple: true,
      size: isInteractive ? Math.min(Math.max(options.length, 3), 6) : 1,
      style: { ...INPUT_STYLE, minWidth: '160px', minHeight: '96px' },
      value: isInteractive ? selectedValues : [''],
      disabled: !isInteractive,
      'data-ss-filter-options-state': optionsState.kind,
      onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
        const nextValues = Array.from(e.target.selectedOptions)
          .map((option) => option.value)
          .filter((optionValue) => optionValue.length > 0);
        onChange(nextValues.length > 0 ? nextValues : undefined);
      },
    },
    ...options.map((opt) =>
      createElement(
        'option',
        { key: opt.value, value: opt.value, disabled: opt.disabled },
        opt.label,
      ),
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

function renderDate(
  filter: FilterDefinition,
  value: unknown,
  onChange: (value: unknown) => void,
  metadata: { inputIdBase: string; inputName: string; label: string },
): ReactNode {
  const dateVal = value as { preset?: string; start?: string; end?: string } | string | undefined;
  const isObj = typeof dateVal === 'object' && dateVal !== null;
  const dateConfig = filter.dateConfig;
  const isWeekly = dateConfig?.mode === 'weekly';
  const isRangeMode = dateConfig?.mode === 'range';
  const allowCustomRange = dateConfig?.allowCustomRange !== false;
  const preset = isObj ? ((dateVal as { preset?: string }).preset ?? '') : '';
  const isCustom =
    isRangeMode ||
    (allowCustomRange &&
      (preset === 'custom' || (!isWeekly && !preset && typeof dateVal === 'string')));
  const customStart = isObj
    ? ((dateVal as { start?: string }).start ?? '')
    : typeof dateVal === 'string'
      ? dateVal
      : '';
  const customEnd = isObj ? ((dateVal as { end?: string }).end ?? '') : '';
  const weeklyOptions = isWeekly ? generateWeeklyDateRangeOptions(dateConfig) : [];
  const selectedWeeklyValue =
    isWeekly && isObj && customStart && customEnd ? `week:${customStart}:${customEnd}` : '';
  const presetOptions =
    dateConfig?.presets && dateConfig.presets.length > 0
      ? DATE_PRESETS.filter(
          (presetOption) =>
            presetOption.value === '' ||
            presetOption.value === 'custom' ||
            dateConfig.presets?.includes(presetOption.value),
        )
      : DATE_PRESETS;

  return createElement(
    'div',
    { className: 'ss-filter-date', style: { display: 'flex', alignItems: 'center', gap: '6px' } },
    isRangeMode
      ? null
      : createElement(
          'select',
          {
            className: 'ss-filter-date-preset',
            id: `${metadata.inputIdBase}-primary`,
            name: `${metadata.inputName}-preset`,
            style: INPUT_STYLE,
            value: isWeekly ? selectedWeeklyValue : preset,
            onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
              const v = e.target.value;
              if (v === '') {
                onChange(undefined);
              } else if (isWeekly) {
                const option = weeklyOptions.find((candidate) => candidate.value === v);
                if (option) {
                  onChange({ preset: option.value, start: option.start, end: option.end });
                }
              } else if (v === 'custom') {
                onChange({ preset: 'custom', start: '', end: '' });
              } else {
                const resolved = resolveRelativeDate(v, new Date(), dateConfig);
                onChange({ preset: v, ...(resolved ?? {}) });
              }
            },
          },
          isWeekly ? createElement('option', { value: '' }, 'All time') : null,
          ...(isWeekly ? weeklyOptions : presetOptions).map((p) =>
            createElement('option', { key: p.value, value: p.value }, p.label),
          ),
        ),
    // Custom date pickers (only when custom ranges are enabled and selected)
    isCustom
      ? createElement(
          'div',
          { style: RANGE_STYLE },
          createElement('input', {
            id: isRangeMode ? `${metadata.inputIdBase}-primary` : undefined,
            name: `${metadata.inputName}-start`,
            'aria-label': `${metadata.label} start date`,
            type: 'date',
            style: { ...INPUT_STYLE, minWidth: '130px' },
            value: customStart,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
              onChange({
                ...(isRangeMode ? {} : { preset: 'custom' }),
                start: e.target.value,
                end: customEnd,
              });
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
              onChange({
                ...(isRangeMode ? {} : { preset: 'custom' }),
                start: customStart,
                end: e.target.value,
              });
            },
          }),
        )
      : null,
  );
}

// ─── Field Options ───────────────────────────────────────────

function placeholderForState(state: ResolvedFilterOptionsState): string | undefined {
  switch (state.kind) {
    case 'loading':
      return 'Loading options…';
    case 'unavailable':
      return state.message;
    case 'error':
      return state.message;
    case 'ready':
      return undefined;
  }
}

function normalizeStaticOption(option: FilterOptionDefinition): ResolvedFilterOption {
  return {
    value: option.value,
    label: option.label ?? option.value,
    disabled: option.disabled,
  };
}

function staticState(filter: FilterDefinition): ResolvedFilterOptionsState | null {
  if (filter.optionSource?.kind !== 'static') return null;
  if (filter.optionSource.options.length === 0) {
    return { kind: 'unavailable', message: 'No options configured' };
  }
  return { kind: 'ready', options: filter.optionSource.options.map(normalizeStaticOption) };
}

function legacyState(legacyOptions?: string[]): ResolvedFilterOptionsState | null {
  if (!legacyOptions || legacyOptions.length === 0) return null;
  return {
    kind: 'ready',
    options: legacyOptions.map((option) => ({ value: option, label: option })),
  };
}

/**
 * Resolve filter options for a single filter, handling static, field-backed,
 * legacy, and unavailable cases. Field-backed resolution is async via the
 * host-provided QueryAdapter. See ADR-009 §2.
 *
 * ADR-009 §3 mandates that `strategy: 'search'` filters must not auto-issue an
 * unbounded distinct query on initial render. Until the typeahead UI lands
 * (no debounced text input is wired through `FilterBar` yet), search-strategy
 * filters render an explicit unavailable state. `preload` keeps the immediate
 * fetch behavior, which is the safe path for low-cardinality fields.
 */
function useResolveFilterOptions(
  filter: FilterDefinition,
  queryAdapter: QueryAdapter | undefined,
  legacyOptions: string[] | undefined,
): ResolvedFilterOptionsState {
  const sync = staticState(filter);
  const fieldSource = filter.optionSource?.kind === 'field' ? filter.optionSource : undefined;
  const isFieldBacked = fieldSource !== undefined;
  const isSearchStrategy = fieldSource?.strategy === 'search';
  const fieldLimit = fieldSource?.maxOptions;

  const [fieldState, setFieldState] = useState<ResolvedFilterOptionsState>(() => {
    if (!isFieldBacked) return { kind: 'ready', options: [] };
    if (isSearchStrategy) {
      return {
        kind: 'unavailable',
        message:
          'Search-strategy field options require a typeahead input (not yet implemented). Use strategy: "preload" or a static option list.',
      };
    }
    return { kind: 'loading' };
  });

  useEffect(() => {
    if (!isFieldBacked) return;
    if (isSearchStrategy) {
      setFieldState({
        kind: 'unavailable',
        message:
          'Search-strategy field options require a typeahead input (not yet implemented). Use strategy: "preload" or a static option list.',
      });
      return;
    }
    if (!queryAdapter) {
      setFieldState({
        kind: 'unavailable',
        message: 'No query adapter available for field-backed options',
      });
      return;
    }

    let cancelled = false;
    setFieldState({ kind: 'loading' });
    void resolveFilterOptionsWithAdapter(queryAdapter, {
      filterId: filter.id,
      datasetId: filter.datasetRef,
      fieldId: filter.fieldRef,
      limit: fieldLimit,
    })
      .then((response) => {
        if (cancelled) return;
        if (response.options.length === 0) {
          setFieldState({ kind: 'unavailable', message: 'No values available' });
          return;
        }
        setFieldState({
          kind: 'ready',
          options: response.options.map((option) => ({
            value: option.value,
            label: option.label ?? option.value,
            disabled: option.disabled,
          })),
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Failed to load options';
        setFieldState({ kind: 'error', message });
      });

    return () => {
      cancelled = true;
    };
  }, [
    isFieldBacked,
    isSearchStrategy,
    queryAdapter,
    filter.id,
    filter.datasetRef,
    filter.fieldRef,
    fieldLimit,
  ]);

  if (sync) return sync;
  if (isFieldBacked) return fieldState;

  const legacy = legacyState(legacyOptions);
  if (legacy) return legacy;

  return { kind: 'unavailable', message: 'Options unavailable' };
}
