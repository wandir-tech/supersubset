# QA Pre-Audit — 2026-04-11

**Agent**: QA sweep across all packages  
**Branch**: Multiple fix branches → merged to develop (PRs #40–#49)  
**Trigger**: Phase 6 hardening — systematic bug hunt before HC-9 release gate

## Scope

Full manual + automated audit of all packages after Phases 0–5 completion.

## Bugs Found & Fixed (31 total)

All 31 issues (#9–#39) found, fixed, and merged to develop.

| #   | Title                                                           | Package          | Severity |
| --- | --------------------------------------------------------------- | ---------------- | -------- |
| #9  | Pie chart: donut variant toggle no visible effect               | charts-echarts   | Medium   |
| #10 | Pie chart: label position change no visible effect              | charts-echarts   | Medium   |
| #11 | Gauge: roundCap toggle no visible effect                        | charts-echarts   | Low      |
| #12 | Gauge: progress mode toggle no visible effect                   | charts-echarts   | Low      |
| #13 | Radar chart: area fill toggle no visible effect                 | charts-echarts   | Low      |
| #14 | Treemap: show parent labels toggle no visible effect            | charts-echarts   | Low      |
| #15 | Table: striped rows toggle no visible effect                    | charts-echarts   | Low      |
| #16 | KPI Card: trend direction toggle no visible effect              | charts-echarts   | Low      |
| #17 | puckToCanonical strips format and config fields on Publish      | designer         | High     |
| #18 | Charts render blank: dataBinding.fields not translated          | designer/runtime | High     |
| #19 | Designer preview: Orders KPI shows incorrect $ prefix           | dev-app          | Low      |
| #21 | Table widget shows 'No data available' in designer preview      | designer         | Medium   |
| #22 | vite-sqlite: FIXTURE_VERSION doesn't protect Publish corruption | example          | Medium   |
| #23 | vite-sqlite: ECharts Instance disposed warnings                 | example          | Low      |
| #24 | vite-sqlite: Comparison KPI query ignores active filters        | example          | Medium   |
| #25 | dev-app Chart Gallery crash: Sankey self-loop                   | dev-app          | High     |
| #26 | No error boundary around chart widgets                          | runtime          | High     |
| #27 | LayoutRenderer: circular references cause infinite recursion    | runtime          | Critical |
| #28 | MarkdownWidget: Stored XSS via crafted markdown                 | runtime          | Critical |
| #29 | Cross-filter toggle fails for object/array values               | runtime          | Medium   |
| #30 | Table widget totals show NaN                                    | charts-echarts   | Low      |
| #31 | DrillManager breadcrumb shows [object Object]                   | runtime          | Low      |
| #34 | Filter and Interaction editors don't load existing defs         | dev-app          | Medium   |
| #35 | vite-sqlite: KPI comparison query ignores active filters        | example          | Medium   |
| #36 | CLI importSchema generates empty layout                         | cli              | High     |
| #37 | FilterProvider: stale closure in setFilter/resetFilter          | runtime          | High     |
| #38 | puck-canonical adapter flattens nested layouts on export        | designer         | High     |
| #39 | Schema validation allows prototype pollution via .passthrough() | schema           | Critical |

## Security Findings

- **#28** (Critical): XSS via MarkdownWidget — fixed with sanitization
- **#39** (Critical): Prototype pollution in Zod schema — fixed by removing .passthrough()

## Merged PRs

- PR #40 — typecheck errors, prettier, husky, CI E2E
- PR #43 — prototype pollution fix (#39)
- PR #44 — chart property wiring (#9–#16)
- PR #45 — adapter serialization (#17, #18, #38)
- PR #46 — runtime stability (#26, #29, #30, #31)
- PR #47 — filter engine (#37, #34)
- PR #48 — vite-sqlite bugs (#22, #23, #24, #35)
- PR #49 — CLI/dev-app misc (#25, #36)

## Final State

- 1,034 unit tests + 63 doc-screenshot tests passing
- All 31 bugs fixed and merged
