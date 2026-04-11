/**
 * SVG icon definitions for each Puck component.
 * Used in the sidebar drawer to make the component list more visual.
 */
import React from 'react';

// ─── SVG Element Helpers ─────────────────────────────────────

type SvgChild = { tag: string; attrs: Record<string, string | number> };

/** Filled rect */
const fr = (x: number, y: number, w: number, h: number, opacity = 1): SvgChild => ({
  tag: 'rect',
  attrs: { x, y, width: w, height: h, fill: 'currentColor', stroke: 'none', opacity, rx: 1 },
});

/** Stroke rect */
const sr = (x: number, y: number, w: number, h: number): SvgChild => ({
  tag: 'rect',
  attrs: { x, y, width: w, height: h, rx: 1 },
});

/** Polyline */
const pl = (points: string): SvgChild => ({
  tag: 'polyline',
  attrs: { points },
});

/** Line */
const ln = (x1: number, y1: number, x2: number, y2: number): SvgChild => ({
  tag: 'line',
  attrs: { x1, y1, x2, y2 },
});

/** Stroke path */
const ps = (d: string): SvgChild => ({
  tag: 'path',
  attrs: { d },
});

/** Filled path */
const pf = (d: string, opacity = 0.3): SvgChild => ({
  tag: 'path',
  attrs: { d, fill: 'currentColor', stroke: 'none', opacity },
});

/** Filled circle */
const cf = (cx: number, cy: number, r: number): SvgChild => ({
  tag: 'circle',
  attrs: { cx, cy, r, fill: 'currentColor', stroke: 'none' },
});

/** Stroke circle */
const cs = (cx: number, cy: number, r: number): SvgChild => ({
  tag: 'circle',
  attrs: { cx, cy, r },
});

// ─── Icon Factory ────────────────────────────────────────────

function makeIconFactory(children: SvgChild[]): (size?: number) => React.ReactElement {
  return (size = 18) => {
    const svgChildren = children.map((child, i) =>
      React.createElement(child.tag, { key: i, ...child.attrs })
    );
    return React.createElement(
      'svg',
      {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        style: { flexShrink: 0, display: 'block' },
      },
      ...svgChildren
    );
  };
}

// ─── Icon Definitions (24×24 viewBox) ────────────────────────

const ICON_FACTORIES: Record<string, (size?: number) => React.ReactElement> = {
  // ── Charts ──
  LineChart: makeIconFactory([
    pl('3,18 7,14 11,16 16,8 21,11'),
  ]),
  BarChart: makeIconFactory([
    fr(4, 13, 4, 7), fr(10, 7, 4, 13), fr(16, 10, 4, 10),
  ]),
  PieChart: makeIconFactory([
    cs(12, 12, 9),
    pf('M12 3 A9 9 0 0 1 20.4 16.5 L12 12 Z', 0.35),
  ]),
  ScatterChart: makeIconFactory([
    cf(5, 9, 1.8), cf(10, 15, 1.8), cf(17, 7, 1.8), cf(13, 11, 1.3), cf(19, 14, 1.3),
  ]),
  AreaChart: makeIconFactory([
    pf('M3 18 L7 12 L12 14 L17 7 L21 10 L21 18 Z', 0.2),
    pl('3,18 7,12 12,14 17,7 21,10'),
  ]),
  ComboChart: makeIconFactory([
    fr(4, 14, 3, 6, 0.4), fr(9, 10, 3, 10, 0.4), fr(14, 12, 3, 8, 0.4),
    pl('5.5,12 10.5,8 15.5,10 20,6'),
  ]),
  HeatmapChart: makeIconFactory([
    fr(3, 3, 5, 5, 0.3), fr(9.5, 3, 5, 5, 0.65), fr(16, 3, 5, 5, 0.45),
    fr(3, 9.5, 5, 5, 0.55), fr(9.5, 9.5, 5, 5, 0.35), fr(16, 9.5, 5, 5, 0.7),
    fr(3, 16, 5, 5, 0.5), fr(9.5, 16, 5, 5, 0.25), fr(16, 16, 5, 5, 0.45),
  ]),
  RadarChart: makeIconFactory([
    ps('M12 3 L19.8 7.5 L19.8 16.5 L12 21 L4.2 16.5 L4.2 7.5 Z'),
    pf('M12 7 L16.5 9.8 L16.5 14.2 L12 17 L7.5 14.2 L7.5 9.8 Z', 0.2),
  ]),
  FunnelChart: makeIconFactory([
    pf('M3 4 L21 4 L18 11 L6 11 Z', 0.4),
    pf('M6 13 L18 13 L15 20 L9 20 Z', 0.25),
  ]),
  TreemapChart: makeIconFactory([
    sr(3, 3, 10, 9), sr(15, 3, 6, 4), sr(15, 9, 6, 3), sr(3, 14, 7, 7), sr(12, 14, 9, 7),
  ]),
  SankeyChart: makeIconFactory([
    ps('M3 6 C10 6 14 10 21 10'),
    ps('M3 12 C10 12 14 14 21 14'),
    ps('M3 18 C10 18 14 16 21 16'),
  ]),
  WaterfallChart: makeIconFactory([
    fr(3, 14, 3, 6), fr(8, 10, 3, 4), fr(13, 6, 3, 4), fr(18, 4, 3, 16),
  ]),
  BoxPlotChart: makeIconFactory([
    sr(8, 8, 8, 8), ln(12, 3, 12, 8), ln(12, 16, 12, 21), ln(8, 12, 16, 12),
  ]),
  GaugeChart: makeIconFactory([
    ps('M4 18 A10 10 0 0 1 20 18'),
    ln(12, 18, 14, 9),
    cf(12, 18, 1.5),
  ]),
  AlertsWidgetBlock: makeIconFactory([
    sr(4, 4, 16, 16),
    ps('M9 8 L14.5 8 L17 12 L14.5 16 L9 16 L6.5 12 Z'),
    ln(11.75, 10, 11.75, 13),
    cf(11.75, 15, 0.8),
  ]),

  // ── Tables & KPIs ──
  Table: makeIconFactory([
    fr(3, 3, 18, 4, 0.25),
    ln(3, 10, 21, 10), ln(3, 14, 21, 14), ln(3, 18, 21, 18),
    ln(10, 7, 10, 21),
  ]),
  KPICard: makeIconFactory([
    pf('M12 4 L16 9 L13 9 L13 15 L11 15 L11 9 L8 9 Z', 0.5),
    ln(6, 19, 18, 19),
  ]),

  // ── Content ──
  HeaderBlock: makeIconFactory([
    ln(4, 7, 20, 7), ln(4, 12, 16, 12), ln(4, 17, 12, 17),
  ]),
  MarkdownBlock: makeIconFactory([
    ps('M4 4 L4 20 L8 12 L12 20 L12 4'),
    ps('M17 8 L17 16'),
    ps('M15 14 L17 16 L19 14'),
  ]),
  DividerBlock: makeIconFactory([
    ln(3, 12, 21, 12),
  ]),
  SpacerBlock: makeIconFactory([
    ln(12, 5, 12, 19),
    ps('M9 8 L12 5 L15 8'),
    ps('M9 16 L12 19 L15 16'),
  ]),

  // ── Controls ──
  FilterBarBlock: makeIconFactory([
    ps('M3 5 L21 5 L15 12 L15 18 L9 18 L9 12 Z'),
  ]),

  // ── Layout ──
  RowBlock: makeIconFactory([
    sr(3, 3, 8, 18), sr(13, 3, 8, 18),
  ]),
  ColumnBlock: makeIconFactory([
    sr(3, 3, 18, 7), sr(3, 13, 18, 8),
  ]),
};

/**
 * Get an SVG icon for a Puck component by its registered name.
 * Returns null if no icon is defined for the given name.
 */
export function getComponentIcon(name: string, size = 18): React.ReactElement | null {
  const factory = ICON_FACTORIES[name];
  return factory ? factory(size) : null;
}

/** All component names that have icons defined. */
export const ICON_COMPONENT_NAMES = Object.keys(ICON_FACTORIES);
