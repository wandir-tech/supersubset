/**
 * Filter engine — manages filter state and propagation across widgets.
 * Uses React context so widgets can subscribe without prop drilling.
 */
import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import type { FilterDefinition, FilterScope } from '@supersubset/schema';

// ─── Filter State ────────────────────────────────────────────

export interface FilterValue {
  filterId: string;
  value: unknown;
}

export interface FilterState {
  values: Record<string, unknown>;
}

// ─── Reducer ─────────────────────────────────────────────────

type FilterAction =
  | { type: 'SET_FILTER'; filterId: string; value: unknown }
  | { type: 'RESET_FILTER'; filterId: string }
  | { type: 'RESET_ALL' }
  | { type: 'BULK_SET'; values: Record<string, unknown> };

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case 'SET_FILTER':
      return {
        ...state,
        values: { ...state.values, [action.filterId]: action.value },
      };
    case 'RESET_FILTER': {
      const { [action.filterId]: _, ...rest } = state.values;
      return { ...state, values: rest };
    }
    case 'RESET_ALL':
      return { values: {} };
    case 'BULK_SET':
      return { ...state, values: { ...state.values, ...action.values } };
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────

export interface FilterContextValue {
  state: FilterState;
  setFilter: (filterId: string, value: unknown) => void;
  resetFilter: (filterId: string) => void;
  resetAll: () => void;
  getFiltersForWidget: (widgetId: string, filters: FilterDefinition[]) => FilterValue[];
}

const FilterContext = createContext<FilterContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────

export interface FilterProviderProps {
  initialValues?: Record<string, unknown>;
  filters?: FilterDefinition[];
  onFilterChange?: (state: FilterState) => void;
  children: ReactNode;
}

export function FilterProvider({
  initialValues,
  filters,
  onFilterChange,
  children,
}: FilterProviderProps) {
  const [state, dispatch] = useReducer(filterReducer, {
    values: initialValues ?? {},
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const setFilter = useCallback(
    (filterId: string, value: unknown) => {
      dispatch({ type: 'SET_FILTER', filterId, value });
      const newValues = { ...stateRef.current.values, [filterId]: value };
      onFilterChange?.({ values: newValues });
    },
    [onFilterChange],
  );

  const resetFilter = useCallback(
    (filterId: string) => {
      dispatch({ type: 'RESET_FILTER', filterId });
      const { [filterId]: _, ...rest } = stateRef.current.values;
      onFilterChange?.({ values: rest });
    },
    [onFilterChange],
  );

  const resetAll = useCallback(() => {
    dispatch({ type: 'RESET_ALL' });
    onFilterChange?.({ values: {} });
  }, [onFilterChange]);

  const getFiltersForWidget = useCallback(
    (widgetId: string, allFilters: FilterDefinition[]): FilterValue[] => {
      return allFilters
        .filter((f) => filterAppliesToWidget(f.scope, widgetId))
        .map((f) => ({ filterId: f.id, value: state.values[f.id] }))
        .filter((fv) => fv.value !== undefined);
    },
    [state.values],
  );

  const value = useMemo(
    () => ({ state, setFilter, resetFilter, resetAll, getFiltersForWidget }),
    [state, setFilter, resetFilter, resetAll, getFiltersForWidget],
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

// ─── Hook ────────────────────────────────────────────────────

export function useFilters(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) {
    throw new Error('useFilters must be used inside <FilterProvider>');
  }
  return ctx;
}

// ─── Scope Logic ─────────────────────────────────────────────

function filterAppliesToWidget(scope: FilterScope, widgetId: string): boolean {
  if (scope.type === 'global') return true;
  if (scope.type === 'page') return true; // page-level filters apply to all widgets on the page
  if (scope.type === 'widgets') return scope.widgetIds.includes(widgetId);
  return false;
}
