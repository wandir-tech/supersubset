import type { ReactElement } from 'react';

import type { ProbeAuthMode, ProbeMetadataSourceMode } from './auth';
import type { ConnectStage, ConnectStageStatus } from './probe-workspace-types';

export interface ProbeConnectionPanelProps {
  metadataModeId: string;
  discoveryUrlInputId: string;
  metadataJsonInputId: string;
  queryUrlInputId: string;
  authModeId: string;
  jwtInputId: string;
  customHeaderNameId: string;
  customHeaderValueId: string;
  loginUrlInputId: string;
  loginEmailInputId: string;
  loginPasswordInputId: string;
  loginMutationInputId: string;
  loginTokenPathInputId: string;
  metadataSourceMode: ProbeMetadataSourceMode;
  authMode: ProbeAuthMode;
  discoveryUrlInput: string;
  metadataJsonInput: string;
  queryUrlInput: string;
  jwtInput: string;
  customHeaderName: string;
  customHeaderValue: string;
  loginUrlInput: string;
  loginEmailInput: string;
  loginPasswordInput: string;
  loginMutationInput: string;
  loginTokenPathInput: string;
  rememberSession: boolean;
  connectStages: ConnectStage[];
  probeError: string;
  isConnecting: boolean;
  setMetadataSourceMode: (value: ProbeMetadataSourceMode) => void;
  setAuthMode: (value: ProbeAuthMode) => void;
  setDiscoveryUrlInput: (value: string) => void;
  setMetadataJsonInput: (value: string) => void;
  setQueryUrlInput: (value: string) => void;
  setJwtInput: (value: string) => void;
  setCustomHeaderName: (value: string) => void;
  setCustomHeaderValue: (value: string) => void;
  setLoginUrlInput: (value: string) => void;
  setLoginEmailInput: (value: string) => void;
  setLoginPasswordInput: (value: string) => void;
  setLoginMutationInput: (value: string) => void;
  setLoginTokenPathInput: (value: string) => void;
  setRememberSession: (value: boolean) => void;
  onConnect: () => void;
}

export function ProbeConnectionPanel({
  metadataModeId,
  discoveryUrlInputId,
  metadataJsonInputId,
  queryUrlInputId,
  authModeId,
  jwtInputId,
  customHeaderNameId,
  customHeaderValueId,
  loginUrlInputId,
  loginEmailInputId,
  loginPasswordInputId,
  loginMutationInputId,
  loginTokenPathInputId,
  metadataSourceMode,
  authMode,
  discoveryUrlInput,
  metadataJsonInput,
  queryUrlInput,
  jwtInput,
  customHeaderName,
  customHeaderValue,
  loginUrlInput,
  loginEmailInput,
  loginPasswordInput,
  loginMutationInput,
  loginTokenPathInput,
  rememberSession,
  connectStages,
  probeError,
  isConnecting,
  setMetadataSourceMode,
  setAuthMode,
  setDiscoveryUrlInput,
  setMetadataJsonInput,
  setQueryUrlInput,
  setJwtInput,
  setCustomHeaderName,
  setCustomHeaderValue,
  setLoginUrlInput,
  setLoginEmailInput,
  setLoginPasswordInput,
  setLoginMutationInput,
  setLoginTokenPathInput,
  setRememberSession,
  onConnect,
}: ProbeConnectionPanelProps): ReactElement {
  return (
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
        onChange={(event) => setMetadataSourceMode(event.target.value as ProbeMetadataSourceMode)}
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
              marginBottom: 8,
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 14,
            }}
          />
          <p style={{ margin: '0 0 14px', color: '#64748b', fontSize: 12, lineHeight: 1.5 }}>
            Metadata is loaded from <code>GET {'{base}/supersubset/datasets'}</code> unless the URL
            already ends with <code>/supersubset/datasets</code>. Prefer an API-segment base (for
            example Tripmatch: <code>http://localhost:PORT/api/analytics</code>) so an empty query
            field below can reuse the same base for <code>POST {'{base}/supersubset/query'}</code>.
          </p>
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
        <option value="login">Login with email + password</option>
      </select>

      {authMode === 'bearer' && (
        <>
          <label
            htmlFor={jwtInputId}
            style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#0f172a' }}
          >
            JWT token (optional)
          </label>
          <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: 12, lineHeight: 1.5 }}>
            Paste the raw JWT only — <code>Bearer</code> is added for you. A leading{' '}
            <code>Bearer</code> prefix is stripped if you paste it anyway.
          </p>
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
      )}

      {authMode === 'custom' && (
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

      {authMode === 'login' && (
        <>
          <p style={{ margin: '0 0 12px', color: '#64748b', fontSize: 12, lineHeight: 1.5 }}>
            The probe will POST a GraphQL mutation to the login URL with{' '}
            <code>{'{ query, variables: { email, password } }'}</code> and then use the returned
            token as <code>Authorization: Bearer &lt;token&gt;</code> for discovery and preview
            requests. Defaults match the tripmatch / bi-data-mart GraphQL schema.
          </p>

          <label
            htmlFor={loginUrlInputId}
            style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#0f172a' }}
          >
            Login URL
          </label>
          <input
            id={loginUrlInputId}
            data-testid="probe-login-url"
            value={loginUrlInput}
            onChange={(event) => setLoginUrlInput(event.target.value)}
            placeholder="http://localhost:3009/graphql"
            style={{
              width: '100%',
              padding: '10px 12px',
              marginBottom: 10,
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 14,
            }}
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              marginBottom: 10,
            }}
          >
            <div>
              <label
                htmlFor={loginEmailInputId}
                style={{
                  display: 'block',
                  marginBottom: 6,
                  fontWeight: 600,
                  color: '#0f172a',
                }}
              >
                Email / user ID
              </label>
              <input
                id={loginEmailInputId}
                data-testid="probe-login-email"
                value={loginEmailInput}
                onChange={(event) => setLoginEmailInput(event.target.value)}
                placeholder="dev@example.com"
                autoComplete="username"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 14,
                }}
              />
            </div>
            <div>
              <label
                htmlFor={loginPasswordInputId}
                style={{
                  display: 'block',
                  marginBottom: 6,
                  fontWeight: 600,
                  color: '#0f172a',
                }}
              >
                Password
              </label>
              <input
                id={loginPasswordInputId}
                data-testid="probe-login-password"
                type="password"
                value={loginPasswordInput}
                onChange={(event) => setLoginPasswordInput(event.target.value)}
                placeholder="dev password"
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 14,
                }}
              />
            </div>
          </div>

          <details style={{ marginBottom: 10 }}>
            <summary
              style={{
                cursor: 'pointer',
                color: '#334155',
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Advanced: login mutation and token path
            </summary>
            <label
              htmlFor={loginMutationInputId}
              style={{
                display: 'block',
                marginTop: 10,
                marginBottom: 6,
                fontWeight: 600,
                color: '#0f172a',
              }}
            >
              Login mutation
            </label>
            <p style={{ margin: '0 0 6px', color: '#64748b', fontSize: 12, lineHeight: 1.5 }}>
              Must accept <code>$email</code> and <code>$password</code> variables.
            </p>
            <textarea
              id={loginMutationInputId}
              data-testid="probe-login-mutation"
              value={loginMutationInput}
              onChange={(event) => setLoginMutationInput(event.target.value)}
              rows={6}
              style={{
                width: '100%',
                padding: '10px 12px',
                marginBottom: 10,
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              }}
            />
            <label
              htmlFor={loginTokenPathInputId}
              style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#0f172a' }}
            >
              Token path in response
            </label>
            <input
              id={loginTokenPathInputId}
              data-testid="probe-login-token-path"
              value={loginTokenPathInput}
              onChange={(event) => setLoginTokenPathInput(event.target.value)}
              placeholder="data.login.accessToken"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              }}
            />
          </details>
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

      <ConnectStageList stages={connectStages} />

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
        onClick={onConnect}
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
  );
}

const CONNECT_STAGE_STYLES: Record<
  ConnectStageStatus,
  { icon: string; color: string; border: string; background: string }
> = {
  pending: {
    icon: '…',
    color: '#1d4ed8',
    border: '#bfdbfe',
    background: '#eff6ff',
  },
  success: {
    icon: '✓',
    color: '#14532d',
    border: '#86efac',
    background: '#dcfce7',
  },
  error: {
    icon: '✕',
    color: '#991b1b',
    border: '#fecaca',
    background: '#fef2f2',
  },
};

function ConnectStageList({ stages }: { stages: ConnectStage[] }): ReactElement | null {
  if (stages.length === 0) return null;

  return (
    <div
      data-testid="probe-connect-log"
      style={{
        marginBottom: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      {stages.map((stage) => {
        const style = CONNECT_STAGE_STYLES[stage.status];
        return (
          <div
            key={stage.id}
            data-testid={`probe-connect-stage-${stage.id}`}
            data-status={stage.status}
            style={{
              borderRadius: 8,
              border: `1px solid ${style.border}`,
              background: style.background,
              color: style.color,
              padding: '8px 12px',
              fontSize: 13,
              lineHeight: 1.5,
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
            }}
          >
            <span
              aria-hidden
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.6)',
                fontWeight: 700,
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              {style.icon}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{stage.label}</div>
              {stage.detail ? (
                <div
                  style={{
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    fontSize: 12,
                    wordBreak: 'break-word',
                  }}
                >
                  {stage.detail}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
