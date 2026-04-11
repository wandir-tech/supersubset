/**
 * Storybook stories for InteractionEditorPanel.
 */
import React, { useState } from 'react';
import {
  InteractionEditorPanel,
  type InteractionEditorPanelProps,
  type InteractionDefinition,
} from './InteractionEditorPanel';

export default {
  title: 'Designer/InteractionEditorPanel',
  component: InteractionEditorPanel,
};

const WIDGET_IDS = ['chart-1', 'chart-2', 'table-1', 'kpi-1'];
const PAGE_IDS = ['page-overview', 'page-details', 'page-drilldown'];
const FIELD_IDS = ['category', 'region', 'revenue', 'order_date', 'quantity'];

const SAMPLE_INTERACTIONS: InteractionDefinition[] = [
  {
    id: 'ix-1',
    trigger: { type: 'click', sourceWidgetId: 'chart-1' },
    action: { type: 'filter', targetWidgetIds: ['table-1', 'kpi-1'], fieldRef: 'category' },
  },
  {
    id: 'ix-2',
    trigger: { type: 'click', sourceWidgetId: 'chart-2' },
    action: { type: 'drill', fieldRef: 'region', targetWidgetId: 'table-1' },
  },
  {
    id: 'ix-3',
    trigger: { type: 'hover', sourceWidgetId: 'chart-1' },
    action: { type: 'navigate', target: { kind: 'page', pageId: 'page-details' } },
  },
];

function Wrapper(props: Partial<InteractionEditorPanelProps> & { initial?: InteractionDefinition[] }) {
  const [interactions, setInteractions] = useState<InteractionDefinition[]>(
    props.initial ?? props.interactions ?? []
  );
  return (
    <div style={{ maxWidth: 500, padding: 20 }}>
      <InteractionEditorPanel
        interactions={interactions}
        onChange={setInteractions}
        widgetIds={props.widgetIds ?? WIDGET_IDS}
        pageIds={props.pageIds ?? PAGE_IDS}
        fieldIds={props.fieldIds ?? FIELD_IDS}
      />
    </div>
  );
}

export const Default = () => <Wrapper initial={SAMPLE_INTERACTIONS} />;

export const Empty = () => <Wrapper initial={[]} />;

export const MultipleInteractions = () => (
  <Wrapper
    initial={[
      ...SAMPLE_INTERACTIONS,
      {
        id: 'ix-4',
        trigger: { type: 'change', sourceWidgetId: 'kpi-1' },
        action: { type: 'external', callbackKey: 'onKpiChange' },
      },
    ]}
  />
);
