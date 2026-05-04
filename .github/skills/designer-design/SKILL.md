---
name: designer-design
description: 'Shape the visual design of the Supersubset designer shell. Use when refining layout density, property panels, palette organization, empty states, preview chrome, selection states, or other UX polish inside packages/designer/. Covers host-owned theming, Puck-compatible shell design, accessibility, and visual QA.'
---

# Designer Design

## When to Use

- Refining the visual hierarchy of the designer shell
- Designing or polishing property panels, toolbar chrome, palette organization, and empty states
- Improving selection, hover, loading, validation, or disabled states in `packages/designer/`
- Making the designer feel more intentional without changing the canonical schema contract
- Reviewing proposed UI changes for theme alignment, accessibility, and embeddability

## Overview

Supersubset's designer should feel like a precise authoring tool, not a branded hosted product.
Its job is to help dashboard authors understand structure, data bindings, and state changes quickly.

The visual direction should therefore be:

- editor-first: dense enough for real work, but never cramped
- host-compatible: the host application owns branding and theme values
- schema-aware: UI affordances must reflect what the canonical dashboard schema can actually express
- Puck-compatible: shell decisions should work with Puck's layout, sidebar, and editing primitives rather than fighting them
- operationally clear: selected, dirty, invalid, loading, empty, and disabled states should read immediately

Use the upstream `design.md` spec as inspiration for reasoning style and section order, not as a new contract to introduce into this repo.

## Local Sources of Truth

These are the normative sources for designer visuals:

- `packages/theme/src/index.ts`
  - `ResolvedTheme`
  - `DEFAULT_THEME`
  - `themeToCssVariables()`
- `.github/instructions/designer.instructions.md` for package constraints
- `.github/skills/puck-integration/SKILL.md` for Puck mechanics and serialization boundaries
- `packages/designer/src/config/puck-config.ts` as a positive example of shell styling that already consumes `var(--ss-*)`
- `packages/designer/src/components/SupersubsetDesigner.tsx` as a positive example of designer-shell chrome and accessibility adaptation
- `packages/designer/src/components/LivePreviewPane.tsx` as a cautionary example where hardcoded visual values should not be copied into new reusable shell work

Do not introduce a repo-wide `DESIGN.md`, a second token system, or a new theme schema through this skill.

## Colors

The designer must consume host-owned theme values rather than inventing its own brand.

- Prefer `var(--ss-color-*)` CSS variables for designer shell UI
- Treat `DEFAULT_THEME` as a fallback, not a branding target
- Use color to communicate state only when the meaning is unambiguous: selection, success, warning, danger, disabled
- Keep chart coloration and shell coloration distinct; chart palette choices should not leak into editor chrome decisions

Guidance:

- Use neutral surfaces and borders to establish containment before reaching for accent color
- Reserve the primary accent for the active selection, primary action, or the single most important focus state in a region
- Make destructive and error states obvious, but do not let them dominate the canvas when the user is simply authoring

## Typography

The designer should inherit host typography through `--ss-font-family`, `--ss-font-size`, and related theme values.

- Favor legibility and scanning speed over expressive display type
- Use weight changes sparingly to separate titles, labels, metadata, and helper text
- Keep data-binding labels, control labels, and validation text visually distinct
- Avoid introducing a second font stack for editor chrome unless the host theme explicitly provides one

## Layout and Spacing

The designer is an operational workspace. It should feel structured, not decorative.

- Use the existing spacing rhythm from the resolved theme and current shell patterns
- Preserve clear separation between palette, canvas, preview, and property editing regions
- Keep high-frequency controls close to the surface they act on
- Avoid layouts that require wide cursor travel for common authoring loops
- Prefer predictable alignment and containment over clever asymmetry

For authoring surfaces, optimize for these loops:

1. choose a block
2. place it
3. configure it
4. verify state in preview
5. continue editing without losing context

## Elevation and Depth

Use depth sparingly. The designer should communicate hierarchy mostly through containment, borders, contrast, and spacing.

- Prefer border, background, and inset treatment before large shadows
- Use stronger separation only for overlays, popovers, or temporary focus surfaces
- Ensure selection states remain readable even when the host theme has low contrast accent colors

## Shapes

Shape language should stay consistent with the host theme and existing designer shell.

- Reuse the host's corner radius direction where possible
- Do not mix aggressively rounded and rigidly square shells within the same workflow
- Keep handles, chips, pills, and buttons visually related so the editor reads as one system

## Components

When designing or reviewing components in the designer, evaluate them by job rather than by isolated styling.

### Shell Chrome

- Toolbar, mode switchers, page tabs, sidebar tabs, and header actions should signal navigation and scope clearly
- Primary actions should be obvious without overpowering the canvas
- Secondary actions should be discoverable but visually quieter

### Palette and Structure Views

- Categories should help authors predict where blocks live
- Icons should support recognition, not carry the whole meaning alone
- Drag handles, insertion affordances, and nesting structure must remain legible at authoring density

### Property Panels

- Group fields by author intent, not by implementation order
- Put the highest-impact controls near the top
- Differentiate destructive, advanced, and validation-heavy controls clearly
- Long forms need sectioning, summaries, or progressive disclosure before they need more chrome

### Preview and Empty States

- The preview area should read as verification space, not final product chrome
- Blank states must explain whether the user needs data, configuration, or layout work next
- Loading and query states must distinguish between waiting, partial data, and hard failure

### Interaction States

For any meaningful UI change, consider all of these states where relevant:

- default
- hover
- focus
- selected
- disabled
- invalid
- loading
- empty
- destructive confirmation

## Validation and Visual QA

Every meaningful designer-shell change should have an explicit proof surface before it is considered done.

- Update or add a Storybook story for every user-facing component or stateful shell pattern that a human reviewer should inspect
- Prefer focused stories that isolate one interaction or layout question over one oversized kitchen-sink story
- Pair structural checks with visual checks: Storybook for component states, Playwright or Chrome MCP for end-to-end authoring flows
- Use screenshots when a regression would be easier to spot visually than semantically
- If a change affects spacing, selection affordances, empty states, or panel hierarchy, assume browser verification is required

Minimum expectations by change type:

- component or panel polish: Storybook story plus a quick visual review
- canvas, palette, or property workflow changes: browser flow validation in the dev app
- state-heavy UI changes: capture the relevant default, hover, focus, selected, loading, empty, or invalid states somewhere reviewable

Good validation questions:

- Can another reviewer tell what changed from the story or screenshot without reading the diff first?
- Would a low-contrast host theme still preserve the intended hierarchy?
- Does the selected state still stand apart from hover and focus?
- Does the layout still read correctly at authoring density?

## Design Brief Template

Use this lightweight brief before a substantial designer-shell change:

```md
## Intent

- What authoring problem is this change solving?

## Surfaces

- Which designer surfaces change?
- Which existing components or files own them?

## Theme Usage

- Which `--ss-*` variables or resolved theme fields are used?
- Are any hardcoded values still necessary? Why?

## States

- Which interaction states must be visible?
- What is the primary state distinction the user needs to notice fastest?

## Accessibility

- How are labels, focus states, and contrast preserved?
- Does the change improve or risk keyboard/screen-reader clarity?

## Validation

- Which Storybook story, test, or browser flow proves the change?
- What screenshot or visual check would catch a regression?
- Which state combinations must be visible in review artifacts?
```

## Do's and Don'ts

- Do keep the designer visually subordinate to host branding and dashboard content
- Do use `ResolvedTheme` and `var(--ss-*)` as the first stop for shell styling
- Do make state transitions and authoring affordances obvious
- Do keep visual groupings aligned with schema concepts and user tasks
- Do use screenshot-driven validation for meaningful visual changes
- Do leave a clear Storybook or browser-verification trail for reviewer-visible UI changes
- Don't add a second visual token vocabulary inside `packages/designer/`
- Don't hardcode persistent brand colors into reusable editor chrome when host theme variables exist
- Don't let Puck implementation details dictate the user-facing information architecture when a clearer shell layer is possible
- Don't create UI affordances for schema behaviors the canonical contract cannot serialize
- Don't copy one-off hardcoded styling from older preview surfaces into new shared designer components

## See Also

- `.github/skills/puck-integration/SKILL.md`
- `.github/skills/document-feature/SKILL.md`
- `docs/testing/verification-strategy.md`
- `.github/instructions/designer.instructions.md`
