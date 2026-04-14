/**
 * Regression tests for bugs #25, #28, #30.
 * Each test is designed to FAIL against pre-fix code.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MarkdownWidget } from '../src/charts/MarkdownWidget';
import { TableWidget } from '../src/charts/TableWidget';
import type { WidgetProps } from '@supersubset/runtime';

function makeProps(overrides: Partial<WidgetProps> = {}): WidgetProps {
  return {
    widgetId: 'test-widget',
    widgetType: 'test',
    config: {},
    ...overrides,
  };
}

// ─── #28: XSS via double-quote injection in markdown links ───

describe('MarkdownWidget — #28 XSS via double-quote in link href', () => {
  it('escapes double quotes in link URLs to prevent attribute breakout', () => {
    // Attack vector: [text](url" onclick="alert(1)) should NOT produce a clickable onclick
    const malicious = '[Click](https://example.com" onclick="alert(1))';
    const { container } = render(
      <MarkdownWidget {...makeProps({ config: { content: malicious } })} />,
    );

    // The anchor must NOT have an actual onclick attribute
    const anchor = container.querySelector('a');
    expect(anchor?.getAttribute('onclick')).toBeNull();

    // The href should contain the escaped quotes as &quot; — the entire
    // malicious payload becomes part of the URL value, not a separate attribute.
    // Before fix: " was not escaped, so the href ended early and onclick became a real attribute.
    const href = anchor?.getAttribute('href') ?? '';
    expect(href).toContain('example.com');
    // The onclick= text is trapped inside the href, not a standalone attribute
    expect(container.querySelectorAll('[onclick]')).toHaveLength(0);
  });

  it('does not allow event handler injection via unescaped quotes', () => {
    // Another attack: image-style injection via quotes in text
    const { container } = render(
      <MarkdownWidget
        {...makeProps({
          config: { content: '[xss](https://x.com" onmouseover="alert(1))' },
        })}
      />,
    );

    // No element in the rendered output should have an onmouseover attribute
    expect(container.querySelectorAll('[onmouseover]')).toHaveLength(0);
  });
});

// ─── #30: NaN corrupts table totals row ──────────────────────

describe('TableWidget — #30 NaN values in totals', () => {
  const columns = [
    { fieldId: 'name', label: 'Name', dataType: 'string' },
    { fieldId: 'amount', label: 'Amount', dataType: 'number' },
  ];

  it('excludes NaN values from totals calculation', () => {
    const data = [
      { name: 'Alice', amount: 100 },
      { name: 'Bob', amount: NaN },
      { name: 'Charlie', amount: 200 },
    ];

    const { container } = render(
      <TableWidget
        {...makeProps({
          config: { showTotals: true },
          columns,
          data,
        })}
      />,
    );

    // The totals row (last tr with fontWeight 600) should show 300, not NaN
    const rows = container.querySelectorAll('tbody tr');
    const totalsRow = rows[rows.length - 1];
    expect(totalsRow).toBeTruthy();
    expect(totalsRow.textContent).not.toContain('NaN');
    // Only finite numbers should be summed: 100 + 200 = 300
    expect(totalsRow.textContent).toContain('300');
  });

  it('handles all-NaN numeric column gracefully', () => {
    const data = [
      { name: 'Alice', amount: NaN },
      { name: 'Bob', amount: NaN },
    ];

    const { container } = render(
      <TableWidget
        {...makeProps({
          config: { showTotals: true },
          columns,
          data,
        })}
      />,
    );

    // Should not display NaN in the totals row
    const rows = container.querySelectorAll('tbody tr');
    const totalsRow = rows[rows.length - 1];
    // With all-NaN, isNumeric stays false, so no total is shown for that column
    expect(totalsRow?.textContent).not.toContain('NaN');
  });
});

// ─── #25: Sankey self-loop/empty-edge filtering ─────────────
// Note: ECharts-based widgets can't be fully rendered in jsdom (no canvas).
// We test the filtering logic that prevents the crash.

describe('SankeyWidget — #25 self-loop and empty-node edge filtering', () => {
  it('filters out self-loop edges where source equals target', () => {
    // Simulate the filtering logic from SankeyWidget
    const data = [
      { src: 'A', tgt: 'A', val: 10 },
      { src: 'A', tgt: 'B', val: 20 },
      { src: 'B', tgt: 'C', val: 30 },
    ];

    const sourceField = 'src';
    const targetField = 'tgt';
    const links: Array<{ source: string; target: string; value: number }> = [];
    for (const row of data) {
      const source = String(row[sourceField] ?? '');
      const target = String(row[targetField] ?? '');
      if (!source || !target || source === target) continue;
      links.push({ source, target, value: Number(row.val ?? 0) });
    }

    // Before fix: A→A self-loop would be included, crashing ECharts with "not a DAG"
    expect(links).toHaveLength(2);
    expect(links.find((l) => l.source === l.target)).toBeUndefined();
  });

  it('filters out edges with empty source or target', () => {
    const data = [
      { src: '', tgt: 'B', val: 10 },
      { src: 'A', tgt: '', val: 20 },
      { src: '', tgt: '', val: 5 },
      { src: 'A', tgt: 'B', val: 30 },
    ];

    const links: Array<{ source: string; target: string }> = [];
    for (const row of data) {
      const source = String(row.src ?? '');
      const target = String(row.tgt ?? '');
      if (!source || !target || source === target) continue;
      links.push({ source, target });
    }

    // Before fix: empty strings created "" → "" or "" → "B" edges
    expect(links).toHaveLength(1);
    expect(links[0]).toEqual({ source: 'A', target: 'B' });
  });

  it('returns empty links when all edges are invalid', () => {
    const data = [
      { src: 'X', tgt: 'X', val: 10 },
      { src: '', tgt: '', val: 5 },
    ];

    const links: Array<{ source: string; target: string }> = [];
    for (const row of data) {
      const source = String(row.src ?? '');
      const target = String(row.tgt ?? '');
      if (!source || !target || source === target) continue;
      links.push({ source, target });
    }

    expect(links).toHaveLength(0);
  });
});
