# ADR-007: End-User Documentation with Screenshot-Driven QA

## Status

Accepted

## Date

2026-04-11

## Context

Supersubset has a rich set of dashboard authoring features (14 chart types, 4 widget types, 6 layout components, filters, interactions, multi-page navigation, import/export) but no end-user documentation. Dashboard authors who want to build dashboards have no reference material explaining what each feature does or how changing a configuration option affects the rendered output.

Additionally, there is no systematic way to verify that every feature's UI works correctly beyond the existing e2e tests, which cover happy paths but not exhaustive property-level behavior.

We need:

1. A documentation site for **dashboard authors** (non-technical audience)
2. Every feature documented with **screenshots** of both the designer property panel and the rendered viewer output
3. The documentation process itself to serve as a **QA gate** — if a feature can't produce correct screenshots, it has a bug that must be fixed first
4. An ergonomic reading experience with **expandable sections** for screenshots plus a bulk **"Expand All"** feature so the entire doc can be reviewed at a glance (by humans or AI agents)
5. A **reusable skill** ("Document a Feature") that standardizes the process for any agent to follow

## Decision

### Documentation Framework: Astro Starlight

Use **Astro Starlight** as the documentation site framework, hosted as `packages/docs/` within the monorepo.

### Screenshot Capture: Playwright

Reuse the existing **Playwright** setup to programmatically capture screenshots from the dev-app. Screenshot scripts live in `packages/docs/capture/` and produce deterministic filenames (`{feature}-{variant}-{view}.png`).

### Process: "Document a Feature" Skill

A new agent skill at `.github/skills/document-feature/SKILL.md` standardizes the 11-step process for documenting any feature:

1. Identify the feature and its configurable properties
2. Set up a clean state in the dev-app
3. Capture designer "default" screenshot (property panel)
4. Capture viewer "default" screenshot (rendered output)
5. Change the setting in the designer
6. Capture designer "changed" screenshot
7. Capture viewer "changed" screenshot
8. Quality check — verify no console errors, visual correctness
9. **Bug fix gate** — fix any bugs before proceeding
10. Write the MDX page using the feature-doc template
11. Slot into the sidebar navigation and cross-reference related features

### Custom MDX Components

- `<ScreenshotComparison>` — before/after toggle or side-by-side view
- `<ExpandAll>` — button that opens/closes all `<details>` elements on the page
- `<FeatureScreenshot>` — captioned image with lightbox behavior

### Example Dataset

The existing `ds-orders` Sales Dashboard from `packages/dev-app/src/demo-dashboard.ts`, which covers temporal, categorical, and numerical data across all widget types.

### Audience

Dashboard authors (non-technical). Developer integration docs remain in `docs/guides/`.

## Consequences

### Positive

- Dashboard authors have a comprehensive visual reference for every feature
- The screenshot generation process systematically verifies every feature works
- Bugs are discovered and fixed as a side-effect of documentation work
- AI agents can review the entire product by expanding all screenshots
- The "Document a Feature" skill makes the process repeatable and consistent
- Screenshots serve as visual regression baselines for future changes

### Negative

- Screenshots must be regenerated when the UI changes (maintenance cost)
- Initial effort is significant (~33 feature pages, ~130+ screenshots)
- Astro Starlight adds a new framework to the project (though it's build-time only)

### Neutral

- The docs site is a new `packages/docs/` package in the monorepo, following existing conventions
- Playwright is already a project dependency; no new external tooling required
- Documentation structure mirrors the designer's feature organization

## Alternatives Considered

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| Docusaurus | React-native, mature ecosystem, large community | Heavy bundle, slow builds, overkill for image-centric content site | Stack weight; Starlight is faster and more purpose-built for docs |
| VitePress | Very fast, excellent DX, lightweight | Vue-based (stack mismatch with React project) | Framework mismatch would confuse contributors |
| Raw Markdown in `docs/` | Zero tooling, already exists | No interactivity, no expand/collapse, no search, no sidebar | Insufficient for screenshot-heavy UX; not pleasant to navigate |
| Storybook Docs | Already configured, component-level | Not suitable for end-user audience, no narrative flow | Developer tool, not author-facing documentation |
| Manual screenshots | Simple, immediate | Not reproducible, drifts instantly, no QA gate | Defeats the automated verification goal |

## References

- [Astro Starlight documentation](https://starlight.astro.build/)
- [Playwright screenshot API](https://playwright.dev/docs/screenshots)
- [Browser Testing Skill](../../.github/skills/browser-testing/SKILL.md)
- [Demo Dashboard](../../packages/dev-app/src/demo-dashboard.ts)
- [Initial Spec](../../initial-spec.md)
