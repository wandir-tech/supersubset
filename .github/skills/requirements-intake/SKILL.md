---
name: requirements-intake
description: Use when proposing, backfilling, or changing Acai-compatible feature specs, feature maps, glossary terms, platform scope, or stable Acai IDs.
---

# Requirements Intake

Use this skill to add or maintain Acai-compatible feature specs under `features/` and glossary files under `features/terms/`.

## Scope

- reviewing existing code and backfilling feature specs
- deciding which `features/*.feature.yaml` file owns a behavior
- creating or updating Acai-compatible feature specs and glossary terms
- choosing where stable Acai IDs belong in tests
- proposing the initial feature map for a major product area

Does not replace GitHub issues, ADRs, orchestration, or `initial-spec.md`. Gives those workflows a durable requirements home.

## Feature Granularity

Use product-sized buckets, not screen-sized or package-sized buckets.

Current Supersubset buckets:

- `schema-and-serialization`
- `designer-authoring`
- `runtime-rendering`
- `charts-and-visualization`
- `metadata-adapters`
- `query-and-probe`
- `filters-and-interactions`
- `navigation-and-alerts`
- `host-integration`
- `interface-behavior`

Use `interface-behavior` for cross-cutting loading, empty, error, and retry UX.

## Chart and Component Properties

Do **not** map every chart/widget property to its own ACID. Use capability-level requirements (Tier A) and cross-cutting rules (Tier B). Property inventories live in schema types, Puck blocks, docs, and exhaustive unit tests.

## Feature YAML Schema

Read `features/README.md` and `features/references/acai-feature-yaml.yaml`.

Supersubset additions:

- `feature.product` is `supersubset`
- `feature.name` matches the filename stem
- Group keys are uppercase snake case
- Platform id is `web` (default; omit `note` when web-only)

## Backfill Workflow

1. Read `features/README.md`
2. Scan `features/*.feature.yaml` and select the owning feature
3. Read relevant `features/terms/*.term.yaml` files
4. Write stable Acai IDs: `<feature-name>.<GROUP_KEY>.<requirement-key>`
5. Emphasize glossary nouns in requirement prose (`*dashboard*`)
6. Run `pnpm run validate:requirements`

## Verification

1. Run `pnpm run validate:requirements`
2. Run `pnpm run requirements:coverage` when adding many ACIDs
3. Confirm no orphan test refs after tagging

## See Also

- `features/README.md`
- `docs/adr/011-requirements-artifacts.md`
- `.github/skills/requirements-driven-work/SKILL.md`
- `.github/skills/requirements-test-tagging/SKILL.md`
- `.github/skills/work-kickoff/SKILL.md`
