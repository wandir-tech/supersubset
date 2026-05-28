import { describe, expect, it, vi } from 'vitest';
import { resolveFilterOptionsWithAdapter, type NormalizedDataset } from '@supersubset/data-model';
import { SqlQueryAdapter, type SqlExecutor } from '../src/adapter';

function mockExecutor(
  rows: Array<Record<string, unknown>>,
): SqlExecutor & { run: ReturnType<typeof vi.fn> } {
  return { run: vi.fn().mockResolvedValue(rows) };
}

const catalog: NormalizedDataset[] = [
  {
    id: 'plan_events',
    label: 'Plan Events',
    fields: [
      { id: 'plan_type', label: 'Plan Type', dataType: 'string', role: 'dimension' },
      { id: 'total', label: 'Total', dataType: 'integer', role: 'measure' },
    ],
  },
];

describe('SqlQueryAdapter — execute', () => {
  it('translates and executes a simple projection', async () => {
    const executor = mockExecutor([{ plan_type: 'MEETUP' }, { plan_type: 'TRIP' }]);
    const adapter = new SqlQueryAdapter({ executor, catalog });

    const result = await adapter.execute({
      datasetId: 'plan_events',
      fields: [{ fieldId: 'plan_type' }],
      limit: 10,
    });

    expect(executor.run).toHaveBeenCalledWith(
      'SELECT "plan_type" AS "plan_type" FROM "plan_events" LIMIT 11',
    );
    expect(result.rows).toEqual([{ plan_type: 'MEETUP' }, { plan_type: 'TRIP' }]);
    expect(result.columns).toEqual([
      { fieldId: 'plan_type', label: 'Plan Type', dataType: 'string' },
    ]);
    expect(result.truncated).toBe(false);
    expect(result.totalRows).toBe(2);
  });

  it('honors distinct: true (DISTINCT in SQL)', async () => {
    const executor = mockExecutor([{ plan_type: 'MEETUP' }]);
    const adapter = new SqlQueryAdapter({ executor });

    await adapter.execute({
      datasetId: 'plan_events',
      fields: [{ fieldId: 'plan_type' }],
      distinct: true,
      limit: 50,
    });

    expect(executor.run).toHaveBeenCalledWith(
      'SELECT DISTINCT "plan_type" AS "plan_type" FROM "plan_events" LIMIT 51',
    );
  });

  it('detects truncation via the +1 sentinel and slices rows', async () => {
    const executor = mockExecutor([{ x: 1 }, { x: 2 }, { x: 3 }]); // 3 rows for limit 2 → truncated
    const adapter = new SqlQueryAdapter({ executor });

    const result = await adapter.execute({
      datasetId: 'orders',
      fields: [{ fieldId: 'x' }],
      limit: 2,
    });

    expect(result.rows).toHaveLength(2);
    expect(result.truncated).toBe(true);
  });

  it('caps limit at maxLimit', async () => {
    const executor = mockExecutor([]);
    const adapter = new SqlQueryAdapter({ executor, maxLimit: 100 });

    await adapter.execute({
      datasetId: 'orders',
      fields: [{ fieldId: 'x' }],
      limit: 5000,
    });

    expect(executor.run).toHaveBeenCalledWith('SELECT "x" AS "x" FROM "orders" LIMIT 101');
  });

  it('uses defaultLimit when query has no limit', async () => {
    const executor = mockExecutor([]);
    const adapter = new SqlQueryAdapter({ executor, defaultLimit: 25 });

    await adapter.execute({
      datasetId: 'orders',
      fields: [{ fieldId: 'x' }],
    });

    expect(executor.run).toHaveBeenCalledWith('SELECT "x" AS "x" FROM "orders" LIMIT 26');
  });

  it('remaps sqlAlias back to outputKey for aggregations', async () => {
    const executor = mockExecutor([{ sum_total: 1000 }]);
    const adapter = new SqlQueryAdapter({ executor, catalog });

    const result = await adapter.execute({
      datasetId: 'plan_events',
      fields: [{ fieldId: 'total', aggregation: 'sum' }],
    });

    expect(result.rows).toEqual([{ total: 1000 }]);
    expect(result.columns).toEqual([{ fieldId: 'total', label: 'Total', dataType: 'integer' }]);
  });

  it('exposes the executed SQL on the result for diagnostics', async () => {
    const executor = mockExecutor([]);
    const adapter = new SqlQueryAdapter({ executor });

    const result = await adapter.execute({
      datasetId: 'orders',
      fields: [{ fieldId: 'x' }],
    });

    expect(result.sql).toMatch(/^SELECT "x" AS "x" FROM "orders"/);
  });

  it('falls back to unknown dataType when no catalog is provided', async () => {
    const executor = mockExecutor([{ status: 'open' }]);
    const adapter = new SqlQueryAdapter({ executor });

    const result = await adapter.execute({
      datasetId: 'orders',
      fields: [{ fieldId: 'status' }],
    });

    expect(result.columns[0]).toEqual({
      fieldId: 'status',
      label: 'Status',
      dataType: 'unknown',
    });
  });
});

describe('SqlQueryAdapter — resolveFilterOptions via data-model helper', () => {
  it('synthesizes a distinct-values query and returns options', async () => {
    const executor = mockExecutor([
      { plan_type: 'MEETUP' },
      { plan_type: 'TRIP' },
      { plan_type: 'AD' },
    ]);
    const adapter = new SqlQueryAdapter({ executor });

    const response = await resolveFilterOptionsWithAdapter(adapter, {
      filterId: 'f-plan-type',
      datasetId: 'plan_events',
      fieldId: 'plan_type',
      limit: 50,
    });

    expect(executor.run).toHaveBeenCalledWith(
      'SELECT DISTINCT "plan_type" AS "plan_type" FROM "plan_events" LIMIT 51',
    );
    expect(response.options).toEqual([{ value: 'MEETUP' }, { value: 'TRIP' }, { value: 'AD' }]);
    expect(response.complete).toBe(true);
  });

  it('translates search into a LIKE filter', async () => {
    const executor = mockExecutor([{ plan_type: 'MEETUP' }]);
    const adapter = new SqlQueryAdapter({ executor });

    await resolveFilterOptionsWithAdapter(adapter, {
      filterId: 'f',
      datasetId: 'plan_events',
      fieldId: 'plan_type',
      search: 'MEET',
      limit: 10,
    });

    expect(executor.run).toHaveBeenCalledWith(
      `SELECT DISTINCT "plan_type" AS "plan_type" FROM "plan_events" WHERE "plan_type" LIKE 'MEET' LIMIT 11`,
    );
  });

  it('deduplicates and skips null values defensively', async () => {
    // Even if the executor returns duplicates (e.g., an older adapter that
    // ignored the distinct flag) or nulls, the helper de-dupes client-side.
    const executor = mockExecutor([
      { plan_type: 'MEETUP' },
      { plan_type: 'MEETUP' },
      { plan_type: null },
      { plan_type: 'TRIP' },
    ]);
    const adapter = new SqlQueryAdapter({ executor });

    const response = await resolveFilterOptionsWithAdapter(adapter, {
      filterId: 'f',
      datasetId: 'plan_events',
      fieldId: 'plan_type',
    });

    expect(response.options).toEqual([{ value: 'MEETUP' }, { value: 'TRIP' }]);
  });
});
