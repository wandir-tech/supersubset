# Schema API

`@supersubset/schema` is the canonical contract for dashboards. Persist, validate, serialize, and import/export `DashboardDefinition` values through this package.

## Main Exports

- Types: `DashboardDefinition`, `PageDefinition`, `WidgetDefinition`, `FilterDefinition`, `InteractionDefinition`, `NavigateTarget`, `InlineThemeDefinition`, `DataModelRef`
- Validation: `dashboardDefinitionSchema`, `validateNesting()`
- Serialization: `serializeToJSON()`, `parseFromJSON()`, `serializeToYAML()`, `parseFromYAML()`
- Migration: `migrateDashboardDefinition()`, `isSupportedSchemaVersion()`, `CURRENT_SCHEMA_VERSION`
- JSON Schema generation: `generateDashboardJsonSchema()`

## Core Types

Use these types most often in host code:

- `DashboardDefinition`: one complete persisted dashboard document
- `PageDefinition`: one canvas within a dashboard document
- `WidgetDefinition`: a widget instance with `id`, `type`, `title`, and free-form `config`
- `FilterDefinition`: dashboard or page filter configuration
- `InteractionDefinition`: click, hover, and select interactions
- `NavigateTarget`: structured navigation target for page routing now and dashboard routing later
- `InlineThemeDefinition`: inline theme values resolved by `@supersubset/theme`
- `DataModelRef`: embedded dataset metadata for filter labels and field references

`NavigateTarget` is intentionally structured instead of storing a raw `pageId`:

```ts
type NavigateTarget =
  | { kind: 'page'; pageId: string }
  | {
      kind: 'dashboard';
      dashboardId: string;
      filterMapping?: NavigationFilterMapping[];
      onMappingFailure?: 'error' | 'warn' | 'ignore';
    };
```

Dashboard targets are valid schema values today, but runtime orchestration for cross-dashboard navigation is still deferred.

## Validation

`dashboardDefinitionSchema` is the primary validation entrypoint.

```ts
import { dashboardDefinitionSchema } from '@supersubset/schema';

const result = dashboardDefinitionSchema.safeParse(definition);

if (!result.success) {
  console.error(result.error.issues);
}
```

Use `validateNesting()` when you are working directly on layout maps and want a focused structural check for parent/child depth issues.

## Serialization

The schema package owns JSON and YAML round-tripping:

```ts
import {
  serializeToJSON,
  parseFromJSON,
  serializeToYAML,
  parseFromYAML,
} from '@supersubset/schema';

const json = serializeToJSON(definition);
const roundTrippedFromJson = parseFromJSON(json);

const yaml = serializeToYAML(definition);
const roundTrippedFromYaml = parseFromYAML(yaml);
```

Use these helpers for import/export instead of hand-rolling serializers, so host flows stay aligned with the canonical contract.

`parseFromJSON()` and `parseFromYAML()` now migrate supported legacy dashboard documents before validating the current contract.

## Migration

`migrateDashboardDefinition()` upgrades supported older documents to the current canonical schema and returns a validated `DashboardDefinition`.

Current support:

- `0.1.0` recursive-layout documents are upgraded to the flat `LayoutMap` model used by `0.2.0`
- legacy `navigate` actions that still store `pageId` or `dashboardId` directly are normalized to structured `target` objects
- legacy top-level `dataModelRef` values are normalized to the current `dataModel` envelope

Use `isSupportedSchemaVersion()` when you need an early capability check before importing a document.

## JSON Schema Generation

`generateDashboardJsonSchema()` returns a draft-07 JSON Schema for external tooling and editor integrations.

Typical uses:

- validating dashboard JSON outside TypeScript
- powering IDE completions for saved dashboard files
- generating downstream documentation or schema artifacts

## Versioning

`CURRENT_SCHEMA_VERSION` exposes the schema version the current package build emits. Use it when generating new definitions in tools or migration helpers.

## Related Docs

- [Canonical Schema v0](../schema/canonical-schema-v0.md)
- [runtime.md](./runtime.md)
- [designer.md](./designer.md)