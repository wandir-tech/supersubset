/**
 * Tests for shared chart option builders (Phase 2.A.1).
 * Verifies color palettes, legend, tooltip, grid, axis, zoom, labels, and number formatting.
 */
import { describe, it, expect } from 'vitest';
import {
  extractSharedConfig,
  buildColorOption,
  buildTitleOption,
  buildLegendOption,
  buildTooltipOption,
  buildGridOption,
  buildCategoryAxisOption,
  buildValueAxisOption,
  buildDataZoomOption,
  buildLabelOption,
  getColorPalette,
  getAvailablePalettes,
  formatNumber,
} from '../src/base/shared-options';

describe('shared-options', () => {
  // ─── extractSharedConfig ──────────────────────────────────

  describe('extractSharedConfig', () => {
    it('extracts all known keys from config record', () => {
      const config: Record<string, unknown> = {
        colorScheme: 'tableau10',
        showLegend: true,
        legendPosition: 'bottom',
        legendType: 'scroll',
        showValues: true,
        numberFormat: ',.2f',
        tooltipTrigger: 'item',
        xAxisTitle: 'Month',
        yAxisTitle: 'Revenue',
        xAxisLabelRotate: 45,
        yAxisMin: 0,
        yAxisMax: 1000,
        logAxis: true,
        zoomable: true,
      };

      const shared = extractSharedConfig(config);
      expect(shared.colorScheme).toBe('tableau10');
      expect(shared.showLegend).toBe(true);
      expect(shared.legendPosition).toBe('bottom');
      expect(shared.legendType).toBe('scroll');
      expect(shared.showValues).toBe(true);
      expect(shared.numberFormat).toBe(',.2f');
      expect(shared.tooltipTrigger).toBe('item');
      expect(shared.xAxisTitle).toBe('Month');
      expect(shared.yAxisTitle).toBe('Revenue');
      expect(shared.xAxisLabelRotate).toBe(45);
      expect(shared.yAxisMin).toBe(0);
      expect(shared.yAxisMax).toBe(1000);
      expect(shared.logAxis).toBe(true);
      expect(shared.zoomable).toBe(true);
    });

    it('returns undefined for missing keys', () => {
      const shared = extractSharedConfig({});
      expect(shared.colorScheme).toBeUndefined();
      expect(shared.showLegend).toBeUndefined();
      expect(shared.zoomable).toBeUndefined();
    });
  });

  // ─── Color Palettes ────────────────────────────────────────

  describe('getColorPalette / buildColorOption', () => {
    it('returns supersetColors as default', () => {
      const colors = getColorPalette();
      expect(colors).toHaveLength(10);
      expect(colors[0]).toBe('#1FA8C9');
    });

    it('returns named palette', () => {
      expect(getColorPalette('tableau10')[0]).toBe('#4E79A7');
      expect(getColorPalette('d3Category10')[0]).toBe('#1f77b4');
      expect(getColorPalette('pastel')[0]).toBe('#AEC7E8');
    });

    it('falls back to default for unknown palette name', () => {
      const colors = getColorPalette('nonexistent');
      expect(colors[0]).toBe('#1FA8C9');
    });

    it('buildColorOption uses shared config', () => {
      const colors = buildColorOption({ colorScheme: 'warm' });
      expect(colors[0]).toBe('#FE4A49');
    });

    it('getAvailablePalettes lists all palettes', () => {
      const palettes = getAvailablePalettes();
      expect(palettes).toContain('supersetColors');
      expect(palettes).toContain('tableau10');
      expect(palettes).toContain('d3Category10');
      expect(palettes).toContain('pastel');
      expect(palettes).toContain('dark');
      expect(palettes).toContain('warm');
      expect(palettes).toContain('cool');
      expect(palettes).toContain('google10');
      expect(palettes.length).toBe(8);
    });
  });

  // ─── Legend ────────────────────────────────────────────────

  describe('buildLegendOption', () => {
    it('returns undefined when showLegend is false', () => {
      expect(buildLegendOption({ showLegend: false })).toBeUndefined();
    });

    it('auto-shows when multiple series', () => {
      const legend = buildLegendOption({}, ['a', 'b']);
      expect(legend).toBeDefined();
      expect(legend!.show).toBe(true);
      expect(legend!.data).toEqual(['a', 'b']);
    });

    it('auto-hides when single series', () => {
      const legend = buildLegendOption({}, ['a']);
      expect(legend).toBeUndefined();
    });

    it('forces show when showLegend=true even for single series', () => {
      const legend = buildLegendOption({ showLegend: true }, ['a']);
      expect(legend).toBeDefined();
      expect(legend!.show).toBe(true);
    });

    it('positions at top by default', () => {
      const legend = buildLegendOption({ showLegend: true });
      expect(legend!.top).toBe(0);
      expect(legend!.left).toBe('center');
      expect(legend!.orient).toBe('horizontal');
    });

    it('offsets top legend when a title is present', () => {
      const legend = buildLegendOption({ showLegend: true }, ['a', 'b'], true);
      expect(legend!.top).toBe(28);
    });

    it('positions at bottom', () => {
      const legend = buildLegendOption({ showLegend: true, legendPosition: 'bottom' });
      expect(legend!.bottom).toBe(0);
      expect(legend!.orient).toBe('horizontal');
    });

    it('positions at left with vertical orient', () => {
      const legend = buildLegendOption({ showLegend: true, legendPosition: 'left' });
      expect(legend!.left).toBe('left');
      expect(legend!.orient).toBe('vertical');
    });

    it('positions at right with vertical orient', () => {
      const legend = buildLegendOption({ showLegend: true, legendPosition: 'right' });
      expect(legend!.right).toBe(0);
      expect(legend!.orient).toBe('vertical');
    });

    it('uses scroll type when specified', () => {
      const legend = buildLegendOption({ showLegend: true, legendType: 'scroll' });
      expect(legend!.type).toBe('scroll');
    });
  });

  // ─── Tooltip ───────────────────────────────────────────────

  describe('buildTooltipOption', () => {
    it('uses default trigger axis', () => {
      expect(buildTooltipOption({})).toEqual({ trigger: 'axis' });
    });

    it('uses default trigger item when specified', () => {
      expect(buildTooltipOption({}, 'item')).toEqual({ trigger: 'item' });
    });

    it('overrides default with shared config', () => {
      expect(buildTooltipOption({ tooltipTrigger: 'item' }, 'axis')).toEqual({ trigger: 'item' });
    });

    it('hides tooltip when trigger is none', () => {
      expect(buildTooltipOption({ tooltipTrigger: 'none' })).toEqual({ show: false });
    });
  });

  // ─── Grid ──────────────────────────────────────────────────

  describe('buildGridOption', () => {
    it('returns default grid', () => {
      const grid = buildGridOption({});
      expect(grid.containLabel).toBe(true);
      expect(grid.left).toBe('3%');
    });

    it('adds top padding for legend at top', () => {
      const grid = buildGridOption({ legendPosition: 'top' }, { hasLegend: true });
      expect(grid.top).toBe(40);
    });

    it('adds title padding when a title is present without a legend', () => {
      const grid = buildGridOption({}, { hasTitle: true, hasLegend: false });
      expect(grid.top).toBe(36);
    });

    it('adds extra top padding when title and legend are both present', () => {
      const grid = buildGridOption({ legendPosition: 'top' }, { hasTitle: true, hasLegend: true });
      expect(grid.top).toBe(68);
    });

    it('adds bottom padding for legend at bottom', () => {
      const grid = buildGridOption({ legendPosition: 'bottom' });
      expect(grid.bottom).toBe(40);
    });

    it('adds extra bottom space for data zoom', () => {
      const grid = buildGridOption({ zoomable: true });
      expect(grid.bottom).toBe('12%');
    });

    it('adds right-side space for y-axis zoom controls', () => {
      const grid = buildGridOption({ zoomable: true }, { zoomAxis: 'y' });
      expect(grid.right).toBe('12%');
      expect(grid.bottom).toBe('3%');
    });

    it('suppresses legend padding when legend hidden', () => {
      const grid = buildGridOption({ showLegend: false });
      expect(grid.top).toBeUndefined();
    });
  });

  describe('buildTitleOption', () => {
    it('anchors the title at the top center', () => {
      const title = buildTitleOption('Revenue Trend');
      expect(title).toMatchObject({ text: 'Revenue Trend', left: 'center', top: 0 });
    });
  });
  // ─── Category Axis ─────────────────────────────────────────

  describe('buildCategoryAxisOption', () => {
    it('builds basic category axis', () => {
      const axis = buildCategoryAxisOption({}, ['Jan', 'Feb']);
      expect(axis.type).toBe('category');
      expect(axis.data).toEqual(['Jan', 'Feb']);
    });

    it('adds axis title', () => {
      const axis = buildCategoryAxisOption({ xAxisTitle: 'Month' }, ['Jan']);
      expect(axis.name).toBe('Month');
      expect(axis.nameLocation).toBe('middle');
      expect(axis.nameGap).toBe(32);
    });

    it('adds label rotation for x-axis', () => {
      const axis = buildCategoryAxisOption({ xAxisLabelRotate: 45 }, ['Jan']);
      expect((axis.axisLabel as Record<string, unknown>)?.rotate).toBe(45);
    });

    it('does not add rotation for y-axis', () => {
      const axis = buildCategoryAxisOption({ xAxisLabelRotate: 45 }, ['A'], 'y');
      expect(axis.axisLabel).toBeUndefined();
    });

    it('uses yAxisTitle when axis=y', () => {
      const axis = buildCategoryAxisOption({ yAxisTitle: 'Category' }, ['A'], 'y');
      expect(axis.name).toBe('Category');
      expect(axis.nameLocation).toBe('middle');
      expect(axis.nameGap).toBe(48);
    });
  });

  // ─── Value Axis ────────────────────────────────────────────

  describe('buildValueAxisOption', () => {
    it('builds basic value axis', () => {
      const axis = buildValueAxisOption({});
      expect(axis.type).toBe('value');
    });

    it('uses log type when logAxis is true', () => {
      const axis = buildValueAxisOption({ logAxis: true }, 'y');
      expect(axis.type).toBe('log');
    });

    it('does not use log for x-axis', () => {
      const axis = buildValueAxisOption({ logAxis: true }, 'x');
      expect(axis.type).toBe('value');
    });

    it('sets min/max bounds', () => {
      const axis = buildValueAxisOption({ yAxisMin: 0, yAxisMax: 100 }, 'y');
      expect(axis.min).toBe(0);
      expect(axis.max).toBe(100);
    });

    it('adds axis title', () => {
      const axis = buildValueAxisOption({ yAxisTitle: 'Revenue' }, 'y');
      expect(axis.name).toBe('Revenue');
      expect(axis.nameLocation).toBe('middle');
      expect(axis.nameGap).toBe(48);
    });

    it('uses centered x-axis titles for horizontal value axes', () => {
      const axis = buildValueAxisOption({ xAxisTitle: 'Revenue' }, 'x');
      expect(axis.name).toBe('Revenue');
      expect(axis.nameLocation).toBe('middle');
      expect(axis.nameGap).toBe(32);
    });

    it('adds number format to axis labels', () => {
      const axis = buildValueAxisOption({ numberFormat: ',.0f' }, 'y');
      expect(axis.axisLabel).toBeDefined();
      const formatter = (axis.axisLabel as { formatter: (v: number) => string }).formatter;
      expect(formatter(1234)).toBe('1,234');
    });
  });

  // ─── Data Zoom ─────────────────────────────────────────────

  describe('buildDataZoomOption', () => {
    it('returns undefined when not zoomable', () => {
      expect(buildDataZoomOption({})).toBeUndefined();
      expect(buildDataZoomOption({ zoomable: false })).toBeUndefined();
    });

    it('returns slider + inside zoom when zoomable', () => {
      const zoom = buildDataZoomOption({ zoomable: true });
      expect(zoom).toHaveLength(2);
      expect(zoom![0].type).toBe('slider');
      expect(zoom![0].xAxisIndex).toBe(0);
      expect(zoom![1].type).toBe('inside');
      expect(zoom![1].xAxisIndex).toBe(0);
    });

    it('targets the category y-axis for horizontal charts', () => {
      const zoom = buildDataZoomOption({ zoomable: true }, 'y');
      expect(zoom).toHaveLength(2);
      expect(zoom![0]).toMatchObject({ type: 'slider', yAxisIndex: 0, orient: 'vertical' });
      expect(zoom![1]).toMatchObject({ type: 'inside', yAxisIndex: 0, orient: 'vertical' });
    });
  });

  // ─── Label Option ──────────────────────────────────────────

  describe('buildLabelOption', () => {
    it('returns undefined when showValues is false or missing', () => {
      expect(buildLabelOption({})).toBeUndefined();
      expect(buildLabelOption({ showValues: false })).toBeUndefined();
    });

    it('returns label config when showValues is true', () => {
      const label = buildLabelOption({ showValues: true });
      expect(label).toBeDefined();
      expect(label!.show).toBe(true);
      expect(label!.position).toBe('top');
    });

    it('applies number format to label formatter', () => {
      const label = buildLabelOption({ showValues: true, numberFormat: '$,.0f' });
      expect(label!.formatter).toBeDefined();
      const formatter = label!.formatter as (params: { value: unknown }) => string;
      expect(formatter({ value: 1234 })).toBe('$1,234');
    });
  });

  // ─── Number Formatting ─────────────────────────────────────

  describe('formatNumber', () => {
    it('returns toString for empty format', () => {
      expect(formatNumber(123, '')).toBe('123');
    });

    it('formats fixed decimals', () => {
      expect(formatNumber(1234.567, '.2f')).toBe('1234.57');
      expect(formatNumber(1234, '.0f')).toBe('1234');
    });

    it('formats with comma separator', () => {
      expect(formatNumber(1234567, ',.0f')).toBe('1,234,567');
      expect(formatNumber(1234.56, ',.2f')).toBe('1,234.56');
    });

    it('formats with dollar prefix', () => {
      expect(formatNumber(1234, '$,.0f')).toBe('$1,234');
      expect(formatNumber(1234.5, '$,.2f')).toBe('$1,234.50');
    });

    it('formats as percentage', () => {
      expect(formatNumber(0.1234, '.1%')).toBe('12.3%');
      expect(formatNumber(0.5678, '.2%')).toBe('56.78%');
    });

    it('formats with SI suffix', () => {
      expect(formatNumber(1234, '.1s')).toBe('1.2K');
      expect(formatNumber(1234567, '.2s')).toBe('1.23M');
      expect(formatNumber(1234567890, '.1s')).toBe('1.2B');
    });

    it('handles negative numbers', () => {
      expect(formatNumber(-1234, ',.0f')).toBe('-1,234');
      expect(formatNumber(-1234, '.1s')).toBe('-1.2K');
    });

    it('handles zero', () => {
      expect(formatNumber(0, ',.2f')).toBe('0.00');
      expect(formatNumber(0, '.1%')).toBe('0.0%');
    });

    it('returns toString for unrecognized format', () => {
      expect(formatNumber(123, 'xyz')).toBe('123');
    });
  });
});
