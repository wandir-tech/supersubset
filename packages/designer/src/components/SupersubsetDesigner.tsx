/**
 * SupersubsetDesigner — main designer component wrapping Puck.
 *
 * Supports controlled mode (value + onChange) and uncontrolled mode (defaultValue + onPublish).
 * Emits canonical DashboardDefinition — host app owns persistence.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Puck, blocksPlugin, outlinePlugin } from '@puckeditor/core';
import type { Data } from '@puckeditor/core';
import type { DashboardDefinition, PageDefinition } from '@supersubset/schema';
import type { NormalizedDataset } from '@supersubset/data-model';
import { createPuckConfig } from '../config/puck-config';
import { puckToCanonical, canonicalToPuck } from '../adapters/puck-canonical';
import { getComponentIcon } from '../icons/component-icons';
import { DatasetProvider } from '../context/DatasetContext';
import { PreviewDataProvider, type FetchPreviewData } from '../context/PreviewDataContext';
import { DesignerHeaderControls } from './DesignerHeaderControls';
import {
  createDesignerA11yInstanceId,
  decorateDesignerShell,
  injectDesignerSidebarStyles,
} from './designer-shell-utils';
import { FilterBuilderPanel } from './FilterBuilderPanel';
import { SlideOverPanel } from './SlideOverPanel';

// Import Puck's CSS
import '@puckeditor/core/puck.css';

export interface SupersubsetDesignerProps {
  /** Controlled mode: current dashboard definition */
  value?: DashboardDefinition;
  /** Controlled mode: called when dashboard changes */
  onChange?: (dashboard: DashboardDefinition) => void;
  /** Called when local title drafts differ from the canonical dashboard value */
  onDraftStateChange?: (hasUncommittedDraft: boolean) => void;
  /** Uncontrolled mode: initial dashboard definition */
  defaultValue?: DashboardDefinition;
  /** Called when user clicks "Publish" / Save */
  onPublish?: (dashboard: DashboardDefinition) => void;
  /** Dashboard title shown in header */
  headerTitle?: string;
  /** Height of the editor. Default: '100vh' */
  height?: string | number;
  /** Disable iframes for the preview (renders inline). Default: false (iframe enabled) */
  disableIframe?: boolean;
  /** Additional metadata passed to Puck components */
  metadata?: Record<string, unknown>;
  /** Available datasets for field reference dropdowns */
  datasets?: NormalizedDataset[];
  /** Callback to fetch real data for chart previews. When provided,
   *  chart previews show live data instead of static sample data. */
  fetchPreviewData?: FetchPreviewData;
  /** Custom actions rendered in the Puck header (right side, before Publish) */
  headerActions?: React.ReactNode;
}

const DEFAULT_DASHBOARD_TITLE = 'Untitled Dashboard';

/**
 * Embeddable dashboard designer backed by Puck.
 *
 * Usage:
 *   <SupersubsetDesigner
 *     defaultValue={existingDashboard}
 *     onPublish={(dashboard) => saveToDB(dashboard)}
 *   />
 */
export function SupersubsetDesigner(props: SupersubsetDesignerProps) {
  const {
    value,
    onChange,
    onDraftStateChange,
    defaultValue,
    onPublish,
    headerTitle,
    height = '100vh',
    disableIframe = false,
    metadata,
    datasets,
    fetchPreviewData,
    headerActions,
  } = props;

  const isControlled = value !== undefined;
  const [uncontrolledDashboard, setUncontrolledDashboard] = useState<
    DashboardDefinition | undefined
  >(defaultValue);
  const sourceDashboard = isControlled ? value : (uncontrolledDashboard ?? defaultValue);
  const pages = sourceDashboard?.pages ?? [];
  const [activePageId, setActivePageId] = useState<string | undefined>(
    sourceDashboard?.defaults?.activePage ?? sourceDashboard?.pages[0]?.id,
  );
  const activePage =
    pages.find((page) => page.id === activePageId) ??
    pages.find((page) => page.id === sourceDashboard?.defaults?.activePage) ??
    pages[0];
  const activePageIndex = activePage ? pages.findIndex((page) => page.id === activePage.id) : 0;
  const [pageTitleDraft, setPageTitleDraft] = useState(activePage?.title ?? '');
  const [dashboardTitleDraft, setDashboardTitleDraft] = useState(
    sourceDashboard?.title ?? DEFAULT_DASHBOARD_TITLE,
  );
  const [showFilters, setShowFilters] = useState(false);
  const [pendingDeletePageId, setPendingDeletePageId] = useState<string | undefined>();
  const [controlledSyncRevision, setControlledSyncRevision] = useState(0);
  const canMutateDashboard = !isControlled || !!onChange;
  const pendingDeletePage = pages.find((page) => page.id === pendingDeletePageId);
  const hasUncommittedDraftChanges =
    canMutateDashboard &&
    (pageTitleDraft !== (activePage?.title ?? '') ||
      dashboardTitleDraft !== (sourceDashboard?.title ?? DEFAULT_DASHBOARD_TITLE));

  const config = useMemo(
    () => createPuckConfig({ filterDefinitions: sourceDashboard?.filters ?? [] }),
    [sourceDashboard?.filters],
  );

  // Inject sidebar CSS overrides once
  useMemo(() => injectDesignerSidebarStyles(), []);

  // Rename sidebar tabs: "Blocks" → "Components", "Outline" → "Layers"
  // Puck merges plugins by name key — same name overrides the default
  const plugins = useMemo(
    () => [
      { ...blocksPlugin(), label: 'Components' },
      { ...outlinePlugin(), label: 'Layers' },
    ],
    [],
  );

  // Use ref for headerActions to keep overrides stable across renders
  const headerActionsRef = useRef<React.ReactNode>(null);
  headerActionsRef.current = headerActions;
  const designerRootRef = useRef<HTMLDivElement | null>(null);
  const a11yInstanceIdRef = useRef(createDesignerA11yInstanceId());
  const lastHandledControlledSignatureRef = useRef<string | undefined>(undefined);
  const lastEmittedControlledSignatureRef = useRef<string | undefined>(undefined);
  const draftStateChangeRef = useRef(onDraftStateChange);
  const controlledValueSignature = useMemo(
    () => (isControlled ? createDashboardSyncSignature(value) : undefined),
    [isControlled, value],
  );

  useEffect(() => {
    draftStateChangeRef.current = onDraftStateChange;
  }, [onDraftStateChange]);

  useEffect(() => {
    const nextActivePageId = activePage?.id;
    if (nextActivePageId !== activePageId) {
      setActivePageId(nextActivePageId);
    }
  }, [activePage, activePageId]);

  useEffect(() => {
    setPageTitleDraft(activePage?.title ?? '');
  }, [activePage?.id, activePage?.title]);

  useEffect(() => {
    setDashboardTitleDraft(sourceDashboard?.title ?? DEFAULT_DASHBOARD_TITLE);
  }, [sourceDashboard?.title]);

  useEffect(() => {
    draftStateChangeRef.current?.(hasUncommittedDraftChanges);
  }, [hasUncommittedDraftChanges]);

  useEffect(() => {
    return () => {
      draftStateChangeRef.current?.(false);
    };
  }, []);

  useEffect(() => {
    if (!isControlled) {
      lastHandledControlledSignatureRef.current = undefined;
      lastEmittedControlledSignatureRef.current = undefined;
      return;
    }

    if (controlledValueSignature === undefined) {
      lastHandledControlledSignatureRef.current = undefined;
      return;
    }

    const lastHandledSignature = lastHandledControlledSignatureRef.current;
    lastHandledControlledSignatureRef.current = controlledValueSignature;

    if (
      lastHandledSignature === undefined ||
      lastHandledSignature === controlledValueSignature ||
      controlledValueSignature === lastEmittedControlledSignatureRef.current
    ) {
      return;
    }

    setControlledSyncRevision((revision) => revision + 1);
  }, [controlledValueSignature, isControlled]);

  const emitDashboardChange = useCallback(
    (dashboard: DashboardDefinition) => {
      if (isControlled) {
        lastEmittedControlledSignatureRef.current = createDashboardSyncSignature(dashboard);
      }
      if (!isControlled) {
        setUncontrolledDashboard(dashboard);
      }
      onChange?.(dashboard);
    },
    [isControlled, onChange],
  );

  const reportDraftState = useCallback(
    (nextDashboardTitleDraft: string, nextPageTitleDraft: string) => {
      draftStateChangeRef.current?.(
        canMutateDashboard &&
          (nextPageTitleDraft !== (activePage?.title ?? '') ||
            nextDashboardTitleDraft !== (sourceDashboard?.title ?? DEFAULT_DASHBOARD_TITLE)),
      );
    },
    [activePage?.title, canMutateDashboard, sourceDashboard?.title],
  );

  const handlePageTitleDraftChange = useCallback(
    (nextValue: string) => {
      setPageTitleDraft(nextValue);
      reportDraftState(dashboardTitleDraft, nextValue);
    },
    [dashboardTitleDraft, reportDraftState],
  );

  const handleDashboardTitleDraftChange = useCallback(
    (nextValue: string) => {
      setDashboardTitleDraft(nextValue);
      reportDraftState(nextValue, pageTitleDraft);
    },
    [pageTitleDraft, reportDraftState],
  );

  const handleResetPageTitleDraft = useCallback(() => {
    if (!activePage) {
      return;
    }

    setPageTitleDraft(activePage.title);
  }, [activePage]);

  const handleResetDashboardTitleDraft = useCallback(() => {
    setDashboardTitleDraft(sourceDashboard?.title ?? DEFAULT_DASHBOARD_TITLE);
  }, [sourceDashboard?.title]);

  const handleAddPage = useCallback(() => {
    if (!canMutateDashboard) {
      return;
    }

    const baseDashboard = sourceDashboard ?? createEmptyDashboard();
    const nextTitle = createNextPageTitle(baseDashboard.pages);
    const nextPage = createEmptyPage(nextTitle, baseDashboard.pages);
    const nextDashboard = withActivePageDefault(
      {
        ...baseDashboard,
        pages: [...baseDashboard.pages, nextPage],
      },
      nextPage.id,
    );

    setActivePageId(nextPage.id);
    setPendingDeletePageId(undefined);
    emitDashboardChange(nextDashboard);
  }, [canMutateDashboard, emitDashboardChange, sourceDashboard]);

  const handleSelectPage = useCallback((pageId: string) => {
    setActivePageId(pageId);
    setPendingDeletePageId(undefined);
  }, []);

  const handleRequestDeletePage = useCallback(
    (pageId: string) => {
      if (!canMutateDashboard || pages.length <= 1) {
        return;
      }

      setPendingDeletePageId(pageId);
    },
    [canMutateDashboard, pages.length],
  );

  const handleCancelDeletePage = useCallback(() => {
    setPendingDeletePageId(undefined);
  }, []);

  const handleConfirmDeletePage = useCallback(() => {
    if (!canMutateDashboard || !sourceDashboard || !pendingDeletePageId || pages.length <= 1) {
      return;
    }

    const pageIndexToDelete = pages.findIndex((page) => page.id === pendingDeletePageId);
    if (pageIndexToDelete === -1) {
      setPendingDeletePageId(undefined);
      return;
    }

    const nextPages = pages.filter((page) => page.id !== pendingDeletePageId);
    const nextActivePage =
      activePage?.id === pendingDeletePageId
        ? (nextPages[Math.max(0, pageIndexToDelete - 1)] ?? nextPages[0])
        : (nextPages.find((page) => page.id === activePage?.id) ?? nextPages[0]);
    const nextDashboard = withActivePageDefault(
      {
        ...sourceDashboard,
        pages: nextPages,
      },
      nextActivePage?.id,
    );

    setActivePageId(nextActivePage?.id);
    setPendingDeletePageId(undefined);
    emitDashboardChange(nextDashboard);
  }, [
    activePage?.id,
    canMutateDashboard,
    emitDashboardChange,
    pages,
    pendingDeletePageId,
    sourceDashboard,
  ]);

  const commitPageTitle = useCallback(() => {
    if (!canMutateDashboard || !sourceDashboard || !activePage) {
      return;
    }

    const nextTitle = normalizePageTitle(pageTitleDraft, activePage.title);
    if (nextTitle === activePage.title) {
      setPageTitleDraft(activePage.title);
      return;
    }

    const nextDashboard: DashboardDefinition = {
      ...sourceDashboard,
      pages: pages.map((page) =>
        page.id === activePage.id
          ? {
              ...page,
              title: nextTitle,
            }
          : page,
      ),
    };

    setPageTitleDraft(nextTitle);
    emitDashboardChange(nextDashboard);
  }, [activePage, canMutateDashboard, emitDashboardChange, pageTitleDraft, pages, sourceDashboard]);

  const commitDashboardTitle = useCallback(() => {
    if (!canMutateDashboard) {
      return;
    }

    const baseDashboard = sourceDashboard ?? createEmptyDashboard();
    const nextTitle = normalizePageTitle(dashboardTitleDraft, baseDashboard.title);
    if (nextTitle === baseDashboard.title) {
      setDashboardTitleDraft(baseDashboard.title);
      return;
    }

    setDashboardTitleDraft(nextTitle);
    emitDashboardChange({
      ...baseDashboard,
      title: nextTitle,
    });
  }, [canMutateDashboard, dashboardTitleDraft, emitDashboardChange, sourceDashboard]);

  const handleFiltersChange = useCallback(
    (nextFilters: DashboardDefinition['filters']) => {
      const baseDashboard = sourceDashboard ?? createEmptyDashboard();
      emitDashboardChange({
        ...baseDashboard,
        filters: nextFilters,
      });
    },
    [emitDashboardChange, sourceDashboard],
  );

  const effectiveDashboardTitle = useMemo(
    () =>
      normalizePageTitle(dashboardTitleDraft, sourceDashboard?.title ?? DEFAULT_DASHBOARD_TITLE),
    [dashboardTitleDraft, sourceDashboard?.title],
  );

  const effectivePageTitle = useMemo(() => {
    if (!activePage) {
      return undefined;
    }

    return normalizePageTitle(pageTitleDraft, activePage.title);
  }, [activePage, pageTitleDraft]);

  // Sidebar icon overrides + header actions wrapper
  const overrides = useMemo(
    () => ({
      drawerItem: ({ name, children }: { name: string; children: React.ReactNode }) => {
        const icon = getComponentIcon(name);
        return React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              boxSizing: 'border-box' as const,
              minHeight: 42,
              height: 42,
              padding: '0 0 0 10px',
            },
          },
          React.createElement(
            'span',
            {
              className: 'ss-drawer-icon',
              style: {
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 20,
                height: 20,
                flexShrink: 0,
                color: '#64748b',
              },
            },
            icon,
          ),
          React.createElement('div', { style: { flex: 1, minWidth: 0 } }, children),
        );
      },
      headerActions: ({ children }: { children: React.ReactNode }) => {
        return React.createElement(
          React.Fragment,
          null,
          React.createElement(DesignerHeaderControls, {
            activePage,
            canMutateDashboard,
            dashboardTitleDraft,
            filtersCount: sourceDashboard?.filters?.length ?? 0,
            hostHeaderActions: headerActionsRef.current,
            onAddPage: handleAddPage,
            onCancelDeletePage: handleCancelDeletePage,
            onCommitDashboardTitle: commitDashboardTitle,
            onCommitPageTitle: commitPageTitle,
            onConfirmDeletePage: handleConfirmDeletePage,
            onDashboardTitleDraftChange: handleDashboardTitleDraftChange,
            onOpenFilters: () => setShowFilters(true),
            onPageTitleDraftChange: handlePageTitleDraftChange,
            onRequestDeletePage: handleRequestDeletePage,
            onResetDashboardTitle: handleResetDashboardTitleDraft,
            onResetPageTitle: handleResetPageTitleDraft,
            onSelectPage: handleSelectPage,
            pageTitleDraft,
            pages,
            pendingDeletePage,
          }),
          children,
        );
      },
    }),
    [
      activePage,
      canMutateDashboard,
      commitDashboardTitle,
      commitPageTitle,
      dashboardTitleDraft,
      handleAddPage,
      handleCancelDeletePage,
      handleDashboardTitleDraftChange,
      handleConfirmDeletePage,
      handlePageTitleDraftChange,
      handleResetDashboardTitleDraft,
      handleResetPageTitleDraft,
      handleRequestDeletePage,
      handleSelectPage,
      pageTitleDraft,
      pages,
      pendingDeletePage,
      sourceDashboard?.filters?.length,
      sourceDashboard?.title,
    ],
  );

  // Convert canonical → Puck data for initial state
  const initialData = useMemo<Partial<Data>>(() => {
    const source = sourceDashboard;
    if (!source) {
      return { root: { props: {} }, content: [] };
    }
    return canonicalToPuck(source, { pageIndex: activePageIndex });
  }, [activePageIndex, sourceDashboard]);

  // Track latest dashboard ID from source
  const dashboardIdRef = useRef(sourceDashboard?.id);

  useEffect(() => {
    if (sourceDashboard?.id) {
      dashboardIdRef.current = sourceDashboard.id;
    }
  }, [sourceDashboard?.id]);

  const handleChange = useCallback(
    (puckData: Data) => {
      const dashboard = puckToCanonical(puckData, {
        dashboardId: dashboardIdRef.current,
        dashboardTitle: effectiveDashboardTitle,
        baseDashboard: sourceDashboard,
        pageIndex: activePageIndex,
        pageId: activePage?.id,
        pageTitle: effectivePageTitle,
      });
      emitDashboardChange(dashboard);
    },
    [
      activePage?.id,
      activePageIndex,
      emitDashboardChange,
      effectiveDashboardTitle,
      effectivePageTitle,
      sourceDashboard,
    ],
  );

  const handlePublish = useCallback(
    (puckData: Data) => {
      if (onPublish) {
        const dashboard = puckToCanonical(puckData, {
          dashboardId: dashboardIdRef.current,
          dashboardTitle: effectiveDashboardTitle,
          baseDashboard: sourceDashboard,
          pageIndex: activePageIndex,
          pageId: activePage?.id,
          pageTitle: effectivePageTitle,
        });
        onPublish(dashboard);
      }
    },
    [
      activePage?.id,
      activePageIndex,
      effectiveDashboardTitle,
      effectivePageTitle,
      onPublish,
      sourceDashboard,
    ],
  );

  const editorKey = `${sourceDashboard?.id ?? 'new-dashboard'}:${activePage?.id ?? 'page-0'}:${controlledSyncRevision}`;

  useEffect(() => {
    const root = designerRootRef.current;
    if (!root) return;

    const applyViewportControlA11y = () => {
      decorateDesignerShell(root, a11yInstanceIdRef.current);
    };

    applyViewportControlA11y();

    if (typeof MutationObserver === 'undefined') {
      return;
    }

    const observer = new MutationObserver(() => {
      applyViewportControlA11y();
    });

    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return React.createElement(
    'div',
    {
      ref: designerRootRef,
      'data-supersubset-designer-root': 'true',
      style: {
        display: 'flex',
        flexDirection: 'column',
        height: typeof height === 'number' ? `${height}px` : height,
        minHeight: 0,
        overflow: 'hidden',
      },
    },
    React.createElement(
      DatasetProvider,
      { datasets: datasets ?? [] },
      React.createElement(
        React.Fragment,
        null,
        fetchPreviewData
          ? React.createElement(
              PreviewDataProvider,
              { fetchPreviewData },
              React.createElement(Puck, {
                key: editorKey,
                config,
                data: initialData,
                onChange: canMutateDashboard ? handleChange : undefined,
                onPublish: onPublish ? handlePublish : undefined,
                headerTitle: headerTitle ?? (sourceDashboard?.title || 'Supersubset Designer'),
                height,
                iframe: { enabled: !disableIframe },
                metadata: metadata ?? {},
                plugins,
                overrides: overrides as never,
              }),
            )
          : React.createElement(Puck, {
              key: editorKey,
              config,
              data: initialData,
              onChange: canMutateDashboard ? handleChange : undefined,
              onPublish: onPublish ? handlePublish : undefined,
              headerTitle: headerTitle ?? (sourceDashboard?.title || 'Supersubset Designer'),
              height,
              iframe: { enabled: !disableIframe },
              metadata: metadata ?? {},
              plugins,
              overrides: overrides as never,
            }),
        React.createElement(SlideOverPanel, {
          open: showFilters,
          onClose: () => setShowFilters(false),
          title: 'Dashboard Filters',
          subtitle: 'Define filter controls, option sources, and runtime scope',
          width: 480,
          children: React.createElement(FilterBuilderPanel, {
            filters: sourceDashboard?.filters ?? [],
            onChange: handleFiltersChange,
            datasets: datasets ?? [],
            pageIds: pages.map((page) => page.id),
            widgetIds: pages.flatMap((page) => page.widgets?.map((widget) => widget.id) ?? []),
          }),
        }),
      ),
    ),
  );
}

function createEmptyDashboard(): DashboardDefinition {
  return {
    schemaVersion: '0.2.0',
    id: createDesignerId('dashboard'),
    title: DEFAULT_DASHBOARD_TITLE,
    pages: [],
  };
}

function createEmptyPage(title: string, existingPages: PageDefinition[]): PageDefinition {
  return {
    id: createUniquePageId(existingPages, title),
    title,
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
    rootNodeId: 'root',
    widgets: [],
  };
}

function createNextPageTitle(existingPages: PageDefinition[]): string {
  let pageNumber = existingPages.length + 1;

  while (existingPages.some((page) => page.title === `Page ${pageNumber}`)) {
    pageNumber += 1;
  }

  return `Page ${pageNumber}`;
}

function createUniquePageId(existingPages: PageDefinition[], title: string): string {
  const baseId = slugify(title) || `page-${existingPages.length + 1}`;
  let candidateId = baseId;
  let suffix = 2;

  while (existingPages.some((page) => page.id === candidateId)) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

function createDashboardSyncSignature(
  dashboard: DashboardDefinition | undefined,
): string | undefined {
  return dashboard ? JSON.stringify(dashboard) : undefined;
}

function normalizePageTitle(nextTitle: string, fallbackTitle: string): string {
  const trimmedTitle = nextTitle.trim();
  return trimmedTitle || fallbackTitle;
}

function withActivePageDefault(
  dashboard: DashboardDefinition,
  activePageId: string | undefined,
): DashboardDefinition {
  if (!activePageId) {
    return dashboard;
  }

  return {
    ...dashboard,
    defaults: {
      ...dashboard.defaults,
      activePage: activePageId,
    },
  };
}

function createDesignerId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
