/**
 * LivePreviewPane — Renders dashboard in real-time using the runtime.
 *
 * Takes the current canonical dashboard definition and renders it using
 * SupersubsetRenderer. Updates whenever the definition changes.
 */
import React, { useMemo, useState, useCallback } from 'react';
import type { DashboardDefinition } from '@supersubset/schema';

export interface LivePreviewPaneProps {
  /** Current dashboard definition */
  dashboard: DashboardDefinition;
  /** Widget registry instance */
  registry: unknown; // WidgetRegistry from @supersubset/runtime
  /** Resolved theme object */
  theme?: Record<string, unknown>;
  /** CSS variables from theme */
  cssVariables?: Record<string, string>;
  /** Renderer component — passed in to avoid hard dep on runtime */
  RendererComponent: React.ComponentType<{
    definition: DashboardDefinition;
    registry: unknown;
    theme?: Record<string, unknown>;
    cssVariables?: Record<string, string>;
    activePage?: string;
  }>;
  /** Height of the preview pane. Default: '100%' */
  height?: string | number;
  /** Optional class name */
  className?: string;
}

type ViewportPreset = 'desktop' | 'tablet' | 'mobile' | 'auto';

const VIEWPORT_WIDTHS: Record<ViewportPreset, string> = {
  auto: '100%',
  desktop: '1280px',
  tablet: '768px',
  mobile: '375px',
};

export function LivePreviewPane({
  dashboard,
  registry,
  theme,
  cssVariables,
  RendererComponent,
  height = '100%',
  className,
}: LivePreviewPaneProps) {
  const [viewport, setViewport] = useState<ViewportPreset>('auto');
  const [activePage, setActivePage] = useState(
    dashboard.pages?.[0]?.id ?? ''
  );

  const pages = useMemo(() => dashboard.pages ?? [], [dashboard]);

  const handleViewport = useCallback((v: ViewportPreset) => setViewport(v), []);

  const buttonStyle: React.CSSProperties = {
    padding: '4px 10px',
    borderRadius: 4,
    border: '1px solid #d9d9d9',
    background: '#fff',
    cursor: 'pointer',
    fontSize: 12,
    fontFamily: 'sans-serif',
  };

  const activeStyle = (v: ViewportPreset): React.CSSProperties => ({
    ...buttonStyle,
    background: viewport === v ? '#1677ff' : '#fff',
    color: viewport === v ? '#fff' : '#333',
    border: viewport === v ? '1px solid #1677ff' : '1px solid #d9d9d9',
  });

  return (
    <div
      className={className}
      data-testid="live-preview-pane"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: typeof height === 'number' ? `${height}px` : height,
        border: '1px solid #e0e0e0',
        borderRadius: 8,
        overflow: 'hidden',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: '#fafafa',
          borderBottom: '1px solid #e0e0e0',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 13 }}>
          👁 Preview
        </span>

        {/* Viewport buttons */}
        <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
          <button
            onClick={() => handleViewport('auto')}
            style={activeStyle('auto')}
            data-testid="viewport-auto"
          >
            Auto
          </button>
          <button
            onClick={() => handleViewport('desktop')}
            style={activeStyle('desktop')}
            data-testid="viewport-desktop"
          >
            🖥
          </button>
          <button
            onClick={() => handleViewport('tablet')}
            style={activeStyle('tablet')}
            data-testid="viewport-tablet"
          >
            📱
          </button>
          <button
            onClick={() => handleViewport('mobile')}
            style={activeStyle('mobile')}
            data-testid="viewport-mobile"
          >
            📲
          </button>
        </div>

        {/* Page tabs */}
        {pages.length > 1 && (
          <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
            {pages.map((page) => (
              <button
                key={page.id}
                onClick={() => setActivePage(page.id)}
                style={{
                  ...buttonStyle,
                  fontWeight: activePage === page.id ? 700 : 400,
                  background: activePage === page.id ? '#e6f7ff' : '#fff',
                }}
              >
                {page.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Preview area */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          background: '#f5f5f5',
          display: 'flex',
          justifyContent: 'center',
          padding: viewport !== 'auto' ? 16 : 0,
        }}
      >
        <div
          style={{
            width: VIEWPORT_WIDTHS[viewport],
            maxWidth: '100%',
            background: '#fff',
            boxShadow:
              viewport !== 'auto'
                ? '0 2px 12px rgba(0,0,0,0.1)'
                : 'none',
            transition: 'width 300ms ease',
            overflow: 'auto',
          }}
          data-testid="preview-viewport"
          data-viewport={viewport}
        >
          <RendererComponent
            definition={dashboard}
            registry={registry}
            theme={theme}
            cssVariables={cssVariables}
            activePage={activePage}
          />
        </div>
      </div>
    </div>
  );
}
