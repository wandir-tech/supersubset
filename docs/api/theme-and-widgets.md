# Theme And Widgets API

This reference covers `@supersubset/theme` and `@supersubset/charts-echarts`.

## @supersubset/theme

Use the theme package to resolve inline theme definitions and bridge them into CSS variables or ECharts theme objects.

Main exports:

- `DEFAULT_THEME`
- `resolveTheme()`
- `themeToCssVariables()`
- `themeToEChartsTheme()`
- `ResolvedTheme`

Typical flow:

```ts
import { resolveTheme, themeToCssVariables } from '@supersubset/theme';

const theme = resolveTheme({
  type: 'inline',
  colors: {
    primary: '#0d5c63',
    background: '#f4fbfb',
    surface: '#ffffff',
    text: '#11333a',
    info: '#0b6bcb',
    success: '#1f7a45',
    warning: '#a05a00',
    danger: '#b42318',
    border: '#d7e7e9',
  },
});

const cssVariables = themeToCssVariables(theme);
```

Semantic status tokens supported today:

- `success`
- `warning`
- `danger`
- `info`
- `border`

Those tokens are used by the alerts widget now and reserve shared semantics for future status-oriented UI.

## @supersubset/charts-echarts

This package ships the bundled widget catalog for runtime hosts.

Main exports:

- widget components such as `LineChartWidget`, `BarChartWidget`, `TableWidget`, `KPICardWidget`, `MarkdownWidget`, and `AlertsWidget`
- shared ECharts option builders like `extractSharedConfig()` and `formatNumber()` for advanced chart work
- `registerAllCharts(registry)`

The `@supersubset/charts-echarts/essentials` entrypoint exports a smaller bundle:

- `registerEssentialWidgets(registry)`
- `LineChartWidget`
- `BarChartWidget`
- `PieChartWidget`
- `TableWidget`
- `KPICardWidget`

## Widget Registration Strategy

Use `registerAllCharts()` when you want the full bundled catalog, including `alerts`.

Use `registerEssentialWidgets()` when you want a smaller default bundle and only the most common chart types.

If you want the essentials bundle plus one or two extra widgets, register those extra widget components manually.

## Registered Widget Types

`registerAllCharts()` registers these widget type strings:

- `line-chart`
- `bar-chart`
- `table`
- `kpi-card`
- `pie-chart`
- `scatter-chart`
- `area-chart`
- `gauge`
- `funnel-chart`
- `radar-chart`
- `treemap`
- `heatmap`
- `combo-chart`
- `waterfall`
- `sankey`
- `box-plot`
- `markdown`
- `alerts`

## Alerts Widget

`AlertsWidget` is a first-class widget export, not an ECharts grammar wrapper. Register it manually if you are not using `registerAllCharts()`.

The widget expects row-shaped input and reads the configured title, message, severity, and timestamp fields from each row.

## Related Docs

- [runtime.md](./runtime.md)
- [schema.md](./schema.md)
- [Chart Configuration Cookbook](../guides/chart-cookbook.md)
- [Canonical Schema v0](../schema/canonical-schema-v0.md)