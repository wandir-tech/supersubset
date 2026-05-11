# QA Round 1 — 2026-04-16

**Agent**: QA testing skill creation + chart rendering audit  
**Branch**: `feature/qa-testing-skill`  
**PR**: #58 (open, targeting develop)

## Scope

Created `.github/skills/qa-testing/SKILL.md` and ran first targeted audit focusing on chart rendering and example apps.

## Bugs Found & Fixed (4)

| #   | Title                                                   | Package        | Severity | Fix                                       |
| --- | ------------------------------------------------------- | -------------- | -------- | ----------------------------------------- |
| #53 | Pie chart renders blank: explicit `roseType: undefined` | charts-echarts | High     | Remove undefined keys from ECharts option |
| #54 | nextjs-ecommerce: duplicate 'use client' directive      | example        | Low      | Remove duplicate directive                |
| #56 | Treemap renders as tiny square: explicit undefined keys | charts-echarts | High     | Strip undefined keys from 7 chart widgets |
| #57 | Duplicate "prepare" key in root package.json            | monorepo       | Low      | Remove duplicate key                      |

## Root Cause Pattern

Bugs #53 and #56 share a root cause: ECharts treats `key: undefined` differently from an absent key. When our chart widgets explicitly set optional properties to `undefined`, ECharts suppresses the default behavior. Fix was to conditionally include properties only when defined.

## Affected Chart Widgets (for #56)

- PieChartWidget
- GaugeWidget
- HeatmapWidget
- ComboChartWidget
- RadarChartWidget
- TreemapWidget
- WaterfallChartWidget

## Artifacts

- `.github/skills/qa-testing/SKILL.md` — QA testing skill for future agents
- 5 commits on `feature/qa-testing-skill` branch

## Test Count After

1,248 unit tests passing (up from 1,034)
