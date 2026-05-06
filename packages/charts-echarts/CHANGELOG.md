# @supersubset/charts-echarts

## 0.1.2

### Patch Changes

- [#115](https://github.com/wandir-tech/supersubset/pull/115) [`26b162d`](https://github.com/wandir-tech/supersubset/commit/26b162d387871718a59e22c2a9331518ced6f26f) Thanks [@github-actions](https://github.com/apps/github-actions)! - Patch release for recent runtime, designer, and chart fixes. This includes restoring theme propagation between the runtime and chart widgets, removing unsupported undefined ECharts options that caused chart rendering issues, and tightening designer and runtime filter editing behavior.

  Compatibility notes:
  - Page-scoped filters now apply only on their authored page. Dashboards that previously relied on page-scoped filters affecting other pages should move those filters to global scope or set an explicit `pageId`.
  - Filter Bar blocks now choose which authored filters to render via `filterIds`. Filter scope remains authored on the filter definitions in the Filter Builder panel, not on the Filter Bar block itself.

- Updated dependencies [[`26b162d`](https://github.com/wandir-tech/supersubset/commit/26b162d387871718a59e22c2a9331518ced6f26f)]:
  - @supersubset/runtime@0.1.2
  - @supersubset/schema@0.1.2
  - @supersubset/theme@0.1.2

## 0.1.1

### Patch Changes

- [#78](https://github.com/wandir-tech/supersubset/pull/78) [`715ee47`](https://github.com/wandir-tech/supersubset/commit/715ee47d6f5ae8b1ff25c356cde5cf356497d14f) Thanks [@kokokenada](https://github.com/kokokenada)! - Patch release for recent runtime, designer, and chart fixes. This includes restoring theme propagation between the runtime and chart widgets, removing unsupported undefined ECharts options that caused chart rendering issues, and tightening designer and runtime filter editing behavior.

- Updated dependencies [[`715ee47`](https://github.com/wandir-tech/supersubset/commit/715ee47d6f5ae8b1ff25c356cde5cf356497d14f)]:
  - @supersubset/runtime@0.1.1
  - @supersubset/schema@0.1.1
  - @supersubset/theme@0.1.1

## 0.1.0

### Minor Changes

- [`09ca46d`](https://github.com/wandir-tech/supersubset/commit/09ca46d83f56444d9828846de97a5abd4c8625e1) - release for testing

### Patch Changes

- Updated dependencies [[`09ca46d`](https://github.com/wandir-tech/supersubset/commit/09ca46d83f56444d9828846de97a5abd4c8625e1)]:
  - @supersubset/runtime@0.1.0
  - @supersubset/schema@0.1.0
