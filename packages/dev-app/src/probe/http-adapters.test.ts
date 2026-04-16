import { describe, expect, it, vi } from 'vitest';

import { HttpMetadataAdapter, HttpQueryAdapter } from './http-adapters';
import { toAuthHeader } from './auth';

describe('http adapters', () => {
  it('injects bearer auth header for metadata probe', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );

    const adapter = new HttpMetadataAdapter({
      authHeader: toAuthHeader('bearer', 'token-123', '', ''),
      fetcher,
    });

    await adapter.getDatasets('https://example.com/');

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    const headers = init.headers as Headers;

    expect(url).toBe('https://example.com/supersubset/datasets');
    expect(init.method).toBe('GET');
    expect(headers.get('Authorization')).toBe('Bearer token-123');
  });

  it('accepts payload wrapped under datasets property', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            datasets: [
              {
                id: 'orders',
                label: 'Orders',
                fields: [],
              },
            ],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
    );

    const adapter = new HttpMetadataAdapter({ fetcher });
    const datasets = await adapter.getDatasets('https://example.com');

    expect(datasets).toHaveLength(1);
    expect(datasets[0]?.id).toBe('orders');
  });

  it('posts logical query to query endpoint with custom header', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            columns: [{ fieldId: 'orders', label: 'Orders', dataType: 'integer' }],
            rows: [{ orders: 12 }],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
    );

    const adapter = new HttpQueryAdapter('https://api.acme.dev/', {
      authHeader: toAuthHeader('custom', '', 'X-Api-Key', 'dev-key'),
      fetcher,
    });

    await adapter.execute({
      datasetId: 'orders',
      fields: [{ fieldId: 'orders', aggregation: 'count' }],
    });

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    const headers = init.headers as Headers;

    expect(url).toBe('https://api.acme.dev/supersubset/query');
    expect(init.method).toBe('POST');
    expect(headers.get('X-Api-Key')).toBe('dev-key');
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(init.body).toContain('"datasetId":"orders"');
  });
});
