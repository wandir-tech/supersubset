import type { NormalizedDataset } from '@supersubset/data-model';
import { describe, expect, it } from 'vitest';

import { buildPreviewQuery, deriveQueryEndpointInput, parseProbeMetadataJson } from './metadata';

const DATASETS: NormalizedDataset[] = [
  {
    id: 'orders',
    label: 'Orders',
    fields: [
      { id: 'region', label: 'Region', dataType: 'string', role: 'dimension' },
      {
        id: 'revenue',
        label: 'Revenue',
        dataType: 'number',
        role: 'measure',
        defaultAggregation: 'sum',
      },
      { id: 'created_at', label: 'Created At', dataType: 'date', role: 'time' },
    ],
  },
];

describe('probe metadata helpers', () => {
  it('accepts metadata JSON envelope objects', async () => {
    const datasets = await parseProbeMetadataJson(JSON.stringify({ datasets: DATASETS }));

    expect(datasets).toHaveLength(1);
    expect(datasets[0]?.id).toBe('orders');
  });

  it('accepts raw dataset arrays', async () => {
    const datasets = await parseProbeMetadataJson(JSON.stringify(DATASETS));

    expect(datasets).toHaveLength(1);
    expect(datasets[0]?.fields[1]?.defaultAggregation).toBe('sum');
  });

  it('builds preview queries with aggregation for measure fields', () => {
    const query = buildPreviewQuery(DATASETS, 'orders', {
      xField: 'region',
      yField: 'revenue',
    });

    expect(query).toEqual({
      datasetId: 'orders',
      limit: 200,
      fields: [{ fieldId: 'region' }, { fieldId: 'revenue', aggregation: 'sum' }],
    });
  });

  it('derives query endpoint from discovery endpoint input', () => {
    expect(deriveQueryEndpointInput('https://api.example.com/supersubset/datasets')).toBe(
      'https://api.example.com/supersubset/query',
    );
    expect(deriveQueryEndpointInput('https://api.example.com')).toBe('https://api.example.com');
  });
});
