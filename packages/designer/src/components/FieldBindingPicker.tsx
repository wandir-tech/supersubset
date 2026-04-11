/**
 * FieldBindingPicker — Browse datasets and fields, bind them to chart roles.
 *
 * Shows available datasets and their fields organized by role (dimension, measure,
 * time, key). Users can drag or click fields to bind them to chart properties.
 *
 * Consumes NormalizedDataset[] from the data-model package.
 */
import React, { useState, useCallback, useMemo } from 'react';
import type {
  NormalizedDataset,
  NormalizedField,
  FieldRole,
} from '@supersubset/data-model';

// ─── Types ───────────────────────────────────────────────────

export interface FieldBinding {
  role: string;
  fieldId: string;
  datasetId: string;
}

export interface FieldBindingPickerProps {
  /** Available datasets (from metadata adapter) */
  datasets: NormalizedDataset[];
  /** Currently selected dataset ID */
  selectedDatasetId?: string;
  /** Called when dataset selection changes */
  onDatasetChange?: (datasetId: string) => void;
  /** Current field bindings */
  bindings?: FieldBinding[];
  /** Called when a field is selected for binding */
  onFieldSelect?: (field: NormalizedField, datasetId: string) => void;
  /** Called when bindings change */
  onBindingsChange?: (bindings: FieldBinding[]) => void;
  /** Binding slots to show (e.g. ['x-axis', 'y-axis', 'series']) */
  slots?: BindingSlot[];
  /** Optional class name */
  className?: string;
}

export interface BindingSlot {
  role: string;
  label: string;
  /** Accepted field roles. Null = accept all */
  acceptRoles?: FieldRole[];
  /** Allow multiple fields (e.g., y-axis can have multiple measures) */
  multiple?: boolean;
}

// ─── Role styling ────────────────────────────────────────────

const ROLE_COLORS: Record<FieldRole, string> = {
  dimension: '#1677ff',
  measure: '#52c41a',
  time: '#fa8c16',
  key: '#722ed1',
  unknown: '#999',
};

const ROLE_ICONS: Record<FieldRole, string> = {
  dimension: 'Abc',
  measure: '#',
  time: '🕐',
  key: '🔑',
  unknown: '?',
};

const ROLE_ORDER: FieldRole[] = ['time', 'dimension', 'measure', 'key', 'unknown'];

// ─── Component ───────────────────────────────────────────────

export function FieldBindingPicker({
  datasets,
  selectedDatasetId,
  onDatasetChange,
  bindings = [],
  onFieldSelect,
  onBindingsChange,
  slots,
  className,
}: FieldBindingPickerProps) {
  const [search, setSearch] = useState('');
  const [expandedRoles, setExpandedRoles] = useState<Set<FieldRole>>(
    new Set(ROLE_ORDER)
  );
  const datasetSelectId = 'ss-field-binding-dataset-select';
  const searchInputId = 'ss-field-binding-search';

  const activeDataset = useMemo(
    () => datasets.find((d) => d.id === selectedDatasetId) ?? datasets[0],
    [datasets, selectedDatasetId]
  );

  const filteredFields = useMemo(() => {
    if (!activeDataset) return [];
    const q = search.toLowerCase();
    return activeDataset.fields.filter(
      (f) =>
        !q ||
        f.label.toLowerCase().includes(q) ||
        f.id.toLowerCase().includes(q)
    );
  }, [activeDataset, search]);

  const fieldsByRole = useMemo(() => {
    const grouped: Record<FieldRole, NormalizedField[]> = {
      time: [],
      dimension: [],
      measure: [],
      key: [],
      unknown: [],
    };
    for (const f of filteredFields) {
      grouped[f.role].push(f);
    }
    return grouped;
  }, [filteredFields]);

  const toggleRole = useCallback((role: FieldRole) => {
    setExpandedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  }, []);

  const handleFieldClick = useCallback(
    (field: NormalizedField) => {
      if (onFieldSelect && activeDataset) {
        onFieldSelect(field, activeDataset.id);
      }
    },
    [onFieldSelect, activeDataset]
  );

  const handleBindField = useCallback(
    (slotRole: string, field: NormalizedField) => {
      if (!onBindingsChange || !activeDataset) return;
      const slot = slots?.find((s) => s.role === slotRole);
      const newBinding: FieldBinding = {
        role: slotRole,
        fieldId: field.id,
        datasetId: activeDataset.id,
      };
      if (slot?.multiple) {
        onBindingsChange([...bindings, newBinding]);
      } else {
        onBindingsChange([
          ...bindings.filter((b) => b.role !== slotRole),
          newBinding,
        ]);
      }
    },
    [onBindingsChange, bindings, slots, activeDataset]
  );

  const handleUnbind = useCallback(
    (slotRole: string, fieldId?: string) => {
      if (!onBindingsChange) return;
      onBindingsChange(
        bindings.filter(
          (b) =>
            b.role !== slotRole || (fieldId && b.fieldId !== fieldId)
        )
      );
    },
    [onBindingsChange, bindings]
  );

  const buttonStyle: React.CSSProperties = {
    padding: '2px 8px',
    borderRadius: 4,
    border: '1px solid #d9d9d9',
    background: '#fff',
    cursor: 'pointer',
    fontSize: 11,
  };

  return (
    <div
      className={className}
      data-testid="field-binding-picker"
      style={{
        fontFamily: 'sans-serif',
        fontSize: 13,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Dataset selector */}
      {datasets.length > 1 && (
        <select
          id={datasetSelectId}
          name="fieldBindingDataset"
          aria-label="Select dataset"
          value={activeDataset?.id ?? ''}
          onChange={(e) => onDatasetChange?.(e.target.value)}
          data-testid="dataset-select"
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid #d9d9d9',
            fontSize: 13,
          }}
        >
          {datasets.map((ds) => (
            <option key={ds.id} value={ds.id}>
              {ds.label}
            </option>
          ))}
        </select>
      )}

      {/* Binding slots */}
      {slots && slots.length > 0 && (
        <div
          data-testid="binding-slots"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: 8,
            background: '#fafafa',
            borderRadius: 6,
            border: '1px solid #e0e0e0',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#888',
              marginBottom: 2,
            }}
          >
            Field Bindings
          </div>
          {slots.map((slot) => {
            const bound = bindings.filter((b) => b.role === slot.role);
            return (
              <div
                key={slot.role}
                data-testid={`slot-${slot.role}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  minHeight: 28,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#555',
                    minWidth: 70,
                  }}
                >
                  {slot.label}:
                </span>
                {bound.length > 0 ? (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {bound.map((b) => (
                      <span
                        key={b.fieldId}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: '#e6f7ff',
                          fontSize: 11,
                          border: '1px solid #91d5ff',
                        }}
                      >
                        {b.fieldId}
                        <button
                          onClick={() => handleUnbind(slot.role, b.fieldId)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 10,
                            color: '#999',
                            padding: 0,
                          }}
                          data-testid={`unbind-${slot.role}-${b.fieldId}`}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: 11, color: '#bbb', fontStyle: 'italic' }}>
                    Drop a field here
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Field search */}
      <input
        id={searchInputId}
        name="fieldBindingSearch"
        aria-label="Search fields"
        type="text"
        placeholder="Search fields..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        data-testid="field-search"
        style={{
          width: '100%',
          padding: '6px 10px',
          borderRadius: 6,
          border: '1px solid #d9d9d9',
          fontSize: 12,
          boxSizing: 'border-box',
        }}
      />

      {/* Fields by role */}
      {activeDataset &&
        ROLE_ORDER.map((role) => {
          const fields = fieldsByRole[role];
          if (fields.length === 0) return null;
          const expanded = expandedRoles.has(role);
          return (
            <div key={role}>
              <button
                onClick={() => toggleRole(role)}
                data-testid={`role-toggle-${role}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  width: '100%',
                  padding: '4px 0',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 12,
                  color: ROLE_COLORS[role],
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 10 }}>{expanded ? '▼' : '▶'}</span>
                <span>{ROLE_ICONS[role]}</span>
                <span>
                  {role.charAt(0).toUpperCase() + role.slice(1)}s ({fields.length})
                </span>
              </button>
              {expanded && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    paddingLeft: 12,
                  }}
                >
                  {fields.map((field) => (
                    <div
                      key={field.id}
                      data-testid={`field-${field.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 8px',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12,
                      }}
                      onClick={() => handleFieldClick(field)}
                    >
                      <span
                        style={{
                          display: 'inline-block',
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: ROLE_COLORS[role],
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ flex: 1 }}>{field.label}</span>
                      <span style={{ fontSize: 10, color: '#bbb' }}>
                        {field.dataType}
                      </span>
                      {/* Quick-bind buttons */}
                      {slots &&
                        slots
                          .filter(
                            (s) =>
                              !s.acceptRoles ||
                              s.acceptRoles.includes(field.role)
                          )
                          .map((s) => (
                            <button
                              key={s.role}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBindField(s.role, field);
                              }}
                              style={buttonStyle}
                              data-testid={`bind-${field.id}-${s.role}`}
                              title={`Bind to ${s.label}`}
                            >
                              → {s.label}
                            </button>
                          ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

      {!activeDataset && (
        <div
          style={{ textAlign: 'center', color: '#999', padding: 24 }}
          data-testid="no-datasets"
        >
          No datasets available. Connect a data source to browse fields.
        </div>
      )}
    </div>
  );
}
