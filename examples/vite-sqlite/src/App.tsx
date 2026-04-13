import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { SupersubsetRenderer, createWidgetRegistry, type FilterState, type WidgetProps } from '@supersubset/runtime';
import { registerEssentialWidgets } from '@supersubset/charts-echarts/essentials';
import { resolveTheme, themeToCssVariables } from '@supersubset/theme';
import type { DashboardDefinition } from '@supersubset/schema';
import { defaultDashboard } from './dashboard';
import { runAnalyticsQueries, type QueryBundle } from './sqlite';
import './styles.css';

const DesignerSurface = lazy(() =>
  import('./DesignerSurface').then((module) => ({ default: module.DesignerSurface })),
);

const STORAGE_KEY = 'supersubset:vite-sqlite-dashboard';
/** Bump when the default fixture changes to invalidate localStorage cache. */
const FIXTURE_VERSION = 4;
const FIXTURE_VERSION_KEY = 'supersubset:vite-sqlite-fixture-version';

export default function App() {
  const [mode, setMode] = useState<'viewer' | 'designer'>('viewer');
  const [showCode, setShowCode] = useState(false);
  const [designerRevision, setDesignerRevision] = useState(0);
  const [dashboard, setDashboard] = useState<DashboardDefinition>(() => {
    const storedVersion = window.localStorage.getItem(FIXTURE_VERSION_KEY);
    if (storedVersion && Number(storedVersion) >= FIXTURE_VERSION) {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored) as DashboardDefinition;
    }
    // Stale or missing — reset to bundled default
    window.localStorage.setItem(FIXTURE_VERSION_KEY, String(FIXTURE_VERSION));
    return defaultDashboard;
  });
  const [filterState, setFilterState] = useState<FilterState>({ values: {} });
  const [bundle, setBundle] = useState<QueryBundle | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboard));
  }, [dashboard]);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setError(null);
    runAnalyticsQueries(filterState.values)
      .then((result) => {
        if (!active) return;
        setBundle(result);
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [filterState.values]);

  const resolvedTheme = useMemo(
    () => resolveTheme({
      type: 'inline',
      colors: {
        primary: '#0d5c63',
        background: '#f4fbfb',
        surface: '#ffffff',
        text: '#11333a',
        muted: '#5f7b81',
        border: '#d7e7e9',
      },
      typography: {
        fontFamily: 'Avenir Next, Segoe UI, sans-serif',
      },
    }),
    [],
  );

  const cssVariables = useMemo(() => themeToCssVariables(resolvedTheme), [resolvedTheme]);

  const handleImport = (nextDashboard: DashboardDefinition) => {
    setDashboard(nextDashboard);
    setDesignerRevision((current) => current + 1);
  };

  const registry = useMemo(() => {
    const registryInstance = createWidgetRegistry();
    registerEssentialWidgets(registryInstance);

    const originalGet = registryInstance.get.bind(registryInstance);
    registryInstance.get = (type: string) => {
      const Original = originalGet(type);
      if (!Original) return undefined;

      const Wrapped = (props: WidgetProps) => {
        const fixture = bundle?.widgetData[props.widgetId];
        return (
          <Original
            {...props}
            data={fixture?.data ?? props.data}
            columns={fixture?.columns ?? props.columns}
          />
        );
      };

      Wrapped.displayName = `SqliteQuery(${type})`;
      return Wrapped;
    };

    return registryInstance;
  }, [bundle]);

  return (
    <div className="shell">
      <header className="hero">
        <div>
          <div className="eyebrow">Vite + SQLite host example</div>
          <h1>Supersubset backed by an in-browser analytics store.</h1>
          <p>
            The host app owns query execution. Supersubset emits filter state; this app turns that state into
            SQLite queries and injects the resulting rows into the runtime widgets.
          </p>
        </div>
        <div className="mode-toggle">
          <button className={mode === 'viewer' ? 'active' : ''} onClick={() => setMode('viewer')}>Viewer</button>
          <button className={mode === 'designer' ? 'active' : ''} onClick={() => setMode('designer')}>Designer</button>
        </div>
      </header>

      <section className="info-grid">
        <div className="info-card">
          <h2>Host-owned persistence</h2>
          <p>Dashboard definition persists to localStorage. Importing a schema replaces the live dashboard state.</p>
        </div>
        <div className="info-card">
          <h2>Filter-driven SQL</h2>
          <p>Viewer filters feed directly into SQLite WHERE clauses and trigger fresh host queries.</p>
        </div>
      </section>

      {status === 'error' ? <div className="error-panel">SQLite bootstrap failed: {error}</div> : null}

      <main className="workspace">
        <section className="canvas-area">
          {mode === 'designer' ? (
            <Suspense fallback={<div className="loading-panel">Loading designer…</div>}>
              <DesignerSurface
                dashboard={dashboard}
                designerRevision={designerRevision}
                showCode={showCode}
                onChange={setDashboard}
                onImport={handleImport}
                onPublish={setDashboard}
                onToggleCode={() => setShowCode((current) => !current)}
              />
            </Suspense>
          ) : (
            <div className="viewer-shell">
              {status === 'loading' || !bundle ? <div className="loading-panel">Running SQLite queries…</div> : null}
              {bundle ? (
                <SupersubsetRenderer
                  definition={dashboard}
                  registry={registry}
                  theme={resolvedTheme as unknown as Record<string, unknown>}
                  cssVariables={cssVariables}
                  filterOptions={bundle.filterOptions}
                  onFilterChange={setFilterState}
                />
              ) : null}
            </div>
          )}
        </section>

        <aside className="query-panel">
          <h2>Query log</h2>
          <p>These statements are executed by the host app, not by Supersubset.</p>
          <pre>{bundle?.queryLog.join('\n\n') ?? 'Waiting for SQLite runtime…'}</pre>
        </aside>
      </main>
    </div>
  );
}