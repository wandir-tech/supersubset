# Chart Configuration Cookbook

This guide collects practical configuration patterns for the bundled widgets in `@supersubset/charts-echarts`.

Use it when you already know the widget type you want and need a working config shape to start from.

## Shared ECharts Settings

Most ECharts-backed widgets read the shared config keys from `config`:

- `colorScheme`
- `showLegend`
- `legendPosition`
- `legendType`
- `showValues`
- `numberFormat`
- `tooltipTrigger`
- `xAxisTitle`
- `yAxisTitle`
- `xAxisLabelRotate`
- `yAxisMin`
- `yAxisMax`
- `logAxis`
- `zoomable`

Example:

```json
{
  "colorScheme": "cool",
  "showLegend": true,
  "legendPosition": "top",
  "showValues": true,
  "numberFormat": "$,.0f",
  "xAxisTitle": "Month",
  "yAxisTitle": "Revenue",
  "zoomable": true
}
```

These shared settings apply to the ECharts chart widgets. They do not drive the HTML-based widgets such as `table`, `kpi-card`, `markdown`, or `alerts`.

## Line And Area Trends

Use `line-chart` when you want one or more series over a category or time axis.

Common keys:

- `xField`
- `yFields`
- `smooth`
- `showMarkers`
- `markerSize`
- `step`
- `connectNulls`
- `area`

Example:

```json
{
  "xField": "month",
  "yFields": ["revenue", "orders"],
  "smooth": true,
  "showMarkers": false,
  "connectNulls": true,
  "numberFormat": "$,.0f"
}
```

Use `area-chart` when you want the same shape with filled areas.

Additional area-chart keys:

- `areaOpacity`
- `stacked`
- `showMarkers`
- `step`
- `connectNulls`

Example:

```json
{
  "xField": "month",
  "yFields": ["revenue"],
  "areaOpacity": 0.3,
  "stacked": true,
  "showMarkers": false
}
```

## Bars And Mixed Charts

Use `bar-chart` for category comparisons.

Common keys:

- `xField`
- `yFields`
- `horizontal`
- `stacked`
- `barWidth`
- `barGap`
- `borderRadius`
- `barMinHeight`

Example:

```json
{
  "xField": "category",
  "yFields": ["sales", "target"],
  "stacked": true,
  "borderRadius": 6,
  "showLegend": true
}
```

Use `combo-chart` when you want bars and lines on the same x-axis.

Common keys:

- `xField`
- `barFields`
- `lineFields`
- `lineSmooth`
- `barBorderRadius`

Example:

```json
{
  "xField": "month",
  "barFields": ["orders"],
  "lineFields": ["revenue"],
  "lineSmooth": true,
  "barBorderRadius": 4,
  "numberFormat": "$,.0f"
}
```

## Share And Conversion Views

Use `pie-chart` for part-to-whole breakdowns.

Common keys:

- `nameField`
- `valueField`
- `donut`
- `innerRadius`
- `outerRadius`
- `labelPosition`
- `padAngle`
- `roseType`

Example:

```json
{
  "nameField": "region",
  "valueField": "revenue",
  "donut": true,
  "innerRadius": 45,
  "outerRadius": 80,
  "labelPosition": "inside"
}
```

Use `funnel-chart` for staged conversion counts.

Common keys:

- `nameField`
- `valueField`
- `sort`
- `funnelAlign`
- `gap`
- `labelPosition`

Example:

```json
{
  "nameField": "stage",
  "valueField": "value",
  "sort": "descending",
  "funnelAlign": "center",
  "gap": 4,
  "labelPosition": "outside"
}
```

## Correlation And Density

Use `scatter-chart` when you need correlation or clustering views.

Common keys:

- `xField`
- `yField`
- `symbolSize`
- `sizeField`
- `colorField`
- `opacity`

Example:

```json
{
  "xField": "temperature",
  "yField": "pressure",
  "sizeField": "density",
  "colorField": "cluster",
  "opacity": 0.5
}
```

Use `heatmap` when you need a two-dimensional grid of values.

Common keys:

- `xField`
- `yField`
- `valueField`
- `cellBorderWidth`
- `cellBorderColor`

Example:

```json
{
  "xField": "day",
  "yField": "hour",
  "valueField": "load",
  "cellBorderWidth": 1,
  "cellBorderColor": "#ffffff"
}
```

## Shape And Hierarchy Charts

Use `radar-chart` for comparing entities across several metrics.

Common keys:

- `valueFields`
- `nameField`
- `shape`
- `areaFill`

Example:

```json
{
  "nameField": "product",
  "valueFields": ["speed", "quality", "price"],
  "shape": "circle",
  "areaFill": true
}
```

Use `treemap` for hierarchical magnitude views.

Common keys:

- `nameField`
- `valueField`
- `showUpperLabel`
- `maxDepth`
- `borderWidth`

Example:

```json
{
  "nameField": "category",
  "valueField": "value",
  "showUpperLabel": true,
  "maxDepth": 2,
  "borderWidth": 2
}
```

## Flow, Delta, Distribution, And Progress

Use `sankey` for flow graphs.

Common keys:

- `sourceField`
- `targetField`
- `valueField`
- `nodeWidth`
- `nodeGap`
- `orient`

Example:

```json
{
  "sourceField": "source",
  "targetField": "target",
  "valueField": "value",
  "nodeWidth": 24,
  "nodeGap": 12,
  "orient": "horizontal"
}
```

Use `waterfall` for cumulative deltas.

Common keys:

- `nameField`
- `valueField`
- `totalLabel`
- `increaseColor`
- `decreaseColor`
- `totalColor`

Example:

```json
{
  "nameField": "quarter",
  "valueField": "delta",
  "totalLabel": "Total",
  "increaseColor": "#52c41a",
  "decreaseColor": "#f5222d",
  "totalColor": "#1677ff"
}
```

Use `box-plot` for distribution summaries.

Common keys:

- `categoryField`
- `valueField`
- `boxWidth`

Example:

```json
{
  "categoryField": "group",
  "valueField": "score",
  "boxWidth": "30"
}
```

Use `gauge` for progress or score widgets.

Common keys:

- `valueField`
- `startAngle`
- `endAngle`
- `splitCount`
- `progressMode`
- `roundCap`
- `minValue`
- `maxValue`

Example:

```json
{
  "valueField": "uptime_pct",
  "minValue": 0,
  "maxValue": 100,
  "progressMode": true,
  "roundCap": true,
  "startAngle": 225,
  "endAngle": -45
}
```

## Table, KPI, Markdown, And Alerts

These widgets are React-rendered HTML widgets, not ECharts wrappers.

### Table

Common keys:

- `columns`
- `showRowNumbers`
- `showTotals`
- `headerAlign`
- `cellAlign`

Example:

```json
{
  "columns": ["name", "score", "grade"],
  "showRowNumbers": true,
  "showTotals": true,
  "headerAlign": "center",
  "cellAlign": "right"
}
```

### KPI Card

Common keys:

- `valueField`
- `comparisonField`
- `subtitleField`
- `prefix`
- `suffix`
- `format`
- `fontSize`
- `trendDirection`

Example:

```json
{
  "valueField": "revenue",
  "comparisonField": "previousRevenue",
  "subtitleField": "note",
  "prefix": "$",
  "fontSize": "lg",
  "trendDirection": "up-good"
}
```

### Markdown

Common keys:

- `content`

Example:

```json
{
  "content": "## Release Notes\n\n- Revenue dashboard refreshed\n- Alerts panel added"
}
```

The markdown widget supports headers, emphasis, lists, inline code, and safe links.

### Alerts

Common keys:

- `titleField`
- `messageField`
- `severityField`
- `timestampField`
- `layout`
- `maxItems`
- `emptyState`
- `showTimestamp`
- `defaultSeverity`

Example:

```json
{
  "titleField": "alert_title",
  "messageField": "alert_message",
  "severityField": "severity",
  "timestampField": "detected_at",
  "layout": "wrap",
  "maxItems": 3,
  "showTimestamp": true,
  "defaultSeverity": "info"
}
```

The alerts widget uses semantic theme tokens such as `info`, `success`, `warning`, `danger`, and `border` when they are present.

## Practical Tips

- Keep field ids aligned with the rows your host actually injects into the widget.
- Start from a minimal config and add one property at a time when tuning a chart.
- Use `registerAllCharts()` if you want the full bundled catalog, including `alerts`.
- Use `registerEssentialWidgets()` when you want a smaller bundle and register extra widgets manually.
- Use the designer preview and the example apps to test configs against real host data before persisting them broadly.

## Related Docs

- [API Reference: Theme And Widgets](../api/theme-and-widgets.md)
- [API Reference: Runtime](../api/runtime.md)
- [Getting Started](../getting-started.md)