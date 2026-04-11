import { describe, it, expect } from 'vitest';
import { DbtAdapter } from '../src/index.js';
import type { DbtManifestSource } from '../src/index.js';

const adapter = new DbtAdapter();

const FIXTURE: DbtManifestSource = {
  nodes: {
    'model.project.users': {
      resource_type: 'model',
      name: 'users',
      description: 'All application users',
      schema: 'public',
      columns: {
        id: { name: 'id', data_type: 'INTEGER', description: 'Primary key' },
        email: { name: 'email', data_type: 'VARCHAR' },
        name: { name: 'name', data_type: 'VARCHAR' },
        created_at: { name: 'created_at', data_type: 'TIMESTAMP' },
        is_active: { name: 'is_active', data_type: 'BOOLEAN' },
      },
    },
    'model.project.orders': {
      resource_type: 'model',
      name: 'orders',
      description: 'Customer orders',
      columns: {
        id: { name: 'id', data_type: 'INTEGER' },
        user_id: { name: 'user_id', data_type: 'INTEGER' },
        total_amount: { name: 'total_amount', data_type: 'DECIMAL' },
        status: { name: 'status', data_type: 'VARCHAR' },
        order_date: { name: 'order_date', data_type: 'DATE' },
      },
      depends_on: { nodes: ['model.project.users'] },
    },
    'source.project.raw_events': {
      resource_type: 'source',
      name: 'raw_events',
      description: 'Raw event stream',
      columns: {
        event_id: { name: 'event_id', data_type: 'STRING' },
        event_type: { name: 'event_type', data_type: 'STRING' },
        timestamp: { name: 'timestamp', data_type: 'TIMESTAMP' },
        payload: { name: 'payload', data_type: 'JSON' },
      },
    },
    'test.project.unique_users_id': {
      resource_type: 'test',
      name: 'unique_users_id',
    },
    'seed.project.country_codes': {
      resource_type: 'seed',
      name: 'country_codes',
      columns: {
        code: { name: 'code', data_type: 'VARCHAR' },
        name: { name: 'name', data_type: 'VARCHAR' },
      },
    },
  },
};

describe('DbtAdapter', () => {
  it('has correct name', () => {
    expect(adapter.name).toBe('dbt');
  });

  describe('getDatasets', () => {
    it('extracts only model and source nodes', async () => {
      const datasets = await adapter.getDatasets(FIXTURE);
      expect(datasets).toHaveLength(3);
      const names = datasets.map((d) => d.id);
      expect(names).toContain('users');
      expect(names).toContain('orders');
      expect(names).toContain('raw_events');
    });

    it('skips test and seed nodes', async () => {
      const datasets = await adapter.getDatasets(FIXTURE);
      const names = datasets.map((d) => d.id);
      expect(names).not.toContain('unique_users_id');
      expect(names).not.toContain('country_codes');
    });

    it('preserves descriptions', async () => {
      const datasets = await adapter.getDatasets(FIXTURE);
      const users = datasets.find((d) => d.id === 'users')!;
      expect(users.description).toBe('All application users');
    });

    it('sets source ref to node id', async () => {
      const datasets = await adapter.getDatasets(FIXTURE);
      const users = datasets.find((d) => d.id === 'users')!;
      expect(users.source).toEqual({ type: 'model', ref: 'model.project.users' });
    });

    it('maps dbt column types correctly', async () => {
      const datasets = await adapter.getDatasets(FIXTURE);
      const users = datasets.find((d) => d.id === 'users')!;

      expect(users.fields.find((f) => f.id === 'id')?.dataType).toBe('integer');
      expect(users.fields.find((f) => f.id === 'email')?.dataType).toBe('string');
      expect(users.fields.find((f) => f.id === 'created_at')?.dataType).toBe('datetime');
      expect(users.fields.find((f) => f.id === 'is_active')?.dataType).toBe('boolean');
    });

    it('infers field roles', async () => {
      const datasets = await adapter.getDatasets(FIXTURE);
      const orders = datasets.find((d) => d.id === 'orders')!;

      expect(orders.fields.find((f) => f.id === 'id')?.role).toBe('key');
      expect(orders.fields.find((f) => f.id === 'total_amount')?.role).toBe('measure');
      expect(orders.fields.find((f) => f.id === 'status')?.role).toBe('dimension');
      expect(orders.fields.find((f) => f.id === 'order_date')?.role).toBe('time');
    });

    it('infers aggregation for measures', async () => {
      const datasets = await adapter.getDatasets(FIXTURE);
      const orders = datasets.find((d) => d.id === 'orders')!;
      expect(orders.fields.find((f) => f.id === 'total_amount')?.defaultAggregation).toBe('sum');
    });

    it('humanizes field names', async () => {
      const datasets = await adapter.getDatasets(FIXTURE);
      const users = datasets.find((d) => d.id === 'users')!;
      expect(users.fields.find((f) => f.id === 'created_at')?.label).toBe('Created At');
      expect(users.fields.find((f) => f.id === 'is_active')?.label).toBe('Is Active');
    });

    it('preserves column descriptions', async () => {
      const datasets = await adapter.getDatasets(FIXTURE);
      const users = datasets.find((d) => d.id === 'users')!;
      expect(users.fields.find((f) => f.id === 'id')?.description).toBe('Primary key');
    });

    it('handles missing data_type as unknown', async () => {
      const source: DbtManifestSource = {
        nodes: {
          'model.test.noTypes': {
            resource_type: 'model',
            name: 'noTypes',
            columns: {
              mystery: { name: 'mystery' },
            },
          },
        },
      };
      const datasets = await adapter.getDatasets(source);
      expect(datasets[0].fields[0].dataType).toBe('unknown');
    });

    it('handles JSON column type', async () => {
      const datasets = await adapter.getDatasets(FIXTURE);
      const events = datasets.find((d) => d.id === 'raw_events')!;
      expect(events.fields.find((f) => f.id === 'payload')?.dataType).toBe('json');
    });
  });

  describe('getDataset', () => {
    it('returns a single dataset by id', async () => {
      const ds = await adapter.getDataset(FIXTURE, 'users');
      expect(ds?.id).toBe('users');
    });

    it('returns undefined for missing dataset', async () => {
      const ds = await adapter.getDataset(FIXTURE, 'nonexistent');
      expect(ds).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('handles empty nodes', async () => {
      const datasets = await adapter.getDatasets({ nodes: {} });
      expect(datasets).toEqual([]);
    });

    it('handles model with no columns', async () => {
      const source: DbtManifestSource = {
        nodes: {
          'model.test.empty': {
            resource_type: 'model',
            name: 'empty',
          },
        },
      };
      const datasets = await adapter.getDatasets(source);
      expect(datasets[0].fields).toEqual([]);
    });
  });

  describe('validation', () => {
    it('rejects null source', async () => {
      await expect(adapter.getDatasets(null as unknown as DbtManifestSource)).rejects.toThrow(
        'source must be an object',
      );
    });

    it('rejects source without nodes', async () => {
      await expect(adapter.getDatasets({} as unknown as DbtManifestSource)).rejects.toThrow(
        'must have a "nodes" object',
      );
    });

    it('rejects array as nodes', async () => {
      await expect(
        adapter.getDatasets({ nodes: [] } as unknown as DbtManifestSource),
      ).rejects.toThrow('must have a "nodes" object');
    });
  });
});
