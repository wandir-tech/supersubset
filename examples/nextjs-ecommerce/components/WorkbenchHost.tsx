'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CodeViewPanel,
  ImportExportPanel,
  SupersubsetDesigner,
  type FetchPreviewData,
} from '@supersubset/designer';
import {
  SupersubsetRenderer,
  createWidgetRegistry,
  type FilterState,
  type WidgetProps,
} from '@supersubset/runtime';
import { registerEssentialWidgets } from '@supersubset/charts-echarts/essentials';
import { resolveTheme, themeToCssVariables } from '@supersubset/theme';
import type { DashboardDefinition, InlineThemeDefinition } from '@supersubset/schema';
import type { NormalizedDataset } from '@supersubset/data-model';
import {
  buildWorkbenchPreviewQuery,
  clearStoredWorkbenchToken,
  executeWorkbenchLogicalQuery,
  fetchWorkbenchDatasets,
  isWorkbenchAuthorizationError,
  loginToWorkbench,
  persistWorkbenchDashboard,
  persistWorkbenchToken,
  readStoredWorkbenchDashboard,
  readStoredWorkbenchToken,
  runWorkbenchViewerQueries,
  type QueryBundle,
} from '../lib/workbench-client';
import { WORKBENCH_LOGIN_EMAIL, WORKBENCH_LOGIN_PASSWORD } from '../lib/workbench-auth';
import { workbenchStarterDashboard } from '../lib/workbench-dashboard';
import { workbenchFilterOptions } from '../lib/workbench-shared';

export function WorkbenchHost() {
  const [email, setEmail] = useState(WORKBENCH_LOGIN_EMAIL);
  const [password, setPassword] = useState(WORKBENCH_LOGIN_PASSWORD);
  const [token, setToken] = useState('');
  const [datasets, setDatasets] = useState<NormalizedDataset[]>([]);
  const [dashboard, setDashboard] = useState<DashboardDefinition>(workbenchStarterDashboard);
  const [publishedDashboard, setPublishedDashboard] =
    useState<DashboardDefinition>(workbenchStarterDashboard);
  const [mode, setMode] = useState<'designer' | 'viewer'>('designer');
  const [showCode, setShowCode] = useState(false);
  const [designerRevision, setDesignerRevision] = useState(0);
  const [bundle, setBundle] = useState<QueryBundle | null>(null);
  const [filterState, setFilterState] = useState<FilterState>({ values: {} });
  const [authStatus, setAuthStatus] = useState<'checking' | 'logged-out' | 'ready'>('checking');
  const [viewerStatus, setViewerStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState('');
  const bundleRef = useRef(bundle);
  bundleRef.current = bundle;

  function resetSession(nextError = '') {
    clearStoredWorkbenchToken();
    setToken('');
    setDatasets([]);
    setBundle(null);
    setFilterState({ values: {} });
    setAuthStatus('logged-out');
    setViewerStatus('idle');
    setError(nextError);
  }

  useEffect(() => {
    const storedDashboard = readStoredWorkbenchDashboard();
    if (storedDashboard) {
      setDashboard(storedDashboard);
      setPublishedDashboard(storedDashboard);
      setMode('viewer');
    }

    const storedToken = readStoredWorkbenchToken();
    if (!storedToken) {
      setAuthStatus('logged-out');
      return;
    }

    setToken(storedToken);
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;
    setError('');
    fetchWorkbenchDatasets(token)
      .then((nextDatasets) => {
        if (!active) return;
        setDatasets(nextDatasets);
        setAuthStatus('ready');
      })
      .catch((nextError: unknown) => {
        if (!active) return;
        if (isWorkbenchAuthorizationError(nextError)) {
          resetSession(
            nextError instanceof Error
              ? nextError.message
              : 'Your demo session expired. Log in again.',
          );
          return;
        }

        resetSession(
          nextError instanceof Error ? nextError.message : 'Failed to load local datasets.',
        );
        setError(nextError instanceof Error ? nextError.message : 'Failed to load local datasets.');
      });

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token || datasets.length === 0) {
      return;
    }

    let active = true;
    setViewerStatus('loading');
    runWorkbenchViewerQueries({
      dashboard: publishedDashboard,
      datasets,
      token,
      filterValues: filterState.values,
    })
      .then((nextBundle) => {
        if (!active) return;
        setBundle(nextBundle);
        setViewerStatus('ready');
      })
      .catch((nextError: unknown) => {
        if (!active) return;
        if (isWorkbenchAuthorizationError(nextError)) {
          resetSession(
            nextError instanceof Error
              ? nextError.message
              : 'Your demo session expired. Log in again.',
          );
          return;
        }

        setViewerStatus('error');
        setError(nextError instanceof Error ? nextError.message : 'Failed to run viewer queries.');
      });

    return () => {
      active = false;
    };
  }, [datasets, filterState.values, publishedDashboard, token]);

  const registry = useMemo(() => {
    const registryInstance = createWidgetRegistry();
    registerEssentialWidgets(registryInstance);

    const originalGet = registryInstance.get.bind(registryInstance);
    const wrappedCache = new Map<string, (props: WidgetProps) => React.JSX.Element>();

    registryInstance.get = (type: string) => {
      const cached = wrappedCache.get(type);
      if (cached) return cached;

      const Original = originalGet(type);
      if (!Original) return undefined;

      const Wrapped = (props: WidgetProps) => {
        const fixture = bundleRef.current?.widgetData[props.widgetId];
        return (
          <Original
            {...props}
            data={fixture?.data ?? props.data}
            columns={fixture?.columns ?? props.columns}
          />
        );
      };

      Wrapped.displayName = `WorkbenchQuery(${type})`;
      wrappedCache.set(type, Wrapped);
      return Wrapped;
    };

    return registryInstance;
  }, []);

  const inlineTheme =
    publishedDashboard.theme?.type === 'inline'
      ? (publishedDashboard.theme as InlineThemeDefinition)
      : null;
  const resolvedTheme = useMemo(() => resolveTheme(inlineTheme), [inlineTheme]);
  const cssVariables = useMemo(() => themeToCssVariables(resolvedTheme), [resolvedTheme]);

  const fetchPreviewData = useMemo<FetchPreviewData | undefined>(() => {
    if (!token || datasets.length === 0) {
      return undefined;
    }

    return async (request) => {
      const query = buildWorkbenchPreviewQuery(datasets, request);
      if (!query) {
        return [];
      }

      try {
        const result = await executeWorkbenchLogicalQuery(token, query);
        return result.rows;
      } catch (nextError) {
        if (isWorkbenchAuthorizationError(nextError)) {
          resetSession(
            nextError instanceof Error
              ? nextError.message
              : 'Your demo session expired. Log in again.',
          );
          return [];
        }

        throw nextError;
      }
    };
  }, [datasets, token]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setAuthStatus('checking');

    try {
      const nextToken = await loginToWorkbench(email, password);
      persistWorkbenchToken(nextToken);
      setToken(nextToken);
    } catch (nextError) {
      setAuthStatus('logged-out');
      setError(nextError instanceof Error ? nextError.message : 'Login failed.');
    }
  }

  function handlePublish(nextDashboard: DashboardDefinition) {
    setDashboard(nextDashboard);
    setPublishedDashboard(nextDashboard);
    persistWorkbenchDashboard(nextDashboard);
    setMode('viewer');
    setError('');
  }

  function handleImport(nextDashboard: DashboardDefinition) {
    setDashboard(nextDashboard);
    setPublishedDashboard(nextDashboard);
    persistWorkbenchDashboard(nextDashboard);
    setDesignerRevision((current) => current + 1);
  }

  function handleLogout() {
    resetSession('');
  }

  if (authStatus !== 'ready') {
    return (
      <main style={{ padding: '32px 36px 48px' }}>
        <section
          style={{
            maxWidth: 1080,
            margin: '0 auto',
            padding: '30px 32px 34px',
            borderRadius: 28,
            background: 'linear-gradient(145deg, rgba(255,255,255,0.96), rgba(227,237,249,0.9))',
            border: '1px solid rgba(15, 76, 129, 0.12)',
            boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 28 }}>
            <div>
              <div
                style={{
                  fontSize: 13,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: '#47638a',
                }}
              >
                Next.js Real Host Workbench
              </div>
              <h1 style={{ margin: '12px 0 10px', fontSize: 44, lineHeight: 1.05 }}>
                Log into the local analytics host and edit against live backend data.
              </h1>
              <p style={{ margin: 0, fontSize: 18, lineHeight: 1.6, color: '#32465f' }}>
                This route mirrors a production-style host flow: GraphQL-style login, secured
                metadata discovery, live preview queries, host-owned publish, and runtime
                re-rendering.
              </p>
              <div
                style={{
                  marginTop: 22,
                  padding: '14px 16px',
                  borderRadius: 16,
                  background: '#f7fbff',
                  border: '1px solid #d8e4f1',
                  color: '#29425d',
                  lineHeight: 1.6,
                }}
              >
                <strong>Demo credentials are prefilled.</strong> The local backend only serves the
                workbench after a successful login, so the example exercises the same auth handoff
                that a real host app would own.
              </div>
            </div>

            <form
              data-testid="workbench-login-form"
              onSubmit={handleLogin}
              style={{
                alignSelf: 'start',
                padding: 24,
                borderRadius: 20,
                background: '#ffffff',
                border: '1px solid #d8e4f1',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: 16 }}>Local operator login</h2>
              <label style={{ display: 'block', marginBottom: 12 }}>
                <span style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#47638a' }}>
                  Email
                </span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  style={inputStyle}
                  autoComplete="username"
                />
              </label>
              <label style={{ display: 'block', marginBottom: 16 }}>
                <span style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#47638a' }}>
                  Password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  style={inputStyle}
                  autoComplete="current-password"
                />
              </label>
              {error ? (
                <div style={{ marginBottom: 16, color: '#b42318', fontSize: 14 }}>{error}</div>
              ) : null}
              <button type="submit" data-testid="workbench-login-submit" style={primaryButtonStyle}>
                {authStatus === 'checking' ? 'Connecting...' : 'Enter workbench'}
              </button>
            </form>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main style={{ padding: '32px 36px 48px' }}>
      <section
        data-testid="workbench-shell"
        style={{
          maxWidth: 1320,
          margin: '0 auto',
          padding: '28px 32px',
          borderRadius: 28,
          background: 'linear-gradient(145deg, rgba(255,255,255,0.94), rgba(226,239,255,0.88))',
          border: '1px solid rgba(29, 78, 216, 0.12)',
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 24,
            alignItems: 'flex-start',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: '#47638a',
              }}
            >
              Real Host Workbench
            </div>
            <h1 style={{ margin: '12px 0 10px', fontSize: 44, lineHeight: 1.05 }}>
              Northstar Logistics Control Tower.
            </h1>
            <p
              style={{ margin: 0, fontSize: 18, lineHeight: 1.6, color: '#32465f', maxWidth: 820 }}
            >
              The host owns auth, discovery, preview queries, publish, and runtime data delivery.
              This route is the production-like validation surface that the simple runtime-only
              example is not.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              type="button"
              data-testid="workbench-mode-designer"
              onClick={() => setMode('designer')}
              style={mode === 'designer' ? activeButtonStyle : secondaryButtonStyle}
            >
              Designer
            </button>
            <button
              type="button"
              data-testid="workbench-mode-viewer"
              onClick={() => setMode('viewer')}
              style={mode === 'viewer' ? activeButtonStyle : secondaryButtonStyle}
            >
              Viewer
            </button>
            <button
              type="button"
              data-testid="workbench-logout"
              onClick={handleLogout}
              style={secondaryButtonStyle}
            >
              Logout
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 12,
            marginTop: 22,
          }}
        >
          <StatusCard
            label="Auth"
            value="Local GraphQL login"
            detail="Bearer token in sessionStorage"
          />
          <StatusCard
            dataTestId="workbench-dataset-status"
            label="Metadata"
            value={`${datasets.length} dataset(s)`}
            detail="Loaded from /api/analytics/supersubset/datasets"
          />
          <StatusCard
            label="Preview"
            value="Live HTTP queries"
            detail="Designer previews hit the secured query endpoint"
          />
          <StatusCard
            label="Runtime"
            value={viewerStatus === 'loading' ? 'Refreshing...' : 'Connected'}
            detail="Published dashboard re-queries on filter changes"
          />
        </div>
      </section>

      {error ? (
        <section style={{ maxWidth: 1320, margin: '16px auto 0', color: '#b42318' }}>
          {error}
        </section>
      ) : null}

      <section
        style={{
          maxWidth: 1320,
          margin: '20px auto 0',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 320px',
          gap: 16,
        }}
      >
        <div
          style={{
            minHeight: 720,
            borderRadius: 24,
            background: '#ffffff',
            border: '1px solid #d8e4f1',
            overflow: 'hidden',
            boxShadow: '0 14px 36px rgba(15, 23, 42, 0.06)',
          }}
        >
          {mode === 'designer' ? (
            <SupersubsetDesigner
              key={designerRevision}
              value={dashboard}
              onChange={setDashboard}
              onPublish={handlePublish}
              headerTitle="Northstar Logistics Workbench"
              height="720px"
              datasets={datasets}
              fetchPreviewData={fetchPreviewData}
              headerActions={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ImportExportPanel dashboard={dashboard} onImport={handleImport} />
                  <button
                    type="button"
                    data-testid="workbench-code-toggle"
                    onClick={() => setShowCode((current) => !current)}
                    style={secondaryButtonStyle}
                  >
                    {'</>'} Code
                  </button>
                </div>
              }
            />
          ) : (
            <div style={{ minHeight: 720, padding: 20, background: '#f8fbff' }}>
              {viewerStatus === 'loading' || !bundle ? (
                <div style={placeholderPanelStyle}>Running secured viewer queries…</div>
              ) : null}
              {bundle ? (
                <SupersubsetRenderer
                  definition={publishedDashboard}
                  registry={registry}
                  theme={resolvedTheme as unknown as Record<string, unknown>}
                  cssVariables={cssVariables}
                  filterOptions={bundle.filterOptions ?? workbenchFilterOptions}
                  onFilterChange={setFilterState}
                />
              ) : null}
            </div>
          )}
          {showCode ? (
            <div style={{ borderTop: '1px solid #d8e4f1' }}>
              <CodeViewPanel
                dashboard={mode === 'designer' ? dashboard : publishedDashboard}
                height="260px"
              />
            </div>
          ) : null}
        </div>

        <aside
          style={{
            borderRadius: 24,
            background: '#ffffff',
            border: '1px solid #d8e4f1',
            padding: 18,
            boxShadow: '0 14px 36px rgba(15, 23, 42, 0.06)',
            alignSelf: 'start',
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 12 }}>Host query log</h2>
          <p style={{ marginTop: 0, color: '#5f7389', lineHeight: 1.6 }}>
            The host app, not Supersubset itself, decides how published widgets turn into live
            logical queries.
          </p>
          <pre
            data-testid="workbench-query-log"
            style={{
              margin: 0,
              whiteSpace: 'pre-wrap',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 12,
              lineHeight: 1.6,
              color: '#16324f',
            }}
          >
            {bundle?.queryLog.join('\n\n') ?? 'Viewer queries will appear here after publish.'}
          </pre>
        </aside>
      </section>
    </main>
  );
}

function StatusCard(props: { dataTestId?: string; label: string; value: string; detail: string }) {
  return (
    <div
      data-testid={props.dataTestId}
      style={{
        padding: '14px 16px',
        borderRadius: 18,
        background: 'rgba(255,255,255,0.72)',
        border: '1px solid rgba(15, 76, 129, 0.08)',
      }}
    >
      <div
        style={{
          fontSize: 12,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#6a8097',
        }}
      >
        {props.label}
      </div>
      <div style={{ marginTop: 8, fontSize: 18, fontWeight: 700, color: '#0f2740' }}>
        {props.value}
      </div>
      <div style={{ marginTop: 6, fontSize: 13, color: '#5f7389', lineHeight: 1.5 }}>
        {props.detail}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 12px',
  borderRadius: 12,
  border: '1px solid #c8d8e8',
  background: '#fbfdff',
};

const primaryButtonStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: 999,
  padding: '12px 18px',
  background: '#0f4c81',
  color: '#ffffff',
  cursor: 'pointer',
};

const secondaryButtonStyle: React.CSSProperties = {
  border: '1px solid #c8d8e8',
  borderRadius: 999,
  padding: '10px 16px',
  background: '#ffffff',
  color: '#16324f',
  cursor: 'pointer',
};

const activeButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  padding: '10px 16px',
};

const placeholderPanelStyle: React.CSSProperties = {
  minHeight: 220,
  display: 'grid',
  placeItems: 'center',
  color: '#5f7389',
};
