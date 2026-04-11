# Supersubset — Risk Register

> **Last updated**: 2026-04-08

## Active Risks

| ID | Risk | Severity | Likelihood | Mitigation | Owner | Status |
|----|------|----------|------------|------------|-------|--------|
| R1 | Puck is too limited for dashboard-specific editing patterns (block nesting, responsive grid, complex property editors) | High | Medium | Phase 0 research task 0.2 will deeply evaluate Puck. Fallback: build custom editor shell with react-dnd. | Research | Open |
| R2 | Superset frontend components too coupled to extract | Medium | High | Bias toward architectural inspiration over code extraction. Clean-room reimplementation for tightly coupled modules. | Research | Open |
| R3 | Canonical schema becomes too complex / breaks backward compatibility | High | Medium | Schema versioning from day 1. Migration engine in Phase 5. Extensive round-trip tests. | Architecture | Open |
| R4 | ECharts bundle size too large for embeddable library | Medium | Medium | Use tree-shakeable ECharts imports. Lazy-load chart types. Measure bundle in CI. | Charts | Open |
| R5 | Agent context loss during long-horizon autonomous execution | High | High | Strong written artifacts, bootstrap document, phase summaries, ADRs. Session memory for in-progress work. | Orchestrator | Open |
| R6 | Cross-filtering and interaction model complexity exceeds timeline | Medium | Medium | MVP with basic filter propagation. Defer advanced drilldowns to Phase 4+. | Runtime | Open |
| R7 | Host app theming bridge is difficult to make universal | Low | Medium | Start with CSS custom properties. Allow complete theme override. Don't assume any specific design system. | Architecture | Open |
| R8 | License compliance issues from extracted code | High | Low | Track licensing in reuse matrix. Preserve all required notices. Legal review before release. | Research | Open |

## Retired Risks

None yet.
