---
description: "Use when modifying ECharts wrappers in packages/charts-echarts/. Covers chart type wrappers, config translators, theme bridges, and chart performance. Enforces widget interface contract and chart rendering best practices."
applyTo: "packages/charts-echarts/**"
---

# Charts-ECharts Package Rules

- All chart wrappers must implement the widget interface from `packages/runtime`
- Wrap ECharts behind a stable internal widget API — never expose raw ECharts options
- Use tree-shakeable ECharts imports (`echarts/core` + individual components)
- Dispose chart instances on unmount to prevent memory leaks
- Handle container resize with ResizeObserver
- Use `notMerge: true` for option updates to avoid stale state
- Theme bridge: translate Supersubset theme tokens → ECharts theme options
- Support all MVP chart types: line, bar, stacked bar, area, pie/donut, scatter, heatmap, combo
- Write tests with fixture data for each chart type
- Write Storybook stories showing each chart variant
