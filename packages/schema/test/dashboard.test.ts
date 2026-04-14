import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  dashboardDefinitionSchema,
  widgetDefinitionSchema,
  validateNesting,
} from '../src/validation';
import { serializeToJSON, parseFromJSON } from '../src/serializers';
import type { DashboardDefinition } from '../src/types';

const fixturePath = resolve(__dirname, 'fixtures/sales-dashboard.json');
const fixtureJSON = readFileSync(fixturePath, 'utf-8');

describe('DashboardDefinition schema', () => {
  it('validates the sales dashboard fixture', () => {
    const raw = JSON.parse(fixtureJSON);
    const result = dashboardDefinitionSchema.safeParse(raw);
    expect(result.success).toBe(true);
  });

  it('rejects missing schemaVersion', () => {
    const raw = JSON.parse(fixtureJSON);
    delete raw.schemaVersion;
    const result = dashboardDefinitionSchema.safeParse(raw);
    expect(result.success).toBe(false);
  });

  it('rejects empty pages array', () => {
    const raw = JSON.parse(fixtureJSON);
    raw.pages = [];
    const result = dashboardDefinitionSchema.safeParse(raw);
    expect(result.success).toBe(false);
  });

  it('rejects missing widget id', () => {
    const raw = JSON.parse(fixtureJSON);
    delete raw.pages[0].widgets[0].id;
    const result = dashboardDefinitionSchema.safeParse(raw);
    expect(result.success).toBe(false);
  });

  it('validates filter scope discriminated union', () => {
    const raw = JSON.parse(fixtureJSON);
    expect(raw.filters[0].scope.type).toBe('global');
    const result = dashboardDefinitionSchema.safeParse(raw);
    expect(result.success).toBe(true);
  });

  it('validates interaction action discriminated union', () => {
    const raw = JSON.parse(fixtureJSON);
    expect(raw.interactions[0].action.type).toBe('filter');
    const result = dashboardDefinitionSchema.safeParse(raw);
    expect(result.success).toBe(true);
  });

  it('validates inline theme', () => {
    const raw = JSON.parse(fixtureJSON);
    expect(raw.theme.type).toBe('inline');
    const result = dashboardDefinitionSchema.safeParse(raw);
    expect(result.success).toBe(true);
  });

  it('validates theme ref', () => {
    const raw = JSON.parse(fixtureJSON);
    raw.theme = { type: 'ref', themeId: 'dark-theme' };
    const result = dashboardDefinitionSchema.safeParse(raw);
    expect(result.success).toBe(true);
  });

  it('validates layout component width and height', () => {
    const raw = JSON.parse(fixtureJSON);
    const widgetNode = raw.pages[0].layout['widget-kpi-revenue'];
    expect(widgetNode.meta.width).toBe(4);
    expect(widgetNode.meta.height).toBe(20);
    const result = dashboardDefinitionSchema.safeParse(raw);
    expect(result.success).toBe(true);
  });

  it('validates flat layout map with parentId references', () => {
    const raw = JSON.parse(fixtureJSON);
    const grid = raw.pages[0].layout['grid-1'];
    expect(grid.parentId).toBe('root-1');
    expect(grid.children).toContain('row-kpi');
    const result = dashboardDefinitionSchema.safeParse(raw);
    expect(result.success).toBe(true);
  });
});

describe('layout nesting validation', () => {
  it('accepts valid nesting (fixture)', () => {
    const raw = JSON.parse(fixtureJSON);
    const errors = validateNesting(raw.pages[0].layout);
    expect(errors).toHaveLength(0);
  });

  it('rejects widget as child of widget', () => {
    const layout = {
      root: { type: 'root', children: ['grid-1'] },
      'grid-1': { type: 'grid', children: ['w-1'] },
      'w-1': { type: 'widget', children: ['w-2'] },
      'w-2': { type: 'widget', children: [] },
    };
    const errors = validateNesting(layout);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('widget');
  });

  it('rejects row as child of root', () => {
    const layout = {
      root: { type: 'root', children: ['row-1'] },
      'row-1': { type: 'row', children: [] },
    };
    const errors = validateNesting(layout);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('row');
  });

  it('accepts tabs inside grid', () => {
    const layout = {
      root: { type: 'root', children: ['grid-1'] },
      'grid-1': { type: 'grid', children: ['tabs-1'] },
      'tabs-1': { type: 'tabs', children: ['tab-1'] },
      'tab-1': { type: 'tab', children: ['row-1'] },
      'row-1': { type: 'row', children: [] },
    };
    const errors = validateNesting(layout);
    expect(errors).toHaveLength(0);
  });

  it('reports missing child references', () => {
    const layout = {
      root: { type: 'root', children: ['nonexistent'] },
    };
    const errors = validateNesting(layout);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('missing');
  });
});

describe('JSON serialization round-trip', () => {
  it('round-trips without semantic loss', () => {
    const parsed = parseFromJSON(fixtureJSON);
    const serialized = serializeToJSON(parsed);
    const reparsed = parseFromJSON(serialized);

    expect(reparsed.schemaVersion).toBe(parsed.schemaVersion);
    expect(reparsed.id).toBe(parsed.id);
    expect(reparsed.title).toBe(parsed.title);
    expect(reparsed.pages).toHaveLength(parsed.pages.length);
    expect(reparsed.pages[0].widgets).toHaveLength(parsed.pages[0].widgets.length);
    expect(reparsed.filters).toHaveLength(parsed.filters!.length);
    expect(reparsed.interactions).toHaveLength(parsed.interactions!.length);
  });

  it('round-trips layout map structure', () => {
    const parsed = parseFromJSON(fixtureJSON);
    const serialized = serializeToJSON(parsed);
    const reparsed = parseFromJSON(serialized);

    const originalLayout = parsed.pages[0].layout;
    const reparsedLayout = reparsed.pages[0].layout;
    expect(Object.keys(reparsedLayout)).toHaveLength(Object.keys(originalLayout).length);
    expect(reparsed.pages[0].rootNodeId).toBe(parsed.pages[0].rootNodeId);
  });

  it('produces deterministic output (sorted keys)', () => {
    const parsed = parseFromJSON(fixtureJSON);
    const first = serializeToJSON(parsed);
    const second = serializeToJSON(parsed);
    expect(first).toBe(second);
  });

  it('serialized output is valid JSON', () => {
    const parsed = parseFromJSON(fixtureJSON);
    const serialized = serializeToJSON(parsed);
    expect(() => JSON.parse(serialized)).not.toThrow();
  });
});

describe('minimal valid dashboard', () => {
  it('accepts a dashboard with one page and flat layout map', () => {
    const minimal: DashboardDefinition = {
      schemaVersion: '0.2.0',
      id: 'test-min',
      title: 'Minimal',
      pages: [
        {
          id: 'page-1',
          title: 'Page 1',
          rootNodeId: 'root',
          layout: {
            root: { id: 'root', type: 'root', children: ['grid-1'], meta: {} },
            'grid-1': {
              id: 'grid-1',
              type: 'grid',
              children: ['w-1'],
              parentId: 'root',
              meta: { columns: 12 },
            },
            'w-1': {
              id: 'w-1',
              type: 'widget',
              children: [],
              parentId: 'grid-1',
              meta: { widgetRef: 'kpi-1', width: 4, height: 20 },
            },
          },
          widgets: [{ id: 'kpi-1', type: 'kpi-card', config: {} }],
        },
      ],
    };
    const result = dashboardDefinitionSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });
});

describe('prototype pollution prevention (#39)', () => {
  it('strips __proto__ from widget config', () => {
    const result = widgetDefinitionSchema.safeParse({
      id: 'w1',
      type: 'kpi-card',
      config: { value: 42, __proto__: { polluted: true } },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect('__proto__' in result.data.config).toBe(false);
      expect(result.data.config.value).toBe(42);
    }
  });

  it('strips constructor and prototype keys from widget config', () => {
    const result = widgetDefinitionSchema.safeParse({
      id: 'w1',
      type: 'kpi-card',
      config: { ok: 1, constructor: 'bad', prototype: 'bad' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect('constructor' in result.data.config).toBe(false);
      expect('prototype' in result.data.config).toBe(false);
      expect(result.data.config.ok).toBe(1);
    }
  });

  it('strips dangerous keys from dashboard defaults filterValues', () => {
    const minimal: DashboardDefinition = {
      schemaVersion: '0.2.0',
      id: 'test-proto',
      title: 'Proto Test',
      pages: [
        {
          id: 'page-1',
          title: 'Page 1',
          rootNodeId: 'root',
          layout: {
            root: { id: 'root', type: 'root', children: [], meta: {} },
          },
          widgets: [],
        },
      ],
      defaults: {
        filterValues: { safe: 'ok', __proto__: { polluted: true } } as Record<string, unknown>,
      },
    };
    const result = dashboardDefinitionSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect('__proto__' in (result.data.defaults?.filterValues ?? {})).toBe(false);
    }
  });

  it('theme no longer passes through unknown properties', () => {
    const minimal: DashboardDefinition = {
      schemaVersion: '0.2.0',
      id: 'test-theme',
      title: 'Theme Test',
      pages: [
        {
          id: 'page-1',
          title: 'Page 1',
          rootNodeId: 'root',
          layout: {
            root: { id: 'root', type: 'root', children: [], meta: {} },
          },
          widgets: [],
        },
      ],
      theme: {
        type: 'inline',
        colors: { primary: '#000', unknownExtraProp: 'should-be-stripped' } as Record<
          string,
          unknown
        >,
      } as DashboardDefinition['theme'],
    };
    const result = dashboardDefinitionSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success && result.data.theme?.type === 'inline') {
      expect(
        (result.data.theme.colors as Record<string, unknown>)?.unknownExtraProp,
      ).toBeUndefined();
    }
  });
});
