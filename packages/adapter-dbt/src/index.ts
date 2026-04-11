/**
 * @supersubset/adapter-dbt — dbt manifest adapter.
 *
 * Accepts a dbt manifest.json (v4+) object and normalizes models
 * into the analytical metadata model.
 */
import type {
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

function convertColumn(col: DbtColumn): NormalizedField {
  const dataType = mapSqlType(col.data_type);
  const role = inferFieldRole(col.name, dataType);
  const defaultAggregation = inferAggregation(role, dataType);

  return {
    id: col.name,
    label: humanizeFieldName(col.name),
    dataType,
    role,
    ...(defaultAggregation !== undefined && { defaultAggregation }),
    ...(col.description && { description: col.description }),
  };
}

function convertNode(nodeId: string, node: DbtNode): NormalizedDataset {
  const columns = node.columns ?? {};
  const fields = Object.values(columns).map(convertColumn);

  return {
    id: node.name.toLowerCase(),
    label: node.name,
    ...(node.description && { description: node.description }),
    source: { type: 'model', ref: nodeId },
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

  async getDataset(source: DbtManifestSource, datasetId: string): Promise<NormalizedDataset | undefined> {
    const datasets = await this.getDatasets(source);
    return datasets.find((d) => d.id === datasetId);
  }
}
