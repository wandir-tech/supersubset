import type { ReactElement } from 'react';

import {
  SupersubsetDesigner,
  ImportExportPanel,
  CodeViewPanel,
  UndoRedoToolbar,
  type FetchPreviewData,
} from '@supersubset/designer';
import type { DashboardDefinition } from '@supersubset/schema';
import type { NormalizedDataset } from '@supersubset/data-model';

import { ProbePreviewStatusBanner } from './ProbePreviewStatusBanner';
import type { PreviewStatus } from './probe-workspace-types';

export interface ProbeDesignerWorkspaceProps {
  metadataSourceSummary: string;
  datasets: NormalizedDataset[];
  fetchPreviewData?: FetchPreviewData;
  effectiveQueryEndpoint: string;
  previewStatus: PreviewStatus;
  showCode: boolean;
  currentDashboard: DashboardDefinition;
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
  onToggleCode: () => void;
  onExportJson: () => void;
  onDisconnect: () => void;
  onDashboardChange: (dashboard: DashboardDefinition) => void;
  onDashboardImport: (dashboard: DashboardDefinition) => void;
  onUndo: () => void;
  onRedo: () => void;
}

export function ProbeDesignerWorkspace({
  metadataSourceSummary,
  datasets,
  fetchPreviewData,
  effectiveQueryEndpoint,
  previewStatus,
  showCode,
  currentDashboard,
  canUndo,
  canRedo,
  undoCount,
  redoCount,
  onToggleCode,
  onExportJson,
  onDisconnect,
  onDashboardChange,
  onDashboardImport,
  onUndo,
  onRedo,
}: ProbeDesignerWorkspaceProps): ReactElement {
  return (
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
          onClick={onToggleCode}
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
          onClick={onExportJson}
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
          onClick={onDisconnect}
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

      <ProbePreviewStatusBanner status={previewStatus} fallbackUrl={effectiveQueryEndpoint} />

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
              onChange={onDashboardChange}
              onPublish={onDashboardChange}
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
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onUndo={onUndo}
                    onRedo={onRedo}
                    undoCount={undoCount}
                    redoCount={redoCount}
                  />
                  <ImportExportPanel dashboard={currentDashboard} onImport={onDashboardImport} />
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
  );
}
