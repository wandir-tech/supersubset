/**
 * Contextual chart type switcher shown in Puck's right sidebar when a chart
 * widget is selected. Dispatches a Puck replace action so puckToCanonical
 * emits the new canonical widget type on publish.
 */
import React, { useCallback } from 'react';
import { createUsePuck } from '@puckeditor/core';
import { ChartTypePicker } from './ChartTypePicker';
import {
  buildPuckChartTypeReplacement,
  isSwitchableChartPuckType,
  puckTypeToWidgetType,
} from '../adapters/switch-puck-chart-type';

// Puck's default `usePuck()` ignores selectors — use createUsePuck() instead.
const usePuckSelector = createUsePuck();

export function ChartTypeSwitchPanel() {
  const selectedItem = usePuckSelector((store) => store.selectedItem);
  const dispatch = usePuckSelector((store) => store.dispatch);
  const getSelectorForId = usePuckSelector((store) => store.getSelectorForId);
  const appState = usePuckSelector((store) => store.appState);

  const handleChange = useCallback(
    (targetWidgetType: string) => {
      if (!selectedItem) return;

      const replacement = buildPuckChartTypeReplacement(selectedItem, targetWidgetType);
      if (!replacement) return;

      const widgetId = selectedItem.props?.id;
      if (typeof widgetId !== 'string' || widgetId.length === 0) return;

      let destinationZone: string | undefined;
      let destinationIndex = -1;

      const selector = getSelectorForId(widgetId);
      if (selector) {
        destinationZone = selector.zone;
        destinationIndex = selector.index;
      }

      if (destinationIndex < 0 && appState?.data) {
        const rootIndex = appState.data.content.findIndex((item) => item.props?.id === widgetId);
        if (rootIndex >= 0) {
          destinationIndex = rootIndex;
        } else if (appState.data.zones) {
          for (const [zoneName, zoneContent] of Object.entries(appState.data.zones)) {
            const zoneIndex = zoneContent.findIndex((item) => item.props?.id === widgetId);
            if (zoneIndex >= 0) {
              destinationZone = zoneName;
              destinationIndex = zoneIndex;
              break;
            }
          }
        }
      }

      if (destinationIndex < 0) return;

      dispatch({
        type: 'replace',
        destinationIndex,
        destinationZone: destinationZone ?? '',
        data: replacement,
      });
    },
    [appState, dispatch, getSelectorForId, selectedItem],
  );

  if (!selectedItem || !isSwitchableChartPuckType(selectedItem.type)) {
    return null;
  }

  const currentWidgetType = puckTypeToWidgetType(selectedItem.type);
  if (!currentWidgetType) {
    return null;
  }

  return (
    <div
      data-testid="chart-type-switch-panel"
      style={{
        marginBottom: 16,
        paddingBottom: 16,
        borderBottom: '1px solid var(--puck-color-grey-09, #e2e8f0)',
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
          color: 'var(--puck-color-grey-04, #64748b)',
          marginBottom: 8,
        }}
      >
        Chart type
      </div>
      <ChartTypePicker compact value={currentWidgetType} onChange={handleChange} />
    </div>
  );
}
