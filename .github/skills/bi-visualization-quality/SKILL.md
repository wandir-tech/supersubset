---
name: bi-visualization-quality
description: 'Evaluate BI dashboards and charts for task-to-chart fit, readability, truthful encodings, filter discoverability, and decision-ready layout quality. Use when testing or reviewing dashboards for market readiness, not just technical correctness.'
---

# BI Visualization Quality

## When to Use

- Testing whether a dashboard is merely functional versus decision-ready
- Reviewing chart choices, labels, colors, and layout hierarchy in host apps or screenshots
- Auditing whether interactivity and filters are discoverable and meaningful to end users
- Deciding what visual assertions belong in browser tests, screenshot checks, or manual QA
- Performing release-readiness review for BI-facing workflows

## Purpose

This skill closes a gap that technical testing alone misses: a BI package can pass type checks, unit tests, and even browser workflows while still producing dashboards that are misleading, unreadable, hard to operate, or poor at answering user questions.

Use this skill alongside `.github/skills/testing-strategy/SKILL.md` and `.github/skills/browser-testing/SKILL.md` when the outcome must be credible to a real analyst, operator, or dashboard consumer.

## Core Review Questions

Ask these before calling a dashboard or chart acceptable:

1. Does the chart type fit the analytical task?
2. Are the most important comparisons easy to see without explanation?
3. Are labels, legends, number formats, and units clear enough for fast interpretation?
4. Are color, size, ordering, and layout helping comprehension rather than adding noise?
5. Are filters and interactions obvious enough that a new user can operate them correctly?
6. Would a reasonable user draw the right conclusion from this view, or could the presentation mislead them?

## Chart Selection Heuristics

Choose the simplest visual form that matches the task.

- Use bars for comparing categories with one or a few measures.
- Use lines for time series or ordered sequences where trend matters.
- Use tables when precise lookup or dense comparison matters more than shape.
- Use scatter plots for relationships or clustering, not for simple category comparison.
- Use heatmaps for matrix-style intensity patterns, not as a default substitute for bars.
- Use KPI cards for single headline metrics, ideally with context such as delta, prior value, or target.
- Use pie or donut only for small part-to-whole cases with few categories and clear magnitude differences.

## Misleading Pattern Checks

Flag these as release concerns unless strongly justified:

- pie or donut with too many slices
- lines with too many series to read cleanly
- truncated axes that exaggerate differences without obvious signaling
- unlabeled or ambiguous units, currencies, or time windows
- inconsistent category ordering across related views
- color meaning that changes from chart to chart without warning
- stacked views that hide the key comparison the user actually needs
- decorative complexity that competes with the data

## Readability Rules

- Titles should explain what the view is showing, not just restate the chart type.
- Axis titles, legend labels, and number formats should remove ambiguity about units and grain.
- Avoid dense label collisions; long labels should wrap, truncate safely, or be moved to a table.
- Use ordering intentionally. Alphabetical order is rarely the best analytical order.
- Show enough context for KPI values to be meaningful.
- Prefer fewer panels with clear hierarchy over many equally loud panels.

## Color And Emphasis

- Use color to encode meaning or emphasis, not decoration.
- Keep category colors stable across related views when the same categories recur.
- Reserve strong accent colors for genuinely important states or outliers.
- Ensure contrast is sufficient for labels, legends, and interactive controls.
- Do not rely on color alone to communicate status or selection.

## Dashboard Composition

- Place the highest-value view first in the reading order.
- Group related filters together and make their scope legible.
- Keep supporting detail visually secondary to the main decision view.
- Avoid making users scan unrelated panels to interpret one chart.
- If multiple views must be compared, align scales and ordering where possible.

## Interaction And Filter Quality

- Filters should be discoverable without reading documentation.
- Filter labels should reflect business meaning, not raw field ids.
- A filter change should produce an obvious visible outcome or clear loading feedback.
- Cross-filter and drill actions should be predictable; hidden affordances are not enough.
- If a dashboard depends on host-owned query refresh, tests should prove both the host query mutation and the visible dashboard update.

## Validation Expectations

Use this skill to strengthen evidence, not replace it.

- Pair visual-quality concerns with the cheapest executable proof possible.
- Add screenshot or browser checks for overlaps, hierarchy, and affordance issues.
- Add semantic assertions for query logs, row counts, KPI values, legends, or visible series changes when interactivity is involved.
- Record manual review findings in `docs/testing/qa-checklist.md` or a QA history entry when the issue is release-relevant.

## Anti-Patterns

- declaring success because the chart rendered at all
- testing only control state when the user cares about the changed analysis result
- using screenshots as the only evidence for data-meaning correctness
- accepting technically valid dashboards that are confusing on first use
- treating design quality as subjective when the defect is actually interpretability or discoverability

## See Also

- `.github/skills/testing-strategy/SKILL.md`
- `.github/skills/browser-testing/SKILL.md`
- `docs/testing/verification-strategy.md`
- `docs/testing/qa-checklist.md`
