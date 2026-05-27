---
name: requirements-test-tagging
description: Use when adding, reviewing, or refining Acai ID prefixes in test names so tests act as evidence for feature requirements.
---

# Requirements Test Tagging

Use when adding or auditing Acai ID prefixes such as `[schema-and-serialization.SERIALIZATION.1]` in Vitest or Playwright test names.

Test prefixes are evidence links, not navigation labels. Prefer no prefix over a misleading prefix.

## Before Tagging

1. Read `features/README.md` and owning `features/*.feature.yaml` files
2. If a test proves behavior with no requirement, update the feature spec first via `requirements-intake`
3. Run `pnpm run validate:requirements` if existing tags may be stale

## Tagging Rules

Prefix a test only when:

- The test's primary purpose is to prove one requirement (or a small tightly coupled set)
- Failure would indicate regression against that requirement's contract
- You can quote the requirement text and point to the assertion

Do **not** prefix:

- Exhaustive property-matrix tests (`per-chart-properties.test.tsx`, `chart-preview-properties.test.tsx`, `adapter-properties.test.ts`) unless proving a named Tier A/B capability
- Smoke or umbrella tests spanning many behaviors
- Doc-screenshot capture tests (`packages/docs/capture/`)

## Format

```ts
it('[schema-and-serialization.SERIALIZATION.1] JSON round-trip preserves dashboard AST', () => {
  // ...
});

test('[designer-authoring.IMPORT_EXPORT.1] export and reimport preserves widget count', async ({
  page,
}) => {
  // ...
});
```

Keep the prefix at the start of the test title. Do not put Acai IDs in `describe` blocks.

## Workflow

1. Fix orphan refs first
2. Tag e2e workflows and contract unit tests before property matrices
3. Run `pnpm run validate:requirements`
4. Run `pnpm run requirements:coverage` to inspect gaps

Target ~60–80% spec ACID coverage; do not chase 100% with weak prefixes.

## See Also

- `features/README.md`
- `docs/adr/011-requirements-artifacts.md`
- `.github/skills/requirements-intake/SKILL.md`
- `.github/skills/requirements-driven-work/SKILL.md`
- `.github/skills/testing-strategy/SKILL.md`
