import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { generateDashboardJsonSchema } from '../src/json-schema';
import { serializeToYAML, parseFromYAML } from '../src/serializers/yaml';
import { parseFromJSON } from '../src/serializers';

const fixturePath = resolve(__dirname, 'fixtures/sales-dashboard.json');
const fixtureJSON = readFileSync(fixturePath, 'utf-8');

describe('JSON Schema generation', () => {
  it('generates a valid JSON Schema object', () => {
    const schema = generateDashboardJsonSchema();
    expect(schema).toBeDefined();
    expect(schema.$schema).toContain('json-schema.org');
    // Main definition is under definitions.DashboardDefinition
    const defs = schema.definitions as Record<string, Record<string, unknown>>;
    expect(defs.DashboardDefinition.type).toBe('object');
  });

  it('includes required properties', () => {
    const schema = generateDashboardJsonSchema();
    const defs = schema.definitions as Record<string, Record<string, unknown>>;
    const required = defs.DashboardDefinition.required as string[];
    expect(required).toContain('schemaVersion');
    expect(required).toContain('id');
    expect(required).toContain('title');
    expect(required).toContain('pages');
  });

  it('includes pages as array type', () => {
    const schema = generateDashboardJsonSchema();
    const defs = schema.definitions as Record<string, Record<string, unknown>>;
    const props = defs.DashboardDefinition.properties as Record<string, Record<string, unknown>>;
    expect(props.pages.type).toBe('array');
  });

  it('is serializable to JSON', () => {
    const schema = generateDashboardJsonSchema();
    const json = JSON.stringify(schema, null, 2);
    expect(() => JSON.parse(json)).not.toThrow();
  });
});

describe('YAML serialization', () => {
  it('round-trips fixture through YAML', () => {
    const parsed = parseFromJSON(fixtureJSON);
    const yaml = serializeToYAML(parsed);
    const reparsed = parseFromYAML(yaml);

    expect(reparsed.schemaVersion).toBe(parsed.schemaVersion);
    expect(reparsed.id).toBe(parsed.id);
    expect(reparsed.title).toBe(parsed.title);
    expect(reparsed.pages).toHaveLength(parsed.pages.length);
  });

  it('preserves layout map structure', () => {
    const parsed = parseFromJSON(fixtureJSON);
    const yaml = serializeToYAML(parsed);
    const reparsed = parseFromYAML(yaml);

    const originalKeys = Object.keys(parsed.pages[0].layout);
    const reparsedKeys = Object.keys(reparsed.pages[0].layout);
    expect(reparsedKeys.length).toBe(originalKeys.length);
  });

  it('produces sorted-key YAML', () => {
    const parsed = parseFromJSON(fixtureJSON);
    const yaml = serializeToYAML(parsed);
    // Sorted keys means 'description' comes before 'filters', 'id' before 'pages', etc.
    const descIdx = yaml.indexOf('description:');
    const filtersIdx = yaml.indexOf('filters:');
    expect(descIdx).toBeLessThan(filtersIdx);
  });

  it('rejects invalid YAML content', () => {
    const badYaml = `
schemaVersion: "0.2.0"
id: "test"
title: "Test"
pages: []
`;
    expect(() => parseFromYAML(badYaml)).toThrow();
  });

  it('JSON and YAML are semantically equivalent', () => {
    const parsed = parseFromJSON(fixtureJSON);
    const yamlStr = serializeToYAML(parsed);
    const fromYaml = parseFromYAML(yamlStr);
    const fromJson = parseFromJSON(fixtureJSON);

    // Compare key fields
    expect(fromYaml.id).toBe(fromJson.id);
    expect(fromYaml.pages[0].widgets.length).toBe(fromJson.pages[0].widgets.length);
    expect(Object.keys(fromYaml.pages[0].layout).length).toBe(
      Object.keys(fromJson.pages[0].layout).length,
    );
  });
});
