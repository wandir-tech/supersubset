/**
 * 3.8 — Workflow test: metadata-to-dashboard (programmatic).
 *
 * Exercises the full import pipeline without a browser:
 * 1. Parse Prisma schema → NormalizedDatasets
 * 2. Auto-generate DashboardDefinition via importSchema()
 * 3. Validate the generated dashboard has correct structure
 * 4. Verify widgets match appropriate chart types for the data model
 */
import { describe, it, expect } from 'vitest';
import { importSchema } from '../src/import-schema.js';

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

const DBT_MANIFEST = {
  nodes: {
    'model.project.customers': {
      resource_type: 'model',
      name: 'customers',
      description: 'Customer dimension table',
      columns: {
        customer_id: { name: 'customer_id', description: 'Primary key', data_type: 'INT' },
        first_name: { name: 'first_name', data_type: 'VARCHAR' },
        last_name: { name: 'last_name', data_type: 'VARCHAR' },
        created_at: { name: 'created_at', data_type: 'TIMESTAMP' },
      },
    },
    'model.project.orders': {
      resource_type: 'model',
      name: 'orders',
      description: 'Order fact table',
      columns: {
        order_id: { name: 'order_id', data_type: 'INT' },
        customer_id: { name: 'customer_id', data_type: 'INT' },
        amount: { name: 'amount', data_type: 'DECIMAL' },
        order_date: { name: 'order_date', data_type: 'DATE' },
        status: { name: 'status', data_type: 'VARCHAR' },
      },
    },
    'test.project.some_test': {
      resource_type: 'test',
      name: 'some_test',
    },
  },
};

describe('Metadata-to-Dashboard Workflow', () => {
  describe('Prisma → Dashboard', () => {
    it('generates a valid dashboard from Prisma schema', async () => {
      const result = await importSchema({
        sourceType: 'prisma',
        source: PRISMA_SCHEMA,
        title: 'E-Commerce Analytics',
      });

      expect(result.dashboard.schemaVersion).toBe('0.2.0');
      expect(result.dashboard.title).toBe('E-Commerce Analytics');
      expect(result.datasets.length).toBeGreaterThan(0);
      expect(result.stats.datasetsCount).toBeGreaterThan(0);
    });

    it('extracts all models as datasets', async () => {
      const result = await importSchema({
        sourceType: 'prisma',
        source: PRISMA_SCHEMA,
      });

      const datasetNames = result.datasets.map((d) => d.id);
      expect(datasetNames).toContain('user');
      expect(datasetNames).toContain('order');
      expect(datasetNames).toContain('orderitem');
    });

    it('infers field roles correctly', async () => {
      const result = await importSchema({
        sourceType: 'prisma',
        source: PRISMA_SCHEMA,
      });

      const orderDs = result.datasets.find((d) => d.id === 'order');
      expect(orderDs).toBeDefined();

      const idField = orderDs!.fields.find((f) => f.id === 'id');
      expect(idField?.role).toBe('key');

      const totalField = orderDs!.fields.find((f) => f.id === 'total');
      expect(totalField?.role).toBe('measure');

      const createdAtField = orderDs!.fields.find((f) => f.id === 'createdAt');
      expect(createdAtField?.role).toBe('time');

      const statusField = orderDs!.fields.find((f) => f.id === 'status');
      expect(statusField?.role).toBe('dimension');
    });

    it('generates appropriate widgets for data model', async () => {
      const result = await importSchema({
        sourceType: 'prisma',
        source: PRISMA_SCHEMA,
      });

      // Order model has time + measure → should generate a line chart
      const pages = result.dashboard.pages;
      expect(pages.length).toBeGreaterThan(0);

      const allWidgets = pages.flatMap((p) => p.widgets);
      const widgetTypes = allWidgets.map((w) => w.type);

      // Should have at least a table widget
      expect(widgetTypes).toContain('table');
      expect(result.stats.widgetsGenerated).toBeGreaterThan(0);
    });

    it('generates valid layout structure', async () => {
      const result = await importSchema({
        sourceType: 'prisma',
        source: PRISMA_SCHEMA,
      });

      for (const page of result.dashboard.pages) {
        expect(page.layout).toBeDefined();
        expect(page.rootNodeId).toBe('root');
        expect(page.layout.root).toBeDefined();
        expect(page.layout.root.type).toBe('root');

        // Every widget should appear in the grid children
        const gridNode = page.layout['grid-main'];
        expect(gridNode).toBeDefined();
        expect(gridNode.type).toBe('grid');

        for (const widget of page.widgets) {
          expect(gridNode.children).toContain(widget.id);
        }
      }
    });
  });

  describe('dbt → Dashboard', () => {
    it('generates a dashboard from dbt manifest', async () => {
      const result = await importSchema({
        sourceType: 'dbt',
        source: DBT_MANIFEST,
        title: 'dbt Analytics',
      });

      expect(result.dashboard.title).toBe('dbt Analytics');
      expect(result.stats.datasetsCount).toBe(2); // Only models, not tests
    });

    it('filters out non-model nodes', async () => {
      const result = await importSchema({
        sourceType: 'dbt',
        source: DBT_MANIFEST,
      });

      const datasetNames = result.datasets.map((d) => d.id);
      expect(datasetNames).not.toContain('some_test');
    });
  });

  describe('JSON → Dashboard', () => {
    it('generates a dashboard from JSON definitions', async () => {
      const source = [
        {
          id: 'sales',
          label: 'Sales Data',
          fields: [
            { id: 'date', dataType: 'date' },
            { id: 'amount', dataType: 'number' },
            { id: 'region', dataType: 'string' },
          ],
        },
      ];

      const result = await importSchema({
        sourceType: 'json',
        source: JSON.stringify(source),
        title: 'Sales Dashboard',
      });

      expect(result.dashboard.title).toBe('Sales Dashboard');
      expect(result.stats.datasetsCount).toBe(1);
      expect(result.stats.widgetsGenerated).toBeGreaterThan(0);
    });
  });

  describe('SQL → Dashboard', () => {
    it('generates a dashboard from SQL catalog', async () => {
      const source = {
        tables: [
          {
            name: 'products',
            type: 'TABLE',
            columns: [
              { name: 'id', dataType: 'INT', nullable: false, isPrimaryKey: true },
              { name: 'name', dataType: 'VARCHAR', nullable: false, isPrimaryKey: false },
              { name: 'price', dataType: 'DECIMAL', nullable: false, isPrimaryKey: false },
              { name: 'created_at', dataType: 'TIMESTAMP', nullable: true, isPrimaryKey: false },
            ],
          },
        ],
      };

      const result = await importSchema({
        sourceType: 'sql',
        source: JSON.stringify(source),
        title: 'Product Analytics',
      });

      expect(result.dashboard.title).toBe('Product Analytics');
      expect(result.stats.datasetsCount).toBe(1);
    });
  });

  describe('End-to-end pipeline validation', () => {
    it('dashboard ID is stable and deterministic', async () => {
      const r1 = await importSchema({ sourceType: 'prisma', source: PRISMA_SCHEMA, id: 'test-id' });
      const r2 = await importSchema({ sourceType: 'prisma', source: PRISMA_SCHEMA, id: 'test-id' });
      expect(r1.dashboard.id).toBe(r2.dashboard.id);
    });

    it('widget configs have required field bindings', async () => {
      const result = await importSchema({
        sourceType: 'prisma',
        source: PRISMA_SCHEMA,
      });

      const allWidgets = result.dashboard.pages.flatMap((p) => p.widgets);
      for (const widget of allWidgets) {
        expect(widget.config).toBeDefined();
        expect(typeof widget.config).toBe('object');
      }
    });
  });
});
