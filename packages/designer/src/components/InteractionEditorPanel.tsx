/**
 * InteractionEditorPanel — Design-time UI for configuring widget interactions.
 *
 * Lets the designer add InteractionDefinitions to the dashboard schema:
 * - Pick trigger source widget and event type
 * - Choose action type (filter, navigate, drill, external)
 * - Configure action-specific fields
 *
 * Emits InteractionDefinition[] changes to the host.
 */
import React, { useCallback } from 'react';
import type {
  InteractionAction as SchemaInteractionAction,
  InteractionDefinition as SchemaInteractionDefinition,
  InteractionTrigger as SchemaInteractionTrigger,
  NavigateTarget as SchemaNavigateTarget,
} from '@supersubset/schema';

// ─── Types (matching canonical InteractionDefinition) ────────

export type InteractionTrigger = SchemaInteractionTrigger;
export type NavigateTarget = SchemaNavigateTarget;
export type InteractionAction = SchemaInteractionAction;
export type InteractionDefinition = SchemaInteractionDefinition;

// ─── Props ────────────────────────────────────────────────────

export interface InteractionEditorPanelProps {
  /** Current interactions */
  interactions: InteractionDefinition[];
  /** Called when interactions change */
  onChange: (interactions: InteractionDefinition[]) => void;
  /** Available widget IDs for source/target */
  widgetIds: string[];
  /** Available page IDs for navigate actions */
  pageIds: string[];
  /** Available field IDs for filter/drill actions */
  fieldIds: string[];
  /** Optional class name */
  className?: string;
}

// ─── Constants ───────────────────────────────────────────────

const TRIGGER_TYPES: { value: InteractionTrigger['type']; label: string }[] = [
  { value: 'click', label: 'Click' },
  { value: 'hover', label: 'Hover' },
  { value: 'change', label: 'Change' },
];

const ACTION_TYPES: { value: InteractionAction['type']; label: string }[] = [
  { value: 'filter', label: 'Filter' },
  { value: 'navigate', label: 'Navigate' },
  { value: 'drill', label: 'Drill' },
  { value: 'external', label: 'External' },
];

// ─── Styles ──────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────

function makeDefaultAction(type: InteractionAction['type']): InteractionAction {
  switch (type) {
    case 'filter':
      return { type: 'filter', targetWidgetIds: [], fieldRef: '' };
    case 'navigate':
      return { type: 'navigate', target: { kind: 'page', pageId: '' } };
    case 'drill':
      return { type: 'drill', fieldRef: '' };
    case 'external':
      return { type: 'external', callbackKey: '' };
  }
}

function isPageTarget(target: NavigateTarget): target is Extract<NavigateTarget, { kind: 'page' }> {
  return target.kind === 'page';
}

// ─── Sub-components ──────────────────────────────────────────

interface InteractionItemProps {
  interaction: InteractionDefinition;
  widgetIds: string[];
  pageIds: string[];
  fieldIds: string[];
  onUpdate: (interaction: InteractionDefinition) => void;
  onDelete: () => void;
}

function InteractionItem({
  interaction,
  widgetIds,
  pageIds,
  fieldIds,
  onUpdate,
  onDelete,
}: InteractionItemProps) {
  const sourceSelectId = `ss-interaction-source-${interaction.id}`;
  const triggerTypeSelectId = `ss-interaction-trigger-type-${interaction.id}`;
  const actionTypeSelectId = `ss-interaction-action-type-${interaction.id}`;
  const filterFieldSelectId = `ss-interaction-filter-field-${interaction.id}`;
  const navigatePageSelectId = `ss-interaction-navigate-page-${interaction.id}`;
  const drillFieldSelectId = `ss-interaction-drill-field-${interaction.id}`;
  const drillTargetSelectId = `ss-interaction-drill-target-${interaction.id}`;
  const externalKeyInputId = `ss-interaction-external-key-${interaction.id}`;
  const navigateTarget = interaction.action.type === 'navigate' ? interaction.action.target : null;
  const pageTarget = navigateTarget && isPageTarget(navigateTarget) ? navigateTarget : null;
  const handleTriggerChange = useCallback(
    (patch: Partial<InteractionTrigger>) => {
      onUpdate({
        ...interaction,
        trigger: { ...interaction.trigger, ...patch },
      });
    },
    [interaction, onUpdate]
  );

  const handleActionChange = useCallback(
    (patch: Partial<InteractionAction>) => {
      onUpdate({
        ...interaction,
        action: { ...interaction.action, ...patch } as InteractionAction,
      });
    },
    [interaction, onUpdate]
  );

  const handleActionTypeChange = useCallback(
    (newType: InteractionAction['type']) => {
      onUpdate({
        ...interaction,
        action: makeDefaultAction(newType),
      });
    },
    [interaction, onUpdate]
  );

  const handleTargetWidgetToggle = useCallback(
    (wid: string) => {
      if (interaction.action.type !== 'filter') return;
      const current = interaction.action.targetWidgetIds ?? [];
      const next = current.includes(wid)
        ? current.filter((id) => id !== wid)
        : [...current, wid];
      handleActionChange({ targetWidgetIds: next });
    },
    [interaction.action, handleActionChange]
  );

  return (
    <div
      className="ss-interaction-item"
      data-testid={`interaction-item-${interaction.id}`}
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
      {/* Header with delete */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 600, fontSize: 12, color: '#333' }}>
          {interaction.id}
        </span>
        <button
          onClick={onDelete}
          data-testid={`interaction-delete-${interaction.id}`}
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
          🗑 Remove
        </button>
      </div>

      {/* Trigger section */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <label htmlFor={sourceSelectId} style={labelStyle}>Source Widget</label>
          <select
            id={sourceSelectId}
            name={`interaction-source-${interaction.id}`}
            value={interaction.trigger.sourceWidgetId ?? ''}
            onChange={(e) =>
              handleTriggerChange({ sourceWidgetId: e.target.value || undefined })
            }
            data-testid={`interaction-source-${interaction.id}`}
            style={selectStyle}
          >
            <option value="">Any widget</option>
            {widgetIds.map((wid) => (
              <option key={wid} value={wid}>
                {wid}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <label htmlFor={triggerTypeSelectId} style={labelStyle}>Trigger Type</label>
          <select
            id={triggerTypeSelectId}
            name={`interaction-trigger-type-${interaction.id}`}
            value={interaction.trigger.type}
            onChange={(e) =>
              handleTriggerChange({ type: e.target.value as InteractionTrigger['type'] })
            }
            data-testid={`interaction-trigger-type-${interaction.id}`}
            style={selectStyle}
          >
            {TRIGGER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label htmlFor={actionTypeSelectId} style={labelStyle}>Action Type</label>
        <select
          id={actionTypeSelectId}
          name={`interaction-action-type-${interaction.id}`}
          value={interaction.action.type}
          onChange={(e) =>
            handleActionTypeChange(e.target.value as InteractionAction['type'])
          }
          data-testid={`interaction-action-type-${interaction.id}`}
          style={selectStyle}
        >
          {ACTION_TYPES.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      {/* Action-specific fields */}
      {interaction.action.type === 'filter' && (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
          data-testid={`interaction-filter-fields-${interaction.id}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label htmlFor={filterFieldSelectId} style={labelStyle}>Field</label>
            <select
              id={filterFieldSelectId}
              name={`interaction-filter-field-${interaction.id}`}
              value={interaction.action.fieldRef}
              onChange={(e) => handleActionChange({ fieldRef: e.target.value })}
              data-testid={`interaction-filter-field-${interaction.id}`}
              style={selectStyle}
            >
              <option value="">Select field...</option>
              {fieldIds.map((fid) => (
                <option key={fid} value={fid}>
                  {fid}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <label style={labelStyle}>Target Widgets</label>
            {widgetIds.map((wid) => {
              const checked = (interaction.action as { targetWidgetIds?: string[] })
                .targetWidgetIds?.includes(wid) ?? false;
              return (
                <label
                  key={wid}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                >
                  <input
                    id={`ss-interaction-filter-target-${wid}-${interaction.id}`}
                    name={`interaction-filter-targets-${interaction.id}`}
                    aria-label={`Target widget ${wid}`}
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleTargetWidgetToggle(wid)}
                    data-testid={`interaction-filter-target-${wid}-${interaction.id}`}
                  />
                  {wid}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {interaction.action.type === 'navigate' && (
        <div
          style={{ display: 'flex', flexDirection: 'column' }}
          data-testid={`interaction-navigate-fields-${interaction.id}`}
        >
          {pageTarget ? (
            <>
              <label htmlFor={navigatePageSelectId} style={labelStyle}>Page</label>
              <select
                id={navigatePageSelectId}
                name={`interaction-navigate-page-${interaction.id}`}
                value={pageTarget.pageId}
                onChange={(e) =>
                  onUpdate({
                    ...interaction,
                    action: {
                      type: 'navigate',
                      target: { kind: 'page', pageId: e.target.value },
                    },
                  })
                }
                data-testid={`interaction-navigate-page-${interaction.id}`}
                style={selectStyle}
              >
                <option value="">Select page...</option>
                {pageIds.map((pid) => (
                  <option key={pid} value={pid}>
                    {pid}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <div
              data-testid={`interaction-navigate-deferred-${interaction.id}`}
              style={{
                border: '1px dashed #d9d9d9',
                borderRadius: 6,
                padding: '10px 12px',
                color: '#666',
                fontSize: 12,
                lineHeight: 1.45,
              }}
            >
              Dashboard navigation targets are preserved in schema but are not editable in the designer yet.
            </div>
          )}
        </div>
      )}

      {interaction.action.type === 'drill' && (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
          data-testid={`interaction-drill-fields-${interaction.id}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label htmlFor={drillFieldSelectId} style={labelStyle}>Field</label>
            <select
              id={drillFieldSelectId}
              name={`interaction-drill-field-${interaction.id}`}
              value={interaction.action.fieldRef}
              onChange={(e) => handleActionChange({ fieldRef: e.target.value })}
              data-testid={`interaction-drill-field-${interaction.id}`}
              style={selectStyle}
            >
              <option value="">Select field...</option>
              {fieldIds.map((fid) => (
                <option key={fid} value={fid}>
                  {fid}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label htmlFor={drillTargetSelectId} style={labelStyle}>Target Widget (optional)</label>
            <select
              id={drillTargetSelectId}
              name={`interaction-drill-target-${interaction.id}`}
              value={interaction.action.targetWidgetId ?? ''}
              onChange={(e) =>
                handleActionChange({ targetWidgetId: e.target.value || undefined })
              }
              data-testid={`interaction-drill-target-${interaction.id}`}
              style={selectStyle}
            >
              <option value="">None</option>
              {widgetIds.map((wid) => (
                <option key={wid} value={wid}>
                  {wid}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {interaction.action.type === 'external' && (
        <div
          style={{ display: 'flex', flexDirection: 'column' }}
          data-testid={`interaction-external-fields-${interaction.id}`}
        >
          <label htmlFor={externalKeyInputId} style={labelStyle}>Callback Key</label>
          <input
            id={externalKeyInputId}
            name={`interaction-external-key-${interaction.id}`}
            type="text"
            value={interaction.action.callbackKey}
            onChange={(e) => handleActionChange({ callbackKey: e.target.value })}
            placeholder="e.g. onWidgetClick"
            data-testid={`interaction-external-key-${interaction.id}`}
            style={selectStyle}
          />
        </div>
      )}
    </div>
  );
}

// ─── Main panel ──────────────────────────────────────────────

let nextId = 1;
function generateInteractionId(): string {
  return `interaction-${Date.now()}-${nextId++}`;
}

export function InteractionEditorPanel({
  interactions,
  onChange,
  widgetIds,
  pageIds,
  fieldIds,
  className,
}: InteractionEditorPanelProps) {
  const handleAdd = useCallback(() => {
    const newInteraction: InteractionDefinition = {
      id: generateInteractionId(),
      trigger: { type: 'click', sourceWidgetId: widgetIds[0] },
      action: { type: 'filter', targetWidgetIds: [], fieldRef: '' },
    };
    onChange([...interactions, newInteraction]);
  }, [interactions, onChange, widgetIds]);

  const handleUpdate = useCallback(
    (index: number, updated: InteractionDefinition) => {
      const next = [...interactions];
      next[index] = updated;
      onChange(next);
    },
    [interactions, onChange]
  );

  const handleDelete = useCallback(
    (index: number) => {
      onChange(interactions.filter((_, i) => i !== index));
    },
    [interactions, onChange]
  );

  return (
    <div
      className={`ss-interaction-editor ${className ?? ''}`}
      data-testid="interaction-editor-panel"
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
          Interactions ({interactions.length})
        </span>
        <button
          onClick={handleAdd}
          data-testid="add-interaction"
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
          + Add interaction
        </button>
      </div>

      {interactions.length === 0 && (
        <div
          style={{ textAlign: 'center', color: '#999', padding: 24, fontSize: 12 }}
          data-testid="no-interactions"
        >
          No interactions defined. Add an interaction to enable cross-widget communication.
        </div>
      )}

      {interactions.map((interaction, index) => (
        <InteractionItem
          key={interaction.id}
          interaction={interaction}
          widgetIds={widgetIds}
          pageIds={pageIds}
          fieldIds={fieldIds}
          onUpdate={(i) => handleUpdate(index, i)}
          onDelete={() => handleDelete(index)}
        />
      ))}
    </div>
  );
}
