/**
 * SlideOverPanel — Right-anchored drawer overlay for dashboard-level config panels.
 * Used for Filters and Interactions configuration in the designer.
 */
import React, { useEffect, useRef, useCallback } from 'react';

export interface SlideOverPanelProps {
  /** Whether the panel is open */
  open: boolean;
  /** Called when the panel should close */
  onClose: () => void;
  /** Panel title shown in the header */
  title: string;
  /** Optional subtitle / description */
  subtitle?: string;
  /** Width of the panel. Default: 400 */
  width?: number;
  /** Panel contents */
  children: React.ReactNode;
}

const BACKDROP_STYLE: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  background: 'rgba(0, 0, 0, 0.2)',
  display: 'flex',
  justifyContent: 'flex-end',
};

const PANEL_STYLE: React.CSSProperties = {
  height: '100%',
  background: '#fff',
  boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.12)',
  display: 'flex',
  flexDirection: 'column',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  overflow: 'hidden',
};

const HEADER_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 20px',
  borderBottom: '1px solid #e5e7eb',
  flexShrink: 0,
};

const TITLE_STYLE: React.CSSProperties = {
  margin: 0,
  fontSize: '16px',
  fontWeight: 600,
  color: '#1f2937',
};

const SUBTITLE_STYLE: React.CSSProperties = {
  margin: '2px 0 0',
  fontSize: '12px',
  color: '#6b7280',
};

const CLOSE_STYLE: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '4px 8px',
  cursor: 'pointer',
  fontSize: '18px',
  color: '#6b7280',
  borderRadius: '4px',
  lineHeight: 1,
};

const BODY_STYLE: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '16px 20px',
};

const FOOTER_STYLE: React.CSSProperties = {
  padding: '12px 20px',
  borderTop: '1px solid #e5e7eb',
  display: 'flex',
  justifyContent: 'flex-end',
  flexShrink: 0,
};

const DONE_BUTTON_STYLE: React.CSSProperties = {
  padding: '8px 24px',
  borderRadius: '6px',
  border: 'none',
  background: '#3b82f6',
  color: '#fff',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
};

export function SlideOverPanel({
  open,
  onClose,
  title,
  subtitle,
  width = 400,
  children,
}: SlideOverPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  return React.createElement(
    'div',
    {
      className: 'ss-slide-over-backdrop',
      style: BACKDROP_STYLE,
      onClick: (e: React.MouseEvent) => {
        // Close when clicking backdrop (not panel)
        if (e.target === e.currentTarget) onClose();
      },
      'data-testid': 'slide-over-backdrop',
    },
    React.createElement(
      'div',
      {
        ref: panelRef,
        className: 'ss-slide-over-panel',
        style: { ...PANEL_STYLE, width },
        'data-testid': 'slide-over-panel',
      },
      // Header
      React.createElement(
        'div',
        { style: HEADER_STYLE },
        React.createElement(
          'div',
          null,
          React.createElement('h2', { style: TITLE_STYLE }, title),
          subtitle ? React.createElement('p', { style: SUBTITLE_STYLE }, subtitle) : null,
        ),
        React.createElement(
          'button',
          {
            onClick: onClose,
            style: CLOSE_STYLE,
            'aria-label': 'Close panel',
            'data-testid': 'slide-over-close',
          },
          '✕',
        ),
      ),
      // Body
      React.createElement('div', { style: BODY_STYLE }, children),
      // Footer
      React.createElement(
        'div',
        { style: FOOTER_STYLE },
        React.createElement(
          'button',
          {
            onClick: onClose,
            style: DONE_BUTTON_STYLE,
            'data-testid': 'slide-over-done',
          },
          'Done',
        ),
      ),
    ),
  );
}
