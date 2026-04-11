import { describe, it, expect } from 'vitest';
import {
  serializeState,
  deserializeState,
  stateToUrlParams,
  stateFromUrlParams,
  type DashboardState,
} from '../src/state/StatePersistence';

// ─── Serialize / Deserialize ─────────────────────────────────

describe('serializeState / deserializeState', () => {
  it('round-trips a basic state', () => {
    const state: DashboardState = {
      filterValues: { region: 'North', status: 'active' },
      activePage: 'page-2',
    };

    const json = serializeState(state);
    const restored = deserializeState(json);

    expect(restored.filterValues).toEqual({ region: 'North', status: 'active' });
    expect(restored.activePage).toBe('page-2');
  });

  it('round-trips state with drill state', () => {
    const state: DashboardState = {
      filterValues: { year: 2024 },
      drillState: {
        active: true,
        sourceWidgetId: 'chart-1',
        fieldRef: 'category',
        fieldValue: 'Electronics',
        breadcrumb: [
          { label: 'Electronics', fieldRef: 'category', value: 'Electronics' },
        ],
      },
    };

    const json = serializeState(state);
    const restored = deserializeState(json);

    expect(restored.drillState?.active).toBe(true);
    expect(restored.drillState?.breadcrumb).toHaveLength(1);
    expect(restored.drillState?.fieldValue).toBe('Electronics');
  });

  it('round-trips empty filter values', () => {
    const state: DashboardState = { filterValues: {} };
    const json = serializeState(state);
    const restored = deserializeState(json);

    expect(restored.filterValues).toEqual({});
    expect(restored.activePage).toBeUndefined();
    expect(restored.drillState).toBeUndefined();
  });

  it('round-trips filter values with various types', () => {
    const state: DashboardState = {
      filterValues: {
        stringVal: 'hello',
        numVal: 42,
        boolVal: true,
        arrayVal: [1, 2, 3],
        nullVal: null,
      },
    };

    const json = serializeState(state);
    const restored = deserializeState(json);

    expect(restored.filterValues).toEqual(state.filterValues);
  });

  it('deserialize invalid JSON returns empty state', () => {
    const result = deserializeState('not valid json {{{');
    expect(result).toEqual({ filterValues: {} });
  });

  it('deserialize empty string returns empty state', () => {
    const result = deserializeState('');
    expect(result).toEqual({ filterValues: {} });
  });

  it('deserialize null-like values returns empty state', () => {
    expect(deserializeState('null')).toEqual({ filterValues: {} });
    expect(deserializeState('42')).toEqual({ filterValues: {} });
    expect(deserializeState('"string"')).toEqual({ filterValues: {} });
    expect(deserializeState('[]')).toEqual({ filterValues: {} });
  });

  it('deserialize object with missing filterValues defaults to empty', () => {
    const result = deserializeState('{"activePage":"page-1"}');
    expect(result.filterValues).toEqual({});
    expect(result.activePage).toBe('page-1');
  });

  it('deserialize object with non-object filterValues defaults to empty', () => {
    const result = deserializeState('{"filterValues":"oops"}');
    expect(result.filterValues).toEqual({});
  });
});

// ─── URL Params ──────────────────────────────────────────────

describe('stateToUrlParams / stateFromUrlParams', () => {
  it('encodes filter values as f_ prefixed params', () => {
    const state: DashboardState = {
      filterValues: { region: 'North', count: 5 },
    };

    const params = stateToUrlParams(state);
    expect(params.get('f_region')).toBe('"North"');
    expect(params.get('f_count')).toBe('5');
  });

  it('encodes activePage as page param', () => {
    const state: DashboardState = {
      filterValues: {},
      activePage: 'page-2',
    };

    const params = stateToUrlParams(state);
    expect(params.get('page')).toBe('page-2');
  });

  it('does not set page param when activePage is undefined', () => {
    const state: DashboardState = { filterValues: {} };
    const params = stateToUrlParams(state);
    expect(params.has('page')).toBe(false);
  });

  it('decodes f_ params back to filter values', () => {
    const params = new URLSearchParams('f_region=%22North%22&f_count=5');
    const result = stateFromUrlParams(params);

    expect(result.filterValues).toEqual({ region: 'North', count: 5 });
  });

  it('decodes page param', () => {
    const params = new URLSearchParams('page=page-3');
    const result = stateFromUrlParams(params);
    expect(result.activePage).toBe('page-3');
  });

  it('round-trips filter values through URL params', () => {
    const state: DashboardState = {
      filterValues: { category: 'Books', year: 2024 },
      activePage: 'overview',
    };

    const params = stateToUrlParams(state);
    const result = stateFromUrlParams(params);

    expect(result.filterValues).toEqual({ category: 'Books', year: 2024 });
    expect(result.activePage).toBe('overview');
  });

  it('returns empty partial for empty params', () => {
    const params = new URLSearchParams('');
    const result = stateFromUrlParams(params);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('handles non-JSON filter values as raw strings', () => {
    const params = new URLSearchParams('f_name=plain-text');
    const result = stateFromUrlParams(params);
    expect(result.filterValues?.name).toBe('plain-text');
  });

  it('state includes filter values', () => {
    const state: DashboardState = {
      filterValues: { status: 'shipped', priority: 'high' },
    };

    const serialized = serializeState(state);
    const deserialized = deserializeState(serialized);

    expect(deserialized.filterValues.status).toBe('shipped');
    expect(deserialized.filterValues.priority).toBe('high');
  });
});
