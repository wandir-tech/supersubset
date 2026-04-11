import { describe, it, expect } from 'vitest';
import { SqlAdapter } from '../src/index.js';
import type { SqlCatalogSource } from '../src/index.js';

const adapter = new SqlAdapter();

const FIXTURE: SqlCatalogSource = {
  tables: [
    {
      name: 'users',
      type: 'TABLE',
      columns: [
        { name: 'id', dataType: 'INTEGER', nullable: false, isPrimaryKey: true },
        { name: 'email', dataType: 'VARCHAR(255)', nullable: false, isPrimaryKey: false },
        { name: 'name', dataType: 'VARCHAR(100)', nullable: true, isPrimaryKey: false },
        { name: 'created_at', dataType: 'TIMESTAMP', nullable: false, isPrimaryKey: false },
        { name: 'is_active', dataType: 'BOOLEAN', nullable: false, isPrimaryKey: false },
      ],
    },
    {
      name: 'orders',
      type: 'TABLE',
      columns: [
        { name: 'id', dataType: 'INTEGER', nullable: false, isPrimaryKey: true },
        { name: 'user_id', dataType: 'INTEGER', nullable: false, isPrimaryKey: false },
        { name: 'total_amount', dataType: 'DECIMAL(10,2)', nullable: false, isPrimaryKey: false },
        { name: 'status', dataType: 'VARCHAR(50)', nullable: false, isPrimaryKey: false },
        { name: 'order_date', dataType: 'DATE', nullable: false, isPrimaryKey: false },
      ],
    },
    {
      schema: 'analytics',
      name: 'order_summary',
      type: 'VIEW',
      columns: [
        { name: 'user_id', dataType: 'INTEGER', nullable: false, isPrimaryKey: false },
        { name: 'order_count', dataType: 'BIGINT', nullable: false, isPrimaryKey: false },
        { name: 'total_revenue', dataType: 'DECIMAL(12,2)', nullable: false, isPrimaryKey: false },
      ],
    },
  ],
  foreignKeys: [
    {
      sourceTable: 'orders',
      sourceColumn: 'user_id',
      targetTable: 'users',
      targetColumn: 'id',
    },
  ],
};

describe('SqlAdapter', () => {
  it('has correct name', () => {
    expect(adapter.name).toBe('sql');
  });

  describe('getDatasets', () => {
    it('returns all tables and views', async () => {
      const datasets = await adapter.getDatasets(FIXTURE);
      expect(datasets).toHaveLength(3);
    });

    it('generates correct dataset ids', async () => {
      const datasets = await adapter.getDatasets(FIXTURE);
      expect(datasets[0].id).toBe('users');
      expect(datasets[1].id).toBe('orders');
      expect(datasets[2].id).toBe('analytics.order_summary');
    });

    it('sets source type for tables', async () => {
      const datasets = await adapter.getDatasets(FIXTURE);
      expect(datasets[0].source?.type).toBe('table');
    });

    it('sets source type for views', async () => {
      const datasets = await adapter.getDatasets(FIXTURE);
      expect(datasets[2].source?.type).toBe('view');
    });

    it('maps SQL types correctly', async () => {
      const datasets = await adapter.getDatasets(FIXTURE);
      const users = datasets[0];

      expect(users.fields.find((f) => f.id === 'id')?.dataType).toBe('integer');
      expect(users.fields.find((f) => f.id === 'email')?.dataType).toBe('string');
      expect(users.fields.find((f) => f.id === 'created_at')?.dataType).toBe('datetime');
      expect(users.fields.find((f) => f.id === 'is_active')?.dataType).toBe('boolean');
    });

    it('marks primary keys as key role', async () => {
      const datasets = await adapter.getDatasets(FIXTURE);
      const users = datasets[0];
      expect(users.fields.find((f) => f.id === 'id')?.role).toBe('key');
    });

    it('infers field roles', async () => {
      const datasets = await adapter.getDatasets(FIXTURE);
      const orders = datasets[1];

      expect(orders.fields.find((f) => f.id === 'total_amount')?.role).toBe('measure');
      expect(orders.fields.find((f) => f.id === 'status')?.role).toBe('dimension');
      expect(orders.fields.find((f) => f.id === 'order_date')?.role).toBe('time');
    });

    it('infers aggregation for measures', async () => {
      const datasets = await adapter.getDatasets(FIXTURE);
      const orders = datasets[1];
      expect(orders.fields.find((f) => f.id === 'total_amount')?.defaultAggregation).toBe('sum');
    });

    it('detects foreign key relationships', async () => {
      const datasets = await adapter.getDatasets(FIXTURE);
      const orders = datasets[1];
      expect(orders.relationships).toHaveLength(1);
      expect(orders.relationships![0]).toEqual({
        targetDatasetId: 'users',
        type: 'many-to-one',
        sourceFieldId: 'user_id',
        targetFieldId: 'id',
      });
    });

    it('omits relationships for tables without FKs', async () => {
      const datasets = await adapter.getDatasets(FIXTURE);
      const users = datasets[0];
      expect(users.relationships).toBeUndefined();
    });

    it('humanizes column names for labels', async () => {
      const datasets = await adapter.getDatasets(FIXTURE);
      const users = datasets[0];
      expect(users.fields.find((f) => f.id === 'created_at')?.label).toBe('Created At');
      expect(users.fields.find((f) => f.id === 'is_active')?.label).toBe('Is Active');
    });

    it('maps DECIMAL type to number', async () => {
      const datasets = await adapter.getDatasets(FIXTURE);
      const orders = datasets[1];
      expect(orders.fields.find((f) => f.id === 'total_amount')?.dataType).toBe('number');
    });

    it('maps DATE type to date', async () => {
      const datasets = await adapter.getDatasets(FIXTURE);
      const orders = datasets[1];
      expect(orders.fields.find((f) => f.id === 'order_date')?.dataType).toBe('date');
    });

    it('maps BIGINT type to integer', async () => {
      const datasets = await adapter.getDatasets(FIXTURE);
      const view = datasets[2];
      expect(view.fields.find((f) => f.id === 'order_count')?.dataType).toBe('integer');
    });
  });

  describe('getDataset', () => {
    it('returns a single dataset by id', async () => {
      const ds = await adapter.getDataset(FIXTURE, 'users');
      expect(ds?.id).toBe('users');
    });

    it('returns dataset with schema prefix', async () => {
      const ds = await adapter.getDataset(FIXTURE, 'analytics.order_summary');
      expect(ds?.id).toBe('analytics.order_summary');
    });

    it('returns undefined for missing dataset', async () => {
      const ds = await adapter.getDataset(FIXTURE, 'nonexistent');
      expect(ds).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('handles source with no tables', async () => {
      const datasets = await adapter.getDatasets({ tables: [] });
      expect(datasets).toEqual([]);
    });

    it('handles source with no foreign keys', async () => {
      const datasets = await adapter.getDatasets({
        tables: [
          {
            name: 'simple',
            type: 'TABLE',
            columns: [{ name: 'id', dataType: 'INT', nullable: false, isPrimaryKey: true }],
          },
        ],
      });
      expect(datasets[0].relationships).toBeUndefined();
    });

    it('maps unknown SQL types to unknown', async () => {
      const datasets = await adapter.getDatasets({
        tables: [
          {
            name: 'exotic',
            type: 'TABLE',
            columns: [
              { name: 'data', dataType: 'GEOMETRY', nullable: true, isPrimaryKey: false },
            ],
          },
        ],
      });
      expect(datasets[0].fields[0].dataType).toBe('unknown');
    });
  });

  describe('validation', () => {
    it('rejects null source', async () => {
      await expect(adapter.getDatasets(null as unknown as SqlCatalogSource)).rejects.toThrow(
        'source must be an object',
      );
    });

    it('rejects source without tables', async () => {
      await expect(adapter.getDatasets({} as unknown as SqlCatalogSource)).rejects.toThrow(
        'must have a "tables" array',
      );
    });

    it('rejects table without name', async () => {
      await expect(
        adapter.getDatasets({
          tables: [{ type: 'TABLE', columns: [] } as unknown as SqlCatalogSource['tables'][0]],
        }),
      ).rejects.toThrow('non-empty "name"');
    });

    it('rejects table with invalid type', async () => {
      await expect(
        adapter.getDatasets({
          tables: [
            { name: 'x', type: 'MATERIALIZED' as never, columns: [] },
          ],
        }),
      ).rejects.toThrow('type "TABLE" or "VIEW"');
    });
  });
});
