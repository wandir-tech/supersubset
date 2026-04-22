import { describe, expect, it } from 'vitest';

import { createExportMetadataEnvelope, exportMetadata } from '../src/export-metadata.js';

const JSON_SOURCE = [
  {
    id: 'orders',
    label: 'Orders',
    fields: [
      { id: 'order_id', dataType: 'integer' },
      { id: 'region', dataType: 'string' },
      { id: 'order_date', dataType: 'date' },
      { id: 'revenue', dataType: 'number' },
    ],
  },
];

describe('exportMetadata', () => {
  it('exports normalized datasets and summary stats', async () => {
    const result = await exportMetadata({
      sourceType: 'json',
      source: JSON_SOURCE,
    });

    expect(result.stats.datasetsCount).toBe(1);
    expect(result.stats.fieldsCount).toBe(4);
    expect(result.datasets[0]?.fields[0]?.label).toBe('Order Id');
    expect(result.datasets[0]?.fields[3]?.defaultAggregation).toBe('sum');
  });

  it('wraps exported datasets in an envelope object', async () => {
    const result = await exportMetadata({
      sourceType: 'json',
      source: JSON_SOURCE,
    });

    expect(createExportMetadataEnvelope(result.datasets)).toEqual({
      datasets: result.datasets,
    });
  });
});
