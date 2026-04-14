import { describe, it, expect } from 'vitest';
import { importSchema } from '../src/import-schema.js';

// ─── Fixtures ────────────────────────────────────────────────

const PRISMA_SCHEMA = `
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  orders    Order[]
}

model Order {
  id        Int      @id @default(autoincrement())
  total     Float
  status    String
  createdAt DateTime @default(now())
  userId    Int
  user      User     @relation(fields: [userId], references: [id])
  items     OrderItem[]
}

model OrderItem {
  id        Int    @id @default(autoincrement())
  quantity  Int
  price     Float
  productId Int
  orderId   Int
  order     Order  @relation(fields: [orderId], references: [id])
}
`;

const JSON_SOURCE = [
  {
    id: 'sales',
    label: 'Sales',
    fields: [
      { id: 'sale_id', dataType: 'integer' },
      { id: 'region', dataType: 'string' },
      { id: 'sale_date', dataType: 'date' },
      { id: 'revenue', dataType: 'number' },
      { id: 'quantity', dataType: 'integer' },
    ],
  },
  {
    id: 'products',
    label: 'Products',
    fields: [
      { id: 'product_id', dataType: 'integer' },
      { id: 'name', dataType: 'string' },
      { id: 'category', dataType: 'string' },
      { id: 'price', dataType: 'number' },
    ],
  },
];

const SQL_CATALOG = {
  tables: [
    {
      name: 'customers',
      type: 'TABLE' as const,
      columns: [
        { name: 'id', dataType: 'INTEGER', nullable: false, isPrimaryKey: true },
        { name: 'name', dataType: 'VARCHAR', nullable: false, isPrimaryKey: false },
        { name: 'email', dataType: 'VARCHAR', nullable: false, isPrimaryKey: false },
        { name: 'created_at', dataType: 'TIMESTAMP', nullable: false, isPrimaryKey: false },
        { name: 'total_spend', dataType: 'DECIMAL', nullable: true, isPrimaryKey: false },
      ],
    },
    {
      name: 'invoices',
      type: 'TABLE' as const,
      columns: [
        { name: 'id', dataType: 'INTEGER', nullable: false, isPrimaryKey: true },
        { name: 'customer_id', dataType: 'INTEGER', nullable: false, isPrimaryKey: false },
        { name: 'amount', dataType: 'DECIMAL', nullable: false, isPrimaryKey: false },
        { name: 'status', dataType: 'VARCHAR', nullable: false, isPrimaryKey: false },
        { name: 'invoice_date', dataType: 'DATE', nullable: false, isPrimaryKey: false },
      ],
    },
  ],
  foreignKeys: [
    {
      sourceTable: 'invoices',
      sourceColumn: 'customer_id',
      targetTable: 'customers',
      targetColumn: 'id',
    },
  ],
};

const DBT_MANIFEST = {
  nodes: {
    'model.project.orders': {
      resource_type: 'model' as const,
      name: 'orders',
      description: 'All orders',
      columns: {
        order_id: { name: 'order_id', data_type: 'INTEGER' },
        customer_name: { name: 'customer_name', data_type: 'VARCHAR' },
        order_date: { name: 'order_date', data_type: 'DATE' },
        total_amount: { name: 'total_amount', data_type: 'DECIMAL' },
        status: { name: 'status', data_type: 'VARCHAR' },
      },
    },
    'model.project.customers': {
      resource_type: 'model' as const,
      name: 'customers',
      description: 'Customer dimension',
      columns: {
        customer_id: { name: 'customer_id', data_type: 'INTEGER' },
        name: { name: 'name', data_type: 'VARCHAR' },
        region: { name: 'region', data_type: 'VARCHAR' },
        signup_date: { name: 'signup_date', data_type: 'DATE' },
      },
    },
    'test.project.not_null': {
      resource_type: 'test' as const,
      name: 'not_null',
    },
  },
};

// ─── Tests ───────────────────────────────────────────────────

describe('importSchema', () => {
  describe('Prisma import', () => {
    it('should import a Prisma schema with 3 models', async () => {
      const result = await importSchema({
        sourceType: 'prisma',
        source: PRISMA_SCHEMA,
        title: 'E-Commerce',
        id: 'dashboard-ecommerce',
      });

      expect(result.dashboard.schemaVersion).toBe('0.2.0');
      expect(result.dashboard.id).toBe('dashboard-ecommerce');
      expect(result.dashboard.title).toBe('E-Commerce');
      expect(result.dashboard.pages).toHaveLength(3);
      expect(result.stats.datasetsCount).toBe(3);
      expect(result.datasets).toHaveLength(3);
    });

    it('should create pages named after models', async () => {
      const result = await importSchema({
        sourceType: 'prisma',
        source: PRISMA_SCHEMA,
      });

      const pageTitles = result.dashboard.pages.map((p) => p.title);
      expect(pageTitles).toContain('User');
      expect(pageTitles).toContain('Order');
      expect(pageTitles).toContain('OrderItem');
    });
  });

  describe('JSON import', () => {
    it('should import JSON dataset definitions', async () => {
      const result = await importSchema({
        sourceType: 'json',
        source: JSON_SOURCE,
        title: 'Sales Dashboard',
      });

      expect(result.dashboard.pages).toHaveLength(2);
      expect(result.stats.datasetsCount).toBe(2);
      expect(result.datasets[0].id).toBe('sales');
      expect(result.datasets[1].id).toBe('products');
    });

    it('should accept JSON as a string', async () => {
      const result = await importSchema({
        sourceType: 'json',
        source: JSON.stringify(JSON_SOURCE),
      });

      expect(result.dashboard.pages).toHaveLength(2);
    });
  });

  describe('SQL import', () => {
    it('should import SQL catalog data', async () => {
      const result = await importSchema({
        sourceType: 'sql',
        source: SQL_CATALOG,
        title: 'SQL Dashboard',
      });

      expect(result.dashboard.pages).toHaveLength(2);
      expect(result.stats.datasetsCount).toBe(2);
    });

    it('should accept SQL catalog as a string', async () => {
      const result = await importSchema({
        sourceType: 'sql',
        source: JSON.stringify(SQL_CATALOG),
      });

      expect(result.dashboard.pages).toHaveLength(2);
    });
  });

  describe('dbt import', () => {
    it('should import dbt manifest and filter to models only', async () => {
      const result = await importSchema({
        sourceType: 'dbt',
        source: DBT_MANIFEST,
        title: 'dbt Dashboard',
      });

      // Should only have 2 models, not the test node
      expect(result.dashboard.pages).toHaveLength(2);
      expect(result.stats.datasetsCount).toBe(2);
    });

    it('should accept dbt manifest as a string', async () => {
      const result = await importSchema({
        sourceType: 'dbt',
        source: JSON.stringify(DBT_MANIFEST),
      });

      expect(result.dashboard.pages).toHaveLength(2);
    });
  });

  describe('auto-widget generation', () => {
    it('should generate Line Chart when time + measure exist', async () => {
      const result = await importSchema({
        sourceType: 'json',
        source: [
          {
            id: 'timeseries',
            label: 'Timeseries',
            fields: [
              { id: 'date', dataType: 'date' },
              { id: 'revenue', dataType: 'number' },
            ],
          },
        ],
      });

      const page = result.dashboard.pages[0];
      const lineChart = page.widgets.find((w) => w.type === 'line-chart');
      expect(lineChart).toBeDefined();
      expect(lineChart!.id).toBe('widget-timeseries-line');
      expect(lineChart!.config.xField).toBe('date');
      expect(lineChart!.config.yField).toBe('revenue');
    });

    it('should generate Bar Chart when dimension + measure exist', async () => {
      const result = await importSchema({
        sourceType: 'json',
        source: [
          {
            id: 'categorical',
            label: 'Categorical',
            fields: [
              { id: 'category', dataType: 'string' },
              { id: 'amount', dataType: 'number' },
            ],
          },
        ],
      });

      const page = result.dashboard.pages[0];
      const barChart = page.widgets.find((w) => w.type === 'bar-chart');
      expect(barChart).toBeDefined();
      expect(barChart!.id).toBe('widget-categorical-bar');
      expect(barChart!.config.xField).toBe('category');
      expect(barChart!.config.yField).toBe('amount');
    });

    it('should generate KPI Card for any measure', async () => {
      const result = await importSchema({
        sourceType: 'json',
        source: [
          {
            id: 'metrics',
            label: 'Metrics',
            fields: [{ id: 'total_revenue', dataType: 'number' }],
          },
        ],
      });

      const page = result.dashboard.pages[0];
      const kpi = page.widgets.find((w) => w.type === 'kpi-card');
      expect(kpi).toBeDefined();
      expect(kpi!.id).toBe('widget-metrics-kpi');
      expect(kpi!.config.field).toBe('total_revenue');
    });

    it('should always generate a Table widget', async () => {
      const result = await importSchema({
        sourceType: 'json',
        source: [
          {
            id: 'basic',
            label: 'Basic',
            fields: [{ id: 'name', dataType: 'string' }],
          },
        ],
      });

      const page = result.dashboard.pages[0];
      const table = page.widgets.find((w) => w.type === 'table');
      expect(table).toBeDefined();
      expect(table!.id).toBe('widget-basic-table');
      expect(table!.config.columns).toEqual(['name']);
    });

    it('should generate all widget types for a rich dataset', async () => {
      const result = await importSchema({
        sourceType: 'json',
        source: [
          {
            id: 'rich',
            label: 'Rich',
            fields: [
              { id: 'order_date', dataType: 'date' },
              { id: 'category', dataType: 'string' },
              { id: 'revenue', dataType: 'number' },
            ],
          },
        ],
      });

      const page = result.dashboard.pages[0];
      const types = page.widgets.map((w) => w.type);
      expect(types).toContain('line-chart');
      expect(types).toContain('bar-chart');
      expect(types).toContain('kpi-card');
      expect(types).toContain('table');
      expect(page.widgets).toHaveLength(4);
    });
  });

  describe('layout generation', () => {
    it('should create valid layout with root and grid', async () => {
      const result = await importSchema({
        sourceType: 'json',
        source: [
          {
            id: 'test',
            label: 'Test',
            fields: [{ id: 'name', dataType: 'string' }],
          },
        ],
      });

      const page = result.dashboard.pages[0];
      expect(page.rootNodeId).toBe('root');
      expect(page.layout.root).toBeDefined();
      expect(page.layout.root.type).toBe('root');
      expect(page.layout.root.children).toEqual(['grid-main']);
      expect(page.layout['grid-main'].type).toBe('grid');
      expect(page.layout['grid-main'].meta.columns).toBe(12);
    });

    it('should include all widget IDs in grid children', async () => {
      const result = await importSchema({
        sourceType: 'json',
        source: [
          {
            id: 'test',
            label: 'Test',
            fields: [
              { id: 'date', dataType: 'date' },
              { id: 'value', dataType: 'number' },
              { id: 'label', dataType: 'string' },
            ],
          },
        ],
      });

      const page = result.dashboard.pages[0];
      const widgetIds = page.widgets.map((w) => w.id);
      expect(page.layout['grid-main'].children).toEqual(widgetIds);
    });

    it('should create widget layout nodes for each widget (#36)', async () => {
      const result = await importSchema({
        sourceType: 'json',
        source: [
          {
            id: 'test',
            label: 'Test',
            fields: [
              { id: 'date', dataType: 'date' },
              { id: 'value', dataType: 'number' },
              { id: 'label', dataType: 'string' },
            ],
          },
        ],
      });

      const page = result.dashboard.pages[0];
      for (const widget of page.widgets) {
        const node = page.layout[widget.id];
        expect(node).toBeDefined();
        expect(node.type).toBe('widget');
        expect(node.parentId).toBe('grid-main');
        expect(node.meta.widgetRef).toBe(widget.id);
      }
    });
  });

  describe('defaults and IDs', () => {
    it('should use default title when not provided', async () => {
      const result = await importSchema({
        sourceType: 'json',
        source: [{ id: 'x', label: 'X', fields: [{ id: 'a', dataType: 'string' }] }],
      });

      expect(result.dashboard.title).toBe('Imported Dashboard');
      expect(result.dashboard.id).toBe('dashboard-imported');
    });

    it('should generate stable widget IDs based on dataset name', async () => {
      const result1 = await importSchema({
        sourceType: 'json',
        source: [
          {
            id: 'orders',
            label: 'Orders',
            fields: [{ id: 'total', dataType: 'number' }],
          },
        ],
      });

      const result2 = await importSchema({
        sourceType: 'json',
        source: [
          {
            id: 'orders',
            label: 'Orders',
            fields: [{ id: 'total', dataType: 'number' }],
          },
        ],
      });

      const ids1 = result1.dashboard.pages[0].widgets.map((w) => w.id);
      const ids2 = result2.dashboard.pages[0].widgets.map((w) => w.id);
      expect(ids1).toEqual(ids2);
    });
  });

  describe('stats', () => {
    it('should report correct stats', async () => {
      const result = await importSchema({
        sourceType: 'json',
        source: JSON_SOURCE,
      });

      expect(result.stats.datasetsCount).toBe(2);
      expect(result.stats.fieldsCount).toBe(9); // 5 + 4
      expect(result.stats.widgetsGenerated).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty JSON source', async () => {
      const result = await importSchema({
        sourceType: 'json',
        source: [],
      });

      expect(result.dashboard.pages).toHaveLength(0);
      expect(result.stats.datasetsCount).toBe(0);
      expect(result.stats.fieldsCount).toBe(0);
      expect(result.stats.widgetsGenerated).toBe(0);
    });

    it('should handle dataset with only dimensions (no measures)', async () => {
      const result = await importSchema({
        sourceType: 'json',
        source: [
          {
            id: 'labels',
            label: 'Labels',
            fields: [
              { id: 'name', dataType: 'string' },
              { id: 'category', dataType: 'string' },
            ],
          },
        ],
      });

      const page = result.dashboard.pages[0];
      // Should only have a table widget (no charts without measures)
      expect(page.widgets).toHaveLength(1);
      expect(page.widgets[0].type).toBe('table');
    });

    it('should handle dataset with a single field', async () => {
      const result = await importSchema({
        sourceType: 'json',
        source: [
          {
            id: 'minimal',
            label: 'Minimal',
            fields: [{ id: 'value', dataType: 'number' }],
          },
        ],
      });

      const page = result.dashboard.pages[0];
      // Should have KPI + Table (measure but no time or dimension)
      const types = page.widgets.map((w) => w.type);
      expect(types).toContain('kpi-card');
      expect(types).toContain('table');
      expect(types).not.toContain('line-chart');
      expect(types).not.toContain('bar-chart');
    });

    it('should handle dbt manifest with no models', async () => {
      const result = await importSchema({
        sourceType: 'dbt',
        source: {
          nodes: {
            'test.project.not_null': { resource_type: 'test', name: 'not_null' },
          },
        },
      });

      expect(result.dashboard.pages).toHaveLength(0);
      expect(result.stats.datasetsCount).toBe(0);
    });

    it('should handle SQL catalog with empty tables array', async () => {
      const result = await importSchema({
        sourceType: 'sql',
        source: { tables: [] },
      });

      expect(result.dashboard.pages).toHaveLength(0);
      expect(result.stats.datasetsCount).toBe(0);
    });
  });
});
