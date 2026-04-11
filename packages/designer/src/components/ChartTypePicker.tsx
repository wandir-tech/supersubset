/**
 * ChartTypePicker — Visual grid of chart types for selecting/switching.
 *
 * Shows a grid of available chart types with icons and labels.
 * Used in the designer to pick initial chart type or switch an existing widget.
 */
import React, { useState, useCallback } from 'react';

export interface ChartTypeOption {
  /** Widget type ID (e.g. 'line-chart') */
  type: string;
  /** Display label */
  label: string;
  /** Emoji or icon */
  icon: string;
  /** Category for grouping */
  category: 'basic' | 'statistical' | 'hierarchical' | 'relational' | 'display';
  /** Short description */
  description?: string;
}

export const CHART_TYPE_OPTIONS: ChartTypeOption[] = [
  // Basic
  { type: 'line-chart', label: 'Line', icon: '📈', category: 'basic', description: 'Trend over time' },
  { type: 'bar-chart', label: 'Bar', icon: '📊', category: 'basic', description: 'Compare categories' },
  { type: 'area-chart', label: 'Area', icon: '📉', category: 'basic', description: 'Stacked trends' },
  { type: 'pie-chart', label: 'Pie / Donut', icon: '🥧', category: 'basic', description: 'Part-of-whole' },
  { type: 'scatter-chart', label: 'Scatter', icon: '⭐', category: 'basic', description: 'Correlation' },
  { type: 'combo-chart', label: 'Combo', icon: '📊📈', category: 'basic', description: 'Bar + Line' },
  // Statistical
  { type: 'heatmap', label: 'Heatmap', icon: '🔥', category: 'statistical', description: 'Density grid' },
  { type: 'box-plot', label: 'Box Plot', icon: '📦', category: 'statistical', description: 'Distribution' },
  { type: 'radar-chart', label: 'Radar', icon: '🕸', category: 'statistical', description: 'Multi-axis comparison' },
  // Hierarchical
  { type: 'treemap', label: 'Treemap', icon: '🌳', category: 'hierarchical', description: 'Nested proportions' },
  { type: 'funnel-chart', label: 'Funnel', icon: '🏗', category: 'hierarchical', description: 'Stage conversion' },
  { type: 'waterfall', label: 'Waterfall', icon: '🌊', category: 'hierarchical', description: 'Running total' },
  // Relational
  { type: 'sankey', label: 'Sankey', icon: '🔀', category: 'relational', description: 'Flow between nodes' },
  // Display
  { type: 'gauge', label: 'Gauge', icon: '🎯', category: 'display', description: 'Single metric dial' },
  { type: 'kpi-card', label: 'KPI Card', icon: '🔢', category: 'display', description: 'Big number + trend' },
  { type: 'table', label: 'Table', icon: '📋', category: 'display', description: 'Tabular data' },
];

const CATEGORY_LABELS: Record<string, string> = {
  basic: 'Basic Charts',
  statistical: 'Statistical',
  hierarchical: 'Hierarchical',
  relational: 'Relational',
  display: 'Display',
};

const CATEGORY_ORDER = ['basic', 'statistical', 'hierarchical', 'relational', 'display'];

export interface ChartTypePickerProps {
  /** Currently selected chart type */
  value?: string;
  /** Called when user selects a chart type */
  onChange: (type: string) => void;
  /** Filter to only show specific types */
  allowedTypes?: string[];
  /** Compact mode (no descriptions) */
  compact?: boolean;
  /** Optional class name */
  className?: string;
}

export function ChartTypePicker({
  value,
  onChange,
  allowedTypes,
  compact = false,
  className,
}: ChartTypePickerProps) {
  const [search, setSearch] = useState('');
  const searchInputId = 'ss-chart-type-search';

  const handleSelect = useCallback(
    (type: string) => {
      onChange(type);
    },
    [onChange]
  );

  const filteredOptions = CHART_TYPE_OPTIONS.filter((opt) => {
    if (allowedTypes && !allowedTypes.includes(opt.type)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        opt.label.toLowerCase().includes(q) ||
        opt.type.toLowerCase().includes(q) ||
        opt.description?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Group by category
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    options: filteredOptions.filter((o) => o.category === cat),
  })).filter((g) => g.options.length > 0);

  return (
    <div
      className={className}
      data-testid="chart-type-picker"
      style={{ fontFamily: 'sans-serif' }}
    >
      {/* Search */}
      <input
        id={searchInputId}
        name="chartTypeSearch"
        aria-label="Search chart types"
        type="text"
        placeholder="Search chart types..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        data-testid="chart-search"
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: 6,
          border: '1px solid #d9d9d9',
          fontSize: 13,
          marginBottom: 12,
          boxSizing: 'border-box',
        }}
      />

      {grouped.map((group) => (
        <div key={group.category} style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#888',
              marginBottom: 8,
              letterSpacing: 0.5,
            }}
          >
            {group.label}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: compact
                ? 'repeat(auto-fill, minmax(80px, 1fr))'
                : 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: 8,
            }}
          >
            {group.options.map((opt) => (
              <button
                key={opt.type}
                onClick={() => handleSelect(opt.type)}
                data-testid={`chart-type-${opt.type}`}
                data-selected={value === opt.type}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  padding: compact ? '8px 4px' : '12px 8px',
                  borderRadius: 8,
                  border: value === opt.type
                    ? '2px solid #1677ff'
                    : '1px solid #e0e0e0',
                  background: value === opt.type ? '#e6f7ff' : '#fff',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  fontSize: 12,
                }}
              >
                <span style={{ fontSize: compact ? 20 : 28 }}>{opt.icon}</span>
                <span style={{ fontWeight: 600, fontSize: compact ? 11 : 12 }}>
                  {opt.label}
                </span>
                {!compact && opt.description && (
                  <span style={{ fontSize: 10, color: '#888', textAlign: 'center' }}>
                    {opt.description}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}

      {filteredOptions.length === 0 && (
        <div
          style={{ textAlign: 'center', color: '#999', padding: 24, fontSize: 13 }}
          data-testid="chart-no-results"
        >
          No chart types match "{search}"
        </div>
      )}
    </div>
  );
}
