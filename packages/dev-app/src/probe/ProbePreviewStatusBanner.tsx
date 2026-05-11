import type { ReactElement } from 'react';

import type { PreviewStatus } from './probe-workspace-types';

const PREVIEW_STATUS_STYLES: Record<
  PreviewStatus['kind'],
  { background: string; border: string; color: string; label: string }
> = {
  idle: {
    background: '#f1f5f9',
    border: '#cbd5e1',
    color: '#475569',
    label: 'Idle',
  },
  loading: {
    background: '#eff6ff',
    border: '#bfdbfe',
    color: '#1d4ed8',
    label: 'Loading…',
  },
  success: {
    background: '#dcfce7',
    border: '#86efac',
    color: '#14532d',
    label: 'Live data',
  },
  empty: {
    background: '#fef3c7',
    border: '#fde68a',
    color: '#92400e',
    label: 'Empty result (falling back to sample data)',
  },
  error: {
    background: '#fef2f2',
    border: '#fecaca',
    color: '#991b1b',
    label: 'Failed (falling back to sample data)',
  },
};

export interface ProbePreviewStatusBannerProps {
  status: PreviewStatus;
  fallbackUrl: string;
}

export function ProbePreviewStatusBanner({
  status,
  fallbackUrl,
}: ProbePreviewStatusBannerProps): ReactElement | null {
  if (status.kind === 'idle' && !status.url) {
    return null;
  }

  const style = PREVIEW_STATUS_STYLES[status.kind];
  const url = status.url ?? fallbackUrl;

  return (
    <div
      data-testid="probe-preview-query-status"
      style={{
        marginBottom: 12,
        borderRadius: 8,
        border: `1px solid ${style.border}`,
        background: style.background,
        color: style.color,
        padding: '8px 12px',
        fontSize: 12,
        lineHeight: 1.5,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <span style={{ fontWeight: 700 }}>Last preview query: {style.label}</span>
      {status.datasetRef ? (
        <code style={{ background: 'rgba(0,0,0,0.05)', padding: '1px 6px', borderRadius: 4 }}>
          {status.datasetRef}
        </code>
      ) : null}
      {typeof status.rowCount === 'number' ? (
        <span>
          {status.rowCount} row{status.rowCount === 1 ? '' : 's'}
        </span>
      ) : null}
      {url ? (
        <span style={{ opacity: 0.85 }}>
          POST <code>{url}</code>
        </span>
      ) : null}
      {status.fieldBindings ? (
        <span style={{ flexBasis: '100%', fontSize: 11, opacity: 0.9 }}>
          Bindings: <code>{status.fieldBindings}</code>
        </span>
      ) : null}
      {status.errorMessage ? (
        <span style={{ flexBasis: '100%', fontFamily: 'ui-monospace, Menlo, monospace' }}>
          {status.errorMessage}
        </span>
      ) : null}
      {status.requestBody ? (
        <details
          style={{
            flexBasis: '100%',
            marginTop: 4,
            fontFamily: 'ui-monospace, Menlo, monospace',
            fontSize: 11,
          }}
        >
          <summary
            style={{
              cursor: 'pointer',
              userSelect: 'none',
              fontFamily: 'sans-serif',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Request body (click to expand)
          </summary>
          <pre
            style={{
              margin: '6px 0 0',
              padding: 10,
              background: 'rgba(15, 23, 42, 0.05)',
              borderRadius: 6,
              overflow: 'auto',
              maxHeight: 220,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {status.requestBody}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
