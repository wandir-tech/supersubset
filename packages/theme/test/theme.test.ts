import { describe, it, expect } from 'vitest';
import {
  DEFAULT_THEME,
  resolveTheme,
  themeToCssVariables,
  themeToEChartsTheme,
  type ResolvedTheme,
} from '../src';

describe('DEFAULT_THEME', () => {
  it('has all required color fields', () => {
    expect(DEFAULT_THEME.colors.primary).toBeDefined();
    expect(DEFAULT_THEME.colors.secondary).toBeDefined();
    expect(DEFAULT_THEME.colors.background).toBeDefined();
    expect(DEFAULT_THEME.colors.surface).toBeDefined();
    expect(DEFAULT_THEME.colors.text).toBeDefined();
    expect(DEFAULT_THEME.colors.success).toBeDefined();
    expect(DEFAULT_THEME.colors.warning).toBeDefined();
    expect(DEFAULT_THEME.colors.danger).toBeDefined();
    expect(DEFAULT_THEME.colors.info).toBeDefined();
    expect(DEFAULT_THEME.colors.border).toBeDefined();
    expect(DEFAULT_THEME.colors.chartPalette.length).toBeGreaterThan(0);
  });

  it('has typography defaults', () => {
    expect(DEFAULT_THEME.typography.fontFamily).toBeDefined();
    expect(DEFAULT_THEME.typography.fontSize).toBe('14px');
  });

  it('has spacing defaults', () => {
    expect(DEFAULT_THEME.spacing.unit).toBe(8);
    expect(DEFAULT_THEME.spacing.gridGap).toBe('16px');
  });
});

describe('resolveTheme', () => {
  it('returns defaults when no inline theme provided', () => {
    const resolved = resolveTheme(null);
    expect(resolved.colors.primary).toBe(DEFAULT_THEME.colors.primary);
    expect(resolved.typography.fontFamily).toBe(DEFAULT_THEME.typography.fontFamily);
  });

  it('merges partial inline theme over defaults', () => {
    const resolved = resolveTheme({
      type: 'inline',
      colors: { primary: '#ff0000', warning: '#f97316' },
    });
    expect(resolved.colors.primary).toBe('#ff0000');
    expect(resolved.colors.warning).toBe('#f97316');
    expect(resolved.colors.secondary).toBe(DEFAULT_THEME.colors.secondary);
  });

  it('overrides typography', () => {
    const resolved = resolveTheme({
      type: 'inline',
      typography: { fontFamily: 'Courier New' },
    });
    expect(resolved.typography.fontFamily).toBe('Courier New');
    expect(resolved.typography.fontSize).toBe(DEFAULT_THEME.typography.fontSize);
  });

  it('preserves custom properties', () => {
    const resolved = resolveTheme({
      type: 'inline',
      custom: { brandLogo: 'logo.png' },
    });
    expect(resolved.custom.brandLogo).toBe('logo.png');
  });
});

describe('themeToCssVariables', () => {
  it('generates CSS variable map from theme', () => {
    const vars = themeToCssVariables(DEFAULT_THEME);
    expect(vars['--ss-color-primary']).toBe(DEFAULT_THEME.colors.primary);
    expect(vars['--ss-color-info']).toBe(DEFAULT_THEME.colors.info);
    expect(vars['--ss-color-border']).toBe(DEFAULT_THEME.colors.border);
    expect(vars['--ss-font-family']).toBe(DEFAULT_THEME.typography.fontFamily);
    expect(vars['--ss-spacing-unit']).toBe('8px');
    expect(vars['--ss-grid-gap']).toBe('16px');
  });

  it('reflects custom theme values in variables', () => {
    const custom = resolveTheme({
      type: 'inline',
      colors: { primary: '#00ff00' },
      spacing: { unit: 4 },
    });
    const vars = themeToCssVariables(custom);
    expect(vars['--ss-color-primary']).toBe('#00ff00');
    expect(vars['--ss-spacing-unit']).toBe('4px');
  });
});

describe('themeToEChartsTheme', () => {
  it('maps chart palette to ECharts color array', () => {
    const echarts = themeToEChartsTheme(DEFAULT_THEME);
    expect(echarts.color).toBe(DEFAULT_THEME.colors.chartPalette);
  });

  it('sets transparent background', () => {
    const echarts = themeToEChartsTheme(DEFAULT_THEME);
    expect(echarts.backgroundColor).toBe('transparent');
  });

  it('passes typography to textStyle', () => {
    const echarts = themeToEChartsTheme(DEFAULT_THEME);
    const textStyle = echarts.textStyle as Record<string, unknown>;
    expect(textStyle.fontFamily).toBe(DEFAULT_THEME.typography.fontFamily);
  });
});
