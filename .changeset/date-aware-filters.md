---
'@supersubset/schema': minor
'@supersubset/runtime': minor
'@supersubset/designer': minor
'@supersubset/charts-echarts': minor
'@supersubset/theme': minor
'@supersubset/data-model': minor
'@supersubset/query-client': minor
'@supersubset/query-sql': minor
'@supersubset/cli': minor
'@supersubset/adapter-prisma': minor
'@supersubset/adapter-sql': minor
'@supersubset/adapter-json': minor
'@supersubset/adapter-dbt': minor
---

Date-aware dashboard filters (closes [#162](https://github.com/wandir-tech/supersubset/issues/162)).

**Schema** — adds optional `FilterDefinition.dateConfig` describing the date-control style (`preset` / `range` / `weekly`), the weekday boundary, and weekly lookback/lookahead. `dateFilterConfigSchema` cross-validates unknown preset values and rejects weekly configs that would generate zero options.

**Shared date utilities** — new `@supersubset/schema/date-utils` exports `generateWeeklyDateRangeOptions`, `resolveRelativeDate`, `isRangeLikeValue` / `isDateRangeLike`, `normalizeRangeBound`, `DATE_PRESETS`, and the supporting `DateRangeValue` / `WeeklyDateRangeOption` types. Designer and runtime now share one source of truth for week-boundary and preset math.

**Designer** — date-typed fields automatically switch to date-aware controls and hide the generic value/operator + select-option-source UI. Authors pick the control style (`Relative date menu` / `Custom date range` / `Weekly range dropdown`), the week-start day, lookback/lookahead, and an authored default value. The weekly mode shows a live dropdown preview with an honest "showing N of M weeks" count.

**Runtime** — `FilterBar` renders weekly dropdowns, custom-range inputs, or relative presets depending on `dateConfig.mode`. Partial custom-range inputs now compile to one-sided `gte` / `lte` filters (previously produced a malformed `between` with `null` bounds). Cross-filter compilation routes through the same `compileFilterDefinitionValue` path so date-range cross-filters behave consistently.

**Backwards compatible.** `dateConfig` is optional; existing dashboards without it keep their prior preset-with-custom-range behavior. The `resolveRelativeDate` and `DATE_PRESETS` public exports keep the same signatures (`resolveRelativeDate` gains an optional third `config` arg).
