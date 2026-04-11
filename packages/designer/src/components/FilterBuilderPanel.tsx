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
import React, { useState, useCallback, useMemo } from 'react';
import type { NormalizedDataset, NormalizedField } from '@supersubset/data-model';

// Re-declare filter types inline to avoid hard dep on schema at runtime.
// These match the canonical FilterDefinition/FilterScope exactly.
export interface FilterDefinition {
  id: string;
  title?: string;
  type: string;
  fieldRef: string;
  datasetRef: string;
  operator: string;
  defaultValue?: unknown;
  scope: FilterScope;
}

export type FilterScope =
  | { type: 'global' }
  | { type: 'page'; pageId: string }
  | { type: 'widgets'; widgetIds: string[] };

// ─── Constants ───────────────────────────────────────────────

export const FILTER_OPERATORS: { value: string; label: string; types: string[] }[] = [
  { value: 'equals', label: 'Equals', types: ['string', 'number', 'integer', 'boolean', 'date', 'datetime'] },
  { value: 'not_equals', label: 'Not equals', types: ['string', 'number', 'integer', 'boolean', 'date', 'datetime'] },
  { value: 'in', label: 'In list', types: ['string', 'number', 'integer'] },
  { value: 'not_in', label: 'Not in list', types: ['string', 'number', 'integer'] },
  { value: 'contains', label: 'Contains', types: ['string'] },
  { value: 'not_contains', label: 'Does not contain', types: ['string'] },
  { value: 'starts_with', label: 'Starts with', types: ['string'] },
  { value: 'gt', label: 'Greater than', types: ['number', 'integer', 'date', 'datetime'] },
  { value: 'gte', label: 'Greater than or equal', types: ['number', 'integer', 'date', 'datetime'] },
  { value: 'lt', label: 'Less than', types: ['number', 'integer', 'date', 'datetime'] },
  { value: 'lte', label: 'Less than or equal', types: ['number', 'integer', 'date', 'datetime'] },
  { value: 'between', label: 'Between', types: ['number', 'integer', 'date', 'datetime'] },
  { value: 'is_null', label: 'Is null', types: ['string', 'number', 'integer', 'boolean', 'date', 'datetime', 'json', 'unknown'] },
  { value: 'is_not_null', label: 'Is not null', types: ['string', 'number', 'integer', 'boolean', 'date', 'datetime', 'json', 'unknown'] },
];

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
    [datasets, filter.datasetRef]
  );

  const field = useMemo(
    () => dataset?.fields.find((f) => f.id === filter.fieldRef),
    [dataset, filter.fieldRef]
  );

  const applicableOperators = useMemo(() => {
    const dt = field?.dataType ?? 'string';
    return FILTER_OPERATORS.filter((op) => op.types.includes(dt));
  }, [field]);

  const handleChange = useCallback(
    (patch: Partial<FilterDefinition>) => {
      onUpdate({ ...filter, ...patch });
    },
    [filter, onUpdate]
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
    [handleChange, pageIds]
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
          <label htmlFor={datasetSelectId} style={labelStyle}>Dataset</label>
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
          <label htmlFor={fieldSelectId} style={labelStyle}>Field</label>
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
          <label htmlFor={operatorSelectId} style={labelStyle}>Operator</label>
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
          <label htmlFor={defaultInputId} style={labelStyle}>Default value</label>
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
        <label htmlFor={typeSelectId} style={labelStyle}>Control type</label>
        <select
          id={typeSelectId}
          name={`filter-type-${filter.id}`}
          value={filter.type}
          onChange={(e) => handleChange({ type: e.target.value })}
          data-testid={`filter-type-${filter.id}`}
          style={selectStyle}
        >
          <option value="select">Dropdown</option>
          <option value="multi-select">Multi-select</option>
          <option value="range">Range slider</option>
          <option value="date-range">Date range</option>
          <option value="text">Text search</option>
        </select>
      </div>

      {/* Scope */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={labelStyle}>Scope</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['global', 'page', 'widgets'] as const).map((st) => (
            <label
              key={st}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
            >
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
            onChange={(e) =>
              handleChange({ scope: { type: 'page', pageId: e.target.value } })
            }
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
                      const current = (
                        filter.scope as { type: 'widgets'; widgetIds: string[] }
                      ).widgetIds;
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
  const handleAdd = useCallback(() => {
    const defaultDataset = datasets[0]?.id ?? '';
    const newFilter: FilterDefinition = {
      id: generateFilterId(),
      type: 'select',
      fieldRef: '',
      datasetRef: defaultDataset,
      operator: 'equals',
      scope: { type: 'global' },
    };
    onChange([...filters, newFilter]);
  }, [filters, onChange, datasets]);

  const handleUpdate = useCallback(
    (index: number, updated: FilterDefinition) => {
      const next = [...filters];
      next[index] = updated;
      onChange(next);
    },
    [filters, onChange]
  );

  const handleDelete = useCallback(
    (index: number) => {
      onChange(filters.filter((_, i) => i !== index));
    },
    [filters, onChange]
  );

  return (
    <div
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
        <span style={{ fontWeight: 700, fontSize: 14 }}>
          Filters ({filters.length})
        </span>
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
