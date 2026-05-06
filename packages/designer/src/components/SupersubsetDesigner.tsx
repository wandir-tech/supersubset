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
import { FilterBuilderPanel } from './FilterBuilderPanel';
import { SlideOverPanel } from './SlideOverPanel';

// Import Puck's CSS
import '@puckeditor/core/puck.css';

// Sidebar style overrides — injected as inline <style> to avoid CSS extraction issues
const SIDEBAR_CSS = `\
[class*="DrawerItem-draggable"]{padding-left:0!important;padding-top:8px!important;padding-bottom:8px!important;min-height:42px!important}\
.ss-drawer-icon{transition:color 100ms ease-in}\
[class*="DrawerItem"]:hover .ss-drawer-icon{color:var(--puck-color-azure-04,#3b82f6)}\
[data-supersubset-scroll-inline="true"]{-ms-overflow-style:none;scrollbar-width:none}\
[data-supersubset-scroll-inline="true"]::-webkit-scrollbar{display:none;width:0;height:0}\
@media (min-width:638px){\
[data-supersubset-designer-root] [class*="PuckLayout-inner"]{--puck-frame-width:minmax(0,1fr)}\
[data-supersubset-designer-root] [class*="PuckCanvas"]{min-width:0}\
[data-supersubset-designer-root] [class*="PuckHeader-inner"]{grid-template-columns:auto auto 1fr}\
[data-supersubset-designer-root] [class*="PuckHeader-tools"]{min-width:0}\
}\
@media (min-width:638px) and (max-width:1024px){[data-supersubset-designer-root] [class*="PuckLayout-inner"]{--puck-user-left-side-bar-width:212px;--puck-user-right-side-bar-width:168px;--puck-frame-width:minmax(320px,1fr)}}\
`;

let sidebarStyleInjected = false;
function injectSidebarStyles() {
  if (sidebarStyleInjected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.setAttribute('data-supersubset', 'sidebar');
  style.textContent = SIDEBAR_CSS;
  document.head.appendChild(style);
  sidebarStyleInjected = true;
}

let nextDesignerA11yInstanceId = 1;

function decorateViewportZoomSelects(root: ParentNode, instanceId: number) {
  const zoomSelects = root.querySelectorAll<HTMLSelectElement>(
    'select[class*="ViewportControls-zoomSelect"]',
  );

  zoomSelects.forEach((select, index) => {
    if (!select.id) {
      select.id = `ss-puck-viewport-zoom-${instanceId}-${index}`;
    }
    if (!select.name) {
      select.name = `viewportZoom-${instanceId}-${index}`;
    }
    if (!select.getAttribute('aria-label')) {
      select.setAttribute('aria-label', 'Viewport zoom');
    }
  });
}

function decoratePreviewIframes(root: ParentNode) {
  const previewIframes = root.querySelectorAll<HTMLIFrameElement>('iframe');

  previewIframes.forEach((iframe) => {
    if (!iframe.getAttribute('title')) {
      iframe.setAttribute('title', 'Supersubset designer preview');
    }
  });
}

export interface SupersubsetDesignerProps {
  /** Controlled mode: current dashboard definition */
  value?: DashboardDefinition;
  /** Controlled mode: called when dashboard changes */
  onChange?: (dashboard: DashboardDefinition) => void;
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

  const config = useMemo(
    () => createPuckConfig({ filterDefinitions: sourceDashboard?.filters ?? [] }),
    [sourceDashboard?.filters],
  );

  // Inject sidebar CSS overrides once
  useMemo(() => injectSidebarStyles(), []);

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
  const a11yInstanceIdRef = useRef(nextDesignerA11yInstanceId++);
  const lastHandledControlledSignatureRef = useRef<string | undefined>(undefined);
  const lastEmittedControlledSignatureRef = useRef<string | undefined>(undefined);
  const controlledValueSignature = useMemo(
    () => (isControlled ? createDashboardSyncSignature(value) : undefined),
    [isControlled, value],
  );

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
        const pageChips = React.createElement(
          'div',
          {
            'data-supersubset-scroll-inline': 'true',
            style: {
              display: 'flex',
              flexWrap: 'nowrap',
              gap: 8,
              alignItems: 'center',
              overflowX: 'auto',
              overflowY: 'hidden',
              minWidth: 0,
              maxWidth: '100%',
            },
          },
          ...pages.map((page) => {
            const isActivePage = activePage?.id === page.id;
            return React.createElement(
              'div',
              {
                key: page.id,
                style: {
                  display: 'inline-flex',
                  alignItems: 'center',
                  borderRadius: 999,
                  border: `1px solid ${isActivePage ? '#0f172a' : '#cbd5e1'}`,
                  background: isActivePage ? '#0f172a' : '#fff',
                  overflow: 'hidden',
                },
              },
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => handleSelectPage(page.id),
                  'data-testid': `designer-page-tab-${page.id}`,
                  style: {
                    padding: '6px 12px',
                    border: 'none',
                    background: 'transparent',
                    color: isActivePage ? '#fff' : '#0f172a',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  },
                },
                page.title,
              ),
              pages.length > 1
                ? React.createElement(
                    'button',
                    {
                      type: 'button',
                      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
                        event.stopPropagation();
                        handleRequestDeletePage(page.id);
                      },
                      'aria-label': `Delete page ${page.title}`,
                      'data-testid': `designer-page-delete-trigger-${page.id}`,
                      disabled: !canMutateDashboard,
                      style: {
                        padding: '6px 10px',
                        border: 'none',
                        borderLeft: `1px solid ${isActivePage ? 'rgba(255,255,255,0.18)' : '#e2e8f0'}`,
                        background: 'transparent',
                        color: isActivePage ? '#cbd5e1' : '#64748b',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: canMutateDashboard ? 'pointer' : 'not-allowed',
                        opacity: canMutateDashboard ? 1 : 0.5,
                      },
                    },
                    '×',
                  )
                : null,
            );
          }),
          React.createElement(
            'button',
            {
              type: 'button',
              onClick: handleAddPage,
              'data-testid': 'designer-page-add',
              disabled: !canMutateDashboard,
              style: {
                padding: '6px 10px',
                borderRadius: 999,
                border: '1px solid #94a3b8',
                background: '#f8fafc',
                color: '#0f172a',
                fontSize: 12,
                fontWeight: 600,
                cursor: canMutateDashboard ? 'pointer' : 'not-allowed',
                opacity: canMutateDashboard ? 1 : 0.6,
                whiteSpace: 'nowrap',
              },
            },
            'Add Page',
          ),
        );

        const deletePrompt = pendingDeletePage
          ? React.createElement(
              'div',
              {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 14,
                  border: '1px solid #fecaca',
                  background: '#fff1f2',
                  maxWidth: 'fit-content',
                },
              },
              React.createElement(
                'span',
                {
                  'data-testid': 'designer-page-delete-prompt',
                  style: {
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#9f1239',
                    whiteSpace: 'nowrap',
                  },
                },
                `Delete ${pendingDeletePage.title}?`,
              ),
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: handleCancelDeletePage,
                  'data-testid': 'designer-page-delete-cancel',
                  style: actionButtonStyle('#fff', '#be123c', '#fecaca'),
                },
                'Cancel',
              ),
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: handleConfirmDeletePage,
                  'data-testid': 'designer-page-delete-confirm',
                  style: actionButtonStyle('#be123c', '#fff', '#be123c'),
                },
                'Delete',
              ),
            )
          : null;

        const metadataControls = React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              alignItems: 'flex-start',
              flex: '1 1 360px',
              minWidth: 0,
            },
          },
          activePage
            ? React.createElement(
                'label',
                {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  },
                },
                React.createElement('span', { style: smallSectionLabelStyle() }, 'Page Title'),
                React.createElement('input', {
                  type: 'text',
                  value: pageTitleDraft,
                  onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                    setPageTitleDraft(event.target.value);
                  },
                  onBlur: commitPageTitle,
                  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
                    if (event.key === 'Enter') {
                      commitPageTitle();
                      event.currentTarget.blur();
                    }
                    if (event.key === 'Escape') {
                      setPageTitleDraft(activePage.title);
                      event.currentTarget.blur();
                    }
                  },
                  placeholder: 'Page title',
                  'aria-label': 'Page title',
                  'data-testid': 'designer-page-title-input',
                  disabled: !canMutateDashboard,
                  style: headerInputStyle(canMutateDashboard, 180),
                }),
              )
            : null,
          React.createElement(
            'label',
            {
              style: {
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              },
            },
            React.createElement('span', { style: smallSectionLabelStyle() }, 'Dashboard Title'),
            React.createElement('input', {
              type: 'text',
              value: dashboardTitleDraft,
              onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                setDashboardTitleDraft(event.target.value);
              },
              onBlur: commitDashboardTitle,
              onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
                if (event.key === 'Enter') {
                  commitDashboardTitle();
                  event.currentTarget.blur();
                }
                if (event.key === 'Escape') {
                  setDashboardTitleDraft(sourceDashboard?.title ?? DEFAULT_DASHBOARD_TITLE);
                  event.currentTarget.blur();
                }
              },
              placeholder: 'Dashboard title',
              'aria-label': 'Dashboard title',
              'data-testid': 'designer-dashboard-title-input',
              disabled: !canMutateDashboard,
              style: headerInputStyle(canMutateDashboard, 220),
            }),
          ),
        );

        const builtInActions = React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
              flex: '0 0 auto',
            },
          },
          React.createElement(
            'button',
            {
              type: 'button',
              onClick: () => setShowFilters(true),
              'data-testid': 'designer-filters-toggle',
              style: {
                ...actionButtonStyle('#fff', '#0f172a', '#cbd5e1'),
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                whiteSpace: 'nowrap',
              },
            },
            `Dashboard Filters${sourceDashboard?.filters?.length ? ` (${sourceDashboard.filters.length})` : ''}`,
          ),
        );

        const headerControlLayout =
          pages.length > 0 || canMutateDashboard
            ? React.createElement(
                'div',
                {
                  'data-testid': 'designer-header-controls',
                  'data-supersubset-scroll-inline': 'true',
                  style: {
                    display: 'flex',
                    alignItems: 'flex-start',
                    alignContent: 'flex-start',
                    gap: 12,
                    rowGap: 12,
                    flex: '1 1 auto',
                    flexWrap: 'wrap',
                    overflowX: 'visible',
                    overflowY: 'visible',
                    minWidth: 0,
                    maxWidth: '100%',
                  },
                },
                React.createElement(
                  'div',
                  {
                    'data-testid': 'designer-page-controls',
                    style: {
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      flex: '0 0 auto',
                      minWidth: 0,
                    },
                  },
                  React.createElement(
                    'span',
                    {
                      style: {
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#64748b',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      },
                    },
                    'Pages',
                  ),
                  pageChips,
                  deletePrompt,
                ),
                metadataControls,
                builtInActions,
                headerActionsRef.current
                  ? React.createElement(
                      'div',
                      {
                        'data-testid': 'designer-host-actions',
                        style: {
                          flex: '1 1 auto',
                          minWidth: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          overflow: 'visible',
                        },
                      },
                      headerActionsRef.current,
                    )
                  : null,
              )
            : headerActionsRef.current;

        return React.createElement(React.Fragment, null, headerControlLayout, children);
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
      handleConfirmDeletePage,
      handleRequestDeletePage,
      handleSelectPage,
      pageTitleDraft,
      pages,
      pendingDeletePage,
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
        dashboardTitle: sourceDashboard?.title ?? dashboardTitleDraft ?? DEFAULT_DASHBOARD_TITLE,
        baseDashboard: sourceDashboard,
        pageIndex: activePageIndex,
        pageId: activePage?.id,
        pageTitle: activePage?.title,
      });
      emitDashboardChange(dashboard);
    },
    [
      activePage?.id,
      activePage?.title,
      activePageIndex,
      dashboardTitleDraft,
      emitDashboardChange,
      sourceDashboard,
    ],
  );

  const handlePublish = useCallback(
    (puckData: Data) => {
      if (onPublish) {
        const dashboard = puckToCanonical(puckData, {
          dashboardId: dashboardIdRef.current,
          dashboardTitle: sourceDashboard?.title ?? dashboardTitleDraft ?? DEFAULT_DASHBOARD_TITLE,
          baseDashboard: sourceDashboard,
          pageIndex: activePageIndex,
          pageId: activePage?.id,
          pageTitle: activePage?.title,
        });
        onPublish(dashboard);
      }
    },
    [
      activePage?.id,
      activePage?.title,
      activePageIndex,
      dashboardTitleDraft,
      onPublish,
      sourceDashboard,
    ],
  );

  const editorKey = `${sourceDashboard?.id ?? 'new-dashboard'}:${activePage?.id ?? 'page-0'}:${controlledSyncRevision}`;

  useEffect(() => {
    const root = designerRootRef.current;
    if (!root) return;

    const applyViewportControlA11y = () => {
      decorateViewportZoomSelects(root, a11yInstanceIdRef.current);
      decoratePreviewIframes(root);
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

function smallSectionLabelStyle(): React.CSSProperties {
  return {
    fontSize: 12,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  };
}

function headerInputStyle(canEdit: boolean, minWidth = 180): React.CSSProperties {
  return {
    width: `${minWidth}px`,
    maxWidth: '100%',
    padding: '6px 10px',
    borderRadius: 999,
    border: '1px solid #cbd5e1',
    fontSize: 12,
    color: '#0f172a',
    background: '#fff',
    opacity: canEdit ? 1 : 0.7,
  };
}

function actionButtonStyle(
  background: string,
  color: string,
  borderColor: string,
): React.CSSProperties {
  return {
    padding: '6px 10px',
    borderRadius: 999,
    border: `1px solid ${borderColor}`,
    background,
    color,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  };
}
