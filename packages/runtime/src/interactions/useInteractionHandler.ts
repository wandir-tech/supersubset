/**
 * useInteractionHandler — creates an onEvent callback for a specific widget
 * that routes events through the InteractionEngine.
 */
import { useCallback } from 'react';
import type { WidgetEvent } from '../widgets/registry';
import { useInteractions } from './InteractionEngine';

/**
 * Hook that creates an `onEvent` callback for a specific widget.
 * When the widget emits an event, the interaction engine processes it
 * (cross-filter, navigate, external, drill) and falls back to the
 * host's onWidgetEvent for unhandled events.
 */
export function useInteractionHandler(widgetId: string): (event: WidgetEvent) => void {
  const { handleWidgetEvent } = useInteractions();

  return useCallback(
    (event: WidgetEvent) => {
      // Ensure the widgetId is always set correctly
      const enrichedEvent: WidgetEvent = {
        ...event,
        widgetId,
      };
      handleWidgetEvent(enrichedEvent);
    },
    [widgetId, handleWidgetEvent],
  );
}
