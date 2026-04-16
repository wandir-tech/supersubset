import type {
  LogicalQuery,
  MetadataAdapter,
  NormalizedDataset,
  QueryAdapter,
  QueryResult,
} from '@supersubset/data-model';

import type { AuthHeader } from './auth';
import { normalizeBaseUrl } from './auth';
import { parseErrorResponse } from './errors';

export interface HttpAdapterOptions {
  authHeader?: AuthHeader;
  fetcher?: typeof fetch;
}

function createHeaders(authHeader?: AuthHeader, includeJsonContentType?: boolean): Headers {
  const headers = new Headers();

  if (includeJsonContentType) {
    headers.set('Content-Type', 'application/json');
  }

  if (authHeader) {
    headers.set(authHeader.name, authHeader.value);
  }

  return headers;
}

function resolveDatasetsUrl(baseUrl: string): string {
  return `${normalizeBaseUrl(baseUrl)}/supersubset/datasets`;
}

function resolveQueryUrl(baseUrl: string): string {
  return `${normalizeBaseUrl(baseUrl)}/supersubset/query`;
}

function isDatasetArray(value: unknown): value is NormalizedDataset[] {
  return Array.isArray(value);
}

export class HttpMetadataAdapter implements MetadataAdapter<string> {
  readonly name = 'http-metadata-adapter';

  private readonly authHeader?: AuthHeader;
  private readonly fetcher: typeof fetch;

  constructor(options: HttpAdapterOptions = {}) {
    this.authHeader = options.authHeader;
    this.fetcher = options.fetcher ?? fetch;
  }

  async getDatasets(source: string): Promise<NormalizedDataset[]> {
    const response = await this.fetcher(resolveDatasetsUrl(source), {
      method: 'GET',
      headers: createHeaders(this.authHeader),
    });

    if (!response.ok) {
      await parseErrorResponse(response);
    }

    const payload = (await response.json()) as unknown;
    if (isDatasetArray(payload)) {
      return payload;
    }

    if (typeof payload === 'object' && payload && 'datasets' in payload) {
      const datasets = (payload as { datasets?: unknown }).datasets;
      if (isDatasetArray(datasets)) {
        return datasets;
      }
    }

    throw new Error('Invalid datasets payload. Expected NormalizedDataset[] response.');
  }

  async getDataset(source: string, datasetId: string): Promise<NormalizedDataset | undefined> {
    const datasets = await this.getDatasets(source);
    return datasets.find((dataset) => dataset.id === datasetId);
  }
}

export class HttpQueryAdapter implements QueryAdapter {
  readonly name = 'http-query-adapter';

  private readonly baseUrl: string;
  private readonly authHeader?: AuthHeader;
  private readonly fetcher: typeof fetch;

  constructor(baseUrl: string, options: HttpAdapterOptions = {}) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.authHeader = options.authHeader;
    this.fetcher = options.fetcher ?? fetch;
  }

  async execute(query: LogicalQuery): Promise<QueryResult> {
    const response = await this.fetcher(resolveQueryUrl(this.baseUrl), {
      method: 'POST',
      headers: createHeaders(this.authHeader, true),
      body: JSON.stringify(query),
    });

    if (!response.ok) {
      await parseErrorResponse(response);
    }

    return (await response.json()) as QueryResult;
  }
}
