import { describe, expect, it, vi } from 'vitest';

import { HttpMetadataAdapter, HttpQueryAdapter } from './http-adapters';
import { toAuthHeader } from './auth';

describe('http adapters', () => {
  it('binds the default global fetch implementation', async () => {
    const originalFetch = globalThis.fetch;
    const calls: string[] = [];

    function sensitiveFetch(this: typeof globalThis, input: RequestInfo | URL): Promise<Response> {
      if (this !== globalThis) {
        throw new TypeError('Illegal invocation');
      }

      calls.push(String(input));
      return Promise.resolve(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }

    globalThis.fetch = sensitiveFetch as typeof fetch;

    try {
      const adapter = new HttpMetadataAdapter();
      await adapter.getDatasets('https://example.com');
      expect(calls).toEqual(['https://example.com/supersubset/datasets']);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

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

  it('accepts direct discovery endpoint URLs without appending another suffix', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );

    const adapter = new HttpMetadataAdapter({ fetcher });
    await adapter.getDatasets('https://example.com/supersubset/datasets');

    const [url] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://example.com/supersubset/datasets');
  });
});
