import { JsonAdapter } from '@supersubset/adapter-json';
import type { LogicalQuery, NormalizedDataset } from '@supersubset/data-model';

const jsonAdapter = new JsonAdapter();
const DEFAULT_PREVIEW_LIMIT = 200;
const DISCOVERY_SUFFIX = '/supersubset/datasets';
const QUERY_SUFFIX = '/supersubset/query';

export type ProbeFieldBindings = Record<string, string | string[] | undefined>;

export interface ProbeMetadataEnvelope {
  datasets: unknown;
}

function isEnvelope(value: unknown): value is ProbeMetadataEnvelope {
  return typeof value === 'object' && value !== null && 'datasets' in value;
}

function flattenFieldBindings(fields: ProbeFieldBindings): string[] {
  const values = Object.values(fields).flatMap((value) => {
    if (typeof value === 'string') {
      return value.length > 0 ? [value] : [];
    }

    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
    }

    return [];
  });

  return Array.from(new Set(values));
}

export async function normalizeProbeMetadataPayload(
  payload: unknown,
): Promise<NormalizedDataset[]> {
  const source = isEnvelope(payload) ? payload.datasets : payload;
  return jsonAdapter.getDatasets(source as never);
}

export async function parseProbeMetadataJson(rawInput: string): Promise<NormalizedDataset[]> {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new Error('Paste metadata JSON before opening the designer.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(
      'Metadata JSON is invalid. Paste a datasets array or an object with a datasets array.',
    );
  }

  try {
    return await normalizeProbeMetadataPayload(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown metadata validation error';
    throw new Error(`Metadata JSON is invalid: ${message}`, {
      cause: error,
    });
  }
}

export function buildPreviewQuery(
  datasets: NormalizedDataset[],
  datasetRef: string,
  fields: ProbeFieldBindings,
  limit = DEFAULT_PREVIEW_LIMIT,
): LogicalQuery | null {
  const dataset = datasets.find((item) => item.id === datasetRef);
  if (!dataset) {
    return null;
  }

  const fieldIds = flattenFieldBindings(fields);
  if (fieldIds.length === 0) {
    return null;
  }

  return {
    datasetId: datasetRef,
    limit,
    fields: fieldIds.map((fieldId) => {
      const field = dataset.fields.find((item) => item.id === fieldId);
      if (field?.role === 'measure') {
        return {
          fieldId,
          aggregation: field.defaultAggregation ?? 'sum',
        };
      }

      return { fieldId };
    }),
  };
}

export function deriveQueryEndpointInput(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return '';
  }

  if (trimmed.endsWith(DISCOVERY_SUFFIX)) {
    return `${trimmed.slice(0, -DISCOVERY_SUFFIX.length)}${QUERY_SUFFIX}`;
  }

  return trimmed;
}
