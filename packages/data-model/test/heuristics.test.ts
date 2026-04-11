import { describe, it, expect } from 'vitest';
import { inferFieldRole, inferAggregation, humanizeFieldName } from '../src/heuristics.js';

describe('inferFieldRole', () => {
  it('identifies "id" as key', () => {
    expect(inferFieldRole('id', 'integer')).toBe('key');
  });

  it('identifies *_id fields as key', () => {
    expect(inferFieldRole('user_id', 'integer')).toBe('key');
    expect(inferFieldRole('order_id', 'integer')).toBe('key');
  });

  it('identifies *Id fields as key', () => {
    expect(inferFieldRole('userId', 'integer')).toBe('key');
    expect(inferFieldRole('productId', 'integer')).toBe('key');
  });

  it('identifies date/datetime types as time', () => {
    expect(inferFieldRole('whatever', 'date')).toBe('time');
    expect(inferFieldRole('whatever', 'datetime')).toBe('time');
  });

  it('identifies time-like names as time', () => {
    expect(inferFieldRole('created_at', 'string')).toBe('time');
    expect(inferFieldRole('updated_at', 'string')).toBe('time');
    expect(inferFieldRole('order_date', 'string')).toBe('time');
    expect(inferFieldRole('orderDate', 'string')).toBe('time');
    expect(inferFieldRole('startTime', 'string')).toBe('time');
    expect(inferFieldRole('createdOn', 'string')).toBe('time');
  });

  it('identifies numeric types as measure', () => {
    expect(inferFieldRole('total', 'number')).toBe('measure');
    expect(inferFieldRole('quantity', 'integer')).toBe('measure');
    expect(inferFieldRole('price', 'number')).toBe('measure');
  });

  it('identifies measure-like names', () => {
    expect(inferFieldRole('order_amount', 'number')).toBe('measure');
    expect(inferFieldRole('line_total', 'number')).toBe('measure');
    expect(inferFieldRole('item_count', 'integer')).toBe('measure');
    expect(inferFieldRole('avg_price', 'number')).toBe('measure');
    expect(inferFieldRole('total_revenue', 'number')).toBe('measure');
    expect(inferFieldRole('unit_qty', 'integer')).toBe('measure');
    expect(inferFieldRole('total_quantity', 'integer')).toBe('measure');
  });

  it('identifies string fields as dimension', () => {
    expect(inferFieldRole('status', 'string')).toBe('dimension');
    expect(inferFieldRole('name', 'string')).toBe('dimension');
    expect(inferFieldRole('category', 'string')).toBe('dimension');
  });

  it('identifies boolean fields as dimension', () => {
    expect(inferFieldRole('is_active', 'boolean')).toBe('dimension');
    expect(inferFieldRole('enabled', 'boolean')).toBe('dimension');
  });

  it('returns unknown for json/unknown types', () => {
    expect(inferFieldRole('meta', 'json')).toBe('unknown');
    expect(inferFieldRole('data', 'unknown')).toBe('unknown');
  });

  it('key takes priority over measure for _id numeric fields', () => {
    expect(inferFieldRole('user_id', 'integer')).toBe('key');
    expect(inferFieldRole('orderId', 'number')).toBe('key');
  });
});

describe('inferAggregation', () => {
  it('returns sum for numeric measures', () => {
    expect(inferAggregation('measure', 'number')).toBe('sum');
    expect(inferAggregation('measure', 'integer')).toBe('sum');
  });

  it('returns none for time fields', () => {
    expect(inferAggregation('time', 'date')).toBe('none');
    expect(inferAggregation('time', 'datetime')).toBe('none');
  });

  it('returns undefined for dimensions', () => {
    expect(inferAggregation('dimension', 'string')).toBeUndefined();
  });

  it('returns undefined for keys', () => {
    expect(inferAggregation('key', 'integer')).toBeUndefined();
  });
});

describe('humanizeFieldName', () => {
  it('converts snake_case to Title Case', () => {
    expect(humanizeFieldName('order_date')).toBe('Order Date');
    expect(humanizeFieldName('created_at')).toBe('Created At');
    expect(humanizeFieldName('user_id')).toBe('User Id');
  });

  it('converts camelCase to Title Case', () => {
    expect(humanizeFieldName('orderId')).toBe('Order Id');
    expect(humanizeFieldName('firstName')).toBe('First Name');
    expect(humanizeFieldName('createdAt')).toBe('Created At');
  });

  it('handles single words', () => {
    expect(humanizeFieldName('id')).toBe('Id');
    expect(humanizeFieldName('name')).toBe('Name');
    expect(humanizeFieldName('status')).toBe('Status');
  });

  it('handles mixed patterns', () => {
    expect(humanizeFieldName('my_fieldName')).toBe('My Field Name');
  });

  it('handles hyphens', () => {
    expect(humanizeFieldName('order-date')).toBe('Order Date');
  });
});
