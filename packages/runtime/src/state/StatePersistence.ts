/**
 * StatePersistence — pure utility functions for serializing/deserializing
 * dashboard interaction state (filter values, drill state, active page).
 * The host app decides where and how to persist; these are just helpers.
 */
import type { DrillState } from '../interactions/DrillManager';

// ─── Types ───────────────────────────────────────────────────

export interface DashboardState {
  filterValues: Record<string, unknown>;
  activePage?: string;
  drillState?: DrillState;
}

// ─── Serialization ───────────────────────────────────────────

export function serializeState(state: DashboardState): string {
  return JSON.stringify(state);
}

export function deserializeState(json: string): DashboardState {
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { filterValues: {} };
    }
    return {
      filterValues:
        parsed.filterValues && typeof parsed.filterValues === 'object' && !Array.isArray(parsed.filterValues)
          ? parsed.filterValues
          : {},
      activePage: typeof parsed.activePage === 'string' ? parsed.activePage : undefined,
      drillState:
        parsed.drillState && typeof parsed.drillState === 'object' && !Array.isArray(parsed.drillState)
          ? parsed.drillState
          : undefined,
    };
  } catch {
    return { filterValues: {} };
  }
}

// ─── URL Params ──────────────────────────────────────────────

export function stateToUrlParams(state: DashboardState): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(state.filterValues)) {
    params.set(`f_${key}`, JSON.stringify(value));
  }
  if (state.activePage) {
    params.set('page', state.activePage);
  }
  return params;
}

export function stateFromUrlParams(params: URLSearchParams): Partial<DashboardState> {
  const filterValues: Record<string, unknown> = {};
  const result: Partial<DashboardState> = {};

  for (const [key, value] of params.entries()) {
    if (key.startsWith('f_')) {
      const filterId = key.slice(2);
      try {
        filterValues[filterId] = JSON.parse(value);
      } catch {
        filterValues[filterId] = value;
      }
    } else if (key === 'page') {
      result.activePage = value;
    }
  }

  if (Object.keys(filterValues).length > 0) {
    result.filterValues = filterValues;
  }

  return result;
}
