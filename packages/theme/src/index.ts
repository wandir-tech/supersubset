/**
 * @supersubset/theme — Theme tokens, defaults, and CSS variable bridge.
 */
import type { InlineThemeDefinition, ThemeColors, ThemeTypography, ThemeSpacing } from '@supersubset/schema';

// ─── Resolved Theme ──────────────────────────────────────────

/**
 * A fully resolved theme with all values populated (no undefined).
 * Created by merging user theme over defaults.
 */
export interface ResolvedTheme {
  colors: Required<
    Pick<
      ThemeColors,
      | 'primary'
      | 'secondary'
      | 'background'
      | 'surface'
      | 'text'
      | 'chartPalette'
      | 'success'
      | 'warning'
      | 'danger'
      | 'info'
      | 'border'
    >
  >;
  typography: Required<Pick<ThemeTypography, 'fontFamily' | 'fontSize' | 'headingFontFamily'>>;
  spacing: Required<Pick<ThemeSpacing, 'unit' | 'widgetPadding' | 'gridGap'>>;
  custom: Record<string, unknown>;
}

// ─── Default Theme ───────────────────────────────────────────

export const DEFAULT_THEME: ResolvedTheme = {
  colors: {
    primary: '#1677ff',
    secondary: '#722ed1',
    background: '#f5f5f5',
    surface: '#ffffff',
    text: '#1f1f1f',
    success: '#15803d',
    warning: '#b45309',
    danger: '#b91c1c',
    info: '#1d4ed8',
    border: '#d9d9d9',
    chartPalette: [
      '#1677ff', '#722ed1', '#13c2c2', '#52c41a',
      '#faad14', '#f5222d', '#eb2f96', '#fa8c16',
    ],
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '14px',
    headingFontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  spacing: {
    unit: 8,
    widgetPadding: '16px',
    gridGap: '16px',
  },
  custom: {},
};

// ─── Theme Resolution ────────────────────────────────────────

/**
 * Merge an inline theme definition over the defaults to produce a fully resolved theme.
 */
export function resolveTheme(inline?: InlineThemeDefinition | null): ResolvedTheme {
  if (!inline) return { ...DEFAULT_THEME };

  return {
    colors: {
      primary: inline.colors?.primary ?? DEFAULT_THEME.colors.primary,
      secondary: inline.colors?.secondary ?? DEFAULT_THEME.colors.secondary,
      background: inline.colors?.background ?? DEFAULT_THEME.colors.background,
      surface: inline.colors?.surface ?? DEFAULT_THEME.colors.surface,
      text: inline.colors?.text ?? DEFAULT_THEME.colors.text,
      success: inline.colors?.success ?? DEFAULT_THEME.colors.success,
      warning: inline.colors?.warning ?? DEFAULT_THEME.colors.warning,
      danger: inline.colors?.danger ?? DEFAULT_THEME.colors.danger,
      info: inline.colors?.info ?? DEFAULT_THEME.colors.info,
      border: inline.colors?.border ?? DEFAULT_THEME.colors.border,
      chartPalette: inline.colors?.chartPalette ?? DEFAULT_THEME.colors.chartPalette,
    },
    typography: {
      fontFamily: inline.typography?.fontFamily ?? DEFAULT_THEME.typography.fontFamily,
      fontSize: inline.typography?.fontSize ?? DEFAULT_THEME.typography.fontSize,
      headingFontFamily: inline.typography?.headingFontFamily ?? DEFAULT_THEME.typography.headingFontFamily,
    },
    spacing: {
      unit: inline.spacing?.unit ?? DEFAULT_THEME.spacing.unit,
      widgetPadding: inline.spacing?.widgetPadding ?? DEFAULT_THEME.spacing.widgetPadding,
      gridGap: inline.spacing?.gridGap ?? DEFAULT_THEME.spacing.gridGap,
    },
    custom: { ...inline.custom },
  };
}

// ─── CSS Variable Bridge ─────────────────────────────────────

/**
 * Convert a ResolvedTheme to CSS custom properties.
 * These can be set on a container element so all children inherit them.
 */
export function themeToCssVariables(theme: ResolvedTheme): Record<string, string> {
  return {
    '--ss-color-primary': theme.colors.primary,
    '--ss-color-secondary': theme.colors.secondary,
    '--ss-color-background': theme.colors.background,
    '--ss-color-surface': theme.colors.surface,
    '--ss-color-text': theme.colors.text,
    '--ss-color-success': theme.colors.success,
    '--ss-color-warning': theme.colors.warning,
    '--ss-color-danger': theme.colors.danger,
    '--ss-color-info': theme.colors.info,
    '--ss-color-border': theme.colors.border,
    '--ss-font-family': theme.typography.fontFamily,
    '--ss-font-size': theme.typography.fontSize,
    '--ss-font-heading': theme.typography.headingFontFamily,
    '--ss-spacing-unit': `${theme.spacing.unit}px`,
    '--ss-widget-padding': theme.spacing.widgetPadding,
    '--ss-grid-gap': theme.spacing.gridGap,
  };
}

// ─── ECharts Theme Bridge ────────────────────────────────────

/**
 * Convert a ResolvedTheme to an ECharts-compatible theme object.
 * Charts package uses this to register with echarts.registerTheme().
 */
export function themeToEChartsTheme(theme: ResolvedTheme): Record<string, unknown> {
  return {
    color: theme.colors.chartPalette,
    backgroundColor: 'transparent',
    textStyle: {
      fontFamily: theme.typography.fontFamily,
      fontSize: parseInt(theme.typography.fontSize, 10) || 14,
      color: theme.colors.text,
    },
    title: {
      textStyle: {
        fontFamily: theme.typography.headingFontFamily,
        color: theme.colors.text,
      },
    },
    legend: {
      textStyle: {
        color: theme.colors.text,
      },
    },
    categoryAxis: {
      axisLine: { lineStyle: { color: '#ccc' } },
      axisLabel: { color: theme.colors.text },
    },
    valueAxis: {
      axisLine: { lineStyle: { color: '#ccc' } },
      axisLabel: { color: theme.colors.text },
      splitLine: { lineStyle: { color: '#f0f0f0' } },
    },
  };
}
