/**
 * Tests for the Puck config and block definitions.
 */
import { describe, it, expect } from 'vitest';
import { createPuckConfig } from '../src/config/puck-config';
import {
  CHART_BLOCK_NAMES,
  PUCK_NAME_TO_WIDGET_TYPE,
  WIDGET_TYPE_TO_PUCK_NAME,
} from '../src/blocks/charts';
import { CONTENT_BLOCK_NAMES } from '../src/blocks/content';
import { CONTROL_BLOCK_NAMES } from '../src/blocks/controls';
import { LAYOUT_BLOCK_NAMES } from '../src/blocks/layout';

describe('createPuckConfig', () => {
  const config = createPuckConfig();
  const totalBlockCount = CHART_BLOCK_NAMES.length + CONTENT_BLOCK_NAMES.length + CONTROL_BLOCK_NAMES.length + LAYOUT_BLOCK_NAMES.length;

  it('returns a valid Puck Config object', () => {
    expect(config).toBeDefined();
    expect(config.components).toBeDefined();
    expect(config.categories).toBeDefined();
    expect(config.root).toBeDefined();
  });

  it('keeps dashboard-level metadata out of the root property panel', () => {
    expect(config.root.fields ?? {}).toEqual({});
  });

  it('registers all chart and data widget components from the charts barrel', () => {
    for (const name of CHART_BLOCK_NAMES) {
      expect(config.components[name]).toBeDefined();
      expect(config.components[name].render).toBeTypeOf('function');
      expect(config.components[name].defaultProps).toBeDefined();
    }
  });

  it('registers all 4 content components', () => {
    for (const name of CONTENT_BLOCK_NAMES) {
      expect(config.components[name]).toBeDefined();
      expect(config.components[name].render).toBeTypeOf('function');
    }
  });

  it('registers all control components', () => {
    for (const name of CONTROL_BLOCK_NAMES) {
      expect(config.components[name]).toBeDefined();
      expect(config.components[name].render).toBeTypeOf('function');
    }
  });

  it('registers all layout components', () => {
    for (const name of LAYOUT_BLOCK_NAMES) {
      expect(config.components[name]).toBeDefined();
      expect(config.components[name].render).toBeTypeOf('function');
    }
  });

  it('has the expected total component count', () => {
    expect(Object.keys(config.components)).toHaveLength(totalBlockCount);
  });

  it('defines five categories', () => {
    expect(config.categories).toBeDefined();
    const cats = config.categories!;
    expect(cats.layout).toBeDefined();
    expect(cats.charts).toBeDefined();
    expect(cats.tables).toBeDefined();
    expect(cats.content).toBeDefined();
    expect(cats.controls).toBeDefined();
  });

  it('layout category contains RowBlock and ColumnBlock', () => {
    expect(config.categories!.layout!.components).toEqual(['RowBlock', 'ColumnBlock']);
  });

  it('charts category contains 14 components', () => {
    expect(config.categories!.charts!.components).toHaveLength(14);
  });

  it('tables category contains Table, KPICard, and AlertsWidgetBlock', () => {
    expect(config.categories!.tables!.components).toEqual(['Table', 'KPICard', 'AlertsWidgetBlock']);
  });

  it('every chart component has a title field', () => {
    for (const name of CHART_BLOCK_NAMES) {
      const comp = config.components[name];
      expect(comp.fields?.title).toBeDefined();
    }
  });
});

describe('Block name mappings', () => {
  it('PUCK_NAME_TO_WIDGET_TYPE covers all chart block names', () => {
    for (const name of CHART_BLOCK_NAMES) {
      expect(PUCK_NAME_TO_WIDGET_TYPE[name]).toBeDefined();
    }
  });

  it('WIDGET_TYPE_TO_PUCK_NAME is the reverse of PUCK_NAME_TO_WIDGET_TYPE', () => {
    for (const [puckName, widgetType] of Object.entries(PUCK_NAME_TO_WIDGET_TYPE)) {
      expect(WIDGET_TYPE_TO_PUCK_NAME[widgetType]).toBe(puckName);
    }
  });

  it('has a widget type mapping for every charts-barrel block', () => {
    expect(Object.keys(PUCK_NAME_TO_WIDGET_TYPE)).toHaveLength(CHART_BLOCK_NAMES.length);
  });
});
