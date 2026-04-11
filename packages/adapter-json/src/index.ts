/**
 * @supersubset/adapter-json — JSON metadata adapter.
 *
 * Accepts hand-authored JSON dataset definitions and normalizes them
 * into the analytical metadata model.
 */
import type {
  MetadataAdapter,
  NormalizedDataset,
  NormalizedField,
  FieldDataType,
  FieldRole,
  AggregationType,
  DatasetRelationship,
} from '@supersubset/data-model';
import { inferFieldRole, inferAggregation, humanizeFieldName } from '@supersubset/data-model';

// ─── Source Types ────────────────────────────────────────────

export interface JsonFieldDefinition {
  id: string;
  label?: string;
  dataType: FieldDataType;
  role?: FieldRole;
  defaultAggregation?: AggregationType;
  format?: string;
  description?: string;
}

export interface JsonDatasetDefinition {
  id: string;
  label: string;
  description?: string;
  fields: JsonFieldDefinition[];
  relationships?: DatasetRelationship[];
}

export type JsonAdapterSource = JsonDatasetDefinition[];

// ─── Validation ──────────────────────────────────────────────

const VALID_DATA_TYPES: ReadonlySet<string> = new Set([
  'string', 'number', 'integer', 'date', 'datetime', 'boolean', 'json', 'unknown',
]);

const VALID_ROLES: ReadonlySet<string> = new Set([
  'dimension', 'measure', 'time', 'key', 'unknown',
]);

function validateSource(source: unknown): asserts source is JsonAdapterSource {
  if (!Array.isArray(source)) {
    throw new Error('JsonAdapter: source must be an array of dataset definitions');
  }
  for (let i = 0; i < source.length; i++) {
    const ds = source[i];
    if (!ds || typeof ds !== 'object') {
      throw new Error(`JsonAdapter: dataset at index ${i} must be an object`);
    }
    if (typeof ds.id !== 'string' || ds.id.length === 0) {
      throw new Error(`JsonAdapter: dataset at index ${i} must have a non-empty string "id"`);
    }
    if (typeof ds.label !== 'string' || ds.label.length === 0) {
      throw new Error(`JsonAdapter: dataset "${ds.id}" must have a non-empty string "label"`);
    }
    if (!Array.isArray(ds.fields)) {
      throw new Error(`JsonAdapter: dataset "${ds.id}" must have a "fields" array`);
    }
    for (let j = 0; j < ds.fields.length; j++) {
      const f = ds.fields[j];
      if (!f || typeof f !== 'object') {
        throw new Error(`JsonAdapter: field at index ${j} in dataset "${ds.id}" must be an object`);
      }
      if (typeof f.id !== 'string' || f.id.length === 0) {
        throw new Error(`JsonAdapter: field at index ${j} in dataset "${ds.id}" must have a non-empty string "id"`);
      }
      if (!VALID_DATA_TYPES.has(f.dataType)) {
        throw new Error(`JsonAdapter: field "${f.id}" in dataset "${ds.id}" has invalid dataType "${f.dataType}"`);
      }
      if (f.role !== undefined && !VALID_ROLES.has(f.role)) {
        throw new Error(`JsonAdapter: field "${f.id}" in dataset "${ds.id}" has invalid role "${f.role}"`);
      }
    }
  }
}

// ─── Implementation ──────────────────────────────────────────

function normalizeField(def: JsonFieldDefinition): NormalizedField {
  const role = def.role ?? inferFieldRole(def.id, def.dataType);
  const defaultAggregation = def.defaultAggregation ?? inferAggregation(role, def.dataType);
  return {
    id: def.id,
    label: def.label ?? humanizeFieldName(def.id),
    dataType: def.dataType,
    role,
    ...(defaultAggregation !== undefined && { defaultAggregation }),
    ...(def.format !== undefined && { format: def.format }),
    ...(def.description !== undefined && { description: def.description }),
  };
}

function normalizeDataset(def: JsonDatasetDefinition): NormalizedDataset {
  return {
    id: def.id,
    label: def.label,
    ...(def.description !== undefined && { description: def.description }),
    fields: def.fields.map(normalizeField),
    ...(def.relationships !== undefined && { relationships: def.relationships }),
  };
}

export class JsonAdapter implements MetadataAdapter<JsonAdapterSource> {
  readonly name = 'json';

  async getDatasets(source: JsonAdapterSource): Promise<NormalizedDataset[]> {
    validateSource(source);
    return source.map(normalizeDataset);
  }

  async getDataset(source: JsonAdapterSource, datasetId: string): Promise<NormalizedDataset | undefined> {
    validateSource(source);
    const def = source.find((d) => d.id === datasetId);
    return def ? normalizeDataset(def) : undefined;
  }
}
