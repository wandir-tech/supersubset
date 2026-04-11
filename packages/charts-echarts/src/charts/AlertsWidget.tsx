import type { WidgetProps } from '@supersubset/runtime';

type AlertSeverity = 'info' | 'success' | 'warning' | 'danger';

const LAYOUT_STYLES: Record<'stack' | 'wrap' | 'inline', React.CSSProperties> = {
  stack: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  wrap: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
  },
  inline: {
    display: 'flex',
    flexWrap: 'nowrap',
    gap: 12,
    overflowX: 'auto',
    paddingBottom: 4,
  },
};

const FALLBACK_SEVERITY_STYLES: Record<
  AlertSeverity,
  { accent: string; background: string; border: string }
> = {
  info: {
    accent: '#1d4ed8',
    background: 'rgba(29, 78, 216, 0.10)',
    border: 'rgba(29, 78, 216, 0.24)',
  },
  success: {
    accent: '#15803d',
    background: 'rgba(21, 128, 61, 0.10)',
    border: 'rgba(21, 128, 61, 0.24)',
  },
  warning: {
    accent: '#b45309',
    background: 'rgba(180, 83, 9, 0.10)',
    border: 'rgba(180, 83, 9, 0.24)',
  },
  danger: {
    accent: '#b91c1c',
    background: 'rgba(185, 28, 28, 0.10)',
    border: 'rgba(185, 28, 28, 0.24)',
  },
};

export function AlertsWidget({ widgetId, config, data, theme, title }: WidgetProps) {
  const rows = Array.isArray(data) ? data : [];
  const titleField = typeof config.titleField === 'string' ? config.titleField : 'alert_title';
  const messageField = typeof config.messageField === 'string' ? config.messageField : 'alert_message';
  const severityField = typeof config.severityField === 'string' ? config.severityField : 'severity';
  const timestampField = typeof config.timestampField === 'string' ? config.timestampField : 'detected_at';
  const layout = getLayout(config.layout);
  const maxItems = toPositiveInteger(config.maxItems);
  const emptyState = config.emptyState === 'hide' ? 'hide' : 'placeholder';
  const showTimestamp = config.showTimestamp !== false && config.showTimestamp !== 'false';
  const defaultSeverity = isAlertSeverity(config.defaultSeverity) ? config.defaultSeverity : 'info';
  const visibleRows = maxItems ? rows.slice(0, maxItems) : rows;
  const borderColor = getThemeColor(theme, 'border', '#d9d9d9');

  if (visibleRows.length === 0 && emptyState === 'hide') {
    return null;
  }

  return (
    <div
      className="ss-alerts"
      data-testid={`alerts-widget-${widgetId}`}
      style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <strong style={{ color: 'var(--ss-color-text, #0f172a)', fontSize: 16 }}>
          {title ?? 'Alerts'}
        </strong>
        <span style={{ color: 'var(--ss-color-text, #64748b)', fontSize: 12, opacity: 0.7 }}>
          {visibleRows.length}
          {' active'}
        </span>
      </div>

      {visibleRows.length === 0 ? (
        <div
          data-testid={`alerts-widget-empty-${widgetId}`}
          style={{
            border: `1px dashed ${borderColor}`,
            borderRadius: 10,
            padding: 16,
            color: 'var(--ss-color-text, #64748b)',
            opacity: 0.8,
            textAlign: 'center',
          }}
        >
          No alerts are currently firing.
        </div>
      ) : (
        <div style={LAYOUT_STYLES[layout]}>
          {visibleRows.map((row, index) => {
            const severityValue = row[severityField];
            const severity = isAlertSeverity(severityValue) ? severityValue : defaultSeverity;
            const severityStyle = resolveSeverityStyle(theme, severity);
            const alertTitle =
              typeof row[titleField] === 'string' && row[titleField].trim().length > 0
                ? row[titleField]
                : `Alert ${index + 1}`;
            const alertMessage =
              typeof row[messageField] === 'string' && row[messageField].trim().length > 0
                ? row[messageField]
                : 'No alert message available.';
            const timestamp = typeof row[timestampField] === 'string' ? row[timestampField] : '';

            return (
              <article
                key={`${alertTitle}-${index}`}
                data-testid={`alerts-widget-item-${widgetId}-${index}`}
                style={{
                  flex: layout === 'stack' ? '1 1 100%' : '1 1 260px',
                  minWidth: layout === 'inline' ? 260 : undefined,
                  borderRadius: 12,
                  border: `1px solid ${severityStyle.border}`,
                  background: severityStyle.background,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <strong style={{ color: 'var(--ss-color-text, #0f172a)', fontSize: 14 }}>
                      {String(alertTitle)}
                    </strong>
                    <span
                      style={{
                        color: 'var(--ss-color-text, #334155)',
                        fontSize: 12,
                        lineHeight: 1.45,
                        opacity: 0.85,
                      }}
                    >
                      {String(alertMessage)}
                    </span>
                  </div>
                  <span
                    style={{
                      borderRadius: 999,
                      border: `1px solid ${severityStyle.border}`,
                      background: 'var(--ss-color-surface, #ffffff)',
                      color: severityStyle.accent,
                      padding: '3px 8px',
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 0.4,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {severity}
                  </span>
                </div>
                {showTimestamp && timestamp ? (
                  <span style={{ color: 'var(--ss-color-text, #64748b)', fontSize: 11, opacity: 0.7 }}>
                    {timestamp}
                  </span>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getThemeColor(
  theme: Record<string, unknown> | undefined,
  token: AlertSeverity | 'border',
  fallback: string,
): string {
  if (!isRecord(theme)) {
    return fallback;
  }

  const colors = theme.colors;
  if (!isRecord(colors)) {
    return fallback;
  }

  const color = colors[token];
  return typeof color === 'string' && color.trim().length > 0 ? color : fallback;
}

function resolveSeverityStyle(theme: Record<string, unknown> | undefined, severity: AlertSeverity) {
  const fallback = FALLBACK_SEVERITY_STYLES[severity];
  const accent = getThemeColor(theme, severity, fallback.accent);

  return {
    accent,
    background: withAlpha(accent, 0.10) ?? fallback.background,
    border: withAlpha(accent, 0.24) ?? fallback.border,
  };
}

function getLayout(value: unknown): 'stack' | 'wrap' | 'inline' {
  return value === 'wrap' || value === 'inline' ? value : 'stack';
}

function toPositiveInteger(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.floor(parsed);
}

function isAlertSeverity(value: unknown): value is AlertSeverity {
  return value === 'info' || value === 'success' || value === 'warning' || value === 'danger';
}

function withAlpha(color: string, alpha: number): string | null {
  const rgb = hexToRgb(color);
  if (!rgb) {
    return null;
  }

  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function hexToRgb(color: string): { r: number; g: number; b: number } | null {
  const normalized = color.trim().replace('#', '');
  const hex = normalized.length === 3
    ? normalized.split('').map((part) => `${part}${part}`).join('')
    : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return null;
  }

  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}