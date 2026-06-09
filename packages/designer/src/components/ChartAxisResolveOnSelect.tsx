/**
 * When a chart is selected, run Puck resolveData once for that widget id.
 *
 * Uses Puck's built-in replace path (no setData) so axis bindings from logicalQuery
 * are merged into the store for the fields panel. Must NOT dispatch setData on every
 * data change — that caused an infinite render loop and browser lockup.
 */
import { useEffect, useRef } from 'react';
import { createUsePuck } from '@puckeditor/core';

const usePuckSelector = createUsePuck();

function isChartPuckType(type: string): boolean {
  return (
    type.endsWith('Chart') || type === 'KPICard' || type === 'Table' || type === 'AlertsWidgetBlock'
  );
}

export function ChartAxisResolveOnSelect() {
  const selectedItem = usePuckSelector((store) => store.selectedItem);
  const resolveDataById = usePuckSelector((store) => store.resolveDataById);
  const resolvedForIdRef = useRef<string | null>(null);

  const selectedId = typeof selectedItem?.props?.id === 'string' ? selectedItem.props.id : null;
  const selectedType = selectedItem?.type ?? null;

  useEffect(() => {
    if (!selectedId || !selectedType || !isChartPuckType(selectedType)) {
      resolvedForIdRef.current = null;
      return;
    }

    if (resolvedForIdRef.current === selectedId) {
      return;
    }

    resolvedForIdRef.current = selectedId;
    void resolveDataById(selectedId, 'force');
  }, [resolveDataById, selectedId, selectedType]);

  return null;
}
