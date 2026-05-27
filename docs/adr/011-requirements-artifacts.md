# ADR-011: Acai-Compatible Feature Specs

## Status

Accepted

## Date

2026-05-26

## Context

Supersubset's AI workflow has strong execution artifacts: GitHub issues, `.github/skills`, ADRs, master plan, and CI gates. The gap is stable product and system requirements. Issues are good for execution, but they are a poor long-term home for reusable requirements because they close, grow noisy, and mix delivery plan with product contract.

Agents need a durable place to answer:

- Which feature owns this behavior?
- Which domain nouns have canonical meanings?
- Which Acai IDs should implementation and tests prove?
- What is the embeddable library contract vs host-app responsibility?

## Decision

Add Acai-compatible feature specs and supporting requirement vocabulary under root `features/`.

```text
features/
  README.md
  <feature>.feature.yaml
  references/
    acai-feature-yaml.yaml
    platforms.yaml
    term-yaml.schema.yaml
  terms/
    <term>.term.yaml
```

Root feature specs use Acai's `feature`, `components`, and `constraints` layout. They are the durable home for stable behavior and Acai IDs. GitHub issues remain the execution surface for implementation slices. ADRs remain the durable decision record. `initial-spec.md` and `docs/schema/` remain bootstrap and technical contract references.

Glossary terms are split one term per file under `features/terms/`. `features/references/` owns supporting schemas, imported references, and platform ids.

## Feature Granularity

Use product-sized feature buckets, not screen-sized or package-sized buckets.

Active buckets:

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

## Chart and Component Properties

Do not map every chart or widget property to its own ACID. TypeScript schema types, Puck block definitions, docs property panels, and exhaustive unit tests remain the source of truth for property inventories.

Use feature YAML for capability contracts (Tier A), cross-cutting chart rules (Tier B), and regression anchors. Add property-level ACIDs only when host-facing, parity-critical, or human-reported regression scope demands it.

## Acai IDs

Acai IDs use Acai's stable dotted form:

```text
<feature-name>.<GROUP_KEY>.<requirement-key>
```

Examples:

- `schema-and-serialization.SERIALIZATION.1`
- `designer-authoring.IMPORT_EXPORT.2`
- `query-and-probe.PROBE_QUERY.1`

Do not silently reuse or renumber IDs once linked from issues, tests, or implementation anchors.

## Platform Scope

Durable requirements use platform id `web` from `features/references/platforms.yaml`. Supersubset is an embeddable React library; the host application owns auth, routing, and data access boundaries.

## Test And Code References

Requirement-proving tests prefix the test name with the Acai ID:

```ts
it('[schema-and-serialization.SERIALIZATION.1] JSON round-trip preserves dashboard AST', () => {
  // ...
});
```

Implementation comments are allowed but should be sparse.

## Workflow Changes

For non-trivial behavior changes:

1. Scan `features/*.feature.yaml`.
2. Read or update the owning feature spec.
3. Link Acai IDs from GitHub issue acceptance criteria.
4. Prefix requirement-proving tests with Acai IDs.
5. Run `pnpm run validate:requirements`.
6. If implementation finds ambiguity, update the feature spec before coding through the gap.

## Consequences

### Positive

- Agents have a compact, parseable requirements layer before reading code.
- Long-lived behavior survives issue closure.
- Test output and CI can trace failures to named contracts.

### Negative

- More files must be maintained.
- Feature specs can drift if PRs do not update them.

### Mitigations

- Use `.github/skills/requirements-intake` for backfills and new work.
- Run the local validator after feature spec or test-prefix changes.
- Treat missing feature spec updates as a review finding for non-trivial behavior changes.

## Related

- `features/README.md`
- `features/*.feature.yaml`
- `tools/requirements/validate-feature-specs.mjs`
- `.github/skills/requirements-intake/SKILL.md`
- `.github/skills/requirements-driven-work/SKILL.md`
- `.github/skills/requirements-test-tagging/SKILL.md`
- `.github/skills/work-kickoff/SKILL.md`
