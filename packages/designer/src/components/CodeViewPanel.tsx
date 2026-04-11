/**
 * CodeViewPanel — Read-only view of the canonical dashboard schema.
 *
 * Shows the current dashboard definition as JSON or YAML with syntax highlighting
 * via a simple mono-spaced view. Useful for debugging and inspection.
 */
import React, { useState, useMemo, useCallback, useRef } from 'react';
import type { DashboardDefinition } from '@supersubset/schema';
import { serializeToJSON, serializeToYAML } from '@supersubset/schema';

export interface CodeViewPanelProps {
  /** Current dashboard definition */
  dashboard: DashboardDefinition;
  /** Initial format. Default: 'json' */
  defaultFormat?: 'json' | 'yaml';
  /** Panel height. Default: '400px' */
  height?: string | number;
  /** Optional class name */
  className?: string;
}

type Format = 'json' | 'yaml';

export function CodeViewPanel({
  dashboard,
  defaultFormat = 'json',
  height = '400px',
  className,
}: CodeViewPanelProps) {
  const [format, setFormat] = useState<Format>(defaultFormat);
  const [collapsed, setCollapsed] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  const code = useMemo(
    () => (format === 'yaml' ? serializeToYAML(dashboard) : serializeToJSON(dashboard)),
    [dashboard, format]
  );

  const stats = useMemo(() => {
    const page = dashboard.pages?.[0];
    const widgetCount = page?.widgets?.length ?? 0;
    const layoutNodes = page?.layout ? Object.keys(page.layout).length : 0;
    return { widgetCount, layoutNodes, pages: dashboard.pages?.length ?? 0 };
  }, [dashboard]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).catch(() => {
      preRef.current?.focus();
    });
  }, [code]);

  const buttonStyle: React.CSSProperties = {
    padding: '4px 10px',
    borderRadius: 4,
    border: '1px solid #d9d9d9',
    background: '#fff',
    cursor: 'pointer',
    fontSize: 12,
    fontFamily: 'sans-serif',
  };

  const activeButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: '#1677ff',
    color: '#fff',
    border: '1px solid #1677ff',
  };

  return (
    <div
      className={className}
      data-testid="code-view-panel"
      style={{
        border: '1px solid #e0e0e0',
        borderRadius: 8,
        overflow: 'hidden',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: '#fafafa',
          borderBottom: '1px solid #e0e0e0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              padding: 0,
            }}
            data-testid="code-view-toggle"
          >
            {collapsed ? '▶' : '▼'}
          </button>
          <span style={{ fontWeight: 600, fontSize: 13 }}>
            {'</>'} Schema
          </span>
          <span style={{ fontSize: 11, color: '#888' }}>
            {stats.pages}p · {stats.widgetCount}w · {stats.layoutNodes}n
          </span>
        </div>

        {!collapsed && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setFormat('json')}
              style={format === 'json' ? activeButtonStyle : buttonStyle}
              data-testid="code-view-json"
            >
              JSON
            </button>
            <button
              onClick={() => setFormat('yaml')}
              style={format === 'yaml' ? activeButtonStyle : buttonStyle}
              data-testid="code-view-yaml"
            >
              YAML
            </button>
            <button
              onClick={handleCopy}
              style={buttonStyle}
              data-testid="code-view-copy"
            >
              📋
            </button>
          </div>
        )}
      </div>

      {/* Code area */}
      {!collapsed && (
        <pre
          ref={preRef}
          tabIndex={0}
          data-testid="code-view-content"
          style={{
            margin: 0,
            padding: 12,
            fontSize: 12,
            lineHeight: 1.5,
            fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
            background: '#1e1e1e',
            color: '#d4d4d4',
            height: typeof height === 'number' ? `${height}px` : height,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {code}
        </pre>
      )}
    </div>
  );
}
