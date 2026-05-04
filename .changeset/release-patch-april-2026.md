---
'@supersubset/charts-echarts': patch
'@supersubset/designer': patch
'@supersubset/runtime': patch
---

Patch release for recent runtime, designer, and chart fixes. This includes restoring theme propagation between the runtime and chart widgets, removing unsupported undefined ECharts options that caused chart rendering issues, and tightening designer and runtime filter editing behavior.

Compatibility notes:

- Page-scoped filters now apply only on their authored page. Dashboards that previously relied on page-scoped filters affecting other pages should move those filters to global scope or set an explicit `pageId`.
- Filter Bar blocks now choose which authored filters to render via `filterIds`. Filter scope remains authored on the filter definitions in the Filter Builder panel, not on the Filter Bar block itself.
