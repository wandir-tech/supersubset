import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION, isSupportedSchemaVersion, migrateDashboardDefinition } from '../src/migrations';
import { parseFromJSON } from '../src/serializers';
import { parseFromYAML } from '../src/serializers/yaml';

const legacyRecursiveDashboard = {
  schemaVersion: '0.1.0',
  id: 'legacy-dashboard',
  title: 'Legacy Dashboard',
  description: 'Recursive layout + dataModelRef + legacy navigate shape',
  dataModelRef: 'catalog://sales',
  pages: [
    {
      id: 'page-overview',
      title: 'Overview',
      layout: {
        id: 'legacy-grid',
        type: 'grid',
        children: [
          {
            id: 'legacy-row',
            type: 'row',
            meta: { gap: '12px' },
            children: [
              {
                id: 'legacy-widget-node',
                type: 'widget',
                widgetId: 'widget-revenue',
                meta: { width: 4, height: 120 },
                children: [],
              },
              {
                id: 'legacy-header-node',
                type: 'header',
                props: { text: 'Legacy Header', headerSize: 'large' },
                children: [],
              },
            ],
          },
        ],
      },
      widgets: [
        {
          id: 'widget-revenue',
          type: 'kpi-card',
          title: 'Revenue',
          config: { valueField: 'revenue' },
        },
      ],
    },
    {
      id: 'page-details',
      title: 'Details',
      layout: {
        id: 'details-grid',
        type: 'grid',
        children: [],
      },
      widgets: [],
    },
  ],
  interactions: [
    {
      id: 'navigate-legacy',
      trigger: { type: 'click', sourceWidgetId: 'widget-revenue' },
      action: { type: 'navigate', pageId: 'page-details' },
    },
  ],
};

const legacyCurrentNavigateDashboard = {
  schemaVersion: '0.2.0',
  id: 'legacy-current-navigate',
  title: 'Legacy Navigate Shape',
  pages: [
    {
      id: 'page-root',
      title: 'Root',
      rootNodeId: 'root',
      layout: {
        root: { id: 'root', type: 'root', children: ['widget-node'], meta: {} },
        'widget-node': {
          id: 'widget-node',
          type: 'widget',
          parentId: 'root',
          children: [],
          meta: { widgetRef: 'widget-revenue', width: 4, height: 120 },
        },
      },
      widgets: [
        {
          id: 'widget-revenue',
          type: 'kpi-card',
          title: 'Revenue',
          config: { valueField: 'revenue' },
        },
      ],
    },
  ],
  interactions: [
    {
      id: 'legacy-dashboard-nav',
      trigger: { type: 'click', sourceWidgetId: 'widget-revenue' },
      action: {
        type: 'navigate',
        dashboardId: 'ops-dashboard',
        filterMapping: [{ sourceFieldRef: 'region', targetFilterId: 'filter-region' }],
        onMappingFailure: 'warn',
      },
    },
  ],
};

describe('schema migrations', () => {
  it('reports supported schema versions', () => {
    expect(isSupportedSchemaVersion('0.1.0')).toBe(true);
    expect(isSupportedSchemaVersion(CURRENT_SCHEMA_VERSION)).toBe(true);
    expect(isSupportedSchemaVersion('9.9.9')).toBe(false);
  });

  it('migrates a 0.1.0 recursive-layout dashboard into the current schema', () => {
    const migrated = migrateDashboardDefinition(legacyRecursiveDashboard);

    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.dataModel).toEqual({ type: 'external', externalRef: 'catalog://sales' });
    expect(migrated.pages[0].rootNodeId).toBeTruthy();
    expect(migrated.pages[0].layout[migrated.pages[0].rootNodeId].type).toBe('root');
    expect(migrated.pages[0].layout[migrated.pages[0].rootNodeId].children).toContain('legacy-grid');
    expect(migrated.pages[0].layout['legacy-widget-node'].parentId).toBe('legacy-row');
    expect(migrated.pages[0].layout['legacy-widget-node'].meta.widgetRef).toBe('widget-revenue');
    expect(migrated.pages[0].layout['legacy-header-node'].meta.text).toBe('Legacy Header');

    expect(migrated.interactions?.[0].action).toEqual({
      type: 'navigate',
      target: { kind: 'page', pageId: 'page-details' },
    });
  });

  it('normalizes legacy navigate actions on current-version documents', () => {
    const migrated = migrateDashboardDefinition(legacyCurrentNavigateDashboard);

    expect(migrated.interactions?.[0].action).toEqual({
      type: 'navigate',
      target: {
        kind: 'dashboard',
        dashboardId: 'ops-dashboard',
        filterMapping: [{ sourceFieldRef: 'region', targetFilterId: 'filter-region' }],
        onMappingFailure: 'warn',
      },
    });
  });

  it('parses and migrates legacy JSON documents transparently', () => {
    const parsed = parseFromJSON(JSON.stringify(legacyRecursiveDashboard));

    expect(parsed.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(parsed.pages[0].layout[parsed.pages[0].rootNodeId].type).toBe('root');
  });

  it('parses and migrates legacy YAML documents transparently', () => {
    const yaml = `
schemaVersion: "0.2.0"
id: "legacy-yaml"
title: "Legacy YAML"
pages:
  - id: "page-root"
    title: "Root"
    layout:
      root:
        id: "root"
        type: "root"
        children: ["widget-node"]
        meta: {}
      widget-node:
        id: "widget-node"
        type: "widget"
        parentId: "root"
        children: []
        meta:
          widgetRef: "widget-revenue"
          width: 4
          height: 120
    rootNodeId: "root"
    widgets:
      - id: "widget-revenue"
        type: "kpi-card"
        config:
          valueField: "revenue"
interactions:
  - id: "legacy-page-nav"
    trigger:
      type: "click"
      sourceWidgetId: "widget-revenue"
    action:
      type: "navigate"
      pageId: "page-details"
`;

    const parsed = parseFromYAML(yaml);

    expect(parsed.interactions?.[0].action).toEqual({
      type: 'navigate',
      target: { kind: 'page', pageId: 'page-details' },
    });
  });

  it('rejects unsupported schema versions before validation', () => {
    expect(() =>
      migrateDashboardDefinition({
        schemaVersion: '9.9.9',
        id: 'unsupported',
        title: 'Unsupported',
        pages: [],
      }),
    ).toThrow('Unsupported schemaVersion');
  });
});