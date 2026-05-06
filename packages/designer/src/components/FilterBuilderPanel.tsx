/**
 * FilterBuilderPanel — Design-time UI for creating/editing dashboard filters.
 *
 * Lets the designer add FilterDefinitions to the dashboard schema:
 * - Pick dataset + field
 * - Choose operator (equals, in, between, gt, lt, etc.)
 * - Set default value
 * - Configure scope (global, page, specific widgets)
 *
 * Emits FilterDefinition[] changes to the host.
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type { NormalizedDataset } from '@supersubset/data-model';
import type {
  FilterDefinition,
  FilterOptionDefinition,
  FilterOptionSource,
  FilterScope,
} from '@supersubset/schema';

export type { FilterDefinition, FilterScope } from '@supersubset/schema';

// ─── Constants ───────────────────────────────────────────────

export const FILTER_OPERATORS: { value: string; label: string; types: string[] }[] = [
  {
    value: 'equals',
    label: 'Equals',
    types: ['string', 'number', 'integer', 'boolean', 'date', 'datetime'],
  },
  {
    value: 'not_equals',
    label: 'Not equals',
    types: ['string', 'number', 'integer', 'boolean', 'date', 'datetime'],
  },
  { value: 'in', label: 'In list', types: ['string', 'number', 'integer'] },
  { value: 'not_in', label: 'Not in list', types: ['string', 'number', 'integer'] },
  { value: 'contains', label: 'Contains', types: ['string'] },
  { value: 'not_contains', label: 'Does not contain', types: ['string'] },
  { value: 'starts_with', label: 'Starts with', types: ['string'] },
  { value: 'gt', label: 'Greater than', types: ['number', 'integer', 'date', 'datetime'] },
  {
    value: 'gte',
    label: 'Greater than or equal',
    types: ['number', 'integer', 'date', 'datetime'],
  },
  { value: 'lt', label: 'Less than', types: ['number', 'integer', 'date', 'datetime'] },
  { value: 'lte', label: 'Less than or equal', types: ['number', 'integer', 'date', 'datetime'] },
  { value: 'between', label: 'Between', types: ['number', 'integer', 'date', 'datetime'] },
  {
    value: 'is_null',
    label: 'Is null',
    types: ['string', 'number', 'integer', 'boolean', 'date', 'datetime', 'json', 'unknown'],
  },
  {
    value: 'is_not_null',
    label: 'Is not null',
    types: ['string', 'number', 'integer', 'boolean', 'date', 'datetime', 'json', 'unknown'],
  },
];

const FILTER_CONTROL_OPTIONS = [
  { value: 'select', label: 'Dropdown (single)' },
  { value: 'multi-select', label: 'Dropdown (multiple)' },
  { value: 'range', label: 'Range slider' },
  { value: 'date', label: 'Date picker' },
  { value: 'text', label: 'Text search' },
] as const;

type SupportedFilterControlType = (typeof FILTER_CONTROL_OPTIONS)[number]['value'];

const LEGACY_FILTER_CONTROL_TYPE_MAP: Record<string, SupportedFilterControlType> = {
  'date-range': 'date',
};

const SELECT_FILTER_CONTROL_TYPES = new Set<SupportedFilterControlType>(['select', 'multi-select']);

type StaticFilterOptionSource = Extract<FilterOptionSource, { kind: 'static' }>;
type FieldFilterOptionSource = Extract<FilterOptionSource, { kind: 'field' }>;

function isSelectFilterControlType(type: string): type is 'select' | 'multi-select' {
  return SELECT_FILTER_CONTROL_TYPES.has(type as SupportedFilterControlType);
}

function getDefaultStaticOption(options: FilterOptionDefinition[]): FilterOptionDefinition {
  let optionNumber = options.length + 1;
  let candidateValue = `option-${optionNumber}`;

  while (options.some((option) => option.value === candidateValue)) {
    optionNumber += 1;
    candidateValue = `option-${optionNumber}`;
  }

  return {
    value: candidateValue,
    label: `Option ${optionNumber}`,
  };
}

function createStaticOptionSource(): StaticFilterOptionSource {
  return {
    kind: 'static',
    completeness: 'complete',
    options: [],
  };
}

function createFieldOptionSource(): FieldFilterOptionSource {
  return {
    kind: 'field',
    strategy: 'search',
    maxOptions: 50,
    minSearchChars: 2,
  };
}

function coercePositiveInteger(value: string): number | undefined {
  if (value.trim().length === 0) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

function normalizeFilterControlType(type: string): SupportedFilterControlType {
  if (type in LEGACY_FILTER_CONTROL_TYPE_MAP) {
    return LEGACY_FILTER_CONTROL_TYPE_MAP[type];
  }

  const supportedOption = FILTER_CONTROL_OPTIONS.find((option) => option.value === type);
  return supportedOption?.value ?? 'select';
}

function normalizeFilterDefinition(filter: FilterDefinition): FilterDefinition {
  const normalizedType = normalizeFilterControlType(filter.type);

  if (normalizedType === filter.type) {
    return filter;
  }

  return {
    ...filter,
    type: normalizedType,
  };
}

function getNormalizedFiltersNeedingMigration(
  filters: FilterDefinition[],
): FilterDefinition[] | null {
  let normalizedFilters: FilterDefinition[] | undefined;

  filters.forEach((filter, index) => {
    const normalizedFilter = normalizeFilterDefinition(filter);

    if (normalizedFilter === filter) {
      normalizedFilters?.push(filter);
      return;
    }

    normalizedFilters ??= filters.slice(0, index);
    normalizedFilters.push(normalizedFilter);
  });

  return normalizedFilters ?? null;
}

// ─── Props ────────────────────────────────────────────────────

export interface FilterBuilderPanelProps {
  /** Current filters */
  filters: FilterDefinition[];
  /** Called when filters change */
  onChange: (filters: FilterDefinition[]) => void;
  /** Available datasets */
  datasets: NormalizedDataset[];
  /** Available page IDs (for page-scoped filters) */
  pageIds?: string[];
  /** Available widget IDs (for widget-scoped filters) */
  widgetIds?: string[];
  /** Optional class name */
  className?: string;
}

// ─── Sub-components ──────────────────────────────────────────

interface FilterEditorProps {
  filter: FilterDefinition;
  datasets: NormalizedDataset[];
  pageIds: string[];
  widgetIds: string[];
  onUpdate: (filter: FilterDefinition) => void;
  onDelete: () => void;
}

function FilterEditor({
  filter,
  datasets,
  pageIds,
  widgetIds,
  onUpdate,
  onDelete,
}: FilterEditorProps) {
  const dataset = useMemo(
    () => datasets.find((d) => d.id === filter.datasetRef),
    [datasets, filter.datasetRef],
  );

  const field = useMemo(
    () => dataset?.fields.find((f) => f.id === filter.fieldRef),
    [dataset, filter.fieldRef],
  );

  const applicableOperators = useMemo(() => {
    const dt = field?.dataType ?? 'string';
    return FILTER_OPERATORS.filter((op) => op.types.includes(dt));
  }, [field]);
  const normalizedFilterType = useMemo(
    () => normalizeFilterControlType(filter.type),
    [filter.type],
  );

  const handleChange = useCallback(
    (patch: Partial<FilterDefinition>) => {
      onUpdate(normalizeFilterDefinition({ ...filter, ...patch }));
    },
    [filter, onUpdate],
  );

  const handleScopeChange = useCallback(
    (scopeType: string) => {
      let scope: FilterScope;
      switch (scopeType) {
        case 'page':
          scope = { type: 'page', pageId: pageIds[0] ?? '' };
          break;
        case 'widgets':
          scope = { type: 'widgets', widgetIds: [] };
          break;
        default:
          scope = { type: 'global' };
      }
      handleChange({ scope });
    },
    [handleChange, pageIds],
  );

  const selectStyle: React.CSSProperties = {
    padding: '4px 8px',
    borderRadius: 4,
    border: '1px solid #d9d9d9',
    fontSize: 12,
    flex: 1,
    minWidth: 0,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: '#555',
    marginBottom: 2,
  };
  const titleInputId = `ss-filter-title-${filter.id}`;
  const datasetSelectId = `ss-filter-dataset-${filter.id}`;
  const fieldSelectId = `ss-filter-field-${filter.id}`;
  const operatorSelectId = `ss-filter-operator-${filter.id}`;
  const defaultInputId = `ss-filter-default-${filter.id}`;
  const typeSelectId = `ss-filter-type-${filter.id}`;
  const pageScopeSelectId = `ss-filter-scope-page-${filter.id}`;
  const optionSourceSelectId = `ss-filter-option-source-${filter.id}`;
  const staticCompletenessSelectId = `ss-filter-option-completeness-${filter.id}`;
  const fieldStrategySelectId = `ss-filter-option-strategy-${filter.id}`;
  const fieldMaxOptionsInputId = `ss-filter-option-max-options-${filter.id}`;
  const fieldMinSearchCharsInputId = `ss-filter-option-min-search-${filter.id}`;

  const staticOptionSource =
    filter.optionSource?.kind === 'static' ? filter.optionSource : undefined;
  const fieldOptionSource = filter.optionSource?.kind === 'field' ? filter.optionSource : undefined;
  const optionSourceKind = filter.optionSource?.kind ?? 'none';

  const handleControlTypeChange = useCallback(
    (nextType: SupportedFilterControlType) => {
      const nextPatch: Partial<FilterDefinition> = { type: nextType };

      if (nextType === 'multi-select' && !['in', 'not_in'].includes(filter.operator)) {
        nextPatch.operator = 'in';
      }

      handleChange(nextPatch);
    },
    [filter.operator, handleChange],
  );

  const handleOptionSourceKindChange = useCallback(
    (nextKind: 'none' | FilterOptionSource['kind']) => {
      if (nextKind === 'none') {
        handleChange({ optionSource: undefined });
        return;
      }

      if (filter.optionSource?.kind === nextKind) {
        return;
      }

      handleChange({
        optionSource:
          nextKind === 'static' ? createStaticOptionSource() : createFieldOptionSource(),
      });
    },
    [filter.optionSource, handleChange],
  );

  const handleStaticOptionsChange = useCallback(
    (nextOptions: FilterOptionDefinition[]) => {
      const currentStaticSource =
        filter.optionSource?.kind === 'static' ? filter.optionSource : createStaticOptionSource();

      handleChange({
        optionSource: {
          ...currentStaticSource,
          options: nextOptions,
        },
      });
    },
    [filter.optionSource, handleChange],
  );

  const handleFieldOptionSourceChange = useCallback(
    (patch: Partial<Extract<FilterOptionSource, { kind: 'field' }>>) => {
      const currentFieldSource =
        filter.optionSource?.kind === 'field' ? filter.optionSource : createFieldOptionSource();

      handleChange({
        optionSource: {
          ...currentFieldSource,
          ...patch,
        },
      });
    },
    [filter.optionSource, handleChange],
  );

  return (
    <div
      data-testid={`filter-editor-${filter.id}`}
      style={{
        padding: 10,
        border: '1px solid #e0e0e0',
        borderRadius: 6,
        background: '#fafafa',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          id={titleInputId}
          name={`filter-title-${filter.id}`}
          aria-label="Filter title"
          type="text"
          value={filter.title ?? ''}
          onChange={(e) => handleChange({ title: e.target.value || undefined })}
          placeholder="Filter title..."
          data-testid={`filter-title-${filter.id}`}
          style={{ ...selectStyle, fontWeight: 600 }}
        />
        <button
          onClick={onDelete}
          data-testid={`filter-delete-${filter.id}`}
          style={{
            background: 'none',
            border: '1px solid #ff4d4f',
            color: '#ff4d4f',
            borderRadius: 4,
            padding: '4px 8px',
            cursor: 'pointer',
            fontSize: 11,
          }}
        >
          Remove
        </button>
      </div>

      {/* Dataset + Field */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <label htmlFor={datasetSelectId} style={labelStyle}>
            Dataset
          </label>
          <select
            id={datasetSelectId}
            name={`filter-dataset-${filter.id}`}
            value={filter.datasetRef}
            onChange={(e) =>
              handleChange({
                datasetRef: e.target.value,
                fieldRef: '',
                operator: 'equals',
              })
            }
            data-testid={`filter-dataset-${filter.id}`}
            style={selectStyle}
          >
            <option value="">Select dataset...</option>
            {datasets.map((ds) => (
              <option key={ds.id} value={ds.id}>
                {ds.label}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <label htmlFor={fieldSelectId} style={labelStyle}>
            Field
          </label>
          <select
            id={fieldSelectId}
            name={`filter-field-${filter.id}`}
            value={filter.fieldRef}
            onChange={(e) => handleChange({ fieldRef: e.target.value })}
            data-testid={`filter-field-${filter.id}`}
            style={selectStyle}
            disabled={!dataset}
          >
            <option value="">Select field...</option>
            {dataset?.fields.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label} ({f.dataType})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Operator + Default value */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <label htmlFor={operatorSelectId} style={labelStyle}>
            Operator
          </label>
          <select
            id={operatorSelectId}
            name={`filter-operator-${filter.id}`}
            value={filter.operator}
            onChange={(e) => handleChange({ operator: e.target.value })}
            data-testid={`filter-operator-${filter.id}`}
            style={selectStyle}
          >
            {applicableOperators.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <label htmlFor={defaultInputId} style={labelStyle}>
            Default value
          </label>
          <input
            id={defaultInputId}
            name={`filter-default-${filter.id}`}
            type="text"
            value={filter.defaultValue != null ? String(filter.defaultValue) : ''}
            onChange={(e) =>
              handleChange({
                defaultValue: e.target.value || undefined,
              })
            }
            placeholder="Optional default..."
            data-testid={`filter-default-${filter.id}`}
            style={selectStyle}
          />
        </div>
      </div>

      {/* Filter type */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <label htmlFor={typeSelectId} style={labelStyle}>
          Control type
        </label>
        <select
          id={typeSelectId}
          name={`filter-type-${filter.id}`}
          value={normalizedFilterType}
          onChange={(e) => handleControlTypeChange(e.target.value as SupportedFilterControlType)}
          data-testid={`filter-type-${filter.id}`}
          style={selectStyle}
        >
          {FILTER_CONTROL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {isSelectFilterControlType(normalizedFilterType) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label htmlFor={optionSourceSelectId} style={labelStyle}>
              Option source
            </label>
            <select
              id={optionSourceSelectId}
              name={`filter-option-source-${filter.id}`}
              value={optionSourceKind}
              onChange={(e) =>
                handleOptionSourceKindChange(e.target.value as 'none' | FilterOptionSource['kind'])
              }
              data-testid={`filter-option-source-kind-${filter.id}`}
              style={selectStyle}
            >
              <option value="none">Host/runtime fallback</option>
              <option value="static">Authored static options</option>
              <option value="field">Field-backed options</option>
            </select>
          </div>

          {staticOptionSource && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: 10,
                borderRadius: 6,
                border: '1px solid #dbe4ee',
                background: '#fff',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label htmlFor={staticCompletenessSelectId} style={labelStyle}>
                  Static list completeness
                </label>
                <select
                  id={staticCompletenessSelectId}
                  name={`filter-option-completeness-${filter.id}`}
                  value={staticOptionSource.completeness ?? 'complete'}
                  onChange={(e) =>
                    handleChange({
                      optionSource: {
                        ...staticOptionSource,
                        completeness: e.target.value as 'complete' | 'curated',
                      },
                    })
                  }
                  data-testid={`filter-option-completeness-${filter.id}`}
                  style={selectStyle}
                >
                  <option value="complete">Complete domain</option>
                  <option value="curated">Curated subset</option>
                </select>
              </div>

              {staticOptionSource.options.length === 0 ? (
                <div
                  data-testid={`filter-static-options-empty-${filter.id}`}
                  style={{ fontSize: 12, color: '#64748b' }}
                >
                  Add authored options to make this select self-contained in the schema.
                </div>
              ) : null}

              {staticOptionSource.options.map((option, index) => (
                <div
                  key={`${filter.id}-option-${index}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) auto auto',
                    gap: 8,
                    alignItems: 'center',
                  }}
                >
                  <input
                    type="text"
                    value={option.value}
                    placeholder="Value"
                    data-testid={`filter-static-option-value-${filter.id}-${index}`}
                    onChange={(e) => {
                      const nextOptions = [...staticOptionSource.options];
                      nextOptions[index] = {
                        ...nextOptions[index],
                        value: e.target.value,
                      };
                      handleStaticOptionsChange(nextOptions);
                    }}
                    style={selectStyle}
                  />
                  <input
                    type="text"
                    value={option.label ?? ''}
                    placeholder="Label (optional)"
                    data-testid={`filter-static-option-label-${filter.id}-${index}`}
                    onChange={(e) => {
                      const nextOptions = [...staticOptionSource.options];
                      const nextLabel = e.target.value;
                      nextOptions[index] = {
                        ...nextOptions[index],
                        label: nextLabel || undefined,
                      };
                      handleStaticOptionsChange(nextOptions);
                    }}
                    style={selectStyle}
                  />
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 12,
                      color: '#475569',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={option.disabled === true}
                      data-testid={`filter-static-option-disabled-${filter.id}-${index}`}
                      onChange={(e) => {
                        const nextOptions = [...staticOptionSource.options];
                        nextOptions[index] = {
                          ...nextOptions[index],
                          disabled: e.target.checked || undefined,
                        };
                        handleStaticOptionsChange(nextOptions);
                      }}
                    />
                    Disabled
                  </label>
                  <button
                    type="button"
                    data-testid={`filter-static-option-remove-${filter.id}-${index}`}
                    onClick={() => {
                      handleStaticOptionsChange(
                        staticOptionSource.options.filter(
                          (_option, optionIndex) => optionIndex !== index,
                        ),
                      );
                    }}
                    style={{
                      border: '1px solid #fecaca',
                      background: '#fff5f5',
                      color: '#b91c1c',
                      borderRadius: 4,
                      padding: '5px 8px',
                      cursor: 'pointer',
                      fontSize: 11,
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <button
                  type="button"
                  data-testid={`filter-static-option-add-${filter.id}`}
                  onClick={() => {
                    handleStaticOptionsChange([
                      ...staticOptionSource.options,
                      getDefaultStaticOption(staticOptionSource.options),
                    ]);
                  }}
                  style={{
                    alignSelf: 'flex-start',
                    border: '1px solid #bfdbfe',
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    borderRadius: 4,
                    padding: '5px 10px',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  + Add option
                </button>
                <div style={{ fontSize: 12, color: '#64748b', textAlign: 'right' }}>
                  Static options ship in the dashboard schema and do not need host lookups.
                </div>
              </div>
            </div>
          )}

          {fieldOptionSource && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: 10,
                borderRadius: 6,
                border: '1px solid #dbe4ee',
                background: '#fff',
              }}
            >
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label htmlFor={fieldStrategySelectId} style={labelStyle}>
                    Resolution strategy
                  </label>
                  <select
                    id={fieldStrategySelectId}
                    name={`filter-option-strategy-${filter.id}`}
                    value={fieldOptionSource.strategy}
                    onChange={(e) =>
                      handleFieldOptionSourceChange({
                        strategy: e.target.value as 'preload' | 'search',
                      })
                    }
                    data-testid={`filter-option-strategy-${filter.id}`}
                    style={selectStyle}
                  >
                    <option value="search">Search on demand</option>
                    <option value="preload">Preload distinct values</option>
                  </select>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label htmlFor={fieldMaxOptionsInputId} style={labelStyle}>
                    Max options
                  </label>
                  <input
                    id={fieldMaxOptionsInputId}
                    name={`filter-option-max-options-${filter.id}`}
                    type="number"
                    min={1}
                    value={fieldOptionSource.maxOptions ?? ''}
                    onChange={(e) =>
                      handleFieldOptionSourceChange({
                        maxOptions: coercePositiveInteger(e.target.value),
                      })
                    }
                    data-testid={`filter-option-max-options-${filter.id}`}
                    style={selectStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label htmlFor={fieldMinSearchCharsInputId} style={labelStyle}>
                  Minimum search characters
                </label>
                <input
                  id={fieldMinSearchCharsInputId}
                  name={`filter-option-min-search-${filter.id}`}
                  type="number"
                  min={1}
                  value={fieldOptionSource.minSearchChars ?? ''}
                  onChange={(e) =>
                    handleFieldOptionSourceChange({
                      minSearchChars: coercePositiveInteger(e.target.value),
                    })
                  }
                  data-testid={`filter-option-min-search-${filter.id}`}
                  style={selectStyle}
                />
              </div>

              <div
                data-testid={`filter-option-field-note-${filter.id}`}
                style={{ fontSize: 12, color: '#64748b' }}
              >
                Field-backed options require runtime host support. Hosts may satisfy this with a
                dedicated option resolver or, during migration, a compatibility fallback.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scope */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={labelStyle}>Scope</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['global', 'page', 'widgets'] as const).map((st) => (
            <label key={st} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
              <input
                id={`ss-filter-scope-${st}-${filter.id}`}
                type="radio"
                name={`scope-${filter.id}`}
                aria-label={`Filter scope ${st}`}
                value={st}
                checked={filter.scope.type === st}
                onChange={() => handleScopeChange(st)}
                data-testid={`filter-scope-${st}-${filter.id}`}
              />
              {st.charAt(0).toUpperCase() + st.slice(1)}
            </label>
          ))}
        </div>

        {/* Page selector */}
        {filter.scope.type === 'page' && (
          <select
            id={pageScopeSelectId}
            name={`filter-scope-page-${filter.id}`}
            aria-label="Filter scope page"
            value={(filter.scope as { type: 'page'; pageId: string }).pageId}
            onChange={(e) => handleChange({ scope: { type: 'page', pageId: e.target.value } })}
            data-testid={`filter-scope-page-select-${filter.id}`}
            style={selectStyle}
          >
            {pageIds.map((pid) => (
              <option key={pid} value={pid}>
                {pid}
              </option>
            ))}
          </select>
        )}

        {/* Widget multi-select */}
        {filter.scope.type === 'widgets' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {widgetIds.map((wid) => {
              const selected = (
                filter.scope as { type: 'widgets'; widgetIds: string[] }
              ).widgetIds.includes(wid);
              return (
                <label
                  key={wid}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                >
                  <input
                    id={`ss-filter-scope-widget-${wid}-${filter.id}`}
                    name={`filter-scope-widgets-${filter.id}`}
                    aria-label={`Apply filter to widget ${wid}`}
                    type="checkbox"
                    checked={selected}
                    onChange={() => {
                      const current = (filter.scope as { type: 'widgets'; widgetIds: string[] })
                        .widgetIds;
                      const next = selected
                        ? current.filter((id) => id !== wid)
                        : [...current, wid];
                      handleChange({
                        scope: { type: 'widgets', widgetIds: next },
                      });
                    }}
                    data-testid={`filter-scope-widget-${wid}-${filter.id}`}
                  />
                  {wid}
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main panel ──────────────────────────────────────────────

let nextId = 1;
function generateFilterId(): string {
  return `filter-${Date.now()}-${nextId++}`;
}

export function FilterBuilderPanel({
  filters,
  onChange,
  datasets,
  pageIds = [],
  widgetIds = [],
  className,
}: FilterBuilderPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const normalizedFilters = useMemo(() => getNormalizedFiltersNeedingMigration(filters), [filters]);
  const normalizedFiltersKey = useMemo(
    () => (normalizedFilters ? JSON.stringify(normalizedFilters) : null),
    [normalizedFilters],
  );
  const latestOnChangeRef = useRef(onChange);
  const lastNormalizedFiltersKeyRef = useRef<string | null>(null);
  const pendingAddedFilterIdRef = useRef<string | null>(null);

  useEffect(() => {
    latestOnChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!normalizedFilters || !normalizedFiltersKey) {
      lastNormalizedFiltersKeyRef.current = null;
      return;
    }

    if (lastNormalizedFiltersKeyRef.current === normalizedFiltersKey) {
      return;
    }

    lastNormalizedFiltersKeyRef.current = normalizedFiltersKey;
    latestOnChangeRef.current(normalizedFilters);
  }, [normalizedFilters, normalizedFiltersKey]);

  useEffect(() => {
    const pendingAddedFilterId = pendingAddedFilterIdRef.current;
    if (!pendingAddedFilterId) {
      return;
    }

    const editor = panelRef.current?.querySelector<HTMLElement>(
      `[data-testid="filter-editor-${pendingAddedFilterId}"]`,
    );
    if (!editor) {
      return;
    }

    pendingAddedFilterIdRef.current = null;
    editor.scrollIntoView({ block: 'nearest', inline: 'nearest' });

    const titleInput = editor.querySelector<HTMLInputElement>(
      `[data-testid="filter-title-${pendingAddedFilterId}"]`,
    );
    if (titleInput) {
      titleInput.focus();
      titleInput.select();
    }
  }, [filters]);

  const handleAdd = useCallback(() => {
    const defaultDataset = datasets[0]?.id ?? '';
    const newFilterId = generateFilterId();
    const newFilter: FilterDefinition = {
      id: newFilterId,
      type: 'select',
      fieldRef: '',
      datasetRef: defaultDataset,
      operator: 'equals',
      scope: { type: 'global' },
    };
    pendingAddedFilterIdRef.current = newFilterId;
    onChange([...filters, newFilter]);
  }, [filters, onChange, datasets]);

  const handleUpdate = useCallback(
    (index: number, updated: FilterDefinition) => {
      const next = [...filters];
      next[index] = updated;
      onChange(next);
    },
    [filters, onChange],
  );

  const handleDelete = useCallback(
    (index: number) => {
      onChange(filters.filter((_, i) => i !== index));
    },
    [filters, onChange],
  );

  return (
    <div
      ref={panelRef}
      className={className}
      data-testid="filter-builder-panel"
      style={{
        fontFamily: 'sans-serif',
        fontSize: 13,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Filters ({filters.length})</span>
        <button
          onClick={handleAdd}
          data-testid="add-filter"
          style={{
            padding: '4px 12px',
            borderRadius: 4,
            border: '1px solid #1677ff',
            background: '#1677ff',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          + Add filter
        </button>
      </div>

      {filters.length === 0 && (
        <div
          style={{ textAlign: 'center', color: '#999', padding: 24, fontSize: 12 }}
          data-testid="no-filters"
        >
          No filters defined. Add a filter to enable interactive data exploration.
        </div>
      )}

      {filters.map((filter, index) => (
        <FilterEditor
          key={filter.id}
          filter={filter}
          datasets={datasets}
          pageIds={pageIds}
          widgetIds={widgetIds}
          onUpdate={(f) => handleUpdate(index, f)}
          onDelete={() => handleDelete(index)}
        />
      ))}
    </div>
  );
}
