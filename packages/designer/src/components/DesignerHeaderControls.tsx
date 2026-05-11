import type { CSSProperties, KeyboardEvent, ReactElement, ReactNode } from 'react';
import type { PageDefinition } from '@supersubset/schema';

export interface DesignerHeaderControlsProps {
  activePage?: PageDefinition;
  canMutateDashboard: boolean;
  dashboardTitleDraft: string;
  filtersCount: number;
  hostHeaderActions?: ReactNode;
  onAddPage: () => void;
  onCancelDeletePage: () => void;
  onCommitDashboardTitle: () => void;
  onCommitPageTitle: () => void;
  onConfirmDeletePage: () => void;
  onDashboardTitleDraftChange: (nextValue: string) => void;
  onOpenFilters: () => void;
  onPageTitleDraftChange: (nextValue: string) => void;
  onRequestDeletePage: (pageId: string) => void;
  onResetDashboardTitle: () => void;
  onResetPageTitle: () => void;
  onSelectPage: (pageId: string) => void;
  pageTitleDraft: string;
  pages: PageDefinition[];
  pendingDeletePage?: PageDefinition;
}

export function DesignerHeaderControls({
  activePage,
  canMutateDashboard,
  dashboardTitleDraft,
  filtersCount,
  hostHeaderActions,
  onAddPage,
  onCancelDeletePage,
  onCommitDashboardTitle,
  onCommitPageTitle,
  onConfirmDeletePage,
  onDashboardTitleDraftChange,
  onOpenFilters,
  onPageTitleDraftChange,
  onRequestDeletePage,
  onResetDashboardTitle,
  onResetPageTitle,
  onSelectPage,
  pageTitleDraft,
  pages,
  pendingDeletePage,
}: DesignerHeaderControlsProps): ReactElement {
  const pageChips = (
    <div
      data-supersubset-scroll-inline="true"
      style={{
        display: 'flex',
        flexWrap: 'nowrap',
        gap: 8,
        alignItems: 'center',
        overflowX: 'auto',
        overflowY: 'hidden',
        minWidth: 0,
        maxWidth: '100%',
      }}
    >
      {pages.map((page) => {
        const isActivePage = activePage?.id === page.id;

        return (
          <div
            key={page.id}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              borderRadius: 999,
              border: `1px solid ${isActivePage ? '#0f172a' : '#cbd5e1'}`,
              background: isActivePage ? '#0f172a' : '#fff',
              overflow: 'hidden',
            }}
          >
            <button
              type="button"
              onClick={() => onSelectPage(page.id)}
              data-testid={`designer-page-tab-${page.id}`}
              style={{
                padding: '6px 12px',
                border: 'none',
                background: 'transparent',
                color: isActivePage ? '#fff' : '#0f172a',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {page.title}
            </button>
            {pages.length > 1 ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onRequestDeletePage(page.id);
                }}
                aria-label={`Delete page ${page.title}`}
                data-testid={`designer-page-delete-trigger-${page.id}`}
                disabled={!canMutateDashboard}
                style={{
                  padding: '6px 10px',
                  border: 'none',
                  borderLeft: `1px solid ${isActivePage ? 'rgba(255,255,255,0.18)' : '#e2e8f0'}`,
                  background: 'transparent',
                  color: isActivePage ? '#cbd5e1' : '#64748b',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: canMutateDashboard ? 'pointer' : 'not-allowed',
                  opacity: canMutateDashboard ? 1 : 0.5,
                }}
              >
                ×
              </button>
            ) : null}
          </div>
        );
      })}
      <button
        type="button"
        onClick={onAddPage}
        data-testid="designer-page-add"
        disabled={!canMutateDashboard}
        style={{
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
        }}
      >
        Add Page
      </button>
    </div>
  );

  const deletePrompt = pendingDeletePage ? (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderRadius: 14,
        border: '1px solid #fecaca',
        background: '#fff1f2',
        maxWidth: 'fit-content',
      }}
    >
      <span
        data-testid="designer-page-delete-prompt"
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: '#9f1239',
          whiteSpace: 'nowrap',
        }}
      >
        {`Delete ${pendingDeletePage.title}?`}
      </span>
      <button
        type="button"
        onClick={onCancelDeletePage}
        data-testid="designer-page-delete-cancel"
        style={actionButtonStyle('#fff', '#be123c', '#fecaca')}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirmDeletePage}
        data-testid="designer-page-delete-confirm"
        style={actionButtonStyle('#be123c', '#fff', '#be123c')}
      >
        Delete
      </button>
    </div>
  ) : null;

  const metadataControls = (
    <div
      data-supersubset-header-metadata="true"
      style={{
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        flex: '1 1 360px',
        minWidth: 0,
      }}
    >
      {activePage ? (
        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <span style={smallSectionLabelStyle()}>Page Title</span>
          <input
            type="text"
            value={pageTitleDraft}
            onChange={(event) => onPageTitleDraftChange(event.target.value)}
            onBlur={onCommitPageTitle}
            onKeyDown={(event) =>
              handleHeaderInputKeyDown(event, onCommitPageTitle, onResetPageTitle)
            }
            placeholder="Page title"
            aria-label="Page title"
            data-testid="designer-page-title-input"
            disabled={!canMutateDashboard}
            style={headerInputStyle(canMutateDashboard, 180)}
          />
        </label>
      ) : null}
      <label
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <span style={smallSectionLabelStyle()}>Dashboard Title</span>
        <input
          type="text"
          value={dashboardTitleDraft}
          onChange={(event) => onDashboardTitleDraftChange(event.target.value)}
          onBlur={onCommitDashboardTitle}
          onKeyDown={(event) =>
            handleHeaderInputKeyDown(event, onCommitDashboardTitle, onResetDashboardTitle)
          }
          placeholder="Dashboard title"
          aria-label="Dashboard title"
          data-testid="designer-dashboard-title-input"
          disabled={!canMutateDashboard}
          style={headerInputStyle(canMutateDashboard, 220)}
        />
      </label>
    </div>
  );

  const builtInActions = (
    <div
      data-supersubset-built-in-actions="true"
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        flex: '0 0 auto',
      }}
    >
      <button
        type="button"
        onClick={onOpenFilters}
        data-testid="designer-filters-toggle"
        style={{
          ...actionButtonStyle('#fff', '#0f172a', '#cbd5e1'),
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          whiteSpace: 'nowrap',
        }}
      >
        {`Dashboard Filters${filtersCount ? ` (${filtersCount})` : ''}`}
      </button>
    </div>
  );

  return (
    <>
      {pages.length > 0 || canMutateDashboard ? (
        <div
          data-testid="designer-header-controls"
          data-supersubset-scroll-inline="true"
          style={{
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
          }}
        >
          <div
            data-testid="designer-page-controls"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              flex: '0 0 auto',
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Pages
            </span>
            {pageChips}
            {deletePrompt}
          </div>
          {metadataControls}
          {builtInActions}
          {hostHeaderActions ? (
            <div
              data-testid="designer-host-actions"
              style={{
                flex: '1 1 auto',
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                overflow: 'visible',
              }}
            >
              {hostHeaderActions}
            </div>
          ) : null}
        </div>
      ) : (
        (hostHeaderActions ?? null)
      )}
    </>
  );
}

function handleHeaderInputKeyDown(
  event: KeyboardEvent<HTMLInputElement>,
  onCommit: () => void,
  onReset: () => void,
) {
  if (event.key === 'Enter') {
    onCommit();
    event.currentTarget.blur();
  }

  if (event.key === 'Escape') {
    onReset();
    event.currentTarget.blur();
  }
}

function smallSectionLabelStyle(): CSSProperties {
  return {
    fontSize: 12,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  };
}

function headerInputStyle(canEdit: boolean, minWidth = 180): CSSProperties {
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

function actionButtonStyle(background: string, color: string, borderColor: string): CSSProperties {
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
