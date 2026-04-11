/**
 * @supersubset/adapter-sql — SQL catalog adapter.
 *
 * Accepts structured representations of SQL information_schema output
 * and normalizes them into the analytical metadata model.
 * No actual DB connection — the host provides the catalog data.
 */
import type {
  MetadataAdapter,
  NormalizedDataset,
  NormalizedField,
  FieldDataType,
  DatasetRelationship,
} from '@supersubset/data-model';
import { inferFieldRole, inferAggregation, humanizeFieldName } from '@supersubset/data-model';

// ─── Source Types ────────────────────────────────────────────

export interface SqlColumnInfo {
  name: string;
  dataType: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  defaultValue?: string;
}

export interface SqlTableInfo {
  schema?: string;
  name: string;
  type: 'TABLE' | 'VIEW';
  columns: SqlColumnInfo[];
}

export interface SqlForeignKey {
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
}

export interface SqlCatalogSource {
  tables: SqlTableInfo[];
  foreignKeys?: SqlForeignKey[];
}

// ─── SQL Type Mapping ────────────────────────────────────────

const SQL_TYPE_MAP: [RegExp, FieldDataType][] = [
  [/^(INT|INTEGER|BIGINT|SMALLINT|TINYINT|MEDIUMINT|SERIAL)/i, 'integer'],
  [/^(FLOAT|DOUBLE|DECIMAL|NUMERIC|REAL|MONEY)/i, 'number'],
  [/^(VARCHAR|CHAR|TEXT|CLOB|NVARCHAR|NCHAR|NTEXT|CHARACTER)/i, 'string'],
  [/^TIMESTAMP/i, 'datetime'],
  [/^DATETIME/i, 'datetime'],
  [/^DATE$/i, 'date'],
  [/^(BOOLEAN|BOOL|BIT)/i, 'boolean'],
  [/^(JSON|JSONB)/i, 'json'],
];

function mapSqlType(sqlType: string): FieldDataType {
  const normalized = sqlType.trim().toUpperCase();
  for (const [pattern, fieldType] of SQL_TYPE_MAP) {
    if (pattern.test(normalized)) return fieldType;
  }
  return 'unknown';
}

// ─── Validation ──────────────────────────────────────────────

function validateSource(source: unknown): asserts source is SqlCatalogSource {
  if (!source || typeof source !== 'object') {
    throw new Error('SqlAdapter: source must be an object with a "tables" array');
  }
  const s = source as Record<string, unknown>;
  if (!Array.isArray(s.tables)) {
    throw new Error('SqlAdapter: source must have a "tables" array');
  }
  for (let i = 0; i < s.tables.length; i++) {
    const t = s.tables[i];
    if (!t || typeof t !== 'object') {
      throw new Error(`SqlAdapter: table at index ${i} must be an object`);
    }
    if (typeof t.name !== 'string' || t.name.length === 0) {
      throw new Error(`SqlAdapter: table at index ${i} must have a non-empty "name"`);
    }
    if (t.type !== 'TABLE' && t.type !== 'VIEW') {
      throw new Error(`SqlAdapter: table "${t.name}" must have type "TABLE" or "VIEW"`);
    }
    if (!Array.isArray(t.columns)) {
      throw new Error(`SqlAdapter: table "${t.name}" must have a "columns" array`);
    }
  }
}

// ─── Normalization ───────────────────────────────────────────

function convertColumn(col: SqlColumnInfo): NormalizedField {
  const dataType = mapSqlType(col.dataType);
  const role = col.isPrimaryKey ? 'key' : inferFieldRole(col.name, dataType);
  const defaultAggregation = inferAggregation(role, dataType);

  return {
    id: col.name,
    label: humanizeFieldName(col.name),
    dataType,
    role,
    ...(defaultAggregation !== undefined && { defaultAggregation }),
  };
}

function convertTable(table: SqlTableInfo, foreignKeys: SqlForeignKey[]): NormalizedDataset {
  const fields = table.columns.map(convertColumn);

  const relationships: DatasetRelationship[] = foreignKeys
    .filter((fk) => fk.sourceTable === table.name)
    .map((fk) => ({
      targetDatasetId: fk.targetTable.toLowerCase(),
      type: 'many-to-one' as const,
      sourceFieldId: fk.sourceColumn,
      targetFieldId: fk.targetColumn,
    }));

  const id = table.schema ? `${table.schema}.${table.name}`.toLowerCase() : table.name.toLowerCase();

  return {
    id,
    label: table.name,
    source: { type: table.type === 'VIEW' ? 'view' : 'table' },
    fields,
    ...(relationships.length > 0 && { relationships }),
  };
}

// ─── Adapter ─────────────────────────────────────────────────

export class SqlAdapter implements MetadataAdapter<SqlCatalogSource> {
  readonly name = 'sql';

  async getDatasets(source: SqlCatalogSource): Promise<NormalizedDataset[]> {
    validateSource(source);
    return source.tables.map((t) => convertTable(t, source.foreignKeys ?? []));
  }

  async getDataset(source: SqlCatalogSource, datasetId: string): Promise<NormalizedDataset | undefined> {
    const datasets = await this.getDatasets(source);
    return datasets.find((d) => d.id === datasetId);
  }
}
