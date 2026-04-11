/**
 * Tests for InteractionEditorPanel.
 *
 * Phase 4 feature: 4.8 — Interaction Editor.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

import {
  InteractionEditorPanel,
  type InteractionDefinition,
} from '../src/components/InteractionEditorPanel';

// ─── Test fixtures ───────────────────────────────────────────

const WIDGET_IDS = ['chart-1', 'chart-2', 'table-1'];
const PAGE_IDS = ['page-1', 'page-2'];
const FIELD_IDS = ['category', 'region', 'revenue'];

const SAMPLE_INTERACTIONS: InteractionDefinition[] = [
  {
    id: 'ix-1',
    trigger: { type: 'click', sourceWidgetId: 'chart-1' },
    action: { type: 'filter', targetWidgetIds: ['table-1'], fieldRef: 'category' },
  },
  {
    id: 'ix-2',
    trigger: { type: 'hover', sourceWidgetId: 'chart-2' },
    action: { type: 'navigate', target: { kind: 'page', pageId: 'page-1' } },
  },
];

// ═══════════════════════════════════════════════════════════════

describe('InteractionEditorPanel', () => {
  afterEach(cleanup);

  it('renders empty state with Add button', () => {
    render(
      <InteractionEditorPanel
        interactions={[]}
        onChange={vi.fn()}
        widgetIds={WIDGET_IDS}
        pageIds={PAGE_IDS}
        fieldIds={FIELD_IDS}
      />
    );
    expect(screen.getByTestId('no-interactions')).toBeTruthy();
    expect(screen.getByTestId('add-interaction')).toBeTruthy();
    expect(screen.getByText('Interactions (0)')).toBeTruthy();
  });

  it('renders list of existing interactions', () => {
    render(
      <InteractionEditorPanel
        interactions={SAMPLE_INTERACTIONS}
        onChange={vi.fn()}
        widgetIds={WIDGET_IDS}
        pageIds={PAGE_IDS}
        fieldIds={FIELD_IDS}
      />
    );
    expect(screen.getByTestId('interaction-item-ix-1')).toBeTruthy();
    expect(screen.getByTestId('interaction-item-ix-2')).toBeTruthy();
    expect(screen.getByText('Interactions (2)')).toBeTruthy();
    // No empty state shown
    expect(screen.queryByTestId('no-interactions')).toBeNull();
  });

  it('Add interaction adds new item', () => {
    const onChange = vi.fn();
    render(
      <InteractionEditorPanel
        interactions={[]}
        onChange={onChange}
        widgetIds={WIDGET_IDS}
        pageIds={PAGE_IDS}
        fieldIds={FIELD_IDS}
      />
    );
    fireEvent.click(screen.getByTestId('add-interaction'));
    expect(onChange).toHaveBeenCalledOnce();
    const newList = onChange.mock.calls[0][0] as InteractionDefinition[];
    expect(newList).toHaveLength(1);
    expect(newList[0].trigger.type).toBe('click');
    expect(newList[0].action.type).toBe('filter');
  });

  it('Remove interaction removes item', () => {
    const onChange = vi.fn();
    render(
      <InteractionEditorPanel
        interactions={SAMPLE_INTERACTIONS}
        onChange={onChange}
        widgetIds={WIDGET_IDS}
        pageIds={PAGE_IDS}
        fieldIds={FIELD_IDS}
      />
    );
    fireEvent.click(screen.getByTestId('interaction-delete-ix-1'));
    expect(onChange).toHaveBeenCalledOnce();
    const newList = onChange.mock.calls[0][0] as InteractionDefinition[];
    expect(newList).toHaveLength(1);
    expect(newList[0].id).toBe('ix-2');
  });

  it('Changing trigger source updates interaction', () => {
    const onChange = vi.fn();
    render(
      <InteractionEditorPanel
        interactions={SAMPLE_INTERACTIONS}
        onChange={onChange}
        widgetIds={WIDGET_IDS}
        pageIds={PAGE_IDS}
        fieldIds={FIELD_IDS}
      />
    );
    fireEvent.change(screen.getByTestId('interaction-source-ix-1'), {
      target: { value: 'chart-2' },
    });
    expect(onChange).toHaveBeenCalledOnce();
    const newList = onChange.mock.calls[0][0] as InteractionDefinition[];
    expect(newList[0].trigger.sourceWidgetId).toBe('chart-2');
  });

  it('wires interaction controls with labels and names', () => {
    render(
      <InteractionEditorPanel
        interactions={SAMPLE_INTERACTIONS}
        onChange={vi.fn()}
        widgetIds={WIDGET_IDS}
        pageIds={PAGE_IDS}
        fieldIds={FIELD_IDS}
      />
    );

    const sourceLabel = screen.getAllByText('Source Widget')[0];
    const sourceSelect = screen.getByTestId('interaction-source-ix-1');
    expect(sourceLabel.getAttribute('for')).toBe('ss-interaction-source-ix-1');
    expect(sourceSelect.getAttribute('id')).toBe('ss-interaction-source-ix-1');
    expect(sourceSelect.getAttribute('name')).toBe('interaction-source-ix-1');

    const filterTarget = screen.getByTestId('interaction-filter-target-chart-2-ix-1');
    expect(filterTarget.getAttribute('name')).toBe('interaction-filter-targets-ix-1');
    expect(filterTarget.getAttribute('aria-label')).toBe('Target widget chart-2');
  });

  it('Changing action type shows appropriate fields', () => {
    const onChange = vi.fn();
    // Start with a filter interaction, switch to navigate
    const interactions: InteractionDefinition[] = [
      {
        id: 'ix-test',
        trigger: { type: 'click', sourceWidgetId: 'chart-1' },
        action: { type: 'filter', targetWidgetIds: [], fieldRef: 'category' },
      },
    ];
    const { rerender } = render(
      <InteractionEditorPanel
        interactions={interactions}
        onChange={onChange}
        widgetIds={WIDGET_IDS}
        pageIds={PAGE_IDS}
        fieldIds={FIELD_IDS}
      />
    );

    // Filter fields should be visible
    expect(screen.getByTestId('interaction-filter-fields-ix-test')).toBeTruthy();
    expect(screen.queryByTestId('interaction-navigate-fields-ix-test')).toBeNull();

    // Change action type to navigate
    fireEvent.change(screen.getByTestId('interaction-action-type-ix-test'), {
      target: { value: 'navigate' },
    });

    expect(onChange).toHaveBeenCalledOnce();
    const newList = onChange.mock.calls[0][0] as InteractionDefinition[];
    expect(newList[0].action.type).toBe('navigate');

    // Re-render with navigate action to verify fields change
    rerender(
      <InteractionEditorPanel
        interactions={newList}
        onChange={onChange}
        widgetIds={WIDGET_IDS}
        pageIds={PAGE_IDS}
        fieldIds={FIELD_IDS}
      />
    );
    expect(screen.getByTestId('interaction-navigate-fields-ix-test')).toBeTruthy();
    expect(screen.queryByTestId('interaction-filter-fields-ix-test')).toBeNull();
  });

  it('Changing filter target widget IDs updates interaction', () => {
    const onChange = vi.fn();
    render(
      <InteractionEditorPanel
        interactions={SAMPLE_INTERACTIONS}
        onChange={onChange}
        widgetIds={WIDGET_IDS}
        pageIds={PAGE_IDS}
        fieldIds={FIELD_IDS}
      />
    );

    // ix-1 has table-1 as target. Toggle chart-2 on.
    fireEvent.click(screen.getByTestId('interaction-filter-target-chart-2-ix-1'));
    expect(onChange).toHaveBeenCalledOnce();
    const newList = onChange.mock.calls[0][0] as InteractionDefinition[];
    const action = newList[0].action as { type: 'filter'; targetWidgetIds?: string[] };
    expect(action.targetWidgetIds).toContain('table-1');
    expect(action.targetWidgetIds).toContain('chart-2');
  });

  it('shows drill fields for drill action type', () => {
    const interactions: InteractionDefinition[] = [
      {
        id: 'ix-drill',
        trigger: { type: 'click', sourceWidgetId: 'chart-1' },
        action: { type: 'drill', fieldRef: 'region' },
      },
    ];
    render(
      <InteractionEditorPanel
        interactions={interactions}
        onChange={vi.fn()}
        widgetIds={WIDGET_IDS}
        pageIds={PAGE_IDS}
        fieldIds={FIELD_IDS}
      />
    );
    expect(screen.getByTestId('interaction-drill-fields-ix-drill')).toBeTruthy();
    expect(screen.getByTestId('interaction-drill-field-ix-drill')).toBeTruthy();
    expect(screen.getByTestId('interaction-drill-target-ix-drill')).toBeTruthy();
  });

  it('shows external fields for external action type', () => {
    const interactions: InteractionDefinition[] = [
      {
        id: 'ix-ext',
        trigger: { type: 'click' },
        action: { type: 'external', callbackKey: 'onRowClick' },
      },
    ];
    render(
      <InteractionEditorPanel
        interactions={interactions}
        onChange={vi.fn()}
        widgetIds={WIDGET_IDS}
        pageIds={PAGE_IDS}
        fieldIds={FIELD_IDS}
      />
    );
    expect(screen.getByTestId('interaction-external-fields-ix-ext')).toBeTruthy();
    const input = screen.getByTestId('interaction-external-key-ix-ext') as HTMLInputElement;
    expect(input.value).toBe('onRowClick');
  });

  it('changing trigger type updates interaction', () => {
    const onChange = vi.fn();
    render(
      <InteractionEditorPanel
        interactions={SAMPLE_INTERACTIONS}
        onChange={onChange}
        widgetIds={WIDGET_IDS}
        pageIds={PAGE_IDS}
        fieldIds={FIELD_IDS}
      />
    );
    fireEvent.change(screen.getByTestId('interaction-trigger-type-ix-1'), {
      target: { value: 'hover' },
    });
    expect(onChange).toHaveBeenCalledOnce();
    const newList = onChange.mock.calls[0][0] as InteractionDefinition[];
    expect(newList[0].trigger.type).toBe('hover');
  });
});
