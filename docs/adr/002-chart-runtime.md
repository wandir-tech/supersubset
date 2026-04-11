# ADR-002: Chart Runtime — Apache ECharts

## Status

Accepted

## Date

2026-04-08

## Context

Supersubset needs a chart rendering engine that supports a wide range of chart types (line, bar, pie, scatter, heatmap, combo, KPI, table) and can be themed to match host applications. The chart engine must:

- Render inside React components in the widget registry
- Accept configuration translated from the canonical schema
- Support theming/styling that host apps can customize
- Handle responsive resizing
- Cover the MVP chart set without requiring multiple charting libraries

## Decision

Use **Apache ECharts** (`echarts`, Apache 2.0 license) as the primary chart rendering engine, wrapped in `packages/charts-echarts/`.

### Architecture

Each chart type is a widget that implements the widget registry interface:

```
Canonical WidgetConfig → ChartConfigTranslator → ECharts Option → echarts.setOption()
```

This follows the pipeline pattern observed in Superset's `EchartsChartPlugin`:
1. **Canonical config** (from dashboard schema) defines what the chart should show
2. **Config translator** (per chart type) converts canonical config to ECharts `option`
3. **ECharts instance** renders the chart

### Widget structure (per chart type)

```
packages/charts-echarts/src/
  ├── base/
  │   ├── EChartsWrapper.tsx      # React wrapper: init, resize, dispose lifecycle
  │   └── themebridge.ts          # Supersubset theme → ECharts theme translation
  ├── line/
  │   ├── LineChart.tsx            # Widget component (registered in widget registry)
  │   └── translateLineConfig.ts  # Canonical config → ECharts option
  ├── bar/
  ├── pie/
  ├── table/                      # ECharts dataset-based table rendering
  └── index.ts                    # Registers all chart widgets
```

### Table widget

Per HC-0 decision, the MVP table widget uses ECharts dataset/table rendering for consistency with other chart widgets. No separate React table library.

### Theming

ECharts supports custom themes via `echarts.registerTheme()`. We will build a theme bridge that translates Supersubset theme tokens (colors, fonts, spacing) into an ECharts theme object. Host apps customize Supersubset theme; the bridge propagates to ECharts.

## Consequences

### Positive

- One charting library covers all MVP chart types including tables
- Apache 2.0 license — permissive, no restrictions
- Rich ecosystem: 65k+ stars, extensive documentation, active maintenance
- Built-in theming system aligns with our host-themeable requirement
- Tree-shakeable — host apps only pay for chart types they use
- Superset's own migration from NVD3 to ECharts validates this as the industry standard

### Negative

- ECharts bundle is ~800KB full / ~300KB tree-shaken for common charts — acceptable for a dashboard library
- ECharts table rendering is less flexible than a dedicated table component (e.g., no inline editing, limited cell customization) — sufficient for MVP read-only tables
- Canvas-based rendering makes DOM-level testing harder — use screenshot comparison in Playwright

### Neutral

- `packages/charts-echarts` is a separate package — could add `packages/charts-d3` or other renderers later without changing schema or runtime
- Chart widgets register with the runtime's widget registry — the runtime doesn't know about ECharts

## Alternatives Considered

| Alternative | Pros | Cons | Why Rejected |
|------------|------|------|-------------|
| **D3.js** | Maximum flexibility, SVG-based (DOM-testable) | Requires building every chart type from primitives; no standard chart components; massive development effort | Library, not a chart solution — would need a D3-based chart library on top |
| **Recharts** | React-native, declarative, lightweight | Limited chart types (no heatmap, no combo natively); less mature theming; smaller ecosystem | Doesn't cover MVP chart set without workarounds |
| **Chart.js** | Simple API, lightweight (~60KB) | Canvas-based like ECharts but fewer chart types; less extensible; weaker theming | Less capable than ECharts with similar tradeoffs |
| **Plotly.js** | Rich chart types, built-in interactivity | Large bundle (~3MB), opinionated styling, complex React integration | Bundle size incompatible with library-first approach |
| **Perspective** | WASM-powered, handles millions of rows | 3-5MB WASM bundle, specialized for pivot/table; dropped per HC-0 decision | Bundle size incompatible with library-first approach |

## References

- [Superset archaeology — chart plugin pattern](../research/superset-archaeology.md)
- [Reuse matrix](../research/reuse-matrix.md)
- [HC-0 decision record](../status/checkpoints/hc-0-result.md)
