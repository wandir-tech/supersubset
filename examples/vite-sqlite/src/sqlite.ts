import type {
  AggregationType,
  LogicalQuery,
  QueryFilter,
  QueryFilterOperator,
  QueryResult,
  QueryResultColumn,
} from '@supersubset/data-model';
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { SQLITE_DATASET_ID, sqliteDataModel, sqliteDatasetFields } from './sqlite-model';

export interface PreviewDataRequest {
  datasetRef: string;
  fields: Record<string, string | string[] | undefined>;
}

export interface CompiledSqliteQuery {
  sql: string;
  params: unknown[];
}

let sqliteRuntimePromise: Promise<SqlJsStatic> | null = null;
let databasePromise: Promise<Database> | null = null;

interface OrderRow {
  id: number;
  orderedAt: string;
  region: string;
  category: string;
  productName: string;
  channel: string;
  revenue: number;
  units: number;
}

const seedOrders: OrderRow[] = [
  {
    id: 1,
    orderedAt: '2026-01-08',
    region: 'North America',
    category: 'Footwear',
    productName: 'Nimbus Runner',
    channel: 'Direct',
    revenue: 1820,
    units: 24,
  },
  {
    id: 2,
    orderedAt: '2026-01-12',
    region: 'Europe',
    category: 'Accessories',
    productName: 'Commuter Tote',
    channel: 'Marketplace',
    revenue: 960,
    units: 18,
  },
  {
    id: 3,
    orderedAt: '2026-01-19',
    region: 'APAC',
    category: 'Apparel',
    productName: 'Merino Tee',
    channel: 'Direct',
    revenue: 1380,
    units: 32,
  },
  {
    id: 4,
    orderedAt: '2026-02-02',
    region: 'North America',
    category: 'Accessories',
    productName: 'Trail Cap',
    channel: 'Retail',
    revenue: 740,
    units: 27,
  },
  {
    id: 5,
    orderedAt: '2026-02-11',
    region: 'Europe',
    category: 'Footwear',
    productName: 'Nimbus Runner',
    channel: 'Direct',
    revenue: 2140,
    units: 28,
  },
  {
    id: 6,
    orderedAt: '2026-02-21',
    region: 'APAC',
    category: 'Apparel',
    productName: 'Merino Tee',
    channel: 'Marketplace',
    revenue: 1250,
    units: 29,
  },
  {
    id: 7,
    orderedAt: '2026-03-05',
    region: 'North America',
    category: 'Hydration',
    productName: 'Altitude Bottle',
    channel: 'Direct',
    revenue: 880,
    units: 44,
  },
  {
    id: 8,
    orderedAt: '2026-03-09',
    region: 'Europe',
    category: 'Footwear',
    productName: 'Nimbus Runner',
    channel: 'Marketplace',
    revenue: 2360,
    units: 31,
  },
  {
    id: 9,
    orderedAt: '2026-03-17',
    region: 'APAC',
    category: 'Apparel',
    productName: 'Merino Tee',
    channel: 'Retail',
    revenue: 1420,
    units: 35,
  },
  {
    id: 10,
    orderedAt: '2026-03-28',
    region: 'North America',
    category: 'Accessories',
    productName: 'Weekender Tote',
    channel: 'Direct',
    revenue: 1640,
    units: 19,
  },
  {
    id: 11,
    orderedAt: '2026-04-03',
    region: 'Europe',
    category: 'Hydration',
    productName: 'Altitude Bottle',
    channel: 'Marketplace',
    revenue: 920,
    units: 46,
  },
  {
    id: 12,
    orderedAt: '2026-04-14',
    region: 'APAC',
    category: 'Footwear',
    productName: 'Nimbus Runner',
    channel: 'Direct',
    revenue: 2480,
    units: 33,
  },
  {
    id: 13,
    orderedAt: '2026-04-22',
    region: 'North America',
    category: 'Apparel',
    productName: 'Storm Shell',
    channel: 'Retail',
    revenue: 1780,
    units: 21,
  },
  {
    id: 14,
    orderedAt: '2026-05-02',
    region: 'Europe',
    category: 'Accessories',
    productName: 'Weekender Tote',
    channel: 'Direct',
    revenue: 1710,
    units: 22,
  },
  {
    id: 15,
    orderedAt: '2026-05-10',
    region: 'APAC',
    category: 'Hydration',
    productName: 'Altitude Bottle',
    channel: 'Marketplace',
    revenue: 980,
    units: 49,
  },
  {
    id: 16,
    orderedAt: '2026-05-19',
    region: 'North America',
    category: 'Footwear',
    productName: 'Summit Hiker',
    channel: 'Direct',
    revenue: 2650,
    units: 26,
  },
  {
    id: 17,
    orderedAt: '2026-05-26',
    region: 'Europe',
    category: 'Apparel',
    productName: 'Storm Shell',
    channel: 'Retail',
    revenue: 1840,
    units: 23,
  },
  {
    id: 18,
    orderedAt: '2026-06-04',
    region: 'APAC',
    category: 'Accessories',
    productName: 'Commuter Tote',
    channel: 'Direct',
    revenue: 1120,
    units: 20,
  },
  {
    id: 19,
    orderedAt: '2026-06-12',
    region: 'North America',
    category: 'Hydration',
    productName: 'Altitude Bottle',
    channel: 'Marketplace',
    revenue: 1025,
    units: 52,
  },
  {
    id: 20,
    orderedAt: '2026-06-18',
    region: 'Europe',
    category: 'Footwear',
    productName: 'Summit Hiker',
    channel: 'Direct',
    revenue: 2760,
    units: 27,
  },
  {
    id: 21,
    orderedAt: '2026-06-23',
    region: 'APAC',
    category: 'Apparel',
    productName: 'Storm Shell',
    channel: 'Marketplace',
    revenue: 1910,
    units: 24,
  },
  {
    id: 22,
    orderedAt: '2026-06-25',
    region: 'North America',
    category: 'Accessories',
    productName: 'Trail Cap',
    channel: 'Retail',
    revenue: 810,
    units: 29,
  },
  {
    id: 23,
    orderedAt: '2026-06-27',
    region: 'Europe',
    category: 'Footwear',
    productName: 'Nimbus Runner',
    channel: 'Marketplace',
    revenue: 2210,
    units: 30,
  },
  {
    id: 24,
    orderedAt: '2026-06-30',
    region: 'APAC',
    category: 'Hydration',
    productName: 'Altitude Bottle',
    channel: 'Direct',
    revenue: 995,
    units: 48,
  },
];

function getSqlRuntime() {
  if (!sqliteRuntimePromise) {
    sqliteRuntimePromise = initSqlJs({
      locateFile: () => wasmUrl,
    });
  }
  return sqliteRuntimePromise;
}

async function createDatabase() {
  const SQL = await getSqlRuntime();
  const db = new SQL.Database();
  db.run(`
    CREATE TABLE orders (
      id INTEGER PRIMARY KEY,
      ordered_at TEXT NOT NULL,
      region TEXT NOT NULL,
      category TEXT NOT NULL,
      product_name TEXT NOT NULL,
      channel TEXT NOT NULL,
      revenue REAL NOT NULL,
      units INTEGER NOT NULL
    );
  `);

  const statement = db.prepare(
    'INSERT INTO orders (id, ordered_at, region, category, product_name, channel, revenue, units) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  );
  for (const row of seedOrders) {
    statement.run([
      row.id,
      row.orderedAt,
      row.region,
      row.category,
      row.productName,
      row.channel,
      row.revenue,
      row.units,
    ]);
  }
  statement.free();
  return db;
}

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = createDatabase();
  }
  return databasePromise;
}

function queryRows(db: Database, sql: string, params: unknown[] = []) {
  const statement = db.prepare(sql);
  statement.bind(params as never);
  const rows: Record<string, unknown>[] = [];
  while (statement.step()) {
    rows.push(statement.getAsObject() as Record<string, unknown>);
  }
  statement.free();
  return rows;
}

const monthNames = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const FILTERABLE_SQL_FIELDS: Record<string, string> = {
  ordered_at: 'ordered_at',
  region: 'region',
  category: 'category',
  product_name: 'product_name',
  channel: 'channel',
};

const PREVIOUS_PERIOD_PREDICATE = "ordered_at < date('now', 'start of month')";

function getDatasetField(fieldId: string) {
  return sqliteDataModel.datasets?.[0]?.fields.find((field) => field.id === fieldId);
}

function getFieldExpression(fieldId: string): string {
  switch (fieldId) {
    case 'month':
      return "strftime('%m', ordered_at)";
    default:
      return FILTERABLE_SQL_FIELDS[fieldId] ?? fieldId;
  }
}

function buildAggregateExpression(fieldId: string, aggregation: AggregationType): string {
  switch (fieldId) {
    case 'orders':
      return 'COUNT(*)';
    case 'aov':
      return 'ROUND(AVG(revenue), 2)';
    case 'previousRevenue':
      return `ROUND(SUM(CASE WHEN ${PREVIOUS_PERIOD_PREDICATE} THEN revenue ELSE 0 END), 2)`;
    case 'previousOrders':
      return `SUM(CASE WHEN ${PREVIOUS_PERIOD_PREDICATE} THEN 1 ELSE 0 END)`;
    case 'previousAov':
      return `ROUND(AVG(CASE WHEN ${PREVIOUS_PERIOD_PREDICATE} THEN revenue END), 2)`;
    default:
      return applyAggregation(getFieldExpression(fieldId), aggregation);
  }
}

function applyAggregation(expression: string, aggregation: AggregationType): string {
  switch (aggregation) {
    case 'avg':
      return `ROUND(AVG(${expression}), 2)`;
    case 'count':
      return `COUNT(${expression})`;
    case 'count_distinct':
      return `COUNT(DISTINCT ${expression})`;
    case 'min':
      return `MIN(${expression})`;
    case 'max':
      return `MAX(${expression})`;
    case 'none':
      return expression;
    case 'sum':
    default:
      return `ROUND(SUM(${expression}), 2)`;
  }
}

function compileFilter(filter: QueryFilter, params: unknown[]): string {
  const expression = FILTERABLE_SQL_FIELDS[filter.fieldId];
  if (!expression) {
    throw new Error(`Unsupported filter field: ${filter.fieldId}`);
  }

  switch (filter.operator) {
    case 'eq':
      params.push(filter.value);
      return `${expression} = ?`;
    case 'neq':
      params.push(filter.value);
      return `${expression} != ?`;
    case 'gt':
      params.push(filter.value);
      return `${expression} > ?`;
    case 'gte':
      params.push(filter.value);
      return `${expression} >= ?`;
    case 'lt':
      params.push(filter.value);
      return `${expression} < ?`;
    case 'lte':
      params.push(filter.value);
      return `${expression} <= ?`;
    case 'like':
      params.push(filter.value);
      return `${expression} LIKE ?`;
    case 'not_like':
      params.push(filter.value);
      return `${expression} NOT LIKE ?`;
    case 'is_null':
      return `${expression} IS NULL`;
    case 'is_not_null':
      return `${expression} IS NOT NULL`;
    case 'in':
    case 'not_in': {
      if (!Array.isArray(filter.value) || filter.value.length === 0) {
        return filter.operator === 'in' ? '1 = 0' : '1 = 1';
      }

      params.push(...filter.value);
      const placeholders = filter.value.map(() => '?').join(', ');
      return `${expression} ${filter.operator === 'in' ? 'IN' : 'NOT IN'} (${placeholders})`;
    }
    case 'between': {
      if (!Array.isArray(filter.value)) {
        throw new Error(`Unsupported between filter for field: ${filter.fieldId}`);
      }

      const [start, end] = filter.value;
      if (start != null && end != null) {
        params.push(start, end);
        return `${expression} BETWEEN ? AND ?`;
      }

      if (start != null) {
        params.push(start);
        return `${expression} >= ?`;
      }

      if (end != null) {
        params.push(end);
        return `${expression} <= ?`;
      }

      return '1 = 1';
    }
    default: {
      const unsupportedOperator: never = filter.operator as never;
      throw new Error(`Unsupported filter operator: ${unsupportedOperator}`);
    }
  }
}

function getDefaultSortClause(query: LogicalQuery): string | null {
  const dimensions = query.fields.filter(
    (field) => !field.aggregation || field.aggregation === 'none',
  );
  const measures = query.fields.filter(
    (field) => field.aggregation && field.aggregation !== 'none',
  );

  if (dimensions.length === 0) {
    return null;
  }

  const timeDimension = dimensions.find((field) => getDatasetField(field.fieldId)?.role === 'time');
  if (timeDimension) {
    return `"${timeDimension.alias ?? timeDimension.fieldId}" ASC`;
  }

  const revenueMeasure = measures.find(
    (field) => field.fieldId === 'revenue' || field.alias === 'revenue',
  );
  if (revenueMeasure) {
    return `"${revenueMeasure.alias ?? revenueMeasure.fieldId}" DESC`;
  }

  if (measures.length > 0) {
    const firstMeasure = measures[0];
    return `"${firstMeasure.alias ?? firstMeasure.fieldId}" DESC`;
  }

  const firstDimension = dimensions[0];
  return `"${firstDimension.alias ?? firstDimension.fieldId}" ASC`;
}

function buildOrderClause(query: LogicalQuery): string {
  if (query.sort && query.sort.length > 0) {
    return `ORDER BY ${query.sort
      .map((sortRule) => `"${sortRule.fieldId}" ${sortRule.direction.toUpperCase()}`)
      .join(', ')}`;
  }

  const defaultSort = getDefaultSortClause(query);
  return defaultSort ? `ORDER BY ${defaultSort}` : '';
}

function buildColumns(query: LogicalQuery): QueryResultColumn[] {
  return query.fields.map((field) => {
    const datasetField = getDatasetField(field.fieldId);

    return {
      fieldId: field.alias ?? field.fieldId,
      label: datasetField?.label ?? field.alias ?? field.fieldId,
      dataType: (datasetField?.dataType ?? 'unknown') as QueryResultColumn['dataType'],
    };
  });
}

function normalizeRows(query: LogicalQuery, rows: Record<string, unknown>[]) {
  if (!query.fields.some((field) => (field.alias ?? field.fieldId) === 'month')) {
    return rows;
  }

  return rows.map((row) => {
    const monthValue = row.month;
    const monthNumber = Number(monthValue);
    if (Number.isNaN(monthNumber)) {
      return row;
    }

    return {
      ...row,
      month: monthNames[Math.max(0, monthNumber - 1)] ?? String(monthValue),
    };
  });
}

export function compileSqliteLogicalQuery(query: LogicalQuery): CompiledSqliteQuery {
  if (query.datasetId !== SQLITE_DATASET_ID) {
    throw new Error(`Unknown dataset: ${query.datasetId}`);
  }

  if (query.fields.length === 0) {
    throw new Error('LogicalQuery must include at least one field.');
  }

  const params: unknown[] = [];
  const whereClause = query.filters?.length
    ? `WHERE ${query.filters.map((filter) => compileFilter(filter, params)).join(' AND ')}`
    : '';

  const dimensions = query.fields.filter(
    (field) => !field.aggregation || field.aggregation === 'none',
  );
  const measures = query.fields.filter(
    (field) => field.aggregation && field.aggregation !== 'none',
  );
  const selectClause = query.fields
    .map((field) => {
      const alias = field.alias ?? field.fieldId;
      const expression =
        field.aggregation && field.aggregation !== 'none'
          ? buildAggregateExpression(field.fieldId, field.aggregation)
          : getFieldExpression(field.fieldId);
      return `${expression} AS "${alias}"`;
    })
    .join(', ');

  const groupByClause =
    measures.length > 0 && dimensions.length > 0
      ? `GROUP BY ${dimensions.map((field) => getFieldExpression(field.fieldId)).join(', ')}`
      : '';
  const orderClause = buildOrderClause(query);
  const limitClause = typeof query.limit === 'number' ? `LIMIT ${query.limit}` : '';
  const offsetClause = typeof query.offset === 'number' ? `OFFSET ${query.offset}` : '';
  const sql = [
    `SELECT ${selectClause}`,
    'FROM orders',
    whereClause,
    groupByClause,
    orderClause,
    limitClause,
    offsetClause,
  ]
    .filter((part) => part.length > 0)
    .join('\n');

  return { sql, params };
}

export function formatSqliteQueryLogEntry(compiledQuery: CompiledSqliteQuery): string {
  return `${compiledQuery.sql} -- ${JSON.stringify(compiledQuery.params)}`;
}

export async function executeSqliteLogicalQuery(
  query: LogicalQuery,
  compiledQuery: CompiledSqliteQuery = compileSqliteLogicalQuery(query),
): Promise<QueryResult> {
  const db = await getDatabase();
  const rows = normalizeRows(query, queryRows(db, compiledQuery.sql, compiledQuery.params));

  return {
    columns: buildColumns(query),
    rows,
    totalRows: rows.length,
  };
}

export async function loadSqliteFilterOptions(): Promise<Record<string, string[]>> {
  const db = await getDatabase();

  return {
    'filter-region': queryRows(db, 'SELECT DISTINCT region FROM orders ORDER BY region').map(
      (row) => String(row.region),
    ),
    'filter-category': queryRows(db, 'SELECT DISTINCT category FROM orders ORDER BY category').map(
      (row) => String(row.category),
    ),
  };
}

// ─── Preview Data Provider for Designer ──────────────────────

function toFieldIds(value: string | string[] | undefined): string[] {
  if (typeof value === 'string') {
    return value.length > 0 ? [value] : [];
  }

  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => entry.length > 0);
  }

  return [];
}

function normalizePreviewAggregation(value: string | undefined): AggregationType | undefined {
  if (
    value === 'sum' ||
    value === 'avg' ||
    value === 'count' ||
    value === 'count_distinct' ||
    value === 'min' ||
    value === 'max' ||
    value === 'none'
  ) {
    return value;
  }

  return undefined;
}

export async function fetchDesignerPreviewData(
  request: PreviewDataRequest,
): Promise<Record<string, unknown>[]> {
  if (request.datasetRef !== SQLITE_DATASET_ID) {
    return [];
  }

  const selectedFieldIds = new Set<string>();
  for (const [key, value] of Object.entries(request.fields)) {
    if (key === 'aggregation' || key === 'metricFields') {
      continue;
    }

    for (const fieldId of toFieldIds(value)) {
      selectedFieldIds.add(fieldId);
    }
  }

  if (selectedFieldIds.size === 0) {
    return [];
  }

  const previewAggregation = normalizePreviewAggregation(
    typeof request.fields.aggregation === 'string' ? request.fields.aggregation : undefined,
  );
  const fields = Array.from(selectedFieldIds).map((fieldId) => {
    const datasetField = sqliteDatasetFields.find((field) => field.id === fieldId);
    if (datasetField?.role === 'measure') {
      return {
        fieldId,
        aggregation:
          previewAggregation ?? (datasetField.defaultAggregation as AggregationType | undefined),
      };
    }

    return { fieldId };
  });

  const result = await executeSqliteLogicalQuery({
    datasetId: SQLITE_DATASET_ID,
    fields,
    limit: 100,
  });

  return result.rows;
}
