import { JsonAdapter } from '@supersubset/adapter-json';
import type { AggregationType, LogicalQuery, NormalizedDataset } from '@supersubset/data-model';

const jsonAdapter = new JsonAdapter();
const DEFAULT_PREVIEW_LIMIT = 200;
const DISCOVERY_SUFFIX = '/supersubset/datasets';
const QUERY_SUFFIX = '/supersubset/query';

export type ProbeFieldBindings = Record<string, string | string[] | undefined>;

export interface ProbeMetadataEnvelope {
  datasets: unknown;
}

const METADATA_BINDING_KEYS = new Set(['aggregation', 'metricFields']);
const VALID_AGGREGATIONS: ReadonlySet<AggregationType> = new Set([
  'sum',
  'avg',
  'count',
  'count_distinct',
  'min',
  'max',
  'none',
]);

function isEnvelope(value: unknown): value is ProbeMetadataEnvelope {
  return typeof value === 'object' && value !== null && 'datasets' in value;
}

function toFieldIdList(value: string | string[] | undefined): string[] {
  if (typeof value === 'string') {
    return value.length > 0 ? [value] : [];
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  }

  return [];
}

function flattenFieldBindings(fields: ProbeFieldBindings): string[] {
  const values = Object.entries(fields).flatMap(([key, value]) => {
    if (METADATA_BINDING_KEYS.has(key)) {
      return [];
    }

    return toFieldIdList(value);
  });

  return Array.from(new Set(values));
}

function toAggregationType(value: string | undefined): AggregationType | undefined {
  if (!value || !VALID_AGGREGATIONS.has(value as AggregationType)) {
    return undefined;
  }

  return value as AggregationType;
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

  const metricFieldIds = new Set(toFieldIdList(fields.metricFields));
  const rawAggregationHint =
    typeof fields.aggregation === 'string' ? fields.aggregation : undefined;
  const hasAggregationHint = Boolean(rawAggregationHint && rawAggregationHint.length > 0);
  const aggregationHint = toAggregationType(rawAggregationHint);

  return {
    datasetId: datasetRef,
    limit,
    fields: fieldIds.map((fieldId) => {
      const field = dataset.fields.find((item) => item.id === fieldId);

      const isMetricField =
        metricFieldIds.size === 0 ? field?.role === 'measure' : metricFieldIds.has(fieldId);

      if (!isMetricField) {
        return { fieldId };
      }

      if (hasAggregationHint) {
        if (aggregationHint && aggregationHint !== 'none') {
          return {
            fieldId,
            aggregation: aggregationHint,
          };
        }

        return { fieldId };
      }

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
