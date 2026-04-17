import { useMemo, useState, type ReactElement } from 'react';

import {
  SupersubsetDesigner,
  ImportExportPanel,
  CodeViewPanel,
  type FetchPreviewData,
  useUndoRedo,
  UndoRedoToolbar,
  useUndoRedoKeyboard,
} from '@supersubset/designer';
import type { DashboardDefinition } from '@supersubset/schema';
import type { NormalizedDataset } from '@supersubset/data-model';

import {
  clearProbeSession,
  loadProbeSession,
  normalizeBaseUrl,
  saveProbeSession,
  toAuthHeader,
  type ProbeAuthMode,
  type ProbeMetadataSourceMode,
} from './auth';
import { toProbeErrorMessage } from './errors';
import { HttpMetadataAdapter, HttpQueryAdapter } from './http-adapters';
import { buildPreviewQuery, deriveQueryEndpointInput, parseProbeMetadataJson } from './metadata';

function createBlankDashboardDefinition(): DashboardDefinition {
  return {
    schemaVersion: '0.2.0',
    id: `probe-${Date.now()}`,
    title: 'Backend Probe Dashboard',
    pages: [
      {
        id: 'page-1',
        title: 'Page 1',
        rootNodeId: 'root',
        layout: {
          root: { id: 'root', type: 'root', children: ['grid-main'], meta: {} },
          'grid-main': {
            id: 'grid-main',
            type: 'grid',
            children: [],
            parentId: 'root',
            meta: { columns: 12 },
          },
        },
        widgets: [],
      },
    ],
    defaults: {
      activePage: 'page-1',
    },
  };
}

function triggerJsonDownload(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function ProbeWorkspace(): ReactElement {
  const metadataModeId = 'probe-metadata-mode';
  const discoveryUrlInputId = 'probe-discovery-url';
  const metadataJsonInputId = 'probe-metadata-json';
  const queryUrlInputId = 'probe-query-url';
  const authModeId = 'probe-auth-mode-select';
  const jwtInputId = 'probe-jwt-token';
  const customHeaderNameId = 'probe-custom-header-name';
  const customHeaderValueId = 'probe-custom-header-value';

  const session = loadProbeSession();

  const [metadataSourceMode, setMetadataSourceMode] = useState<ProbeMetadataSourceMode>(
    session?.metadataSourceMode ?? 'discovery-url',
  );
  const [authMode, setAuthMode] = useState<ProbeAuthMode>(session?.authMode ?? 'bearer');
  const [discoveryUrlInput, setDiscoveryUrlInput] = useState(session?.discoveryUrl ?? '');
  const [metadataJsonInput, setMetadataJsonInput] = useState(session?.metadataJson ?? '');
  const [queryUrlInput, setQueryUrlInput] = useState(session?.queryUrl ?? '');
  const [jwtInput, setJwtInput] = useState(session?.jwt ?? '');
  const [customHeaderName, setCustomHeaderName] = useState(session?.customHeaderName ?? '');
  const [customHeaderValue, setCustomHeaderValue] = useState(session?.customHeaderValue ?? '');
  const [rememberSession, setRememberSession] = useState(Boolean(session));
  const [datasets, setDatasets] = useState<NormalizedDataset[]>([]);
  const [probeError, setProbeError] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const isConnected = datasets.length > 0;

  const undoRedo = useUndoRedo(createBlankDashboardDefinition(), { debounceMs: 500 });
  useUndoRedoKeyboard(undoRedo.undo, undoRedo.redo, isConnected);

  const currentDashboard = undoRedo.current;

  const authHeader = useMemo(
    () => toAuthHeader(authMode, jwtInput, customHeaderName, customHeaderValue),
    [authMode, jwtInput, customHeaderName, customHeaderValue],
  );

  const effectiveQueryEndpoint = useMemo(() => {
    const normalizedQueryUrl = normalizeBaseUrl(queryUrlInput);
    if (normalizedQueryUrl) {
      return normalizedQueryUrl;
    }

    if (metadataSourceMode === 'discovery-url') {
      return deriveQueryEndpointInput(discoveryUrlInput);
    }

    return '';
  }, [discoveryUrlInput, metadataSourceMode, queryUrlInput]);

  const fetchPreviewData = useMemo<FetchPreviewData | undefined>(() => {
    if (!isConnected || !effectiveQueryEndpoint) {
      return undefined;
    }

    const queryAdapter = new HttpQueryAdapter(effectiveQueryEndpoint, { authHeader });
    return async (request) => {
      const query = buildPreviewQuery(datasets, request.datasetRef, request.fields);
      if (!query) {
        return [];
      }

      try {
        const result = await queryAdapter.execute(query);
        return result.rows;
      } catch (error) {
        console.warn('[Supersubset Probe] Preview query failed', error);
        return [];
      }
    };
  }, [authHeader, datasets, effectiveQueryEndpoint, isConnected]);

  async function handleProbeConnect(): Promise<void> {
    const normalizedDiscoveryUrl = normalizeBaseUrl(discoveryUrlInput);
    const normalizedQueryUrl = normalizeBaseUrl(queryUrlInput);

    if (
      metadataSourceMode === 'discovery-url' &&
      !normalizedDiscoveryUrl.startsWith('http://') &&
      !normalizedDiscoveryUrl.startsWith('https://')
    ) {
      setProbeError(
        'Enter a full discovery URL or backend base URL starting with http:// or https://',
      );
      return;
    }

    if (
      normalizedQueryUrl.length > 0 &&
      !normalizedQueryUrl.startsWith('http://') &&
      !normalizedQueryUrl.startsWith('https://')
    ) {
      setProbeError('Enter a full query URL or backend base URL starting with http:// or https://');
      return;
    }

    setIsConnecting(true);
    setProbeError('');

    try {
      const nextDatasets =
        metadataSourceMode === 'discovery-url'
          ? await new HttpMetadataAdapter({ authHeader }).getDatasets(normalizedDiscoveryUrl)
          : await parseProbeMetadataJson(metadataJsonInput);

      if (nextDatasets.length === 0) {
        throw new Error('Metadata loaded successfully, but no datasets were discovered.');
      }

      setDatasets(nextDatasets);
      undoRedo.reset(createBlankDashboardDefinition());

      if (rememberSession) {
        saveProbeSession({
          metadataSourceMode,
          discoveryUrl: normalizedDiscoveryUrl,
          metadataJson: metadataJsonInput,
          queryUrl: normalizedQueryUrl,
          authMode,
          jwt: jwtInput,
          customHeaderName,
          customHeaderValue,
        });
      } else {
        clearProbeSession();
      }
    } catch (error) {
      setDatasets([]);
      setProbeError(toProbeErrorMessage(error));
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleExportJson(): Promise<void> {
    const serialized = JSON.stringify(currentDashboard, null, 2);

    try {
      await navigator.clipboard.writeText(serialized);
    } catch {
      // Clipboard is best-effort. Download still works.
    }

    const safeTitle =
      currentDashboard.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'probe-dashboard';

    triggerJsonDownload(`${safeTitle}.json`, serialized);
  }

  function handleDisconnect(): void {
    setDatasets([]);
    setProbeError('');
  }

  const metadataSourceSummary =
    metadataSourceMode === 'discovery-url'
      ? normalizeBaseUrl(discoveryUrlInput)
      : 'Pasted metadata JSON';

  return (
    <div style={{ maxWidth: 1320, margin: '0 auto', padding: '20px 24px' }}>
      <div
        style={{
          marginBottom: 16,
          padding: '12px 14px',
          borderRadius: 10,
          border: '1px solid #fde68a',
          background: '#fffbeb',
          color: '#78350f',
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        DEV TOOL: Use development credentials only. This screen is designed for local/backend
        compatibility testing, not production authentication flows.
      </div>

      {!isConnected ? (
        <section
          style={{
            border: '1px solid #d6dee8',
            borderRadius: 14,
            padding: 20,
            background: '#fff',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.07)',
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 10, color: '#0f172a' }}>Backend Probe</h2>
          <p style={{ margin: '0 0 18px', color: '#475569' }}>
            Load metadata from a discovery endpoint or pasted JSON, then optionally use a live query
            endpoint for preview data while building charts.
          </p>

          <label
            htmlFor={metadataModeId}
            style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#0f172a' }}
          >
            Metadata source
          </label>
          <select
            id={metadataModeId}
            data-testid="probe-metadata-mode"
            value={metadataSourceMode}
            onChange={(event) =>
              setMetadataSourceMode(event.target.value as ProbeMetadataSourceMode)
            }
            style={{
              width: '100%',
              padding: '10px 12px',
              marginBottom: 14,
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 14,
            }}
          >
            <option value="discovery-url">Discovery URL</option>
            <option value="paste-json">Paste metadata JSON</option>
          </select>

          {metadataSourceMode === 'discovery-url' ? (
            <>
              <label
                htmlFor={discoveryUrlInputId}
                style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#0f172a' }}
              >
                Discovery URL or backend base URL
              </label>
              <input
                id={discoveryUrlInputId}
                data-testid="probe-url-input"
                value={discoveryUrlInput}
                onChange={(event) => setDiscoveryUrlInput(event.target.value)}
                placeholder="https://api.example.com"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  marginBottom: 14,
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 14,
                }}
              />
            </>
          ) : (
            <>
              <label
                htmlFor={metadataJsonInputId}
                style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#0f172a' }}
              >
                Metadata JSON
              </label>
              <textarea
                id={metadataJsonInputId}
                data-testid="probe-metadata-json-input"
                value={metadataJsonInput}
                onChange={(event) => setMetadataJsonInput(event.target.value)}
                placeholder='{"datasets":[{"id":"orders","label":"Orders","fields":[...]}]}'
                rows={8}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  marginBottom: 14,
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                }}
              />
            </>
          )}

          <label
            htmlFor={queryUrlInputId}
            style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#0f172a' }}
          >
            Query endpoint URL or backend base URL (optional)
          </label>
          <input
            id={queryUrlInputId}
            data-testid="probe-query-url-input"
            value={queryUrlInput}
            onChange={(event) => setQueryUrlInput(event.target.value)}
            placeholder="https://api.example.com"
            style={{
              width: '100%',
              padding: '10px 12px',
              marginBottom: 8,
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 14,
            }}
          />
          <p style={{ margin: '0 0 14px', color: '#64748b', fontSize: 12, lineHeight: 1.5 }}>
            Leave this blank to reuse the discovery URL for live preview when possible. When using
            pasted metadata, you can still provide a query endpoint for chart preview data.
          </p>

          <label
            htmlFor={authModeId}
            style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#0f172a' }}
          >
            Auth mode
          </label>
          <select
            id={authModeId}
            data-testid="probe-auth-mode"
            value={authMode}
            onChange={(event) => setAuthMode(event.target.value as ProbeAuthMode)}
            style={{
              width: '100%',
              padding: '10px 12px',
              marginBottom: 14,
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 14,
            }}
          >
            <option value="bearer">Bearer JWT</option>
            <option value="custom">Custom header</option>
          </select>

          {authMode === 'bearer' ? (
            <>
              <label
                htmlFor={jwtInputId}
                style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#0f172a' }}
              >
                JWT token (optional)
              </label>
              <textarea
                id={jwtInputId}
                data-testid="probe-jwt-input"
                value={jwtInput}
                onChange={(event) => setJwtInput(event.target.value)}
                placeholder="eyJhbGciOi..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  marginBottom: 14,
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                }}
              />
            </>
          ) : (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 2fr',
                  gap: 10,
                  marginBottom: 6,
                }}
              >
                <label
                  htmlFor={customHeaderNameId}
                  style={{ display: 'block', fontWeight: 600, color: '#0f172a' }}
                >
                  Header name
                </label>
                <label
                  htmlFor={customHeaderValueId}
                  style={{ display: 'block', fontWeight: 600, color: '#0f172a' }}
                >
                  Header value
                </label>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 2fr',
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <input
                  id={customHeaderNameId}
                  data-testid="probe-header-name"
                  value={customHeaderName}
                  onChange={(event) => setCustomHeaderName(event.target.value)}
                  placeholder="X-API-Key"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 14,
                  }}
                />
                <input
                  id={customHeaderValueId}
                  data-testid="probe-header-value"
                  value={customHeaderValue}
                  onChange={(event) => setCustomHeaderValue(event.target.value)}
                  placeholder="my-dev-key"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 14,
                  }}
                />
              </div>
            </>
          )}

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 14,
              color: '#334155',
              fontSize: 14,
            }}
          >
            <input
              type="checkbox"
              checked={rememberSession}
              onChange={(event) => setRememberSession(event.target.checked)}
            />
            Remember settings in sessionStorage for this browser session
          </label>

          {probeError && (
            <div
              data-testid="probe-error"
              style={{
                marginBottom: 14,
                borderRadius: 8,
                border: '1px solid #fecaca',
                background: '#fef2f2',
                color: '#991b1b',
                padding: '10px 12px',
                fontSize: 13,
              }}
            >
              {probeError}
            </div>
          )}

          <button
            data-testid="probe-connect-button"
            onClick={() => {
              void handleProbeConnect();
            }}
            disabled={isConnecting}
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: 'none',
              cursor: isConnecting ? 'wait' : 'pointer',
              background: '#1d4ed8',
              color: '#fff',
              fontWeight: 700,
            }}
          >
            {isConnecting ? 'Connecting...' : 'Load metadata and open designer'}
          </button>
        </section>
      ) : (
        <section>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 12,
              flexWrap: 'wrap',
            }}
          >
            <span
              data-testid="probe-metadata-source-summary"
              style={{
                borderRadius: 999,
                background: '#dcfce7',
                color: '#14532d',
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Metadata: {metadataSourceSummary}
            </span>
            <span data-testid="probe-dataset-count" style={{ color: '#334155', fontSize: 13 }}>
              {datasets.length} dataset(s) discovered
            </span>
            <span
              data-testid="probe-preview-status"
              style={{
                borderRadius: 999,
                background: fetchPreviewData ? '#dbeafe' : '#fef3c7',
                color: fetchPreviewData ? '#1d4ed8' : '#92400e',
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {fetchPreviewData
                ? `Preview: ${effectiveQueryEndpoint}`
                : 'Preview: disabled (metadata only)'}
            </span>
            <button
              onClick={() => setShowCode((value) => !value)}
              style={{
                padding: '5px 10px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                cursor: 'pointer',
                background: showCode ? '#e2e8f0' : '#fff',
              }}
            >
              {'</>'} Code
            </button>
            <button
              onClick={() => {
                void handleExportJson();
              }}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid #1d4ed8',
                color: '#1d4ed8',
                background: '#eff6ff',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Export JSON
            </button>
            <button
              onClick={handleDisconnect}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid #fca5a5',
                color: '#b91c1c',
                background: '#fef2f2',
                cursor: 'pointer',
              }}
            >
              Reconnect
            </button>
          </div>

          <div style={{ display: 'flex', height: 'calc(100vh - 140px)' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div
                style={{
                  flex: showCode ? '1 1 64%' : '1 1 100%',
                  overflow: 'hidden',
                  minHeight: 0,
                }}
              >
                <SupersubsetDesigner
                  value={currentDashboard}
                  onChange={undoRedo.push}
                  onPublish={undoRedo.push}
                  headerTitle="Supersubset Probe Designer"
                  height="100%"
                  datasets={datasets}
                  fetchPreviewData={fetchPreviewData}
                  headerActions={
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        flexWrap: 'nowrap',
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        minWidth: 0,
                      }}
                    >
                      <UndoRedoToolbar
                        canUndo={undoRedo.canUndo}
                        canRedo={undoRedo.canRedo}
                        onUndo={undoRedo.undo}
                        onRedo={undoRedo.redo}
                        undoCount={undoRedo.undoCount}
                        redoCount={undoRedo.redoCount}
                      />
                      <ImportExportPanel dashboard={currentDashboard} onImport={undoRedo.reset} />
                    </div>
                  }
                />
              </div>
              {showCode && (
                <div style={{ flex: '0 0 280px', borderTop: '2px solid #e2e8f0' }}>
                  <CodeViewPanel dashboard={currentDashboard} height="280px" />
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
