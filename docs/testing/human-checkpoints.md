# Supersubset — Human Checkpoints

> **Purpose**: Define mandatory pause points where a human reviews agent work before allowing the swarm to proceed. These prevent long-horizon goal drift.

## Why Human Checkpoints

Autonomous agents lose coherence over long horizons in predictable ways:
1. **Architecture drift** — small unauthorized changes accumulate
2. **Test theater** — tests exist but don't test the right things
3. **Visual rot** — layout/UX degrades without human eyes
4. **Scope creep** — agents add features nobody asked for
5. **False completion** — tasks marked done but don't actually work end-to-end

Human checkpoints are the antidote. Each one is a **stop-the-line** moment.

---

## Checkpoint Schedule

### HC-0: Research Approval (after Phase 0, tasks 0.1–0.7)
**When**: After research completes, before any ADRs are finalized
**Duration**: ~30 min review

**Human reviews**:
- [ ] Read `docs/research/reuse-matrix.md` — does the classification make sense?
- [ ] Read each research doc — are the coupling assessments credible?
- [ ] Check: is Puck still the right editor shell choice?
- [ ] Check: are there reuse opportunities the agent missed?
- [ ] Approve or request changes to the reuse matrix

**Gate**: Agents cannot proceed to ADRs (0.8–0.11) until HC-0 passes.

---

### HC-1: Architecture Approval (after Phase 0, tasks 0.8–0.13)
**When**: After ADRs and schema draft, before Phase 1 coding begins
**Duration**: ~45 min review

**Human reviews**:
- [ ] Read all ADRs in `docs/adr/` — accept/reject each decision
- [ ] Review canonical schema v0 draft — does the shape make sense for real dashboards?
- [ ] Review package skeleton — are boundaries clean?
- [ ] Review `docs/testing/verification-strategy.md` — is the testing plan sufficient?
- [ ] Review `docs/status/risk-register.md` — any new risks?
- [ ] **Write 1-2 example dashboards in JSON by hand** using the proposed schema to gut-check readability

**Gate**: Agents cannot start Phase 1 until HC-1 passes.

---

### HC-2: First Render (mid Phase 1, after task 1.16)
**When**: Dev app renders a fixture dashboard with 4 widget types
**Duration**: ~15 min review

**Human reviews**:
- [ ] Open dev app in browser manually
- [ ] Inspect `screenshots/phase-1/charts-first-render.png`
- [ ] Check: do the charts look like real charts? (not just colored boxes)
- [ ] Check: does the layout engine place widgets correctly?
- [ ] Check: does the fixture dashboard JSON make sense when you read it?
- [ ] Run `pnpm test` — all green?

**Gate**: Agents cannot start Phase 2 until HC-2 passes.

---

### HC-3: Designer Smoke Test (mid Phase 2, after task 2.5)
**When**: Designer can load, drag a widget, and edit its properties
**Duration**: ~20 min review

**Human reviews**:
- [ ] Open designer in browser manually
- [ ] Drag a chart widget to canvas — does it feel right?
- [ ] Edit a property — does the widget update?
- [ ] Inspect `screenshots/phase-2/drag-drop-*.png` and `property-edit-*.png`
- [ ] Check: is the Puck integration clean or hacky?
- [ ] Read `packages/designer/src/adapters/` — is the Puck↔canonical bridge understandable?

**Gate**: If drag-and-drop or property editing feels wrong, STOP. Rethink the Puck integration before building more features on a shaky foundation.

---

### HC-4: Round-Trip Verification (end Phase 2, after task 2.16)
**When**: Full Test Plan A execution complete
**Duration**: ~30 min review

**Human reviews**:
- [ ] Inspect all `screenshots/phase-2/` screenshots
- [ ] **Manually** create a dashboard in the designer (don't just look at agent screenshots)
- [ ] Export to JSON, export to YAML
- [ ] Open both files — are they human-readable?
- [ ] Diff them semantically — are they equivalent?
- [ ] Import the JSON into a fresh designer — does it survive?
- [ ] Check Playwright test results: `pnpm test:e2e`
- [ ] Review `e2e/workflows/designer-to-renderer.spec.ts` — does it test what matters?
- [ ] Review `e2e/workflows/import-export-cycle.spec.ts` — is the round-trip real?

**Gate**: Phase 2 is not done until you've personally used the designer and the round-trip works.

---

### HC-5: Adapter Sanity (end Phase 3, after task 3.7)
**When**: At least Prisma and JSON adapters pass fixture tests
**Duration**: ~15 min review

**Human reviews**:
- [ ] Read a fixture Prisma schema and the adapter output — does the normalization make sense?
- [ ] Check field role inference — are dimensions/measures/time fields correctly classified?
- [ ] Review adapter test fixtures — are they realistic schemas, not toy examples?
- [ ] Check: can a new adapter be written by reading the interface + one example?

**Gate**: Agents cannot start Phase 4 until HC-5 passes.

---

### HC-6: Interaction Model Review (mid Phase 4, after task 4.3)
**When**: Cross-filtering works between two widgets
**Duration**: ~20 min review

**Human reviews**:
- [ ] Open dev app, click a bar chart bar
- [ ] Does the table filter? Does the line chart update?
- [ ] Inspect `screenshots/phase-4/cross-filter-*.png`
- [ ] Check: is the filter state model understandable? Read `packages/runtime/src/filters/`
- [ ] Check: are Playwright interaction tests actually clicking and verifying? (`e2e/interactions/`)

**Gate**: If interactions feel broken or laggy, STOP. Fix the state model before adding drilldowns.

---

### HC-7: Full Journey Walkthrough (end Phase 4)
**When**: All interactions complete, all Playwright workflow tests pass
**Duration**: ~45 min review

**Human reviews**:
- [ ] **Perform the complete Test Plan A manually** — not by reading agent logs, by doing it yourself
- [ ] **Perform Test Plan B manually** — load a saved definition, verify rendering
- [ ] Run all Playwright tests: `pnpm test:e2e` — all green?
- [ ] Review all `screenshots/` — any visual issues?
- [ ] Check acceptance criteria progress (all should be achievable at this point)

**Gate**: Phase 5 cannot start until full manual walkthrough passes.

---

### HC-8: Getting-Started Validation (Phase 5, after task 5.3)
**When**: Sample apps and the getting-started guide are available
**Duration**: ~15-20 min review

**Human reviews**:
- [ ] Follow `docs/getting-started.md` from a clean shell without relying on agent notes
- [ ] Run `pnpm install`
- [ ] Run `pnpm build`
- [ ] Run `pnpm dev:nextjs-example` and verify the example loads and the theme toggle works
- [ ] Run `pnpm dev:vite-sqlite-example` and verify viewer mode, SQL log updates, and designer load
- [ ] Check whether the troubleshooting notes are enough to recover from a simple mistake without extra guidance
- [ ] Note any confusing, missing, or misleading steps in the onboarding docs

**Gate**: Phase 5 onboarding work is not complete until a human can follow the guide without agent intervention.

---

### HC-9: Release Readiness (end Phase 6)
**When**: All hardening tasks complete
**Duration**: ~1 hour review

**Human reviews**:
- [ ] Run full test suite: `pnpm test && pnpm test:e2e`
- [ ] Review Snyk security scan results
- [ ] Review bundle sizes — are they reasonable for an embeddable library?
- [ ] Test the Next.js host app example end-to-end
- [ ] Test the Vite host app example end-to-end
- [ ] Review all `screenshots/phase-6/` — regression, responsiveness, and host integration
- [ ] Read the final Storybook — does it document the API correctly?
- [ ] Perform Test Plan D (host integration) manually
- [ ] **Write a dashboard from scratch as a developer** using only the docs and API — is it comprehensible?

**Gate**: This is the release gate. All criteria must pass.

---

## Checkpoint Communication Protocol

### Before Each Checkpoint

The orchestrator agent must prepare a **checkpoint brief**:

```markdown
# Checkpoint HC-N Brief

## What was built since last checkpoint
[Summary of completed tasks]

## Screenshots to review
[List of screenshot files with descriptions]

## Test results
[Pass/fail summary, link to full results]

## Known issues
[Any problems the agent is aware of]

## Questions for human
[Specific decisions that need human input]

## Time estimate for review
[How long the human should budget]
```

Store in: `docs/status/checkpoints/hc-N-brief.md`

### After Each Checkpoint

The human records their decision:

```markdown
# Checkpoint HC-N Result

## Decision: PASS / FAIL / PASS WITH NOTES

## Issues found
[List any problems]

## Required changes before proceeding
[If FAIL, what must be fixed]

## Approved scope changes
[If the human wants to add/remove scope]

## Notes
[Any guidance for the agents going forward]
```

Store in: `docs/status/checkpoints/hc-N-result.md`

---

## Summary: Checkpoint Map

```
Phase 0 (Research)
  ├── [tasks 0.1-0.7] → HC-0: Research Approval (human reviews reuse matrix)
  ├── [tasks 0.8-0.14] → HC-1: Architecture Approval (human reviews ADRs + schema)
  
Phase 1 (Schema + Runtime)
  ├── [tasks 1.1-1.16] → HC-2: First Render (human opens dev app)
  
Phase 2 (Designer MVP)
  ├── [tasks 2.1-2.5] → HC-3: Designer Smoke Test (human tries drag-and-drop)
  ├── [tasks 2.6-2.16] → HC-4: Round-Trip Verification (human creates a dashboard)
  
Phase 3 (Adapters)
  └── [tasks 3.1-3.7] → HC-5: Adapter Sanity (human reviews normalization)

Phase 4 (Interactions)
  ├── [tasks 4.1-4.3] → HC-6: Interaction Model (human clicks a cross-filter)
  └── [tasks 4.4-4.8] → HC-7: Full Journey Walkthrough (human does Test Plans A+B)

Phase 5 (Developer Experience)
  └── [tasks 5.1-5.3] → HC-8: Getting-Started Validation (human follows docs from scratch)

Phase 6 (Hardening)
  └── [tasks 6.1-6.7] → HC-9: Release Readiness (human does full review)
```

**Total human time**: ~5 hours spread across the entire project lifecycle. Each checkpoint is short and focused.
