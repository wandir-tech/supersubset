import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KPICardWidget } from '../src/charts/KPICardWidget';
import { TableWidget } from '../src/charts/TableWidget';
import { MarkdownWidget } from '../src/charts/MarkdownWidget';
import { AlertsWidget } from '../src/charts/AlertsWidget';
import type { WidgetProps } from '@supersubset/runtime';

// Note: ECharts-based charts (Line, Bar) need canvas mocking for unit tests.
// They are better tested via Playwright E2E. Here we test the HTML-rendered widgets.

function makeProps(overrides: Partial<WidgetProps> = {}): WidgetProps {
  return {
    widgetId: 'test-widget',
    widgetType: 'test',
    config: {},
    ...overrides,
  };
}

describe('KPICardWidget', () => {
  it('renders a formatted value', () => {
    const { container } = render(
      <KPICardWidget
        {...makeProps({
          title: 'Revenue',
          config: { valueField: 'revenue' },
          data: [{ revenue: 1234567 }],
        })}
      />,
    );

    expect(container.querySelector('.ss-kpi')).toBeTruthy();
    expect(container.textContent).toContain('Revenue');
    expect(container.textContent).toContain('1,234,567');
  });

  it('shows empty state when no data', () => {
    const { container } = render(
      <KPICardWidget {...makeProps({ title: 'Revenue', config: { valueField: 'revenue' } })} />,
    );

    expect(container.querySelector('.ss-kpi-empty')).toBeTruthy();
    expect(container.textContent).toContain('—');
  });

  it('formats currency values', () => {
    const { container } = render(
      <KPICardWidget
        {...makeProps({
          config: { valueField: 'revenue', format: 'currency' },
          data: [{ revenue: 42000 }],
        })}
      />,
    );

    expect(container.textContent).toContain('$');
  });

  it('shows delta comparison', () => {
    const { container } = render(
      <KPICardWidget
        {...makeProps({
          title: 'Sales',
          config: { valueField: 'current', comparisonField: 'previous' },
          data: [{ current: 120, previous: 100 }],
        })}
      />,
    );

    expect(container.textContent).toContain('▲');
    expect(container.textContent).toContain('20.0%');
  });

  it('shows negative delta', () => {
    const { container } = render(
      <KPICardWidget
        {...makeProps({
          config: { valueField: 'current', comparisonField: 'previous' },
          data: [{ current: 80, previous: 100 }],
        })}
      />,
    );

    expect(container.textContent).toContain('▼');
    expect(container.textContent).toContain('20.0%');
  });

  it('shows compact format', () => {
    const { container } = render(
      <KPICardWidget
        {...makeProps({
          config: { valueField: 'val', format: 'compact' },
          data: [{ val: 2500000 }],
        })}
      />,
    );

    expect(container.textContent).toContain('2.5M');
  });
});

describe('TableWidget', () => {
  const sampleColumns = [
    { fieldId: 'name', label: 'Name', dataType: 'string' },
    { fieldId: 'revenue', label: 'Revenue', dataType: 'number' },
    { fieldId: 'region', label: 'Region', dataType: 'string' },
  ];

  const sampleData = [
    { name: 'Alice', revenue: 100000, region: 'North' },
    { name: 'Bob', revenue: 75000, region: 'South' },
    { name: 'Charlie', revenue: 120000, region: 'East' },
  ];

  it('renders table with headers and rows', () => {
    const { container } = render(
      <TableWidget
        {...makeProps({
          columns: sampleColumns,
          data: sampleData,
        })}
      />,
    );

    expect(container.querySelector('table')).toBeTruthy();
    expect(container.querySelectorAll('th')).toHaveLength(3);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(container.textContent).toContain('Alice');
    expect(container.textContent).toContain('Revenue');
  });

  it('respects column config filter', () => {
    const { container } = render(
      <TableWidget
        {...makeProps({
          columns: sampleColumns,
          data: sampleData,
          config: { columns: ['name', 'revenue'] },
        })}
      />,
    );

    expect(container.querySelectorAll('th')).toHaveLength(2);
    expect(container.textContent).not.toContain('Region');
  });

  it('shows empty state when no data', () => {
    const { container } = render(
      <TableWidget
        {...makeProps({
          title: 'Orders',
          columns: sampleColumns,
        })}
      />,
    );

    expect(container.querySelector('.ss-table-empty')).toBeTruthy();
    expect(container.textContent).toContain('No data available');
  });

  it('limits rows via pageSize config', () => {
    const manyRows = Array.from({ length: 100 }, (_, i) => ({
      name: `User ${i}`,
      revenue: i * 1000,
      region: 'N',
    }));

    const { container } = render(
      <TableWidget
        {...makeProps({
          columns: sampleColumns,
          data: manyRows,
          config: { pageSize: 10 },
        })}
      />,
    );

    expect(container.querySelectorAll('tbody tr')).toHaveLength(10);
  });
});

describe('MarkdownWidget', () => {
  it('renders markdown content as HTML', () => {
    const { container } = render(
      <MarkdownWidget
        {...makeProps({
          config: { content: '# Hello World\n\nThis is **bold** and *italic*.' },
        })}
      />,
    );

    expect(container.querySelector('.ss-markdown')).toBeTruthy();
    expect(container.innerHTML).toContain('<h1>');
    expect(container.innerHTML).toContain('<strong>bold</strong>');
    expect(container.innerHTML).toContain('<em>italic</em>');
  });

  it('sanitizes script tags', () => {
    const { container } = render(
      <MarkdownWidget
        {...makeProps({
          config: { content: '<script>alert("xss")</script>' },
        })}
      />,
    );

    expect(container.innerHTML).not.toContain('<script>');
    // The markdown renderer escapes < and > to &lt; &gt;, which React renders as visible text
    expect(container.textContent).toContain('<script>');
  });

  it('renders links with safe attributes', () => {
    const { container } = render(
      <MarkdownWidget
        {...makeProps({
          config: { content: '[Click here](https://example.com)' },
        })}
      />,
    );

    const link = container.querySelector('a');
    expect(link).toBeTruthy();
    expect(link?.getAttribute('href')).toBe('https://example.com');
    expect(link?.getAttribute('rel')).toContain('noopener');
    expect(link?.getAttribute('target')).toBe('_blank');
  });

  it('shows title if provided', () => {
    const { container } = render(
      <MarkdownWidget
        {...makeProps({
          title: 'My Notes',
          config: { content: 'Some content' },
        })}
      />,
    );

    expect(container.textContent).toContain('My Notes');
  });

  it('renders empty content gracefully', () => {
    const { container } = render(
      <MarkdownWidget {...makeProps({ config: {} })} />,
    );

    expect(container.querySelector('.ss-markdown')).toBeTruthy();
  });
});

describe('AlertsWidget', () => {
  const alertRows = [
    {
      alert_title: 'Latency spike',
      alert_message: '95th percentile latency exceeded 800ms in us-east-1.',
      severity: 'warning',
      detected_at: '2026-04-10 14:20 UTC',
    },
    {
      alert_title: 'Queue recovered',
      alert_message: 'Fulfillment backlog returned to normal operating range.',
      severity: 'success',
      detected_at: '2026-04-10 14:35 UTC',
    },
  ];

  it('renders alert rows with severity badges', () => {
    render(
      <AlertsWidget
        {...makeProps({
          widgetId: 'alerts-1',
          title: 'Operations Watchlist',
          config: {
            titleField: 'alert_title',
            messageField: 'alert_message',
            severityField: 'severity',
            timestampField: 'detected_at',
            layout: 'wrap',
            showTimestamp: true,
          },
          data: alertRows,
        })}
      />,
    );

    expect(screen.getByTestId('alerts-widget-alerts-1')).toBeTruthy();
    expect(screen.getByText('Operations Watchlist')).toBeTruthy();
    expect(screen.getByText('Latency spike')).toBeTruthy();
    expect(screen.getByText('warning')).toBeTruthy();
    expect(screen.getByText('2026-04-10 14:20 UTC')).toBeTruthy();
  });

  it('respects maxItems and hide empty state', () => {
    const { rerender } = render(
      <AlertsWidget
        {...makeProps({
          widgetId: 'alerts-2',
          config: {
            titleField: 'alert_title',
            messageField: 'alert_message',
            severityField: 'severity',
            maxItems: 1,
          },
          data: alertRows,
        })}
      />,
    );

    expect(screen.getAllByTestId(/alerts-widget-item-alerts-2-/)).toHaveLength(1);

    rerender(
      <AlertsWidget
        {...makeProps({
          widgetId: 'alerts-3',
          config: {
            emptyState: 'hide',
          },
          data: [],
        })}
      />,
    );

    expect(screen.queryByTestId('alerts-widget-alerts-3')).toBeNull();
  });

  it('uses semantic theme colors when available', () => {
    render(
      <AlertsWidget
        {...makeProps({
          widgetId: 'alerts-4',
          config: {
            titleField: 'alert_title',
            messageField: 'alert_message',
            severityField: 'severity',
          },
          data: [{ ...alertRows[0], severity: 'danger' }],
          theme: {
            colors: {
              danger: '#7f1d1d',
              border: '#cbd5e1',
            },
          },
        })}
      />,
    );

    const badge = screen.getByText('danger');
    // jsdom normalises hex → rgb
    expect(badge.style.color).toBe('rgb(127, 29, 29)');
  });
});

describe('registerAllCharts', () => {
  it('registers all 18 widget types', async () => {
    const { registerAllCharts } = await import('../src/index');
    const { createWidgetRegistry } = await import('@supersubset/runtime');
    const registry = createWidgetRegistry();
    registerAllCharts(registry);

    const expectedTypes = [
      'line-chart', 'bar-chart', 'table', 'kpi-card',
      'pie-chart', 'scatter-chart', 'area-chart', 'gauge',
      'funnel-chart', 'radar-chart', 'treemap', 'heatmap',
      'combo-chart', 'waterfall', 'sankey', 'box-plot', 'markdown', 'alerts',
    ];

    for (const type of expectedTypes) {
      expect(registry.has(type), `Missing widget type: ${type}`).toBe(true);
    }

    expect(registry.getRegisteredTypes().length).toBe(18);
  });
});
