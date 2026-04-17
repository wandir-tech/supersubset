import { StrictMode, useMemo, useState, useCallback, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  SupersubsetRenderer,
  createWidgetRegistry,
  type WidgetProps,
  type NavigateRequest,
} from '@supersubset/runtime';
import { registerAllCharts } from '@supersubset/charts-echarts';
import { resolveTheme, themeToCssVariables } from '@supersubset/theme';
import {
  SupersubsetDesigner,
  ImportExportPanel,
  CodeViewPanel,
  LivePreviewPane,
  useUndoRedo,
  UndoRedoToolbar,
  useUndoRedoKeyboard,
  FilterBuilderPanel,
  SlideOverPanel,
  InteractionEditorPanel,
} from '@supersubset/designer';
import type { DashboardDefinition, InlineThemeDefinition } from '@supersubset/schema';
import type { NormalizedDataset } from '@supersubset/data-model';
import type { FilterDefinition } from '@supersubset/designer';
import {
  demoDashboard,
  alertsData,
  kpiData,
  trendData,
  regionData,
  ordersTableData,
  ordersTableColumns,
  pieData,
  scatterData,
  areaData,
  comboData,
  gaugeData,
  funnelData,
  radarData,
  treemapData,
  heatmapData,
  waterfallData,
  sankeyData,
  boxplotData,
} from './demo-dashboard';
import { dashboardSwitchingDemo, pageNavigationDemoDashboard } from './navigation-demo';
import { ProbeWorkspace } from './probe/ProbeWorkspace';

/**
 * Data-injecting widget wrapper — in a real app, the runtime would
 * fetch data via QueryAdapter. For the dev app demo, we inject fixture data.
 */
const DEMO_DATA: Record<
  string,
  { data: Record<string, unknown>[]; columns?: WidgetProps['columns'] }
> = {
  // Overview page
  'alerts-overview': { data: alertsData },
  'kpi-revenue': { data: kpiData },
  'kpi-orders': { data: kpiData },
  'kpi-aov': { data: kpiData },
  'chart-revenue-trend': { data: trendData },
  'chart-region-sales': { data: regionData },
  'table-orders': { data: ordersTableData, columns: ordersTableColumns },
  // Gallery page
  'chart-pie': { data: pieData },
  'chart-scatter': { data: scatterData },
  'chart-area': { data: areaData },
  'chart-combo': { data: comboData },
  'chart-gauge': { data: gaugeData },
  'chart-funnel': { data: funnelData },
  'chart-radar': { data: radarData },
  'chart-treemap': { data: treemapData },
  'chart-heatmap': { data: heatmapData },
  'chart-waterfall': { data: waterfallData },
  'chart-sankey': { data: sankeyData },
  'chart-boxplot': { data: boxplotData },
  // Pages vs dashboards demo
  'pages-kpi-revenue': { data: kpiData },
  'pages-kpi-orders': { data: kpiData },
  'pages-kpi-aov': { data: kpiData },
  'pages-chart-region-sales': { data: regionData },
  'pages-chart-revenue-trend': { data: trendData },
  'pages-table-orders': { data: ordersTableData, columns: ordersTableColumns },
  'exec-kpi-revenue': { data: kpiData },
  'exec-kpi-orders': { data: kpiData },
  'exec-chart-revenue-trend': { data: trendData },
  'exec-chart-region-sales': { data: regionData },
  'ops-kpi-orders': { data: kpiData },
  'ops-kpi-aov': { data: kpiData },
  'ops-chart-region-sales': { data: regionData },
  'ops-table-orders': { data: ordersTableData, columns: ordersTableColumns },
};

const FILTER_OPTIONS = {
  'filter-region': ['North', 'South', 'East', 'West'],
  'filter-category': ['Electronics', 'Clothing', 'Food', 'Home'],
};

type ViewerScenario = 'live' | 'pages' | 'dashboards';

function App() {
  const [mode, setMode] = useState<'viewer' | 'designer' | 'preview' | 'probe'>('viewer');
  const [viewerScenario, setViewerScenario] = useState<ViewerScenario>('live');
  const [activeDashboardId, setActiveDashboardId] = useState(
    dashboardSwitchingDemo.initialDashboardId,
  );
  const [savedDashboard, setSavedDashboard] = useState<DashboardDefinition | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showInteractions, setShowInteractions] = useState(false);
  const [demoFilters, setDemoFilters] = useState<FilterDefinition[]>(
    (demoDashboard.filters ?? []) as FilterDefinition[],
  );
  const [demoInteractions, setDemoInteractions] = useState<
    import('@supersubset/designer').InteractionDefinition[]
  >((demoDashboard.interactions ?? []) as import('@supersubset/designer').InteractionDefinition[]);

  // Demo datasets for FieldBindingPicker
  const demoDatasets: NormalizedDataset[] = useMemo(
    () => [
      {
        id: 'ds-orders',
        label: 'Orders',
        fields: [
          {
            id: 'order_date',
            label: 'Order Date',
            dataType: 'date' as const,
            role: 'time' as const,
          },
          { id: 'month', label: 'Month', dataType: 'string' as const, role: 'time' as const },
          {
            id: 'category',
            label: 'Category',
            dataType: 'string' as const,
            role: 'dimension' as const,
          },
          {
            id: 'region',
            label: 'Region',
            dataType: 'string' as const,
            role: 'dimension' as const,
          },
          {
            id: 'product',
            label: 'Product',
            dataType: 'string' as const,
            role: 'dimension' as const,
          },
          { id: 'stage', label: 'Stage', dataType: 'string' as const, role: 'dimension' as const },
          { id: 'item', label: 'Item', dataType: 'string' as const, role: 'dimension' as const },
          {
            id: 'source',
            label: 'Source',
            dataType: 'string' as const,
            role: 'dimension' as const,
          },
          { id: 'page', label: 'Page', dataType: 'string' as const, role: 'dimension' as const },
          { id: 'hour', label: 'Hour', dataType: 'string' as const, role: 'dimension' as const },
          { id: 'day', label: 'Day', dataType: 'string' as const, role: 'dimension' as const },
          {
            id: 'revenue',
            label: 'Revenue',
            dataType: 'number' as const,
            role: 'measure' as const,
            defaultAggregation: 'sum' as const,
          },
          {
            id: 'prevRevenue',
            label: 'Prev Revenue',
            dataType: 'number' as const,
            role: 'measure' as const,
          },
          {
            id: 'orders',
            label: 'Orders',
            dataType: 'integer' as const,
            role: 'measure' as const,
            defaultAggregation: 'count' as const,
          },
          {
            id: 'prevOrders',
            label: 'Prev Orders',
            dataType: 'integer' as const,
            role: 'measure' as const,
          },
          {
            id: 'aov',
            label: 'Avg Order Value',
            dataType: 'number' as const,
            role: 'measure' as const,
          },
          {
            id: 'quantity',
            label: 'Quantity',
            dataType: 'integer' as const,
            role: 'measure' as const,
            defaultAggregation: 'sum' as const,
          },
          {
            id: 'amount',
            label: 'Amount',
            dataType: 'number' as const,
            role: 'measure' as const,
            defaultAggregation: 'sum' as const,
          },
          { id: 'profit', label: 'Profit', dataType: 'number' as const, role: 'measure' as const },
          { id: 'online', label: 'Online', dataType: 'number' as const, role: 'measure' as const },
          {
            id: 'margin',
            label: 'Margin %',
            dataType: 'number' as const,
            role: 'measure' as const,
          },
          {
            id: 'achievement',
            label: 'Achievement',
            dataType: 'number' as const,
            role: 'measure' as const,
          },
          {
            id: 'count',
            label: 'Count',
            dataType: 'integer' as const,
            role: 'measure' as const,
            defaultAggregation: 'count' as const,
          },
          {
            id: 'sales',
            label: 'Sales',
            dataType: 'number' as const,
            role: 'measure' as const,
            defaultAggregation: 'sum' as const,
          },
          {
            id: 'visits',
            label: 'Visits',
            dataType: 'integer' as const,
            role: 'measure' as const,
            defaultAggregation: 'sum' as const,
          },
        ],
        source: { type: 'table', name: 'orders' },
      },
      {
        id: 'ds-ops-alerts',
        label: 'Operations Alerts',
        fields: [
          {
            id: 'alert_title',
            label: 'Alert Title',
            dataType: 'string' as const,
            role: 'dimension' as const,
          },
          {
            id: 'alert_message',
            label: 'Alert Message',
            dataType: 'string' as const,
            role: 'dimension' as const,
          },
          {
            id: 'severity',
            label: 'Severity',
            dataType: 'string' as const,
            role: 'dimension' as const,
          },
          {
            id: 'detected_at',
            label: 'Detected At',
            dataType: 'date' as const,
            role: 'time' as const,
          },
        ],
        source: { type: 'table', name: 'ops_alerts' },
      },
    ],
    [],
  );

  // Undo/redo for designer mode
  const undoRedo = useUndoRedo(demoDashboard, { debounceMs: 500 });
  useUndoRedoKeyboard(undoRedo.undo, undoRedo.redo, mode === 'designer');
  const currentDashboard = undoRedo.current;
  const currentPages = currentDashboard.pages;
  const viewerDashboard = useMemo(() => {
    if (viewerScenario === 'pages') {
      return pageNavigationDemoDashboard;
    }

    if (viewerScenario === 'dashboards') {
      return (
        dashboardSwitchingDemo.dashboards.find((dashboard) => dashboard.id === activeDashboardId) ??
        dashboardSwitchingDemo.dashboards[0]!
      );
    }

    return currentDashboard;
  }, [activeDashboardId, currentDashboard, viewerScenario]);
  const viewerPages = viewerDashboard.pages;
  const [viewerActivePage, setViewerActivePage] = useState(viewerDashboard.pages[0]?.id ?? '');
  const [viewerInitialFilterValues, setViewerInitialFilterValues] = useState<
    Record<string, unknown> | undefined
  >(undefined);

  useEffect(() => {
    if (!viewerPages.some((page) => page.id === viewerActivePage)) {
      setViewerActivePage(viewerPages[0]?.id ?? '');
    }
  }, [viewerActivePage, viewerPages]);

  useEffect(() => {
    setViewerInitialFilterValues(undefined);
  }, [activeDashboardId, viewerScenario]);

  const registry = useMemo(() => {
    const reg = createWidgetRegistry();
    registerAllCharts(reg);

    // Wrap each widget to inject demo data
    const originalGet = reg.get.bind(reg);
    reg.get = (type: string) => {
      const Original = originalGet(type);
      if (!Original) return undefined;

      const Wrapped = (props: WidgetProps) => {
        const demoData = DEMO_DATA[props.widgetId];
        return (
          <Original
            {...props}
            data={demoData?.data ?? props.data}
            columns={demoData?.columns ?? props.columns}
          />
        );
      };
      Wrapped.displayName = `DemoData(${type})`;
      return Wrapped;
    };

    return reg;
  }, []);

  const designerInlineTheme = currentDashboard.theme as InlineThemeDefinition | undefined;
  const designerResolvedTheme = useMemo(
    () => resolveTheme(designerInlineTheme ?? null),
    [designerInlineTheme],
  );
  const designerCssVars = useMemo(
    () => themeToCssVariables(designerResolvedTheme),
    [designerResolvedTheme],
  );
  const viewerInlineTheme = viewerDashboard.theme as InlineThemeDefinition | undefined;
  const viewerResolvedTheme = useMemo(
    () => resolveTheme(viewerInlineTheme ?? null),
    [viewerInlineTheme],
  );
  const viewerCssVars = useMemo(
    () => themeToCssVariables(viewerResolvedTheme),
    [viewerResolvedTheme],
  );

  const handleViewerNavigate = useCallback(
    (request: NavigateRequest) => {
      if (request.target.kind !== 'page') {
        console.warn(
          '[Supersubset] Dashboard navigation targets are not enabled in the dev app yet.',
          request.target,
        );
        return;
      }

      const pageId = request.target.pageId;
      const filterState = request.filterState;

      if (viewerScenario === 'pages') {
        const nextFilterValues: Record<string, unknown> = {};
        const regionValue = filterState?.region ?? filterState?.name;

        if (typeof regionValue === 'string' && regionValue.length > 0) {
          nextFilterValues['filter-region'] = regionValue;
        }

        if (typeof filterState?.category === 'string' && filterState.category.length > 0) {
          nextFilterValues['filter-category'] = filterState.category;
        }

        setViewerInitialFilterValues(
          Object.keys(nextFilterValues).length > 0 ? nextFilterValues : undefined,
        );
      }

      setViewerActivePage(pageId);
    },
    [viewerScenario],
  );

  const viewerRendererKey = useMemo(
    () =>
      JSON.stringify({
        dashboardId: viewerDashboard.id,
        initialFilters: viewerInitialFilterValues ?? null,
      }),
    [viewerDashboard.id, viewerInitialFilterValues],
  );

  const handlePublish = useCallback(
    (dashboard: DashboardDefinition) => {
      setSavedDashboard(dashboard);
      undoRedo.push(dashboard);
      console.log('[Supersubset] Dashboard published:', JSON.stringify(dashboard, null, 2));
      alert(
        `Dashboard "${dashboard.title}" saved! (${dashboard.pages[0]?.widgets?.length ?? 0} widgets)`,
      );
    },
    [undoRedo],
  );

  return (
    <div>
      {/* Mode toggle bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 24px',
          background: '#1a1a2e',
          color: '#fff',
          fontFamily: 'sans-serif',
          fontSize: 14,
        }}
      >
        <strong style={{ fontSize: 16, marginRight: 8 }}>⚡ Supersubset</strong>
        <button
          onClick={() => setMode('viewer')}
          style={{
            padding: '6px 14px',
            borderRadius: 4,
            border: 'none',
            cursor: 'pointer',
            background: mode === 'viewer' ? '#3b82f6' : '#333',
            color: '#fff',
            fontWeight: mode === 'viewer' ? 700 : 400,
          }}
        >
          📊 Viewer
        </button>
        <button
          onClick={() => setMode('designer')}
          style={{
            padding: '6px 14px',
            borderRadius: 4,
            border: 'none',
            cursor: 'pointer',
            background: mode === 'designer' ? '#3b82f6' : '#333',
            color: '#fff',
            fontWeight: mode === 'designer' ? 700 : 400,
          }}
        >
          🎨 Designer
        </button>
        <button
          onClick={() => setMode('preview')}
          style={{
            padding: '6px 14px',
            borderRadius: 4,
            border: 'none',
            cursor: 'pointer',
            background: mode === 'preview' ? '#3b82f6' : '#333',
            color: '#fff',
            fontWeight: mode === 'preview' ? 700 : 400,
          }}
        >
          👁 Preview
        </button>
        <button
          data-testid="mode-probe"
          onClick={() => setMode('probe')}
          style={{
            padding: '6px 14px',
            borderRadius: 4,
            border: 'none',
            cursor: 'pointer',
            background: mode === 'probe' ? '#3b82f6' : '#333',
            color: '#fff',
            fontWeight: mode === 'probe' ? 700 : 400,
          }}
        >
          🔌 Probe
        </button>
        {savedDashboard && (
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#aaa' }}>
            Last saved: {savedDashboard.title} ({savedDashboard.pages[0]?.widgets?.length ?? 0}{' '}
            widgets)
          </span>
        )}
      </div>

      {mode === 'probe' ? (
        <ProbeWorkspace />
      ) : mode === 'designer' ? (
        <div style={{ display: 'flex', height: 'calc(100vh - 44px)' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div
              style={{ flex: showCode ? '1 1 60%' : '1 1 100%', overflow: 'hidden', minHeight: 0 }}
            >
              <SupersubsetDesigner
                value={currentDashboard}
                onChange={undoRedo.push}
                onPublish={handlePublish}
                headerTitle="Supersubset Designer"
                height="100%"
                datasets={demoDatasets}
                headerActions={
                  <div
                    data-testid="dev-app-designer-actions"
                    data-supersubset-scroll-inline="true"
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
                    <ImportExportPanel
                      dashboard={currentDashboard}
                      onImport={(d) => {
                        undoRedo.reset(d);
                        setSavedDashboard(d);
                      }}
                    />
                    <button
                      onClick={() => setShowCode(!showCode)}
                      data-testid="code-toggle"
                      style={{
                        padding: '4px 10px',
                        borderRadius: 4,
                        border: '1px solid #ccc',
                        background: showCode ? '#e0edff' : '#fff',
                        color: '#333',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: showCode ? 600 : 400,
                      }}
                    >
                      {'</>'} Code
                    </button>
                    {/* Separator */}
                    <span
                      style={{ width: 1, height: 20, background: '#d1d5db', margin: '0 4px' }}
                    />
                    {/* Dashboard Config Group */}
                    <button
                      onClick={() => {
                        setShowFilters(!showFilters);
                        setShowInteractions(false);
                      }}
                      data-testid="filters-toggle"
                      style={{
                        padding: '4px 10px',
                        borderRadius: 4,
                        border: '1px solid #ccc',
                        background: showFilters ? '#e0edff' : '#fff',
                        color: '#333',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: showFilters ? 600 : 400,
                      }}
                    >
                      ⛶ Filters{demoFilters.length > 0 ? ` (${demoFilters.length})` : ''}
                    </button>
                    <button
                      onClick={() => {
                        setShowInteractions(!showInteractions);
                        setShowFilters(false);
                      }}
                      data-testid="interactions-toggle"
                      style={{
                        padding: '4px 10px',
                        borderRadius: 4,
                        border: '1px solid #ccc',
                        background: showInteractions ? '#e0edff' : '#fff',
                        color: '#333',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: showInteractions ? 600 : 400,
                      }}
                    >
                      ⚡ Interactions
                      {demoInteractions.length > 0 ? ` (${demoInteractions.length})` : ''}
                    </button>
                  </div>
                }
              />
            </div>
            {showCode && (
              <div style={{ flex: '0 0 300px', borderTop: '2px solid #e0e0e0' }}>
                <CodeViewPanel dashboard={currentDashboard} height="300px" />
              </div>
            )}
          </div>
          {/* Slide-over: Filters */}
          <SlideOverPanel
            open={showFilters}
            onClose={() => setShowFilters(false)}
            title="Dashboard Filters"
            subtitle="Define filters that users can interact with at runtime"
            width={420}
          >
            <FilterBuilderPanel
              filters={demoFilters}
              onChange={setDemoFilters}
              datasets={demoDatasets}
              pageIds={currentPages.map((p) => p.id)}
              widgetIds={currentPages.flatMap((p) => p.widgets?.map((w) => w.id) ?? [])}
            />
          </SlideOverPanel>
          {/* Slide-over: Interactions */}
          <SlideOverPanel
            open={showInteractions}
            onClose={() => setShowInteractions(false)}
            title="Widget Interactions"
            subtitle="Configure how widgets respond to user events"
            width={420}
          >
            <InteractionEditorPanel
              interactions={demoInteractions}
              onChange={setDemoInteractions}
              widgetIds={currentPages.flatMap((p) => p.widgets?.map((w) => w.id) ?? [])}
              pageIds={currentPages.map((p) => p.id)}
              fieldIds={demoDatasets.flatMap((ds) => ds.fields.map((f) => f.id))}
            />
          </SlideOverPanel>
        </div>
      ) : mode === 'preview' ? (
        <LivePreviewPane
          dashboard={currentDashboard}
          registry={registry}
          theme={designerResolvedTheme as unknown as Record<string, unknown>}
          cssVariables={designerCssVars}
          RendererComponent={SupersubsetRenderer as never}
          height="calc(100vh - 44px)"
        />
      ) : (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px' }}>
          <section
            style={{
              marginBottom: '20px',
              border: '1px solid #d9e2f2',
              borderRadius: 16,
              padding: '18px 20px',
              background: 'linear-gradient(135deg, #f8fbff 0%, #fff7ed 100%)',
              boxShadow: '0 14px 32px rgba(15, 23, 42, 0.08)',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: 16,
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ maxWidth: 760 }}>
                <h2 style={{ margin: 0, fontSize: 24, color: '#0f172a' }}>Pages vs dashboards</h2>
                <p style={{ margin: '10px 0 8px', color: '#334155', lineHeight: 1.55 }}>
                  A page is another canvas inside the same dashboard document. Pages share the
                  dashboard id, filter contract, theme, and saved state. A separate dashboard is a
                  different document with its own identity, route, defaults, and ownership boundary.
                </p>
                <p style={{ margin: 0, color: '#475569', lineHeight: 1.55 }}>
                  Use pages when you are staying inside one analytical workbook. Use separate
                  dashboards when the user is moving into a different analytical product surface.
                  The demos below show both patterns with the current runtime.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  data-testid="viewer-scenario-live"
                  onClick={() => setViewerScenario('live')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 999,
                    border: '1px solid #cbd5e1',
                    background: viewerScenario === 'live' ? '#0f172a' : '#fff',
                    color: viewerScenario === 'live' ? '#fff' : '#0f172a',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Live dashboard
                </button>
                <button
                  data-testid="viewer-scenario-pages"
                  onClick={() => setViewerScenario('pages')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 999,
                    border: '1px solid #cbd5e1',
                    background: viewerScenario === 'pages' ? '#0f172a' : '#fff',
                    color: viewerScenario === 'pages' ? '#fff' : '#0f172a',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  One dashboard, two pages
                </button>
                <button
                  data-testid="viewer-scenario-dashboards"
                  onClick={() => setViewerScenario('dashboards')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 999,
                    border: '1px solid #cbd5e1',
                    background: viewerScenario === 'dashboards' ? '#0f172a' : '#fff',
                    color: viewerScenario === 'dashboards' ? '#fff' : '#0f172a',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Two separate dashboards
                </button>
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 12,
                marginTop: 16,
              }}
            >
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.84)',
                  borderRadius: 12,
                  padding: 14,
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                }}
              >
                <strong style={{ display: 'block', marginBottom: 6, color: '#0f172a' }}>
                  Page
                </strong>
                <span style={{ color: '#475569', lineHeight: 1.5 }}>
                  An alternate view inside one dashboard document. Same id, same filter bar, same
                  interaction set, same persistence envelope.
                </span>
              </div>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.84)',
                  borderRadius: 12,
                  padding: 14,
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                }}
              >
                <strong style={{ display: 'block', marginBottom: 6, color: '#0f172a' }}>
                  Separate dashboard
                </strong>
                <span style={{ color: '#475569', lineHeight: 1.5 }}>
                  A different document. It can have a different title, route, layout, theme, owner,
                  defaults, and filter contract.
                </span>
              </div>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.84)',
                  borderRadius: 12,
                  padding: 14,
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                }}
              >
                <strong style={{ display: 'block', marginBottom: 6, color: '#0f172a' }}>
                  What to try
                </strong>
                <span style={{ color: '#475569', lineHeight: 1.5 }}>
                  In the page demo, click the region chart to navigate to another page. In the
                  dashboard demo, use the host buttons to switch documents and notice the separate
                  titles and themes.
                </span>
              </div>
            </div>
          </section>

          {viewerScenario === 'dashboards' && (
            <section
              style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}
            >
              {dashboardSwitchingDemo.dashboards.map((dashboard) => (
                <button
                  key={dashboard.id}
                  data-testid={`dashboard-switch-${dashboard.id}`}
                  onClick={() => setActiveDashboardId(dashboard.id)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid #d6d3d1',
                    background: activeDashboardId === dashboard.id ? '#fff7ed' : '#fff',
                    color: '#7c2d12',
                    fontWeight: activeDashboardId === dashboard.id ? 700 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {dashboard.title}
                </button>
              ))}
            </section>
          )}

          {viewerPages.length > 1 && (
            <nav
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '16px',
                borderBottom: '2px solid #e0e0e0',
                paddingBottom: '8px',
              }}
            >
              {viewerPages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => setViewerActivePage(page.id)}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '4px 4px 0 0',
                    cursor: 'pointer',
                    fontWeight: viewerActivePage === page.id ? 700 : 400,
                    background:
                      viewerActivePage === page.id
                        ? 'var(--ss-color-primary, #1677ff)'
                        : 'transparent',
                    color: viewerActivePage === page.id ? '#fff' : 'var(--ss-color-text, #1f1f1f)',
                    fontSize: '14px',
                  }}
                >
                  {page.title}
                </button>
              ))}
            </nav>
          )}
          <SupersubsetRenderer
            key={viewerRendererKey}
            definition={viewerDashboard}
            registry={registry}
            theme={viewerResolvedTheme as unknown as Record<string, unknown>}
            cssVariables={viewerCssVars}
            activePage={viewerActivePage}
            initialFilterValues={viewerInitialFilterValues}
            filterOptions={FILTER_OPTIONS}
            onNavigate={handleViewerNavigate}
            onFilterChange={(state) => console.log('[Supersubset] Filter state:', state)}
            onWidgetEvent={(event) => console.log('[Supersubset] Widget event:', event)}
          />
        </div>
      )}
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
