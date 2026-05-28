---
name: requirements-driven-work
description: Use when implementing, reviewing, or planning code that should be guided by existing feature specs, glossary terms, or Acai IDs.
---

# Requirements-Driven Work

Use when code, tests, issues, or reviews need to consume the requirements layer under `features/`.

Use `requirements-intake` when requirements need to be proposed or reorganized. Use `requirements-test-tagging` when adding Acai ID prefixes in tests.

## Quick Start

1. Read `features/README.md`
2. Identify candidate feature specs from `features/*.feature.yaml`
3. Read owning feature specs and relevant `features/terms/*.term.yaml` files
4. List the Acai IDs that should guide the work
5. If no owner is clear, stop and use `requirements-intake`

## Finding The Owner

Choose the feature that owns the product behavior, not the package where code lives.

- Canonical schema, serialization, migrations: `schema-and-serialization`
- Puck designer, property panels, import/export UX: `designer-authoring`
- Layout engine, widget registry, render modes: `runtime-rendering`
- ECharts wrappers, chart round-trip, field binding: `charts-and-visualization`
- Prisma/SQL/JSON/dbt adapters, CLI import: `metadata-adapters`
- Logical query client, HTTP probe contract: `query-and-probe`
- Filter bar, cross-widget filters, drilldown: `filters-and-interactions`
- Page navigation, alert rules/widgets: `navigation-and-alerts`
- Embedding, controlled modes, host ownership: `host-integration`
- Loading, empty, error, retry UX: `interface-behavior`

## Implementation Workflow

1. Compare requirement text to existing code and tests
2. Implement missing behavior against the requirement
3. If the requirement is wrong or absent, update the feature spec before coding through ambiguity
4. Add or update tests whose primary purpose proves the changed requirements
5. Run `pnpm run validate:requirements` when specs or test IDs changed

## Review Workflow

1. Enumerate linked Acai IDs from issue, PR, changed tests, and feature specs
2. Mark each as Evidenced, Gap, N/A, or Cannot verify
3. Treat durable behavior changes without requirement updates as review findings

## See Also

- `features/README.md`
- `docs/adr/011-requirements-artifacts.md`
- `.github/skills/requirements-intake/SKILL.md`
- `.github/skills/requirements-test-tagging/SKILL.md`
- `.github/skills/work-kickoff/SKILL.md`
