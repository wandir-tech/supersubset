/**
 * DrillManager — manages drill-to-detail state with breadcrumb navigation.
 * Provides a React context so widgets and the interaction engine can
 * drill down into data, drill back up, or reset to the top level.
 */
import { createContext, useContext, useReducer, useCallback, useMemo, type ReactNode } from 'react';

// ─── Types ───────────────────────────────────────────────────

export interface DrillBreadcrumb {
  label: string;
  fieldRef: string;
  value: unknown;
}

export interface DrillState {
  active: boolean;
  sourceWidgetId: string;
  fieldRef: string;
  fieldValue: unknown;
  breadcrumb: DrillBreadcrumb[];
}

const INITIAL_DRILL_STATE: DrillState = {
  active: false,
  sourceWidgetId: '',
  fieldRef: '',
  fieldValue: undefined,
  breadcrumb: [],
};

// ─── Reducer ─────────────────────────────────────────────────

type DrillAction =
  | { type: 'DRILL_DOWN'; sourceWidgetId: string; fieldRef: string; value: unknown }
  | { type: 'DRILL_UP' }
  | { type: 'DRILL_TO'; index: number }
  | { type: 'RESET' };

function drillReducer(state: DrillState, action: DrillAction): DrillState {
  switch (action.type) {
    case 'DRILL_DOWN': {
      const label =
        action.value != null && typeof action.value === 'object'
          ? Object.entries(action.value as Record<string, unknown>)
              .map(([k, v]) => `${k}: ${v}`)
              .join(', ')
          : String(action.value);
      const newCrumb: DrillBreadcrumb = {
        label,
        fieldRef: action.fieldRef,
        value: action.value,
      };
      return {
        active: true,
        sourceWidgetId: action.sourceWidgetId,
        fieldRef: action.fieldRef,
        fieldValue: action.value,
        breadcrumb: [...state.breadcrumb, newCrumb],
      };
    }
    case 'DRILL_UP': {
      if (state.breadcrumb.length <= 1) {
        return INITIAL_DRILL_STATE;
      }
      const breadcrumb = state.breadcrumb.slice(0, -1);
      const last = breadcrumb[breadcrumb.length - 1];
      return {
        active: true,
        sourceWidgetId: state.sourceWidgetId,
        fieldRef: last.fieldRef,
        fieldValue: last.value,
        breadcrumb,
      };
    }
    case 'DRILL_TO': {
      if (action.index < 0) {
        return INITIAL_DRILL_STATE;
      }
      const breadcrumb = state.breadcrumb.slice(0, action.index + 1);
      const last = breadcrumb[breadcrumb.length - 1];
      return {
        active: true,
        sourceWidgetId: state.sourceWidgetId,
        fieldRef: last.fieldRef,
        fieldValue: last.value,
        breadcrumb,
      };
    }
    case 'RESET':
      return INITIAL_DRILL_STATE;
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────

export interface DrillContextValue {
  drillState: DrillState;
  drillDown: (sourceWidgetId: string, fieldRef: string, value: unknown) => void;
  drillUp: () => void;
  drillTo: (index: number) => void;
  resetDrill: () => void;
}

const DrillContext = createContext<DrillContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────

export interface DrillProviderProps {
  children: ReactNode;
}

export function DrillProvider({ children }: DrillProviderProps) {
  const [drillState, dispatch] = useReducer(drillReducer, INITIAL_DRILL_STATE);

  const drillDown = useCallback((sourceWidgetId: string, fieldRef: string, value: unknown) => {
    dispatch({ type: 'DRILL_DOWN', sourceWidgetId, fieldRef, value });
  }, []);

  const drillUp = useCallback(() => {
    dispatch({ type: 'DRILL_UP' });
  }, []);

  const drillTo = useCallback((index: number) => {
    dispatch({ type: 'DRILL_TO', index });
  }, []);

  const resetDrill = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const value = useMemo(
    () => ({ drillState, drillDown, drillUp, drillTo, resetDrill }),
    [drillState, drillDown, drillUp, drillTo, resetDrill],
  );

  return <DrillContext.Provider value={value}>{children}</DrillContext.Provider>;
}

// ─── Hook ────────────────────────────────────────────────────

export function useDrill(): DrillContextValue {
  const ctx = useContext(DrillContext);
  if (!ctx) {
    throw new Error('useDrill must be used inside <DrillProvider>');
  }
  return ctx;
}
