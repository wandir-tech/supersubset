import { useMemo, useState, type ReactElement } from 'react';

import { type FetchPreviewData, useUndoRedo, useUndoRedoKeyboard } from '@supersubset/designer';
import type { DashboardDefinition } from '@supersubset/schema';
import type { NormalizedDataset } from '@supersubset/data-model';

import {
  clearProbeSession,
  createDefaultLoginConfig,
  loadProbeSession,
  normalizeBaseUrl,
  performProbeLogin,
  saveProbeSession,
  toAuthHeader,
  type ProbeAuthMode,
  type ProbeMetadataSourceMode,
} from './auth';
import { toProbeErrorMessage } from './errors';
import { HttpMetadataAdapter, HttpQueryAdapter } from './http-adapters';
import { buildPreviewQuery, deriveQueryEndpointInput, parseProbeMetadataJson } from './metadata';
import { ProbeConnectionPanel } from './ProbeConnectionPanel';
import { ProbeDesignerWorkspace } from './ProbeDesignerWorkspace';
import { resolveProbeDatasets } from './probe-connection';
import { type ConnectStage, type PreviewStatus } from './probe-workspace-types';

function summarizeFieldBindings(fields: Record<string, string | string[] | undefined>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      parts.push(`${key}=[${value.join(', ')}]`);
    } else if (value.length > 0) {
      parts.push(`${key}=${value}`);
    }
  }
  return parts.join(' · ');
}

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
  const loginUrlInputId = 'probe-login-url';
  const loginEmailInputId = 'probe-login-email';
  const loginPasswordInputId = 'probe-login-password';
  const loginMutationInputId = 'probe-login-mutation';
  const loginTokenPathInputId = 'probe-login-token-path';

  const session = loadProbeSession();
  const loginDefaults = createDefaultLoginConfig();

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
  const [loginUrlInput, setLoginUrlInput] = useState(session?.loginUrl ?? loginDefaults.loginUrl);
  const [loginEmailInput, setLoginEmailInput] = useState(
    session?.loginEmail ?? loginDefaults.loginEmail,
  );
  const [loginPasswordInput, setLoginPasswordInput] = useState(
    session?.loginPassword ?? loginDefaults.loginPassword,
  );
  const [loginMutationInput, setLoginMutationInput] = useState(
    session?.loginMutation ?? loginDefaults.loginMutation,
  );
  const [loginTokenPathInput, setLoginTokenPathInput] = useState(
    session?.loginTokenPath ?? loginDefaults.loginTokenPath,
  );
  const [loginToken, setLoginToken] = useState<string>('');
  const [rememberSession, setRememberSession] = useState(Boolean(session));
  const [datasets, setDatasets] = useState<NormalizedDataset[]>([]);
  const [probeError, setProbeError] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectStages, setConnectStages] = useState<ConnectStage[]>([]);
  const [showCode, setShowCode] = useState(false);
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>({ kind: 'idle' });
  const isConnected = datasets.length > 0;

  const undoRedo = useUndoRedo(createBlankDashboardDefinition(), { debounceMs: 500 });
  useUndoRedoKeyboard(undoRedo.undo, undoRedo.redo, isConnected);

  const currentDashboard = undoRedo.current;

  const authHeader = useMemo(
    () => toAuthHeader(authMode, jwtInput, customHeaderName, customHeaderValue, loginToken),
    [authMode, jwtInput, customHeaderName, customHeaderValue, loginToken],
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
      const bindings = summarizeFieldBindings(request.fields);
      const query = buildPreviewQuery(datasets, request.datasetRef, request.fields);
      if (!query) {
        setPreviewStatus({
          kind: 'idle',
          url: queryAdapter.resolvedUrl,
          datasetRef: request.datasetRef,
          fieldBindings: bindings,
          timestamp: Date.now(),
        });
        return [];
      }

      const requestBody = JSON.stringify(query, null, 2);

      setPreviewStatus({
        kind: 'loading',
        url: queryAdapter.resolvedUrl,
        datasetRef: request.datasetRef,
        fieldBindings: bindings,
        requestBody,
        timestamp: Date.now(),
      });

      try {
        const result = await queryAdapter.execute(query);
        setPreviewStatus({
          kind: result.rows.length === 0 ? 'empty' : 'success',
          url: queryAdapter.resolvedUrl,
          datasetRef: request.datasetRef,
          rowCount: result.rows.length,
          fieldBindings: bindings,
          requestBody,
          timestamp: Date.now(),
        });
        return result.rows;
      } catch (error) {
        console.warn('[Supersubset Probe] Preview query failed', error);
        setPreviewStatus({
          kind: 'error',
          url: queryAdapter.resolvedUrl,
          datasetRef: request.datasetRef,
          errorMessage: toProbeErrorMessage(error),
          fieldBindings: bindings,
          requestBody,
          timestamp: Date.now(),
        });
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

    const sessionPayload = {
      metadataSourceMode,
      discoveryUrl: normalizedDiscoveryUrl,
      metadataJson: metadataJsonInput,
      queryUrl: normalizedQueryUrl,
      authMode,
      jwt: jwtInput,
      customHeaderName,
      customHeaderValue,
      loginUrl: loginUrlInput.trim(),
      loginMutation: loginMutationInput,
      loginEmail: loginEmailInput,
      loginPassword: loginPasswordInput,
      loginTokenPath: loginTokenPathInput,
    };

    const stages: ConnectStage[] = [];
    const pushStage = (stage: ConnectStage): ConnectStage => {
      stages.push(stage);
      setConnectStages([...stages]);
      return stage;
    };
    const updateStage = (id: string, patch: Partial<ConnectStage>): void => {
      const index = stages.findIndex((entry) => entry.id === id);
      if (index === -1) return;
      stages[index] = { ...stages[index], ...patch } as ConnectStage;
      setConnectStages([...stages]);
    };

    setIsConnecting(true);
    setProbeError('');
    setConnectStages([]);

    try {
      const result = await resolveProbeDatasets(
        {
          metadataSourceMode,
          normalizedDiscoveryUrl,
          metadataJsonInput,
          authMode,
          authHeader,
          loginUrlInput,
          loginMutationInput,
          loginEmailInput,
          loginPasswordInput,
          loginTokenPathInput,
          jwtInput,
          customHeaderName,
          customHeaderValue,
        },
        { pushStage, updateStage },
      );

      if (result.loginToken) {
        setLoginToken(result.loginToken);
      }

      setDatasets(result.datasets);
      undoRedo.reset(createBlankDashboardDefinition());

      if (!rememberSession) {
        clearProbeSession();
      }
    } catch (error) {
      setDatasets([]);
      setProbeError(toProbeErrorMessage(error));
    } finally {
      if (rememberSession) {
        saveProbeSession(sessionPayload);
      }
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
    setLoginToken('');
    setConnectStages([]);
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
        <ProbeConnectionPanel
          metadataModeId={metadataModeId}
          discoveryUrlInputId={discoveryUrlInputId}
          metadataJsonInputId={metadataJsonInputId}
          queryUrlInputId={queryUrlInputId}
          authModeId={authModeId}
          jwtInputId={jwtInputId}
          customHeaderNameId={customHeaderNameId}
          customHeaderValueId={customHeaderValueId}
          loginUrlInputId={loginUrlInputId}
          loginEmailInputId={loginEmailInputId}
          loginPasswordInputId={loginPasswordInputId}
          loginMutationInputId={loginMutationInputId}
          loginTokenPathInputId={loginTokenPathInputId}
          metadataSourceMode={metadataSourceMode}
          authMode={authMode}
          discoveryUrlInput={discoveryUrlInput}
          metadataJsonInput={metadataJsonInput}
          queryUrlInput={queryUrlInput}
          jwtInput={jwtInput}
          customHeaderName={customHeaderName}
          customHeaderValue={customHeaderValue}
          loginUrlInput={loginUrlInput}
          loginEmailInput={loginEmailInput}
          loginPasswordInput={loginPasswordInput}
          loginMutationInput={loginMutationInput}
          loginTokenPathInput={loginTokenPathInput}
          rememberSession={rememberSession}
          connectStages={connectStages}
          probeError={probeError}
          isConnecting={isConnecting}
          setMetadataSourceMode={setMetadataSourceMode}
          setAuthMode={setAuthMode}
          setDiscoveryUrlInput={setDiscoveryUrlInput}
          setMetadataJsonInput={setMetadataJsonInput}
          setQueryUrlInput={setQueryUrlInput}
          setJwtInput={setJwtInput}
          setCustomHeaderName={setCustomHeaderName}
          setCustomHeaderValue={setCustomHeaderValue}
          setLoginUrlInput={setLoginUrlInput}
          setLoginEmailInput={setLoginEmailInput}
          setLoginPasswordInput={setLoginPasswordInput}
          setLoginMutationInput={setLoginMutationInput}
          setLoginTokenPathInput={setLoginTokenPathInput}
          setRememberSession={setRememberSession}
          onConnect={() => {
            void handleProbeConnect();
          }}
        />
      ) : (
        <ProbeDesignerWorkspace
          metadataSourceSummary={metadataSourceSummary}
          datasets={datasets}
          fetchPreviewData={fetchPreviewData}
          effectiveQueryEndpoint={effectiveQueryEndpoint}
          previewStatus={previewStatus}
          showCode={showCode}
          currentDashboard={currentDashboard}
          canUndo={undoRedo.canUndo}
          canRedo={undoRedo.canRedo}
          undoCount={undoRedo.undoCount}
          redoCount={undoRedo.redoCount}
          onToggleCode={() => setShowCode((value) => !value)}
          onExportJson={() => {
            void handleExportJson();
          }}
          onDisconnect={handleDisconnect}
          onDashboardChange={undoRedo.push}
          onDashboardImport={undoRedo.reset}
          onUndo={undoRedo.undo}
          onRedo={undoRedo.redo}
        />
      )}
    </div>
  );
}
