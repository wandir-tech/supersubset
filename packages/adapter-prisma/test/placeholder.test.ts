import { describe, it, expect } from 'vitest';
import { PrismaAdapter } from '../src/index.js';

const adapter = new PrismaAdapter();

const FIXTURE_SCHEMA = `
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

describe('PrismaAdapter', () => {
  it('has correct name', () => {
    expect(adapter.name).toBe('prisma');
  });

  describe('getDatasets', () => {
    it('extracts all models', async () => {
      const datasets = await adapter.getDatasets(FIXTURE_SCHEMA);
      expect(datasets).toHaveLength(3);
      expect(datasets.map((d) => d.id)).toEqual(['user', 'order', 'orderitem']);
    });

    it('extracts scalar fields from User model', async () => {
      const datasets = await adapter.getDatasets(FIXTURE_SCHEMA);
      const user = datasets.find((d) => d.id === 'user')!;
      expect(user.fields.map((f) => f.id)).toEqual(['id', 'email', 'name', 'createdAt']);
    });

    it('skips relation navigation fields', async () => {
      const datasets = await adapter.getDatasets(FIXTURE_SCHEMA);
      const user = datasets.find((d) => d.id === 'user')!;
      // "orders" should not appear as a field
      expect(user.fields.find((f) => f.id === 'orders')).toBeUndefined();
    });

    it('maps Prisma types correctly', async () => {
      const datasets = await adapter.getDatasets(FIXTURE_SCHEMA);
      const user = datasets.find((d) => d.id === 'user')!;

      expect(user.fields.find((f) => f.id === 'id')?.dataType).toBe('integer');
      expect(user.fields.find((f) => f.id === 'email')?.dataType).toBe('string');
      expect(user.fields.find((f) => f.id === 'createdAt')?.dataType).toBe('datetime');
    });

    it('marks @id fields as key role', async () => {
      const datasets = await adapter.getDatasets(FIXTURE_SCHEMA);
      const user = datasets.find((d) => d.id === 'user')!;
      expect(user.fields.find((f) => f.id === 'id')?.role).toBe('key');
    });

    it('infers roles for non-@id fields', async () => {
      const datasets = await adapter.getDatasets(FIXTURE_SCHEMA);
      const user = datasets.find((d) => d.id === 'user')!;

      expect(user.fields.find((f) => f.id === 'email')?.role).toBe('dimension');
      expect(user.fields.find((f) => f.id === 'createdAt')?.role).toBe('time');
    });

    it('infers measure role for numeric fields', async () => {
      const datasets = await adapter.getDatasets(FIXTURE_SCHEMA);
      const order = datasets.find((d) => d.id === 'order')!;
      const total = order.fields.find((f) => f.id === 'total');
      expect(total?.role).toBe('measure');
      expect(total?.defaultAggregation).toBe('sum');
    });

    it('extracts relationships from @relation', async () => {
      const datasets = await adapter.getDatasets(FIXTURE_SCHEMA);
      const order = datasets.find((d) => d.id === 'order')!;
      expect(order.relationships).toHaveLength(1);
      expect(order.relationships![0]).toEqual({
        targetDatasetId: 'user',
        type: 'many-to-one',
        sourceFieldId: 'userId',
        targetFieldId: 'id',
      });
    });

    it('extracts OrderItem relationships', async () => {
      const datasets = await adapter.getDatasets(FIXTURE_SCHEMA);
      const item = datasets.find((d) => d.id === 'orderitem')!;
      expect(item.relationships).toHaveLength(1);
      expect(item.relationships![0].targetDatasetId).toBe('order');
      expect(item.relationships![0].sourceFieldId).toBe('orderId');
    });

    it('humanizes field names for labels', async () => {
      const datasets = await adapter.getDatasets(FIXTURE_SCHEMA);
      const order = datasets.find((d) => d.id === 'order')!;
      const userId = order.fields.find((f) => f.id === 'userId');
      expect(userId?.label).toBe('User Id');
      const createdAt = order.fields.find((f) => f.id === 'createdAt');
      expect(createdAt?.label).toBe('Created At');
    });
  });

  describe('getDataset', () => {
    it('returns a single dataset by id', async () => {
      const ds = await adapter.getDataset(FIXTURE_SCHEMA, 'user');
      expect(ds?.id).toBe('user');
      expect(ds?.label).toBe('User');
    });

    it('returns undefined for missing dataset', async () => {
      const ds = await adapter.getDataset(FIXTURE_SCHEMA, 'nonexistent');
      expect(ds).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('handles schema with no models', async () => {
      const datasets = await adapter.getDatasets('// empty schema\n');
      expect(datasets).toEqual([]);
    });

    it('handles model with only relation fields', async () => {
      const schema = `
model Tag {
  id   Int    @id @default(autoincrement())
  name String
}
`;
      const datasets = await adapter.getDatasets(schema);
      expect(datasets).toHaveLength(1);
      expect(datasets[0].fields).toHaveLength(2);
    });
  });

  describe('validation', () => {
    it('rejects non-string source', async () => {
      await expect(adapter.getDatasets(123 as unknown as string)).rejects.toThrow(
        'non-empty Prisma schema string',
      );
    });

    it('rejects empty string', async () => {
      await expect(adapter.getDatasets('')).rejects.toThrow('non-empty Prisma schema string');
    });

    it('rejects whitespace-only string', async () => {
      await expect(adapter.getDatasets('   ')).rejects.toThrow('non-empty Prisma schema string');
    });
  });
});
