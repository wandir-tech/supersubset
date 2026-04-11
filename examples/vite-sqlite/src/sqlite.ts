import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

export interface WidgetFixture {
  data: Record<string, unknown>[];
  columns?: Array<{ fieldId: string; label: string; dataType: string }>;
}

export interface QueryBundle {
  widgetData: Record<string, WidgetFixture>;
  filterOptions: Record<string, string[]>;
  queryLog: string[];
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
  { id: 1, orderedAt: '2026-01-08', region: 'North America', category: 'Footwear', productName: 'Nimbus Runner', channel: 'Direct', revenue: 1820, units: 24 },
  { id: 2, orderedAt: '2026-01-12', region: 'Europe', category: 'Accessories', productName: 'Commuter Tote', channel: 'Marketplace', revenue: 960, units: 18 },
  { id: 3, orderedAt: '2026-01-19', region: 'APAC', category: 'Apparel', productName: 'Merino Tee', channel: 'Direct', revenue: 1380, units: 32 },
  { id: 4, orderedAt: '2026-02-02', region: 'North America', category: 'Accessories', productName: 'Trail Cap', channel: 'Retail', revenue: 740, units: 27 },
  { id: 5, orderedAt: '2026-02-11', region: 'Europe', category: 'Footwear', productName: 'Nimbus Runner', channel: 'Direct', revenue: 2140, units: 28 },
  { id: 6, orderedAt: '2026-02-21', region: 'APAC', category: 'Apparel', productName: 'Merino Tee', channel: 'Marketplace', revenue: 1250, units: 29 },
  { id: 7, orderedAt: '2026-03-05', region: 'North America', category: 'Hydration', productName: 'Altitude Bottle', channel: 'Direct', revenue: 880, units: 44 },
  { id: 8, orderedAt: '2026-03-09', region: 'Europe', category: 'Footwear', productName: 'Nimbus Runner', channel: 'Marketplace', revenue: 2360, units: 31 },
  { id: 9, orderedAt: '2026-03-17', region: 'APAC', category: 'Apparel', productName: 'Merino Tee', channel: 'Retail', revenue: 1420, units: 35 },
  { id: 10, orderedAt: '2026-03-28', region: 'North America', category: 'Accessories', productName: 'Weekender Tote', channel: 'Direct', revenue: 1640, units: 19 },
  { id: 11, orderedAt: '2026-04-03', region: 'Europe', category: 'Hydration', productName: 'Altitude Bottle', channel: 'Marketplace', revenue: 920, units: 46 },
  { id: 12, orderedAt: '2026-04-14', region: 'APAC', category: 'Footwear', productName: 'Nimbus Runner', channel: 'Direct', revenue: 2480, units: 33 },
  { id: 13, orderedAt: '2026-04-22', region: 'North America', category: 'Apparel', productName: 'Storm Shell', channel: 'Retail', revenue: 1780, units: 21 },
  { id: 14, orderedAt: '2026-05-02', region: 'Europe', category: 'Accessories', productName: 'Weekender Tote', channel: 'Direct', revenue: 1710, units: 22 },
  { id: 15, orderedAt: '2026-05-10', region: 'APAC', category: 'Hydration', productName: 'Altitude Bottle', channel: 'Marketplace', revenue: 980, units: 49 },
  { id: 16, orderedAt: '2026-05-19', region: 'North America', category: 'Footwear', productName: 'Summit Hiker', channel: 'Direct', revenue: 2650, units: 26 },
  { id: 17, orderedAt: '2026-05-26', region: 'Europe', category: 'Apparel', productName: 'Storm Shell', channel: 'Retail', revenue: 1840, units: 23 },
  { id: 18, orderedAt: '2026-06-04', region: 'APAC', category: 'Accessories', productName: 'Commuter Tote', channel: 'Direct', revenue: 1120, units: 20 },
  { id: 19, orderedAt: '2026-06-12', region: 'North America', category: 'Hydration', productName: 'Altitude Bottle', channel: 'Marketplace', revenue: 1025, units: 52 },
  { id: 20, orderedAt: '2026-06-18', region: 'Europe', category: 'Footwear', productName: 'Summit Hiker', channel: 'Direct', revenue: 2760, units: 27 },
  { id: 21, orderedAt: '2026-06-23', region: 'APAC', category: 'Apparel', productName: 'Storm Shell', channel: 'Marketplace', revenue: 1910, units: 24 },
  { id: 22, orderedAt: '2026-06-25', region: 'North America', category: 'Accessories', productName: 'Trail Cap', channel: 'Retail', revenue: 810, units: 29 },
  { id: 23, orderedAt: '2026-06-27', region: 'Europe', category: 'Footwear', productName: 'Nimbus Runner', channel: 'Marketplace', revenue: 2210, units: 30 },
  { id: 24, orderedAt: '2026-06-30', region: 'APAC', category: 'Hydration', productName: 'Altitude Bottle', channel: 'Direct', revenue: 995, units: 48 }
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

function buildWhereClause(filters: Record<string, unknown>) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  const region = filters['filter-region'];
  if (typeof region === 'string' && region.length > 0) {
    conditions.push('region = ?');
    params.push(region);
  }

  const category = filters['filter-category'];
  if (typeof category === 'string' && category.length > 0) {
    conditions.push('category = ?');
    params.push(category);
  }

  const dateValue = filters['filter-date'];
  if (dateValue && typeof dateValue === 'object') {
    const maybeDate = dateValue as { start?: string; end?: string };
    if (maybeDate.start) {
      conditions.push('ordered_at >= ?');
      params.push(maybeDate.start);
    }
    if (maybeDate.end) {
      conditions.push('ordered_at <= ?');
      params.push(maybeDate.end);
    }
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export async function runAnalyticsQueries(filters: Record<string, unknown>): Promise<QueryBundle> {
  const db = await getDatabase();
  const { whereClause, params } = buildWhereClause(filters);
  const queryLog: string[] = [];

  const run = (sql: string, sqlParams: unknown[] = params) => {
    queryLog.push(`${sql} -- ${JSON.stringify(sqlParams)}`);
    return queryRows(db, sql, sqlParams);
  };

  const summaryRows = run(
    `
      SELECT
        ROUND(SUM(revenue), 2) AS revenue,
        COUNT(*) AS orders,
        ROUND(SUM(revenue) / COUNT(*), 2) AS aov
      FROM orders
      ${whereClause}
    `,
  );

  const previousRows = run(
    `
      SELECT
        ROUND(SUM(revenue), 2) AS previousRevenue,
        COUNT(*) AS previousOrders,
        ROUND(SUM(revenue) / COUNT(*), 2) AS previousAov
      FROM orders
      WHERE ordered_at < '2026-04-01'
    `,
    [],
  );

  const monthlyRows = run(
    `
      SELECT
        strftime('%m', ordered_at) AS month_number,
        ROUND(SUM(revenue), 2) AS revenue,
        COUNT(*) AS orders
      FROM orders
      ${whereClause}
      GROUP BY strftime('%m', ordered_at)
      ORDER BY strftime('%m', ordered_at)
    `,
  ).map((row) => ({
    month: monthNames[Math.max(0, Number(row.month_number) - 1)] ?? String(row.month_number),
    revenue: row.revenue,
    orders: row.orders,
  }));

  const categoryRows = run(
    `
      SELECT category, ROUND(SUM(revenue), 2) AS revenue
      FROM orders
      ${whereClause}
      GROUP BY category
      ORDER BY revenue DESC
    `,
  );

  const topProducts = run(
    `
      SELECT
        product_name,
        SUM(units) AS units,
        ROUND(SUM(revenue), 2) AS revenue,
        region
      FROM orders
      ${whereClause}
      GROUP BY product_name, region
      ORDER BY revenue DESC
      LIMIT 6
    `,
  );

  const regionOptions = run('SELECT DISTINCT region FROM orders ORDER BY region', []).map((row) => String(row.region));
  const categoryOptions = run('SELECT DISTINCT category FROM orders ORDER BY category', []).map((row) => String(row.category));

  const summary = summaryRows[0] ?? { revenue: 0, orders: 0, aov: 0 };
  const previous = previousRows[0] ?? { previousRevenue: 0, previousOrders: 0, previousAov: 0 };

  return {
    widgetData: {
      'kpi-revenue': { data: [{ ...summary, ...previous }] },
      'kpi-orders': { data: [{ ...summary, ...previous }] },
      'kpi-aov': { data: [{ ...summary, ...previous }] },
      'chart-monthly-sales': { data: monthlyRows },
      'chart-category-sales': { data: categoryRows },
      'table-top-products': {
        columns: [
          { fieldId: 'product_name', label: 'Product', dataType: 'string' },
          { fieldId: 'units', label: 'Units', dataType: 'integer' },
          { fieldId: 'revenue', label: 'Revenue', dataType: 'number' },
          { fieldId: 'region', label: 'Region', dataType: 'string' },
        ],
        data: topProducts,
      },
    },
    filterOptions: {
      'filter-region': regionOptions,
      'filter-category': categoryOptions,
    },
    queryLog,
  };
}