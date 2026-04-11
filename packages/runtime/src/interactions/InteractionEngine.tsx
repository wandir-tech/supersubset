/**
 * InteractionEngine — processes InteractionDefinitions and routes widget events
 * to filter actions, navigation callbacks, external callbacks, and drill events.
 *
 * Nests inside FilterProvider so it can call useFilters() for cross-filtering.
 */
import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type {
  InteractionDefinition,
  InteractionAction,
  NavigateTarget,
} from '@supersubset/schema';
import type { WidgetEvent } from '../widgets/registry';
import { useFilters } from '../filters/FilterEngine';
import { useDrill } from './DrillManager';

// ─── Callbacks provided by the host ──────────────────────────

export interface NavigateRequest {
  target: NavigateTarget;
  filterState?: Record<string, unknown>;
}

export interface InteractionCallbacks {
  onNavigate?: (request: NavigateRequest) => void;
  onExternalAction?: (callbackKey: string, payload?: Record<string, unknown>) => void;
  onDrill?: (fieldRef: string, targetWidgetId?: string) => void;
  /** Fallback for events that don't match any interaction */
  onWidgetEvent?: (event: WidgetEvent) => void;
}

// ─── Context ─────────────────────────────────────────────────

export interface InteractionContextValue {
  /** Dispatch a widget event through the interaction engine */
  handleWidgetEvent: (event: WidgetEvent) => void;
  /** Get interactions defined for a specific widget */
  getInteractionsForWidget: (widgetId: string) => InteractionDefinition[];
}

const InteractionContext = createContext<InteractionContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────

export interface InteractionProviderProps {
  interactions: InteractionDefinition[];
  callbacks: InteractionCallbacks;
  children: ReactNode;
}

export function InteractionProvider({
  interactions,
  callbacks,
  children,
}: InteractionProviderProps) {
  const { state, setFilter, resetFilter } = useFilters();
  const { drillDown } = useDrill();

  const getInteractionsForWidget = useCallback(
    (widgetId: string): InteractionDefinition[] => {
      return interactions.filter((i) => i.trigger.sourceWidgetId === widgetId);
    },
    [interactions],
  );

  const handleWidgetEvent = useCallback(
    (event: WidgetEvent) => {
      const matching = interactions.filter(
        (i) =>
          i.trigger.sourceWidgetId === event.widgetId &&
          i.trigger.type === event.type,
      );

      if (matching.length === 0) {
        // No interaction defined — bubble to host
        callbacks.onWidgetEvent?.(event);
        return;
      }

      let handled = false;
      for (const interaction of matching) {
        handled = true;
        executeAction(interaction.action, event, {
          setFilter,
          resetFilter,
          filterValues: state.values,
          callbacks,
          drillDown,
        });
      }

      // Also bubble to host even if interactions handled it
      callbacks.onWidgetEvent?.(event);
    },
    [interactions, callbacks, setFilter, resetFilter, state.values, drillDown],
  );

  const value = useMemo(
    () => ({ handleWidgetEvent, getInteractionsForWidget }),
    [handleWidgetEvent, getInteractionsForWidget],
  );

  return (
    <InteractionContext.Provider value={value}>
      {children}
    </InteractionContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────

export function useInteractions(): InteractionContextValue {
  const ctx = useContext(InteractionContext);
  if (!ctx) {
    throw new Error('useInteractions must be used inside <InteractionProvider>');
  }
  return ctx;
}

// ─── Action Execution ────────────────────────────────────────

interface ActionContext {
  setFilter: (filterId: string, value: unknown) => void;
  resetFilter: (filterId: string) => void;
  filterValues: Record<string, unknown>;
  callbacks: InteractionCallbacks;
  drillDown: (sourceWidgetId: string, fieldRef: string, value: unknown) => void;
}

function executeAction(
  action: InteractionAction,
  event: WidgetEvent,
  ctx: ActionContext,
): void {
  switch (action.type) {
    case 'filter':
      executeCrossFilter(action, event, ctx);
      break;
    case 'navigate':
      ctx.callbacks.onNavigate?.({
        target: action.target,
        filterState: event.payload,
      });
      break;
    case 'external':
      ctx.callbacks.onExternalAction?.(action.callbackKey, {
        ...action.payload,
        ...event.payload,
      });
      break;
    case 'drill': {
      const value = event.payload?.[action.fieldRef] ?? event.payload?.value;
      ctx.drillDown(event.widgetId, action.fieldRef, value);
      ctx.callbacks.onDrill?.(action.fieldRef, action.targetWidgetId);
      break;
    }
  }
}

/**
 * Cross-filter: set a filter from the event payload.
 * Toggle behavior: if the same value is already set, clear it.
 */
function executeCrossFilter(
  action: Extract<InteractionAction, { type: 'filter' }>,
  event: WidgetEvent,
  ctx: ActionContext,
): void {
  const fieldRef = action.fieldRef;
  const value = event.payload?.[fieldRef] ?? event.payload?.value;
  const filterId = `cross-filter:${event.widgetId}:${fieldRef}`;

  // Toggle behavior: if same value is already set, clear it
  const currentValue = ctx.filterValues[filterId];
  if (currentValue !== undefined && currentValue === value) {
    ctx.resetFilter(filterId);
  } else {
    ctx.setFilter(filterId, value);
  }
}
