---
name: echarts-widgets
description: "Build Apache ECharts chart wrappers for the Supersubset widget registry. Use when implementing chart types (line, bar, pie, scatter, heatmap, combo, KPI), translating canonical chart config to ECharts options, building theme bridges, or optimizing chart rendering performance."
---

# ECharts Widget Development Skill

## When to Use
- Implementing a new chart type wrapper
- Translating canonical widget config to ECharts options
- Building the theme bridge (Supersubset tokens → ECharts theme)
- Optimizing chart rendering or resize behavior
- Adding chart interaction handlers (click, hover, brush)

## Widget Interface Contract

Every chart widget must implement:

```typescript
interface SupersubsetWidget {
  type: string;
  render(props: WidgetRenderProps): React.ReactElement;
  getDefaultConfig(): WidgetConfig;
  validateConfig(config: WidgetConfig): ValidationResult;
}

interface WidgetRenderProps {
  config: WidgetConfig;
  data: QueryResult;
  dimensions: { width: number; height: number };
  theme: ThemeTokens;
  interactions: InteractionHandlers;
  state: 'loading' | 'error' | 'empty' | 'ready';
  error?: Error;
}
```

## Config Translation Pattern

```
Canonical WidgetConfig → ECharts Option
```

Each chart type has a translator function:
```typescript
function lineChartTranslator(config: LineChartConfig, data: QueryResult, theme: ThemeTokens): EChartsOption
```

## Chart Types (MVP)

| Category | Types |
|----------|-------|
| Value | KPI card, KPI grid, sparkline KPI |
| Chart | line, bar, stacked bar, area, donut/pie, scatter, heatmap, combo |
| Table | table, pivot table |
| Content | markdown, text, image, divider |
| Control | filter bar, date range, tabs |

## Procedure

1. Read the widget interface from `packages/runtime/src/widgets/`
2. Create chart component in `packages/charts-echarts/src/charts/`
3. Implement config translator in `packages/charts-echarts/src/translators/`
4. Register with the widget registry
5. Add theme mapping in `packages/charts-echarts/src/theme/`
6. Write tests with fixture data
7. Create Storybook story

## ECharts Best Practices
- Use `echarts-for-react` wrapper or build a thin React wrapper
- Dispose chart instance on unmount to prevent memory leaks
- Handle container resize with ResizeObserver
- Use `notMerge: true` for config updates to avoid stale state
- Lazy-load chart types to reduce bundle size
