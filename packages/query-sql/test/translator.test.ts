import { describe, expect, it } from 'vitest';
import type { LogicalQuery } from '@supersubset/data-model';
import { escapeLiteral, planFields, toSql } from '../src/translator';

describe('toSql — projection and aliases', () => {
  it('emits SELECT with quoted identifiers for a simple projection', () => {
    const { sql } = toSql({
      datasetId: 'orders',
      fields: [{ fieldId: 'status' }, { fieldId: 'total' }],
    });
    expect(sql).toBe('SELECT "status" AS "status", "total" AS "total" FROM "orders"');
  });

  it('honors user-supplied aliases', () => {
    const { sql } = toSql({
      datasetId: 'orders',
      fields: [{ fieldId: 'total', alias: 'order_total' }],
    });
    expect(sql).toBe('SELECT "total" AS "order_total" FROM "orders"');
  });

  it('disambiguates an aggregation alias from the raw column name', () => {
    const { sql, planned } = toSql({
      datasetId: 'orders',
      fields: [{ fieldId: 'total', aggregation: 'sum' }],
    });
    expect(sql).toBe('SELECT SUM("total") AS "sum_total" FROM "orders"');
    expect(planned[0].outputKey).toBe('total');
    expect(planned[0].sqlAlias).toBe('sum_total');
  });
});

describe('toSql — DISTINCT', () => {
  it('emits SELECT DISTINCT when query.distinct is true and no aggregations are present', () => {
    const { sql } = toSql({
      datasetId: 'plan_events',
      fields: [{ fieldId: 'plan_type' }],
      distinct: true,
      limit: 50,
    });
    expect(sql).toBe('SELECT DISTINCT "plan_type" AS "plan_type" FROM "plan_events" LIMIT 50');
  });

  it('does not emit DISTINCT when aggregations are present (GROUP BY already deduplicates)', () => {
    const { sql } = toSql({
      datasetId: 'orders',
      fields: [{ fieldId: 'status' }, { fieldId: 'total', aggregation: 'sum' }],
      distinct: true,
    });
    expect(sql).toContain('GROUP BY "status"');
    expect(sql).not.toContain('SELECT DISTINCT');
  });

  it('omits DISTINCT when the flag is false or absent', () => {
    const a = toSql({ datasetId: 'orders', fields: [{ fieldId: 'status' }] }).sql;
    const b = toSql({
      datasetId: 'orders',
      fields: [{ fieldId: 'status' }],
      distinct: false,
    }).sql;
    expect(a).not.toContain('DISTINCT');
    expect(b).not.toContain('DISTINCT');
  });
});

describe('toSql — aggregations and GROUP BY', () => {
  it('emits GROUP BY for non-aggregated projection fields when at least one aggregation is present', () => {
    const { sql } = toSql({
      datasetId: 'orders',
      fields: [
        { fieldId: 'status' },
        { fieldId: 'region' },
        { fieldId: 'total', aggregation: 'sum' },
      ],
    });
    expect(sql).toBe(
      'SELECT "status" AS "status", "region" AS "region", SUM("total") AS "sum_total" FROM "orders" GROUP BY "status", "region"',
    );
  });

  it('translates COUNT(DISTINCT col)', () => {
    const { sql } = toSql({
      datasetId: 'orders',
      fields: [{ fieldId: 'customer_id', aggregation: 'count_distinct' }],
    });
    expect(sql).toBe(
      'SELECT COUNT(DISTINCT "customer_id") AS "count_distinct_customer_id" FROM "orders"',
    );
  });

  it('omits GROUP BY when there are no non-aggregated projection fields', () => {
    const { sql } = toSql({
      datasetId: 'orders',
      fields: [{ fieldId: 'total', aggregation: 'sum' }],
    });
    expect(sql).toBe('SELECT SUM("total") AS "sum_total" FROM "orders"');
  });
});

describe('toSql — WHERE', () => {
  it('translates each filter operator', () => {
    const cases: Array<[LogicalQuery['filters'], string]> = [
      [[{ fieldId: 'status', operator: 'eq', value: 'open' }], `"status" = 'open'`],
      [[{ fieldId: 'status', operator: 'neq', value: 'open' }], `"status" != 'open'`],
      [[{ fieldId: 'total', operator: 'gt', value: 100 }], `"total" > 100`],
      [[{ fieldId: 'total', operator: 'gte', value: 100 }], `"total" >= 100`],
      [[{ fieldId: 'total', operator: 'lt', value: 100 }], `"total" < 100`],
      [[{ fieldId: 'total', operator: 'lte', value: 100 }], `"total" <= 100`],
      [
        [{ fieldId: 'status', operator: 'in', value: ['open', 'closed'] }],
        `"status" IN ('open', 'closed')`,
      ],
      [
        [{ fieldId: 'status', operator: 'not_in', value: ['archived'] }],
        `"status" NOT IN ('archived')`,
      ],
      [[{ fieldId: 'name', operator: 'like', value: '%a%' }], `"name" LIKE '%a%'`],
      [[{ fieldId: 'name', operator: 'not_like', value: '%a%' }], `"name" NOT LIKE '%a%'`],
      [[{ fieldId: 'note', operator: 'is_null', value: undefined }], `"note" IS NULL`],
      [[{ fieldId: 'note', operator: 'is_not_null', value: undefined }], `"note" IS NOT NULL`],
      [[{ fieldId: 'total', operator: 'between', value: [10, 20] }], `"total" BETWEEN 10 AND 20`],
    ];
    for (const [filters, expected] of cases) {
      const { sql } = toSql({
        datasetId: 'orders',
        fields: [{ fieldId: 'status' }],
        filters,
      });
      expect(sql).toContain(`WHERE ${expected}`);
    }
  });

  it('joins multiple filters with AND', () => {
    const { sql } = toSql({
      datasetId: 'orders',
      fields: [{ fieldId: 'status' }],
      filters: [
        { fieldId: 'status', operator: 'eq', value: 'open' },
        { fieldId: 'total', operator: 'gt', value: 100 },
      ],
    });
    expect(sql).toContain(`WHERE "status" = 'open' AND "total" > 100`);
  });

  it('renders empty IN as NULL to keep SQL valid', () => {
    const { sql } = toSql({
      datasetId: 'orders',
      fields: [{ fieldId: 'status' }],
      filters: [{ fieldId: 'status', operator: 'in', value: [] }],
    });
    expect(sql).toContain('IN (NULL)');
  });
});

describe('toSql — ORDER BY, LIMIT, OFFSET', () => {
  it('translates sort by raw column', () => {
    const { sql } = toSql({
      datasetId: 'orders',
      fields: [{ fieldId: 'status' }],
      sort: [{ fieldId: 'status', direction: 'asc' }],
    });
    expect(sql).toContain('ORDER BY "status" ASC');
  });

  it('translates sort by output key (alias) using the SQL alias', () => {
    const { sql } = toSql({
      datasetId: 'orders',
      fields: [{ fieldId: 'total', aggregation: 'sum' }],
      sort: [{ fieldId: 'total', direction: 'desc' }],
    });
    // outputKey 'total' matches → uses sqlAlias 'sum_total'
    expect(sql).toContain('ORDER BY "sum_total" DESC');
  });

  it('emits LIMIT when set, and adds 1 with truncationProbe', () => {
    const a = toSql({ datasetId: 'orders', fields: [{ fieldId: 'status' }], limit: 100 });
    expect(a.sql).toContain('LIMIT 100');

    const b = toSql(
      { datasetId: 'orders', fields: [{ fieldId: 'status' }], limit: 100 },
      { truncationProbe: true },
    );
    expect(b.sql).toContain('LIMIT 101');
  });

  it('emits OFFSET only when > 0', () => {
    const a = toSql({ datasetId: 'orders', fields: [{ fieldId: 'status' }], offset: 0 });
    expect(a.sql).not.toContain('OFFSET');
    const b = toSql({ datasetId: 'orders', fields: [{ fieldId: 'status' }], offset: 50 });
    expect(b.sql).toContain('OFFSET 50');
  });
});

describe('toSql — validation', () => {
  it('throws when datasetId is missing', () => {
    expect(() => toSql({ datasetId: '', fields: [{ fieldId: 'x' }] })).toThrow(/datasetId/);
  });

  it('throws when fields is empty', () => {
    expect(() => toSql({ datasetId: 'orders', fields: [] })).toThrow(/fields/);
  });

  it('throws on unsupported filter operator', () => {
    expect(() =>
      toSql({
        datasetId: 'orders',
        fields: [{ fieldId: 'status' }],
        // @ts-expect-error testing runtime guard for bad operator
        filters: [{ fieldId: 'status', operator: 'starts_with', value: 'x' }],
      }),
    ).toThrow(/unsupported operator/);
  });

  it('throws on bad sort direction', () => {
    expect(() =>
      toSql({
        datasetId: 'orders',
        fields: [{ fieldId: 'status' }],
        // @ts-expect-error testing runtime guard for bad direction
        sort: [{ fieldId: 'status', direction: 'sideways' }],
      }),
    ).toThrow(/asc.*desc/);
  });

  it('throws on between without [min, max]', () => {
    expect(() =>
      toSql({
        datasetId: 'orders',
        fields: [{ fieldId: 'status' }],
        filters: [{ fieldId: 'total', operator: 'between', value: [10] }],
      }),
    ).toThrow(/min, max/);
  });

  it('throws on duplicate sqlAlias collisions (forces caller to disambiguate)', () => {
    expect(() =>
      toSql({
        datasetId: 'orders',
        fields: [{ fieldId: 'status' }, { fieldId: 'status' }],
      }),
    ).toThrow(/duplicate column alias "status"/);
  });

  it('allows the same fieldId twice when at least one carries a unique alias', () => {
    const { sql } = toSql({
      datasetId: 'orders',
      fields: [{ fieldId: 'status' }, { fieldId: 'status', alias: 'status_raw' }],
    });
    expect(sql).toBe('SELECT "status" AS "status", "status" AS "status_raw" FROM "orders"');
  });

  it('throws on outputKey collision even when sqlAlias is unique (different aggregations on same fieldId)', () => {
    // sqlAlias would be sum_total / avg_total (unique), but outputKey defaults
    // to fieldId for both, which would silently overwrite during row remap.
    expect(() =>
      toSql({
        datasetId: 'orders',
        fields: [
          { fieldId: 'total', aggregation: 'sum' },
          { fieldId: 'total', aggregation: 'avg' },
        ],
      }),
    ).toThrow(/duplicate output key "total"/);
  });

  it('throws on outputKey collision between raw + aggregated same fieldId', () => {
    expect(() =>
      toSql({
        datasetId: 'orders',
        fields: [{ fieldId: 'total' }, { fieldId: 'total', aggregation: 'sum' }],
      }),
    ).toThrow(/duplicate output key "total"/);
  });

  it('allows multiple aggregations on the same fieldId when each has a unique alias', () => {
    const { sql, planned } = toSql({
      datasetId: 'orders',
      fields: [
        { fieldId: 'total', aggregation: 'sum', alias: 'sum_total' },
        { fieldId: 'total', aggregation: 'avg', alias: 'avg_total' },
      ],
    });
    expect(sql).toBe(
      'SELECT SUM("total") AS "sum_total", AVG("total") AS "avg_total" FROM "orders"',
    );
    expect(planned.map((p) => p.outputKey)).toEqual(['sum_total', 'avg_total']);
  });

  it('rejects negative or fractional limit/offset', () => {
    expect(() => toSql({ datasetId: 'orders', fields: [{ fieldId: 'x' }], limit: -1 })).toThrow(
      /limit must be a non-negative integer/,
    );
    expect(() => toSql({ datasetId: 'orders', fields: [{ fieldId: 'x' }], limit: 2.5 })).toThrow(
      /limit must be a non-negative integer/,
    );
    expect(() => toSql({ datasetId: 'orders', fields: [{ fieldId: 'x' }], offset: -5 })).toThrow(
      /offset must be a non-negative integer/,
    );
    expect(() => toSql({ datasetId: 'orders', fields: [{ fieldId: 'x' }], offset: 1.5 })).toThrow(
      /offset must be a non-negative integer/,
    );
  });

  it('accepts limit/offset of 0 (valid edge cases)', () => {
    const a = toSql({ datasetId: 'orders', fields: [{ fieldId: 'x' }], limit: 0 });
    expect(a.sql).toContain('LIMIT 0');
    // offset 0 is valid but omitted from the SQL (no OFFSET clause emitted).
    const b = toSql({ datasetId: 'orders', fields: [{ fieldId: 'x' }], offset: 0 });
    expect(b.sql).not.toContain('OFFSET');
  });
});

describe('escapeLiteral', () => {
  it('handles null/undefined → NULL', () => {
    expect(escapeLiteral(null)).toBe('NULL');
    expect(escapeLiteral(undefined)).toBe('NULL');
  });
  it('handles numbers, booleans, dates, strings', () => {
    expect(escapeLiteral(42)).toBe('42');
    expect(escapeLiteral(true)).toBe('TRUE');
    expect(escapeLiteral(false)).toBe('FALSE');
    expect(escapeLiteral(new Date('2026-05-27T00:00:00Z'))).toBe(`'2026-05-27T00:00:00.000Z'`);
    expect(escapeLiteral("it's")).toBe(`'it''s'`);
  });
  it('rejects non-finite numbers', () => {
    expect(() => escapeLiteral(NaN)).toThrow(/invalid numeric/);
    expect(() => escapeLiteral(Infinity)).toThrow(/invalid numeric/);
  });
});

describe('planFields', () => {
  it('outputKey is alias when provided, else fieldId; sqlAlias makes aggregations unique', () => {
    const planned = planFields({
      datasetId: 'orders',
      fields: [
        { fieldId: 'status' },
        { fieldId: 'total', aggregation: 'sum' },
        { fieldId: 'total', alias: 'raw_total' },
      ],
    });
    expect(planned.map((p) => p.outputKey)).toEqual(['status', 'total', 'raw_total']);
    expect(planned.map((p) => p.sqlAlias)).toEqual(['status', 'sum_total', 'raw_total']);
  });
});
