import type {
  LogicalQuery,
  MetadataAdapter,
  NormalizedDataset,
  NormalizedField,
  QueryAdapter,
  QueryResult,
} from '@supersubset/data-model';
import { humanizeFieldName, inferAggregation, inferFieldRole } from '@supersubset/data-model';

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

/**
 * A URL is considered "already a terminal endpoint" when it ends with the
 * canonical Supersubset suffix OR a plain `/datasets` / `/query` path —
 * those aren't plausible base-URL suffixes, so using them as-is is safe and
 * avoids producing nonsense URLs like `.../api/analytics/query/supersubset/query`.
 *
 * Conventional base URLs (e.g. `.../api/analytics/catalog`) are still
 * auto-suffixed because `catalog` isn't in the terminal list.
 */
const DATASETS_TERMINAL_SUFFIXES = ['/supersubset/datasets', '/datasets'];
const QUERY_TERMINAL_SUFFIXES = ['/supersubset/query', '/query'];

function resolveEndpointUrl(
  input: string,
  canonicalSuffix: string,
  terminalSuffixes: readonly string[],
): string {
  const normalized = normalizeBaseUrl(input);
  for (const suffix of terminalSuffixes) {
    if (normalized.endsWith(suffix)) {
      return normalized;
    }
  }
  return `${normalized}${canonicalSuffix}`;
}

export function resolveDatasetsUrl(baseUrl: string): string {
  return resolveEndpointUrl(baseUrl, '/supersubset/datasets', DATASETS_TERMINAL_SUFFIXES);
}

export function resolveQueryUrl(baseUrl: string): string {
  return resolveEndpointUrl(baseUrl, '/supersubset/query', QUERY_TERMINAL_SUFFIXES);
}

function isDatasetArray(value: unknown): value is NormalizedDataset[] {
  return Array.isArray(value);
}

/**
 * Backends occasionally return fields without a `role` (or with missing
 * `label`/`defaultAggregation`) since those are optional hints for the
 * designer. Infer them here so role-filtered field pickers (X-Axis, Y-Axis,
 * Series, etc.) can discover the fields. This mirrors the inference that
 * `@supersubset/adapter-json` applies to pasted metadata.
 */
function normalizeFetchedField(field: NormalizedField): NormalizedField {
  const role = field.role ?? inferFieldRole(field.id, field.dataType);
  const defaultAggregation = field.defaultAggregation ?? inferAggregation(role, field.dataType);
  return {
    ...field,
    label: field.label ?? humanizeFieldName(field.id),
    role,
    ...(defaultAggregation !== undefined && { defaultAggregation }),
  };
}

function normalizeFetchedDataset(dataset: NormalizedDataset): NormalizedDataset {
  return {
    ...dataset,
    fields: Array.isArray(dataset.fields) ? dataset.fields.map(normalizeFetchedField) : [],
  };
}

function normalizeFetchedDatasets(datasets: NormalizedDataset[]): NormalizedDataset[] {
  return datasets.map(normalizeFetchedDataset);
}

export class HttpMetadataAdapter implements MetadataAdapter<string> {
  readonly name = 'http-metadata-adapter';

  private readonly authHeader?: AuthHeader;
  private readonly fetcher: typeof fetch;

  constructor(options: HttpAdapterOptions = {}) {
    this.authHeader = options.authHeader;
    this.fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
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
      return normalizeFetchedDatasets(payload);
    }

    if (typeof payload === 'object' && payload && 'datasets' in payload) {
      const datasets = (payload as { datasets?: unknown }).datasets;
      if (isDatasetArray(datasets)) {
        return normalizeFetchedDatasets(datasets);
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
    this.fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
  }

  /** The exact URL this adapter POSTs to — useful for debugging banners. */
  get resolvedUrl(): string {
    return resolveQueryUrl(this.baseUrl);
  }

  async execute(query: LogicalQuery): Promise<QueryResult> {
    const response = await this.fetcher(this.resolvedUrl, {
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
