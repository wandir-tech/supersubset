# Requirements

Supersubset keeps stable product and system requirements as Acai-compatible feature specs under `features/`.

Decision record: [docs/adr/011-requirements-artifacts.md](../docs/adr/011-requirements-artifacts.md).

## Structure

```text
features/
  *.feature.yaml
  references/
    acai-feature-yaml.yaml
    platforms.yaml
    term-yaml.schema.yaml
  terms/*.term.yaml
```

Use root `features/*.feature.yaml` for active requirements, `features/references/` for supporting schemas and vocabularies, and one `features/terms/<term>.term.yaml` file per glossary term.

## Feature Specs

Feature specs stay synced to Acai's `feature.yaml` shape:

- top-level keys: `feature`, `components`, `constraints`
- behavior under `components`
- cross-cutting policy under `constraints`
- stable requirement IDs in Acai form: `<feature-name>.<GROUP_KEY>.<requirement-key>`

Requirement keys must be numeric (`1`, `2`) or hyphen-nested (`1-1`). Quote hyphenated keys in YAML so they are not parsed as subtraction.

Do not add custom top-level sections.

Reference: `features/references/acai-feature-yaml.yaml` is the imported Acai `feature.yaml` spec from https://acai.sh/feature-yaml; Supersubset-specific policy lives here and in `tools/requirements/validate-feature-specs.mjs`.

## Platform Scope

Platform ids live in `features/references/platforms.yaml`. Current id is `web`.

Default scope is web. Omit `note` for that default.

## Glossary

Glossary terms explain nouns used in feature specs. They do not change Acai feature parsing.

Term schema: `features/references/term-yaml.schema.yaml`.

- Emphasize nouns in requirement prose, for example `*dashboard*`.
- Map multi-word terms to snake case, for example `*logical query*` -> `features/terms/logical_query.term.yaml`.
- Prefer singular term files.
- Keep references compact: package paths and TypeScript type names only when helpful.

## Chart and Component Property Granularity

Requirements YAML captures **capability contracts**, not a per-property inventory.

- **Tier A:** Durable author/host-visible behavior (e.g. scatter point size round-trips designer → schema → runtime).
- **Tier B:** Cross-cutting rules across chart or widget types.
- **Tier C:** Individual property knobs — documented in schema types, Puck blocks, docs site, and exhaustive unit tests (`per-chart-properties`, `adapter-properties`) without per-property ACIDs unless regression-anchored.

## Test And Code References

Acai IDs belong first in feature specs, then in tests that prove the behavior.

- Prefix test names only when the test primarily proves that requirement.
- Use multiple prefixes only when one test genuinely proves multiple contracts.
- Do not tag exhaustive property-matrix tests unless they prove a named Tier A/B requirement.

For broad or corrective test tagging, read `.github/skills/requirements-test-tagging/SKILL.md`.

## Workflow

For durable behavior changes:

1. Find the owning feature spec before implementation.
2. Update or add requirements before coding through ambiguity.
3. Link Acai IDs from GitHub issue acceptance criteria when an issue exists.
4. Add precise Acai ID prefixes to requirement-proving tests.
5. Run `pnpm run validate:requirements` after changing feature specs, glossary terms, or test IDs.
6. Run `pnpm run requirements:coverage` to list uncovered spec ACIDs by feature.
7. Run `pnpm run test:requirements-validator` after changing the validator or its fixtures.

Use `.github/skills/requirements-intake/SKILL.md` to create or reorganize requirements, and `.github/skills/requirements-driven-work/SKILL.md` to implement or review against existing requirements.

## Tools

The local validator (`pnpm run validate:requirements`, CI jobs `requirements-validate.yml` and `ci.yml`) checks YAML parsing, duplicate ACIDs, glossary term shape, emphasized-term links, test references, platform notes, and `feature.product` without needing the Acai CLI or server.

Coverage report:

```bash
pnpm run requirements:coverage
pnpm run --silent requirements:coverage:json
```
