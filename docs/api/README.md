# API Reference

This directory documents the public package surfaces that host applications integrate with today.

Start with [Getting Started](../getting-started.md) if you want the fastest path to a running example. Use [Canonical Schema v0](../schema/canonical-schema-v0.md) when you need the current dashboard contract in one place.

## Package Map

| Package | Purpose | Reference |
| --- | --- | --- |
| `@supersubset/schema` | Canonical dashboard contract, validation, serializers, JSON Schema generation | [schema.md](./schema.md) |
| `@supersubset/runtime` | Runtime renderer, widget registry, filters, interactions, state helpers | [runtime.md](./runtime.md) |
| `@supersubset/designer` | Puck-backed visual editor and advanced editor helpers | [designer.md](./designer.md) |
| `@supersubset/theme` | Theme resolution and CSS/ECharts bridges | [theme-and-widgets.md](./theme-and-widgets.md) |
| `@supersubset/charts-echarts` | Bundled widget catalog and registration helpers | [theme-and-widgets.md](./theme-and-widgets.md) |
| `@supersubset/data-model` | Normalized metadata model and adapter interfaces | [metadata-and-cli.md](./metadata-and-cli.md) |
| `@supersubset/query-client` | Host-side query execution and metadata caching helpers | [metadata-and-cli.md](./metadata-and-cli.md) |
| `@supersubset/adapter-*` | Source-specific metadata normalization packages | [metadata-and-cli.md](./metadata-and-cli.md) |
| `@supersubset/cli` | Schema import API and CLI entrypoint | [metadata-and-cli.md](./metadata-and-cli.md) |

## Recommended Reading Order

1. Read [schema.md](./schema.md) first. The schema is the product contract.
2. Read [runtime.md](./runtime.md) if you are embedding a viewer.
3. Read [designer.md](./designer.md) if you are embedding editing.
4. Read [theme-and-widgets.md](./theme-and-widgets.md) when you need bundled widgets or theme tokens.
5. Read [metadata-and-cli.md](./metadata-and-cli.md) when your host owns metadata normalization or query execution.

## Integration Model

Supersubset is split so the host keeps control of routing, persistence, auth, and data execution:

- `@supersubset/schema` defines what a dashboard is.
- `@supersubset/designer` edits that schema.
- `@supersubset/runtime` renders that schema.
- `@supersubset/theme` and `@supersubset/charts-echarts` supply shared presentation primitives.
- `@supersubset/data-model`, `@supersubset/query-client`, adapters, and the CLI help normalize metadata without forcing a backend.

## Task-Focused Guides

- [Schema Import Tutorial](../guides/schema-import.md)
- [Chart Configuration Cookbook](../guides/chart-cookbook.md)
- [Custom Adapter Authoring Guide](../guides/custom-adapter.md)