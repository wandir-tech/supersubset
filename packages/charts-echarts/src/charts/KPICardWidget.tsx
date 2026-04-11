/**
 * KPI card widget — displays a single numeric value with optional comparison.
 * Renders as styled HTML (no ECharts needed for simple KPI).
 */
import type { WidgetProps } from '@supersubset/runtime';
import {
  extractSharedConfig,
  getColorPalette,
  formatNumber as sharedFormatNumber,
} from '../base/shared-options';

export function KPICardWidget({ config, data, title }: WidgetProps) {
  // Extract value from first row
  const valueField = (config.valueField as string) ?? '';
  const comparisonField = config.comparisonField as string | undefined;
  const subtitleField = config.subtitleField as string | undefined;
  const prefix = (config.prefix as string) ?? '';
  const suffix = (config.suffix as string) ?? '';
  const format = config.format as string | undefined;
  const fontSize = (config.fontSize as 'sm' | 'md' | 'lg') ?? 'md';
  const trendDirection = (config.trendDirection as 'up-good' | 'down-good') ?? 'up-good';
  const conditionalColor = config.conditionalColor as Array<{ threshold: number; color: string }> | undefined;
  const shared = extractSharedConfig(config);
  const palette = getColorPalette(shared.colorScheme);
  const accentColor = palette[0] ?? '#1FA8C9';

  const row = data?.[0];
  const value = row?.[valueField];
  const comparison = comparisonField ? row?.[comparisonField] : undefined;
  const subtitle = subtitleField ? row?.[subtitleField] : undefined;

  const fontSizeMap = { sm: '24px', md: '32px', lg: '48px' };
  const valueFontSize = fontSizeMap[fontSize] ?? '32px';

  if (value === undefined || value === null) {
    return (
      <div className="ss-kpi ss-kpi-empty" style={containerStyle}>
        <div style={labelStyle}>{title ?? 'KPI'}</div>
        <div style={{ ...valueStyle, color: '#999', fontSize: valueFontSize }}>—</div>
      </div>
    );
  }

  const formattedValue = formatValue(value, format, prefix, suffix, shared.numberFormat);
  const delta = computeDelta(value, comparison);

  // Determine value color from conditional color thresholds or accent
  let resolvedColor = accentColor;
  if (conditionalColor && typeof value === 'number') {
    for (const { threshold, color } of conditionalColor) {
      if (value >= threshold) resolvedColor = color;
    }
  }

  // Trend color: green/red depends on trendDirection
  const deltaColor = delta !== null
    ? (trendDirection === 'up-good'
      ? (delta >= 0 ? '#52c41a' : '#f5222d')
      : (delta >= 0 ? '#f5222d' : '#52c41a'))
    : undefined;

  return (
    <div className="ss-kpi" style={containerStyle}>
      <div style={labelStyle}>{title ?? 'KPI'}</div>
      <div style={{ ...valueStyle, color: resolvedColor, fontSize: valueFontSize }}>{formattedValue}</div>
      {subtitle !== undefined && (
        <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
          {String(subtitle)}
        </div>
      )}
      {delta !== null && (
        <div
          style={{
            fontSize: '14px',
            color: deltaColor,
            marginTop: '4px',
          }}
        >
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  height: '100%',
};

const labelStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--ss-color-text, #1f1f1f)',
  opacity: 0.65,
  marginBottom: '8px',
  fontWeight: 500,
};

const valueStyle: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: 700,
  color: 'var(--ss-color-text, #1f1f1f)',
  lineHeight: 1.2,
};

function formatValue(value: unknown, format: string | undefined, prefix: string, suffix: string, numberFormat?: string): string {
  let str: string;
  if (typeof value === 'number') {
    // Prefer shared numberFormat if set
    if (numberFormat) {
      str = sharedFormatNumber(value, numberFormat);
      return `${prefix}${str}${suffix}`;
    }
    if (format === 'currency') {
      str = value.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
      return str; // currency format includes prefix
    } else if (format === 'percent') {
      str = (value * 100).toFixed(1) + '%';
      return `${prefix}${str}${suffix}`;
    } else if (format === 'compact') {
      str = compactNumber(value);
    } else {
      str = value.toLocaleString();
    }
  } else {
    str = String(value);
  }
  return `${prefix}${str}${suffix}`;
}

function compactNumber(n: number): string {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}

function computeDelta(current: unknown, previous: unknown): number | null {
  if (typeof current !== 'number' || typeof previous !== 'number' || previous === 0) {
    return null;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}
