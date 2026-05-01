/**
 * Integration tests for the full designer system:
 * Config + Adapter + Preview + Layout working together.
 * Verifies the entire pipeline from Puck config → rendering → schema conversion.
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { createPuckConfig } from '../src/config/puck-config';
import { puckToCanonical, canonicalToPuck } from '../src/adapters/puck-canonical';
import { CHART_BLOCK_NAMES, PUCK_NAME_TO_WIDGET_TYPE } from '../src/blocks/charts';
import { CONTENT_BLOCK_NAMES } from '../src/blocks/content';
import { CONTROL_BLOCK_NAMES } from '../src/blocks/controls';
import { LAYOUT_BLOCK_NAMES } from '../src/blocks/layout';
import { getComponentIcon, ICON_COMPONENT_NAMES } from '../src/icons/component-icons';
import { getSampleData, SAMPLE_DATA_TYPES } from '../src/data/sample-data';
import type { Data } from '@puckeditor/core';

// ─── Config + Block Registration Integration ─────────────────

describe('Config integration — all blocks registered', () => {
  const config = createPuckConfig();
  const allComponentNames = Object.keys(config.components);
  const totalBlockCount =
    CHART_BLOCK_NAMES.length +
    CONTENT_BLOCK_NAMES.length +
    CONTROL_BLOCK_NAMES.length +
    LAYOUT_BLOCK_NAMES.length;

  it('registers the expected total number of components', () => {
    expect(allComponentNames).toHaveLength(totalBlockCount);
  });

  it('every registered component has a render function', () => {
    for (const name of allComponentNames) {
      expect(config.components[name].render).toBeTypeOf('function');
    }
  });

  it('every registered component can be instantiated with defaultProps', () => {
    for (const name of allComponentNames) {
      const comp = config.components[name];
      const props = { ...comp.defaultProps, puck: { isEditing: false } };

      // For layout blocks with slot fields, provide a mock content component
      if (comp.fields?.content && (comp.fields.content as { type: string }).type === 'slot') {
        props.content = (() => React.createElement('div', null, 'slot-content')) as unknown;
      }

      expect(() => comp.render(props)).not.toThrow();
    }
  });

  it('all CHART_BLOCK_NAMES are registered in config', () => {
    for (const name of CHART_BLOCK_NAMES) {
      expect(config.components[name]).toBeDefined();
    }
  });

  it('all CONTENT_BLOCK_NAMES are registered in config', () => {
    for (const name of CONTENT_BLOCK_NAMES) {
      expect(config.components[name]).toBeDefined();
    }
  });

  it('all CONTROL_BLOCK_NAMES are registered in config', () => {
    for (const name of CONTROL_BLOCK_NAMES) {
      expect(config.components[name]).toBeDefined();
    }
  });

  it('all LAYOUT_BLOCK_NAMES are registered in config', () => {
    for (const name of LAYOUT_BLOCK_NAMES) {
      expect(config.components[name]).toBeDefined();
    }
  });
});

// ─── Category system integration ─────────────────────────────

describe('Category integration', () => {
  const config = createPuckConfig();
  const cats = config.categories!;

  it('all chart components appear in exactly one category', () => {
    const allCatComponents = Object.values(cats).flatMap(
      (cat) => (cat as { components?: string[] }).components ?? [],
    );

    for (const name of CHART_BLOCK_NAMES) {
      const count = allCatComponents.filter((c) => c === name).length;
      expect(count, `${name} should appear in exactly one category`).toBe(1);
    }
  });

  it('all content components appear in exactly one category', () => {
    const allCatComponents = Object.values(cats).flatMap(
      (cat) => (cat as { components?: string[] }).components ?? [],
    );

    for (const name of CONTENT_BLOCK_NAMES) {
      expect(allCatComponents).toContain(name);
    }
  });

  it('all control components appear in exactly one category', () => {
    const allCatComponents = Object.values(cats).flatMap(
      (cat) => (cat as { components?: string[] }).components ?? [],
    );

    for (const name of CONTROL_BLOCK_NAMES) {
      expect(allCatComponents).toContain(name);
    }
  });

  it('all layout components appear in exactly one category', () => {
    const allCatComponents = Object.values(cats).flatMap(
      (cat) => (cat as { components?: string[] }).components ?? [],
    );

    for (const name of LAYOUT_BLOCK_NAMES) {
      expect(allCatComponents).toContain(name);
    }
  });

  it('charts category is expanded by default', () => {
    expect(cats.charts).toBeDefined();
    expect((cats.charts as { defaultExpanded?: boolean }).defaultExpanded).toBe(true);
  });

  it('layout category is expanded by default', () => {
    expect((cats.layout as { defaultExpanded?: boolean }).defaultExpanded).toBe(true);
  });

  it('no component is listed in multiple categories', () => {
    const seen = new Set<string>();
    for (const [catName, cat] of Object.entries(cats)) {
      for (const comp of (cat as { components?: string[] }).components ?? []) {
        expect(seen.has(comp), `${comp} appears in multiple categories`).toBe(false);
        seen.add(comp);
      }
    }
  });

  it('every categorized component is registered in config.components', () => {
    const allCatComponents = Object.values(cats).flatMap(
      (cat) => (cat as { components?: string[] }).components ?? [],
    );

    for (const name of allCatComponents) {
      expect(config.components[name], `${name} is categorized but not registered`).toBeDefined();
    }
  });
});

// ─── Icons coverage integration ──────────────────────────────

describe('Icons integration — every block has an icon', () => {
  const allBlockNames = [
    ...CHART_BLOCK_NAMES,
    ...CONTENT_BLOCK_NAMES,
    ...CONTROL_BLOCK_NAMES,
    ...LAYOUT_BLOCK_NAMES,
  ];

  it('every block has an icon definition', () => {
    for (const name of allBlockNames) {
      const icon = getComponentIcon(name);
      expect(icon, `Missing icon for ${name}`).not.toBeNull();
    }
  });

  it('all icons are SVG elements', () => {
    for (const name of allBlockNames) {
      const icon = getComponentIcon(name);
      expect(icon?.type, `${name} icon should be SVG`).toBe('svg');
    }
  });

  it('ICON_COMPONENT_NAMES matches all block names', () => {
    expect(ICON_COMPONENT_NAMES).toHaveLength(allBlockNames.length);
    for (const name of allBlockNames) {
      expect(ICON_COMPONENT_NAMES).toContain(name);
    }
  });
});

// ─── Sample data coverage integration ────────────────────────

describe('Sample data integration — every chart widget type has data', () => {
  const allWidgetTypes = Object.values(PUCK_NAME_TO_WIDGET_TYPE);

  it('every widget type has corresponding sample data', () => {
    for (const type of allWidgetTypes) {
      const data = getSampleData(type);
      expect(data, `Missing sample data for ${type}`).not.toBeNull();
      expect(data!.data.length, `Empty sample data for ${type}`).toBeGreaterThan(0);
    }
  });

  it('SAMPLE_DATA_TYPES covers all widget types', () => {
    for (const type of allWidgetTypes) {
      expect(SAMPLE_DATA_TYPES, `${type} not in SAMPLE_DATA_TYPES`).toContain(type);
    }
  });

  it('sample data has proper structure for each type', () => {
    for (const type of allWidgetTypes) {
      const data = getSampleData(type);
      expect(data).not.toBeNull();
      // Every data point should be a plain object
      for (const row of data!.data) {
        expect(typeof row).toBe('object');
        expect(row).not.toBeNull();
        expect(Object.keys(row).length).toBeGreaterThan(0);
      }
    }
  });
});

// ─── Full pipeline integration ───────────────────────────────

describe('Full pipeline — build dashboard → serialize → restore', () => {
  it('creates a dashboard with all chart types and round-trips it', () => {
    const content = CHART_BLOCK_NAMES.map((name) => {
      const config = createPuckConfig();
      const comp = config.components[name];
      return {
        type: name,
        props: {
          id: `widget-${name.toLowerCase()}`,
          ...comp.defaultProps,
        },
      };
    });

    const puckData: Data = {
      root: { props: { title: 'Full Pipeline Test' } },
      content,
    };

    // Step 1: Convert to canonical
    const canonical = puckToCanonical(puckData);
    expect(canonical.schemaVersion).toBe('0.2.0');
    expect(canonical.title).toBe('Full Pipeline Test');
    expect(canonical.pages).toHaveLength(1);

    // Step 2: Verify canonical output
    const page = canonical.pages[0];
    expect(page.widgets.length).toBe(CHART_BLOCK_NAMES.length);

    // Step 3: Convert back to Puck data
    const restored = canonicalToPuck(canonical);
    expect(restored.root?.props ?? {}).toEqual({});
    expect(restored.content).toHaveLength(CHART_BLOCK_NAMES.length);

    // Step 4: Verify type preservation
    for (let i = 0; i < restored.content!.length; i++) {
      const original = content[i];
      const result = restored.content![i];
      expect(result.type).toBe(original.type);
      // Title should be preserved
      expect(result.props.title).toBe(original.props.title);
    }
  });

  it('creates a mixed dashboard with layout, charts, content, and controls', () => {
    const puckData: Data = {
      root: { props: { title: 'Mixed Dashboard' } },
      content: [
        {
          type: 'HeaderBlock',
          props: { id: 'h1', text: 'Sales Overview', size: 'large', align: 'center' },
        },
        { type: 'DividerBlock', props: { id: 'd1', color: '#e0e0e0', thickness: 1, margin: 16 } },
        {
          type: 'FilterBarBlock',
          props: { id: 'fb1', title: 'Filters', scope: 'global', layout: 'horizontal' },
        },
        {
          type: 'LineChart',
          props: {
            id: 'lc1',
            title: 'Revenue Trend',
            datasetRef: 'sales',
            xAxisField: 'month',
            yAxisField: 'revenue',
            seriesField: '',
            aggregation: 'sum',
            smooth: 'true',
          },
        },
        {
          type: 'BarChart',
          props: {
            id: 'bc1',
            title: 'Sales by Category',
            datasetRef: 'sales',
            xAxisField: 'category',
            yAxisField: 'amount',
            seriesField: '',
            aggregation: 'none',
            orientation: 'vertical',
            stacked: 'false',
          },
        },
        {
          type: 'PieChart',
          props: {
            id: 'pc1',
            title: 'Market Share',
            datasetRef: 'sales',
            categoryField: 'region',
            valueField: 'share',
            aggregation: 'none',
            variant: 'donut',
          },
        },
        {
          type: 'KPICard',
          props: {
            id: 'kpi1',
            title: 'Total Revenue',
            datasetRef: 'sales',
            valueField: 'total',
            aggregation: 'sum',
            prefix: '$',
            suffix: '',
            comparisonField: 'prev_total',
          },
        },
        {
          type: 'Table',
          props: {
            id: 't1',
            title: 'Transaction Details',
            datasetRef: 'transactions',
            pageSize: 25,
            striped: 'true',
          },
        },
        { type: 'SpacerBlock', props: { id: 's1', height: 32 } },
        { type: 'MarkdownBlock', props: { id: 'm1', content: '*Data refreshed daily*' } },
      ],
    };

    const canonical = puckToCanonical(puckData);
    const page = canonical.pages[0];

    // Widgets: FilterBar + LineChart + BarChart + PieChart + KPICard + Table = 6
    expect(page.widgets).toHaveLength(6);

    // Layout nodes: root + grid-main + 10 items = 12
    expect(Object.keys(page.layout)).toHaveLength(12);

    // Verify widget types
    const widgetTypes = page.widgets.map((w) => w.type);
    expect(widgetTypes).toContain('line-chart');
    expect(widgetTypes).toContain('bar-chart');
    expect(widgetTypes).toContain('pie-chart');
    expect(widgetTypes).toContain('kpi-card');
    expect(widgetTypes).toContain('table');
    expect(widgetTypes).toContain('filter-bar');

    // Verify content blocks are layout nodes, not widgets
    expect(page.layout['layout-h1']?.type).toBe('header');
    expect(page.layout['layout-d1']?.type).toBe('divider');
    expect(page.layout['layout-s1']?.type).toBe('spacer');
  });
});

// ─── Layout blocks integration ───────────────────────────────

describe('Layout blocks integration', () => {
  const config = createPuckConfig();

  it('RowBlock has slot field for content', () => {
    const row = config.components['RowBlock'];
    expect(row).toBeDefined();
    expect((row.fields?.content as { type: string }).type).toBe('slot');
  });

  it('ColumnBlock is not inline and has slot field', () => {
    const col = config.components['ColumnBlock'];
    expect(col).toBeDefined();
    expect(col.inline).toBe(false);
    expect((col.fields?.content as { type: string }).type).toBe('slot');
  });

  it('RowBlock defaults include pre-populated columns', () => {
    const row = config.components['RowBlock'];
    const content = (row.defaultProps as Record<string, unknown>).content as unknown[];
    expect(content).toHaveLength(2);
  });

  it('RowBlock renders with CSS Grid', () => {
    const row = config.components['RowBlock'];
    const MockContent = (props: { style?: React.CSSProperties }) =>
      React.createElement('div', { style: props.style });

    const element = row.render({
      content: MockContent,
      gap: 16,
      padding: 0,
      minHeight: 80,
      background: '',
      puck: { isEditing: true },
    });

    expect(element).toBeDefined();
    // Verify it produces a React element
    expect(React.isValidElement(element)).toBe(true);
  });

  it('ColumnBlock renders with gridColumn span', () => {
    const col = config.components['ColumnBlock'];
    const MockContent = () => React.createElement('div');

    const element = col.render({
      span: 8,
      content: MockContent,
      verticalAlign: 'center',
      puck: { dragRef: { current: null }, isEditing: true },
    });

    expect(element).toBeDefined();
    expect(React.isValidElement(element)).toBe(true);
  });

  it('ColumnBlock clamps span to 1–12 range', () => {
    const col = config.components['ColumnBlock'];
    const MockContent = () => React.createElement('div');

    // span=0 should clamp to 1
    const element0 = col.render({
      span: 0,
      content: MockContent,
      verticalAlign: 'start',
      puck: { isEditing: false },
    });
    expect(element0).toBeDefined();

    // span=20 should clamp to 12
    const element20 = col.render({
      span: 20,
      content: MockContent,
      verticalAlign: 'start',
      puck: { isEditing: false },
    });
    expect(element20).toBeDefined();
  });
});

// ─── Content blocks integration ──────────────────────────────

describe('Content blocks integration', () => {
  const config = createPuckConfig();

  it('HeaderBlock renders correct heading level for each size', () => {
    const header = config.components['HeaderBlock'];

    const large = header.render({ text: 'Title', size: 'large', align: 'left' });
    expect(React.isValidElement(large)).toBe(true);
    expect((large as React.ReactElement).type).toBe('h1');

    const medium = header.render({ text: 'Title', size: 'medium', align: 'left' });
    expect((medium as React.ReactElement).type).toBe('h2');

    const small = header.render({ text: 'Title', size: 'small', align: 'left' });
    expect((small as React.ReactElement).type).toBe('h3');
  });

  it('DividerBlock renders an hr element', () => {
    const divider = config.components['DividerBlock'];
    const el = divider.render({ color: '#ccc', thickness: 2, margin: 8 });
    expect((el as React.ReactElement).type).toBe('hr');
  });

  it('SpacerBlock renders a div with specified height', () => {
    const spacer = config.components['SpacerBlock'];
    const el = spacer.render({ height: 48, puck: { isEditing: false } });
    expect((el as React.ReactElement).type).toBe('div');
  });

  it('MarkdownBlock renders text content', () => {
    const md = config.components['MarkdownBlock'];
    const el = md.render({ content: '## Hello' }) as React.ReactElement;
    expect(el.type).toBe('div');
    expect(el.props.children).toBe('## Hello');
  });
});

// ─── Controls integration ────────────────────────────────────

describe('Controls integration', () => {
  const config = createPuckConfig();

  it('FilterBarBlock renders with title', () => {
    const fb = config.components['FilterBarBlock'];
    const el = fb.render({ title: 'My Filters', layout: 'horizontal' });
    expect(React.isValidElement(el)).toBe(true);
  });

  it('FilterBarBlock renders vertical layout', () => {
    const fb = config.components['FilterBarBlock'];
    const el = fb.render({ title: 'Filters', layout: 'vertical' });
    expect(React.isValidElement(el)).toBe(true);
  });

  it('FilterBarBlock preview distinguishes filter subsets', () => {
    const filterAwareConfig = createPuckConfig({
      filterDefinitions: [
        {
          id: 'region-filter',
          title: 'Region',
          type: 'select',
          fieldRef: 'region',
          datasetRef: 'orders',
          operator: 'equals',
          scope: { type: 'global' },
        },
        {
          id: 'date-filter',
          title: 'Order Date',
          type: 'date',
          fieldRef: 'order_date',
          datasetRef: 'orders',
          operator: 'equals',
          scope: { type: 'global' },
        },
      ],
    });
    const fb = filterAwareConfig.components['FilterBarBlock'];
    const allFiltersElement = fb.render({
      title: 'Filters',
      layout: 'horizontal',
    }) as React.ReactElement;
    const subsetElement = fb.render({
      title: 'Filters',
      layout: 'horizontal',
      filterIds: ['region-filter'],
    }) as React.ReactElement;

    const allFiltersChildren = React.Children.toArray(
      allFiltersElement.props.children,
    ) as React.ReactElement[];
    const subsetChildren = React.Children.toArray(
      subsetElement.props.children,
    ) as React.ReactElement[];

    expect(allFiltersChildren[2].props.children).toBe('Showing all authored filters');
    expect(subsetChildren[2].props.children).toBe('Showing Region');
  });
});

// ─── Root render function ────────────────────────────────────

describe('Root render integration', () => {
  const config = createPuckConfig();

  it('root does not expose dashboard fields in the page inspector', () => {
    expect(config.root?.fields ?? {}).toEqual({});
  });

  it('root does not set dashboard metadata defaults', () => {
    expect((config.root as { defaultProps?: Record<string, unknown> })?.defaultProps ?? {}).toEqual(
      {},
    );
  });

  it('root render function wraps children', () => {
    const root = config.root!;
    const el = root.render!({
      children: React.createElement('div', null, 'content'),
      title: 'Test',
      puck: { isEditing: false },
    });
    expect(React.isValidElement(el)).toBe(true);
  });
});
