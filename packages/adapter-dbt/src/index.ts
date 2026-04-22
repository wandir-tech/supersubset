/**
 * @supersubset/adapter-dbt — dbt manifest adapter.
 *
 * Accepts a dbt manifest.json (v4+) object and normalizes models
 * into the analytical metadata model.
 */
import type {
  AggregationType,
  DatasetSource,
  FieldRole,
  MetadataAdapter,
  NormalizedDataset,
  NormalizedField,
  FieldDataType,
} from '@supersubset/data-model';
import { inferFieldRole, inferAggregation, humanizeFieldName } from '@supersubset/data-model';

// ─── Source Types ────────────────────────────────────────────

export interface DbtColumn {
  name: string;
  description?: string;
  data_type?: string;
  meta?: Record<string, unknown>;
}

export interface DbtNode {
  resource_type: 'model' | 'source' | 'seed' | 'test' | 'snapshot';
  name: string;
  description?: string;
  schema?: string;
  columns?: Record<string, DbtColumn>;
  depends_on?: { nodes?: string[] };
  meta?: Record<string, unknown>;
}

export interface DbtManifestSource {
  nodes: Record<string, DbtNode>;
}

interface DbtSupersubsetDatasetMeta {
  label?: string;
  description?: string;
  sourceType?: DatasetSource['type'];
}

interface DbtSupersubsetFieldMeta {
  label?: string;
  description?: string;
  dataType?: FieldDataType;
  role?: FieldRole;
  defaultAggregation?: AggregationType;
  format?: string;
  sourceExpression?: string;
}

// ─── SQL Type Mapping (reused from sql adapter logic) ────────

const SQL_TYPE_MAP: [RegExp, FieldDataType][] = [
  [/^(INT|INTEGER|BIGINT|SMALLINT|TINYINT|MEDIUMINT|SERIAL)/i, 'integer'],
  [/^(FLOAT|DOUBLE|DECIMAL|NUMERIC|REAL|MONEY|NUMBER)/i, 'number'],
  [/^(VARCHAR|CHAR|TEXT|CLOB|NVARCHAR|NCHAR|NTEXT|CHARACTER|STRING)/i, 'string'],
  [/^TIMESTAMP/i, 'datetime'],
  [/^DATETIME/i, 'datetime'],
  [/^DATE$/i, 'date'],
  [/^(BOOLEAN|BOOL|BIT)/i, 'boolean'],
  [/^(JSON|JSONB|VARIANT|OBJECT|ARRAY)/i, 'json'],
];

function mapSqlType(sqlType: string | undefined): FieldDataType {
  if (!sqlType) return 'unknown';
  const normalized = sqlType.trim().toUpperCase();
  for (const [pattern, fieldType] of SQL_TYPE_MAP) {
    if (pattern.test(normalized)) return fieldType;
  }
  return 'unknown';
}

// ─── Validation ──────────────────────────────────────────────

function validateSource(source: unknown): asserts source is DbtManifestSource {
  if (!source || typeof source !== 'object') {
    throw new Error('DbtAdapter: source must be an object with a "nodes" property');
  }
  const s = source as Record<string, unknown>;
  if (!s.nodes || typeof s.nodes !== 'object' || Array.isArray(s.nodes)) {
    throw new Error('DbtAdapter: source must have a "nodes" object');
  }
}

// ─── Normalization ───────────────────────────────────────────

const PROCESSABLE_TYPES = new Set(['model', 'source']);
const VALID_FIELD_DATA_TYPES: ReadonlySet<FieldDataType> = new Set([
  'string',
  'number',
  'integer',
  'date',
  'datetime',
  'boolean',
  'json',
  'unknown',
]);
const VALID_FIELD_ROLES: ReadonlySet<FieldRole> = new Set([
  'dimension',
  'measure',
  'time',
  'key',
  'unknown',
]);
const VALID_AGGREGATIONS: ReadonlySet<AggregationType> = new Set([
  'sum',
  'avg',
  'count',
  'count_distinct',
  'min',
  'max',
  'none',
]);
const VALID_SOURCE_TYPES: ReadonlySet<DatasetSource['type']> = new Set([
  'table',
  'view',
  'model',
  'query',
  'file',
]);

function getSupersubsetMeta(
  meta: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  const candidate = meta?.supersubset;
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return undefined;
  }
  return candidate as Record<string, unknown>;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function readFieldDataType(value: unknown): FieldDataType | undefined {
  return typeof value === 'string' && VALID_FIELD_DATA_TYPES.has(value as FieldDataType)
    ? (value as FieldDataType)
    : undefined;
}

function readFieldRole(value: unknown): FieldRole | undefined {
  return typeof value === 'string' && VALID_FIELD_ROLES.has(value as FieldRole)
    ? (value as FieldRole)
    : undefined;
}

function readAggregation(value: unknown): AggregationType | undefined {
  return typeof value === 'string' && VALID_AGGREGATIONS.has(value as AggregationType)
    ? (value as AggregationType)
    : undefined;
}

function readSourceType(value: unknown): DatasetSource['type'] | undefined {
  return typeof value === 'string' && VALID_SOURCE_TYPES.has(value as DatasetSource['type'])
    ? (value as DatasetSource['type'])
    : undefined;
}

function getDatasetOverrides(node: DbtNode): DbtSupersubsetDatasetMeta {
  const meta = getSupersubsetMeta(node.meta);
  return {
    label: readString(meta?.label),
    description: readString(meta?.description),
    sourceType: readSourceType(meta?.sourceType),
  };
}

function getFieldOverrides(col: DbtColumn): DbtSupersubsetFieldMeta {
  const meta = getSupersubsetMeta(col.meta);
  return {
    label: readString(meta?.label),
    description: readString(meta?.description),
    dataType: readFieldDataType(meta?.dataType),
    role: readFieldRole(meta?.role),
    defaultAggregation: readAggregation(meta?.defaultAggregation),
    format: readString(meta?.format),
    sourceExpression: readString(meta?.sourceExpression),
  };
}

function convertColumn(col: DbtColumn): NormalizedField {
  const overrides = getFieldOverrides(col);
  const dataType = overrides.dataType ?? mapSqlType(col.data_type);
  const role = overrides.role ?? inferFieldRole(col.name, dataType);
  const defaultAggregation = overrides.defaultAggregation ?? inferAggregation(role, dataType);
  const description = overrides.description ?? col.description;

  return {
    id: col.name,
    label: overrides.label ?? humanizeFieldName(col.name),
    dataType,
    role,
    ...(defaultAggregation !== undefined && { defaultAggregation }),
    ...(overrides.format !== undefined && { format: overrides.format }),
    ...(overrides.sourceExpression !== undefined && {
      sourceExpression: overrides.sourceExpression,
    }),
    ...(description !== undefined && { description }),
  };
}

function getDatasetId(nodeId: string): string {
  // dbt manifest node keys are unique_ids; use them directly so dataset IDs
  // remain stable across schemas/packages and do not collide on display names.
  return nodeId;
}

function getDatasetSourceType(node: DbtNode): DatasetSource['type'] {
  return node.resource_type === 'source' ? 'table' : 'model';
}

function convertNode(nodeId: string, node: DbtNode): NormalizedDataset {
  const overrides = getDatasetOverrides(node);
  const columns = node.columns ?? {};
  const fields = Object.values(columns).map(convertColumn);

  return {
    id: getDatasetId(nodeId),
    label: overrides.label ?? node.name,
    ...((overrides.description ?? node.description) !== undefined && {
      description: overrides.description ?? node.description,
    }),
    source: {
      type: overrides.sourceType ?? getDatasetSourceType(node),
      ref: nodeId,
    },
    fields,
  };
}

// ─── Adapter ─────────────────────────────────────────────────

export class DbtAdapter implements MetadataAdapter<DbtManifestSource> {
  readonly name = 'dbt';

  async getDatasets(source: DbtManifestSource): Promise<NormalizedDataset[]> {
    validateSource(source);
    const datasets: NormalizedDataset[] = [];

    for (const [nodeId, node] of Object.entries(source.nodes)) {
      if (!node || typeof node !== 'object') continue;
      if (!PROCESSABLE_TYPES.has(node.resource_type)) continue;
      datasets.push(convertNode(nodeId, node));
    }

    return datasets;
  }

  async getDataset(
    source: DbtManifestSource,
    datasetId: string,
  ): Promise<NormalizedDataset | undefined> {
    const datasets = await this.getDatasets(source);
    return datasets.find((d) => d.id === datasetId);
  }
}
