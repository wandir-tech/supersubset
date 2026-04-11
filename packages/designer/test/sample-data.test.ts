/**
 * Tests for sample data provider.
 */
import { describe, it, expect } from 'vitest';
import { getSampleData, SAMPLE_DATA_TYPES } from '../src/data/sample-data';

describe('getSampleData', () => {
  it('returns data for all defined sample data types', () => {
    for (const type of SAMPLE_DATA_TYPES) {
      const result = getSampleData(type);
      expect(result).not.toBeNull();
      expect(result!.data).toBeInstanceOf(Array);
      expect(result!.data.length).toBeGreaterThan(0);
    }
  });

  it('returns null for unknown widget types', () => {
    expect(getSampleData('unknown-chart')).toBeNull();
    expect(getSampleData('')).toBeNull();
  });

  it('line-chart data has month and revenue fields', () => {
    const result = getSampleData('line-chart');
    expect(result!.data[0]).toHaveProperty('month');
    expect(result!.data[0]).toHaveProperty('revenue');
  });

  it('bar-chart data has category and sales fields', () => {
    const result = getSampleData('bar-chart');
    expect(result!.data[0]).toHaveProperty('category');
    expect(result!.data[0]).toHaveProperty('sales');
  });

  it('pie-chart data has category and value fields', () => {
    const result = getSampleData('pie-chart');
    expect(result!.data[0]).toHaveProperty('category');
    expect(result!.data[0]).toHaveProperty('value');
  });

  it('table data includes columns metadata', () => {
    const result = getSampleData('table');
    expect(result!.columns).toBeDefined();
    expect(result!.columns!.length).toBeGreaterThan(0);
    expect(result!.columns![0]).toHaveProperty('key');
    expect(result!.columns![0]).toHaveProperty('title');
  });

  it('alerts data includes title, message, severity, and timestamp fields', () => {
    const result = getSampleData('alerts');
    expect(result!.data[0]).toHaveProperty('alert_title');
    expect(result!.data[0]).toHaveProperty('alert_message');
    expect(result!.data[0]).toHaveProperty('severity');
    expect(result!.data[0]).toHaveProperty('detected_at');
  });

  it('returns deterministic data (same result on repeated calls)', () => {
    const result1 = getSampleData('line-chart');
    const result2 = getSampleData('line-chart');
    expect(result1).toEqual(result2);
  });

  it('SAMPLE_DATA_TYPES has 17 entries', () => {
    expect(SAMPLE_DATA_TYPES).toHaveLength(17);
  });
});
