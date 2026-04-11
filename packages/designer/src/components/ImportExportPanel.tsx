/**
 * ImportExportPanel — Import/Export dashboard as JSON or YAML.
 *
 * Renders inline buttons + modal dialog for import/export operations.
 * Uses @supersubset/schema serializers for format handling.
 */
import React, { useState, useCallback, useRef } from 'react';
import type { DashboardDefinition } from '@supersubset/schema';
import {
  serializeToJSON,
  parseFromJSON,
  serializeToYAML,
  parseFromYAML,
} from '@supersubset/schema';

export interface ImportExportPanelProps {
  /** Current dashboard definition to export */
  dashboard: DashboardDefinition;
  /** Called when a dashboard is imported */
  onImport: (dashboard: DashboardDefinition) => void;
  /** Optional class name */
  className?: string;
}

type Format = 'json' | 'yaml';
type DialogMode = 'export' | 'import' | null;

export function ImportExportPanel({
  dashboard,
  onImport,
  className,
}: ImportExportPanelProps) {
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [format, setFormat] = useState<Format>('json');
  const [importText, setImportText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const serialize = useCallback(
    (fmt: Format) =>
      fmt === 'yaml' ? serializeToYAML(dashboard) : serializeToJSON(dashboard),
    [dashboard]
  );

  const handleExport = useCallback(() => {
    setError(null);
    setDialogMode('export');
  }, []);

  const handleImportOpen = useCallback(() => {
    setError(null);
    setImportText('');
    setDialogMode('import');
  }, []);

  const handleClose = useCallback(() => {
    setDialogMode(null);
    setError(null);
    setImportText('');
  }, []);

  const handleCopy = useCallback(() => {
    const text = serialize(format);
    navigator.clipboard.writeText(text).catch(() => {
      // Fallback: select textarea text
      textareaRef.current?.select();
    });
  }, [serialize, format]);

  const handleDownload = useCallback(() => {
    const text = serialize(format);
    const ext = format === 'yaml' ? 'yaml' : 'json';
    const mime = format === 'yaml' ? 'text/yaml' : 'application/json';
    const filename = `${dashboard.title || 'dashboard'}.${ext}`;
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [serialize, format, dashboard.title]);

  const handleImportSubmit = useCallback(() => {
    setError(null);
    try {
      const parsed =
        format === 'yaml'
          ? parseFromYAML(importText)
          : parseFromJSON(importText);
      onImport(parsed);
      handleClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Invalid ${format.toUpperCase()}: ${msg}`);
    }
  }, [importText, format, onImport, handleClose]);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        setImportText(text);
        // Auto-detect format
        if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
          setFormat('yaml');
        } else {
          setFormat('json');
        }
      };
      reader.readAsText(file);
      // Reset input so same file can be re-uploaded
      e.target.value = '';
    },
    []
  );

  const buttonStyle: React.CSSProperties = {
    padding: '6px 12px',
    borderRadius: 4,
    border: '1px solid #d9d9d9',
    background: '#fff',
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: 'sans-serif',
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: '#1677ff',
    color: '#fff',
    border: '1px solid #1677ff',
  };

  return (
    <>
      <div className={className} style={{ display: 'inline-flex', gap: 8 }}>
        <button
          onClick={handleExport}
          style={buttonStyle}
          data-testid="export-btn"
        >
          📤 Export
        </button>
        <button
          onClick={handleImportOpen}
          style={buttonStyle}
          data-testid="import-btn"
        >
          📥 Import
        </button>
      </div>

      {dialogMode && (
        <div
          data-testid="import-export-dialog"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            fontFamily: 'sans-serif',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: 24,
              width: '90vw',
              maxWidth: 640,
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 style={{ margin: 0, fontSize: 16 }}>
                {dialogMode === 'export'
                  ? '📤 Export Dashboard'
                  : '📥 Import Dashboard'}
              </h3>
              <button
                onClick={handleClose}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 18,
                  cursor: 'pointer',
                  color: '#999',
                }}
                data-testid="dialog-close"
              >
                ✕
              </button>
            </div>

            {/* Format toggle */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setFormat('json')}
                style={format === 'json' ? primaryButtonStyle : buttonStyle}
                data-testid="format-json"
              >
                JSON
              </button>
              <button
                onClick={() => setFormat('yaml')}
                style={format === 'yaml' ? primaryButtonStyle : buttonStyle}
                data-testid="format-yaml"
              >
                YAML
              </button>
            </div>

            {dialogMode === 'export' ? (
              <>
                <textarea
                  ref={textareaRef}
                  id="ss-export-textarea"
                  name="exportDashboard"
                  aria-label="Export dashboard payload"
                  readOnly
                  value={serialize(format)}
                  style={{
                    flex: 1,
                    minHeight: 300,
                    fontFamily: 'monospace',
                    fontSize: 12,
                    padding: 12,
                    borderRadius: 4,
                    border: '1px solid #d9d9d9',
                    resize: 'vertical',
                  }}
                  data-testid="export-textarea"
                />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleCopy}
                    style={buttonStyle}
                    data-testid="copy-btn"
                  >
                    📋 Copy
                  </button>
                  <button
                    onClick={handleDownload}
                    style={primaryButtonStyle}
                    data-testid="download-btn"
                  >
                    ⬇ Download
                  </button>
                </div>
              </>
            ) : (
              <>
                <textarea
                  id="ss-import-textarea"
                  name="importDashboard"
                  aria-label="Import dashboard payload"
                  value={importText}
                  onChange={(e) => {
                    setImportText(e.target.value);
                    setError(null);
                  }}
                  placeholder={`Paste ${format.toUpperCase()} here or upload a file...`}
                  style={{
                    flex: 1,
                    minHeight: 300,
                    fontFamily: 'monospace',
                    fontSize: 12,
                    padding: 12,
                    borderRadius: 4,
                    border: `1px solid ${error ? '#ff4d4f' : '#d9d9d9'}`,
                    resize: 'vertical',
                  }}
                  data-testid="import-textarea"
                />
                {error && (
                  <div
                    style={{ color: '#ff4d4f', fontSize: 12 }}
                    data-testid="import-error"
                  >
                    {error}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <input
                    ref={fileInputRef}
                    id="ss-import-file"
                    name="importDashboardFile"
                    aria-label="Upload dashboard file"
                    type="file"
                    accept=".json,.yaml,.yml"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    data-testid="file-input"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={buttonStyle}
                    data-testid="upload-btn"
                  >
                    📁 Upload File
                  </button>
                  <button
                    onClick={handleImportSubmit}
                    disabled={!importText.trim()}
                    style={{
                      ...primaryButtonStyle,
                      opacity: importText.trim() ? 1 : 0.5,
                    }}
                    data-testid="import-submit-btn"
                  >
                    ✓ Import
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
