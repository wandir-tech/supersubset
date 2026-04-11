# HC-0 Result — Research Approval

> **Date**: 2026-04-08  
> **Reviewer**: Human (project owner)  
> **Status**: ✅ APPROVED  
> **Brief**: [hc-0-brief.md](hc-0-brief.md)

## Decisions

### 1. Editor Shell: Puck — APPROVED
Proceed with Puck as the editor shell. No additional investigation needed.
Craft.js remains a documented fallback if Puck hits blockers.

### 2. Responsive Layout: Custom CSS Grid blocks in Puck
Build `<Grid>`, `<Row>`, `<Column>` as Puck components using CSS Grid + Puck slot fields.
No external grid library (react-grid-layout rejected due to drag-drop conflict with Puck).

### 3. Perspective: DROPPED
Do not include Perspective in any phase. The WASM bundle cost (3-5MB) is incompatible
with the library-first approach. All tabular needs will be handled by ECharts table widgets.

### 4. MVP Table Widget: ECharts dataset/table
Use ECharts table rendering for the MVP, consistent with other chart widgets.
No separate React table library in scope.

### 5. Schema: Domain-Agnostic
The canonical schema defines the **format** for describing data models, not the models themselves.
All field types, dimensions, measures, and domain concepts are user-supplied inputs.
The schema should be easy to provide and as standard as possible.
No built-in domain knowledge. No Rill-style opinionated type taxonomies baked into the schema —
instead, the schema accepts user-defined type labels.

## Impact on Reuse Matrix

- Perspective row changes from "Optional code donor (Phase 5)" → **Discarded**
- No other reuse matrix changes

## Next Steps

Agents may proceed to Wave 2:
- 0.16: ADR-001 — Editor shell (Puck)
- 0.17: ADR-002 — Chart runtime (ECharts)
- 0.18: ADR-003 — Canonical schema format
- 0.19: ADR-004 — Package boundaries
- 0.20–0.22: Schema draft, monorepo skeleton, Playwright scaffold
