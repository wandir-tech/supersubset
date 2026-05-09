import { Suspense, lazy, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { SupersubsetRenderer, createWidgetRegistry, type FilterState } from '@supersubset/runtime';
import type { QueryAdapter } from '@supersubset/data-model';
import { registerEssentialWidgets } from '@supersubset/charts-echarts/essentials';
import { resolveTheme, themeToCssVariables } from '@supersubset/theme';
import type { DashboardDefinition } from '@supersubset/schema';
import { defaultDashboard } from './dashboard';
import {
  compileSqliteLogicalQuery,
  ensureSqliteReady,
  executeSqliteLogicalQuery,
  fetchDesignerPreviewData,
  formatSqliteQueryLogEntry,
} from './sqlite';
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
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as DashboardDefinition;
          // Basic structural validation: must have pages array with at least one page
          if (Array.isArray(parsed.pages) && parsed.pages.length > 0 && parsed.pages[0].layout) {
            return parsed;
          }
        } catch {
          // Corrupt JSON — fall through to reset
        }
      }
    }
    // Stale, missing, or structurally invalid — reset to bundled default
    window.localStorage.setItem(FIXTURE_VERSION_KEY, String(FIXTURE_VERSION));
    return defaultDashboard;
  });
  const [filterState, setFilterState] = useState<FilterState>({ values: {} });
  const [sqliteReady, setSqliteReady] = useState(false);
  const [queryLog, setQueryLog] = useState<string[]>([]);
  const [viewerStatus, setViewerStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const queryCycleRef = useRef({ generation: 0, pending: 0, failed: false });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboard));
  }, [dashboard]);

  useEffect(() => {
    let active = true;
    setError(null);
    ensureSqliteReady()
      .then(() => {
        if (!active) return;
        setSqliteReady(true);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      active = false;
    };
  }, []);

  useLayoutEffect(() => {
    if (!sqliteReady || mode !== 'viewer') {
      if (mode !== 'viewer') {
        setViewerStatus('idle');
      }
      return;
    }

    queryCycleRef.current = {
      generation: queryCycleRef.current.generation + 1,
      pending: 0,
      failed: false,
    };
    setQueryLog([]);
    setViewerStatus('loading');
    setError(null);
  }, [dashboard, filterState.values, mode, sqliteReady]);

  const resolvedTheme = useMemo(
    () =>
      resolveTheme({
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

  const handleReset = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.setItem(FIXTURE_VERSION_KEY, String(FIXTURE_VERSION));
    setDashboard(defaultDashboard);
    setDesignerRevision((current) => current + 1);
  };

  const registry = useMemo(() => {
    const registryInstance = createWidgetRegistry();
    registerEssentialWidgets(registryInstance);

    return registryInstance;
  }, []);

  const queryAdapter = useMemo<QueryAdapter | undefined>(() => {
    if (!sqliteReady || mode !== 'viewer') {
      return undefined;
    }

    return {
      name: 'vite-sqlite-host',
      execute: async (query) => {
        const generation = queryCycleRef.current.generation;
        queryCycleRef.current.pending += 1;
        const compiledQuery = compileSqliteLogicalQuery(query);
        setQueryLog((current) => [...current, formatSqliteQueryLogEntry(compiledQuery)]);

        try {
          return await executeSqliteLogicalQuery(query, compiledQuery);
        } catch (nextError) {
          if (generation === queryCycleRef.current.generation) {
            queryCycleRef.current.failed = true;
            setViewerStatus('error');
            setError(nextError instanceof Error ? nextError.message : String(nextError));
          }

          throw nextError;
        } finally {
          if (generation === queryCycleRef.current.generation) {
            queryCycleRef.current.pending = Math.max(0, queryCycleRef.current.pending - 1);
            if (queryCycleRef.current.pending === 0 && !queryCycleRef.current.failed) {
              setViewerStatus('ready');
            }
          }
        }
      },
    };
  }, [mode, sqliteReady]);

  return (
    <div className={mode === 'designer' ? 'shell shell--designer' : 'shell'}>
      <header className="hero">
        <div>
          <div className="eyebrow">Vite + SQLite host example</div>
          <h1>Supersubset backed by an in-browser analytics store.</h1>
          <p>
            The host app owns query execution. Supersubset emits filter state; this app turns that
            state into SQLite queries and injects the resulting rows into the runtime widgets.
          </p>
        </div>
        <div className="mode-toggle">
          <button className={mode === 'viewer' ? 'active' : ''} onClick={() => setMode('viewer')}>
            Viewer
          </button>
          <button
            className={mode === 'designer' ? 'active' : ''}
            onClick={() => setMode('designer')}
          >
            Designer
          </button>
          <button onClick={handleReset} title="Reset dashboard to bundled defaults">
            Reset
          </button>
        </div>
      </header>

      <section className="info-grid">
        <div className="info-card">
          <h2>Host-owned persistence</h2>
          <p>
            Dashboard definition persists to localStorage. Importing a schema replaces the live
            dashboard state.
          </p>
        </div>
        <div className="info-card">
          <h2>Filter-driven SQL</h2>
          <p>
            Viewer filters feed directly into SQLite WHERE clauses and trigger fresh host queries.
          </p>
        </div>
      </section>

      {error ? <div className="error-panel">SQLite bootstrap failed: {error}</div> : null}

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
              {!sqliteReady || viewerStatus === 'loading' ? (
                <div className="loading-panel">Running SQLite queries…</div>
              ) : null}
              {sqliteReady ? (
                <SupersubsetRenderer
                  definition={dashboard}
                  registry={registry}
                  theme={resolvedTheme as unknown as Record<string, unknown>}
                  cssVariables={cssVariables}
                  queryAdapter={queryAdapter}
                  onFilterChange={setFilterState}
                />
              ) : null}
            </div>
          )}
        </section>

        <aside className="query-panel">
          <h2>Query log</h2>
          <p>These statements are executed by the host app, not by Supersubset.</p>
          <pre>{queryLog.join('\n\n') || 'Waiting for SQLite runtime…'}</pre>
        </aside>
      </main>
    </div>
  );
}
