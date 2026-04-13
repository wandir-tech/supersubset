import { CodeViewPanel, ImportExportPanel, SupersubsetDesigner } from '@supersubset/designer';
import type { DashboardDefinition } from '@supersubset/schema';
import type { NormalizedDataset } from '@supersubset/data-model';

/**
 * Metadata describing the SQLite orders table.
 * This tells the designer what fields are available for chart configuration.
 */
const SQLITE_DATASETS: NormalizedDataset[] = [
  {
    id: 'sqlite-orders',
    label: 'Orders',
    source: { type: 'table', ref: 'orders' },
    fields: [
      { id: 'ordered_at', label: 'Order Date', dataType: 'date', role: 'time' },
      { id: 'region', label: 'Region', dataType: 'string', role: 'dimension' },
      { id: 'category', label: 'Category', dataType: 'string', role: 'dimension' },
      { id: 'product_name', label: 'Product Name', dataType: 'string', role: 'dimension' },
      { id: 'channel', label: 'Channel', dataType: 'string', role: 'dimension' },
      { id: 'revenue', label: 'Revenue', dataType: 'number', role: 'measure', defaultAggregation: 'sum' },
      { id: 'units', label: 'Units', dataType: 'integer', role: 'measure', defaultAggregation: 'sum' },
    ],
  },
];

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
        datasets={SQLITE_DATASETS}
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