import { CodeViewPanel, ImportExportPanel, SupersubsetDesigner } from '@supersubset/designer';
import type { DashboardDefinition } from '@supersubset/schema';

export interface DesignerSurfaceProps {
  dashboard: DashboardDefinition;
  designerRevision: number;
  showCode: boolean;
  onChange: (dashboard: DashboardDefinition) => void;
  onImport: (dashboard: DashboardDefinition) => void;
  onPublish: (dashboard: DashboardDefinition) => void;
  onToggleCode: () => void;
}

export function DesignerSurface({
  dashboard,
  designerRevision,
  showCode,
  onChange,
  onImport,
  onPublish,
  onToggleCode,
}: DesignerSurfaceProps) {
  return (
    <div className="designer-shell">
      <SupersubsetDesigner
        key={designerRevision}
        value={dashboard}
        onChange={onChange}
        onPublish={onPublish}
        height="100%"
        headerTitle="SQLite Analytics Workbench"
        headerActions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ImportExportPanel dashboard={dashboard} onImport={onImport} />
            <button
              type="button"
              data-testid="sqlite-code-toggle"
              onClick={onToggleCode}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid #c5d9db',
                background: showCode ? '#d9f0f2' : '#fff',
                cursor: 'pointer',
              }}
            >
              {'</>'} Code
            </button>
          </div>
        }
      />
      {showCode ? (
        <div className="code-panel">
          <CodeViewPanel dashboard={dashboard} height="260px" />
        </div>
      ) : null}
    </div>
  );
}