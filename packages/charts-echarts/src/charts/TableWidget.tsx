/**
 * Table widget — renders tabular data using ECharts dataset.
 * This is the MVP table implementation (per HC-0 decision: ECharts table, no separate lib).
 *
 * ECharts doesn't have a native table component, so we use a lightweight
 * HTML table rendered in React, styled to match the dashboard theme.
 * This keeps the table in the widget registry alongside chart types.
 */
import { useMemo } from 'react';
import type { WidgetProps } from '@supersubset/runtime';

export function TableWidget({ config, data, columns, title, height }: WidgetProps) {
  const displayColumns = useMemo(() => {
    const configColumns = config.columns as string[] | undefined;
    if (configColumns && configColumns.length > 0 && columns) {
      return columns.filter((c) => configColumns.includes(c.fieldId));
    }
    return columns ?? [];
  }, [config, columns]);

  const pageSize = (config.pageSize as number) ?? 50;
  const showRowNumbers = config.showRowNumbers === true;
  const showTotals = config.showTotals === true;
  const headerAlign = (config.headerAlign as 'left' | 'center' | 'right') ?? 'left';
  const cellAlign = (config.cellAlign as 'left' | 'center' | 'right') ?? 'left';
  const displayData = useMemo(() => {
    return data?.slice(0, pageSize) ?? [];
  }, [data, pageSize]);

  const totals = useMemo(() => {
    if (!showTotals || !data || data.length === 0) return null;
    const sums: Record<string, number> = {};
    for (const col of displayColumns) {
      let sum = 0;
      let isNumeric = false;
      for (const row of data) {
        const v = row[col.fieldId];
        if (typeof v === 'number') { sum += v; isNumeric = true; }
      }
      if (isNumeric) sums[col.fieldId] = sum;
    }
    return sums;
  }, [showTotals, data, displayColumns]);

  if (!data || data.length === 0) {
    return (
      <div className="ss-table-empty" style={{ textAlign: 'center', padding: '24px', color: '#999' }}>
        <div style={{ fontWeight: 600 }}>{title ?? 'Table'}</div>
        <div>No data available</div>
      </div>
    );
  }

  const tableStyle: React.CSSProperties = {
    width: '100%',
    maxHeight: height ? `${height}px` : '400px',
    overflow: 'auto',
  };

  return (
    <div className="ss-table" style={tableStyle}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 'var(--ss-font-size, 14px)',
          fontFamily: 'var(--ss-font-family, inherit)',
        }}
      >
        <thead>
          <tr>
            {showRowNumbers && (
              <th style={{ padding: '8px 12px', textAlign: headerAlign, borderBottom: '2px solid #e0e0e0', fontWeight: 600, position: 'sticky', top: 0, background: 'var(--ss-color-surface, #fff)', width: 40 }}>#</th>
            )}
            {displayColumns.map((col) => (
              <th
                key={col.fieldId}
                style={{
                  padding: '8px 12px',
                  textAlign: headerAlign,
                  borderBottom: '2px solid #e0e0e0',
                  fontWeight: 600,
                  position: 'sticky',
                  top: 0,
                  background: 'var(--ss-color-surface, #fff)',
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayData.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              style={{ background: rowIdx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)' }}
            >
              {showRowNumbers && (
                <td style={{ padding: '6px 12px', borderBottom: '1px solid #f0f0f0', textAlign: cellAlign, color: '#999' }}>{rowIdx + 1}</td>
              )}
              {displayColumns.map((col) => (
                <td
                  key={col.fieldId}
                  style={{
                    padding: '6px 12px',
                    borderBottom: '1px solid #f0f0f0',
                    textAlign: cellAlign,
                  }}
                >
                  {String(row[col.fieldId] ?? '')}
                </td>
              ))}
            </tr>
          ))}
          {totals && (
            <tr style={{ fontWeight: 600, borderTop: '2px solid #e0e0e0' }}>
              {showRowNumbers && <td style={{ padding: '6px 12px' }}></td>}
              {displayColumns.map((col) => (
                <td key={col.fieldId} style={{ padding: '6px 12px', textAlign: cellAlign }}>
                  {totals[col.fieldId] !== undefined ? totals[col.fieldId].toLocaleString() : ''}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
