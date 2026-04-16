---
name: qa-testing
description: 'Exploratory and systematic QA testing for Supersubset. Use when hunting bugs, verifying fixes, assessing test coverage gaps, or running a structured QA pass across packages and examples. Covers bug-filing protocol, verification workflow, coverage assessment, and regression check methodology.'
---

# QA Testing (Supersubset)

## When to Use

- Running an exploratory QA pass across the product
- Verifying that a batch of bug fixes actually work
- Assessing test coverage and identifying gaps
- Filing bugs with reproducible steps on GitHub

## Prerequisites

```bash
gh auth status          # GitHub CLI authenticated
pnpm install && pnpm build   # Clean build
pnpm test                    # Unit tests green before starting
```

## QA Pass Workflow

### 1. Scope

Pick a focus area (or rotate through all):

| Area                     | Packages / Artifacts                        | Dev server                                                    |
| ------------------------ | ------------------------------------------- | ------------------------------------------------------------- |
| Designer editor          | `packages/designer`, `packages/dev-app`     | `pnpm dev` → `localhost:3000`                                 |
| Viewer/runtime           | `packages/runtime`, `packages/dev-app`      | same                                                          |
| Charts                   | `packages/charts-echarts`                   | same                                                          |
| vite-sqlite example      | `examples/vite-sqlite`                      | `cd examples/vite-sqlite && pnpm dev` → `localhost:3003`      |
| nextjs-ecommerce example | `examples/nextjs-ecommerce`                 | `cd examples/nextjs-ecommerce && pnpm dev` → `localhost:3001` |
| CLI import               | `packages/cli`                              | terminal only                                                 |
| Adapters                 | `packages/adapter-*`, `packages/data-model` | unit tests only                                               |

### 2. Explore

For each area, exercise the **happy path first**, then **edge cases**:

- **Happy path**: Does the primary workflow complete without errors?
- **Property toggles**: Do config fields (donut, striped, roundCap, etc.) change the output?
- **Round-trip**: Does Publish → View → re-Edit preserve all data?
- **Filters/interactions**: Do cross-filters, drill, cascading filters work?
- **Error paths**: Missing data, malformed input, empty datasets, network errors
- **Multi-page**: Add/delete/rename pages, filter propagation across pages
- **Responsive**: Viewport modes (desktop/tablet/mobile) in designer

### 3. Verify with Evidence

Use Chrome MCP tools for browser verification:

```
chr_navigate_page → chr_take_screenshot → chr_evaluate_script → chr_list_console_messages
```

Check for:

- Console errors/warnings
- Visual rendering correctness
- Data binding accuracy (values match expected query results)
- No stale state after navigation

### 4. File Bugs

Use `gh` CLI (see `.github/skills/github-cli/SKILL.md`):

```bash
gh issue create \
  --title "Brief: what's broken" \
  --body "## Steps to Reproduce
1. ...
2. ...

## Expected
...

## Actual
...

## Evidence
Screenshot or console output.

## Package(s)
\`packages/...\`" \
  --label bug
```

Rules:

- One bug per issue — don't bundle unrelated problems
- Include package name(s) in the body
- Attach screenshot evidence when visual
- Reference related issues if it's a regression of a prior fix

### 5. Verify Fixes

When checking that bugs are fixed:

1. **Unit/integration tests** — grep for regression test by issue number (`#NN`)
2. **Browser verification** — reproduce the original steps and confirm the fix
3. **No regressions** — `pnpm test` still green after the fix

## Coverage Assessment Method

Map tested vs untested surface:

| Dimension         | How to assess                                           |
| ----------------- | ------------------------------------------------------- |
| Packages          | Which packages have been exercised (unit + browser)?    |
| Chart types       | All 17 widget types rendered with data?                 |
| Config properties | All toggle/select fields produce visible change?        |
| Examples          | Each example app loads and works end-to-end?            |
| Workflows         | Publish, import/export, filter, drill, page management? |
| Error paths       | Empty data, bad schema, circular refs, XSS payloads?    |

## Prioritized Test Areas

Highest risk (test first):

1. **Puck ↔ canonical round-trip** — data loss on publish is highest severity
2. **Filter/interaction engine** — stateful, closure-sensitive, cross-widget
3. **Example apps** — real-world integration surface
4. **Security** — XSS, prototype pollution, input validation

Medium risk: 5. Multi-page navigation and state 6. Chart property toggles across all types 7. CLI schema generation 8. Responsive/viewport modes

Lower risk (unit tests sufficient): 9. Adapter field inference 10. Theme token application 11. Query client abstraction

## Anti-Patterns

- Testing only happy paths — edge cases are where bugs hide
- Filing vague bugs ("it doesn't work") — always include repro steps
- Skipping `pnpm test` before browser testing — unit failures cause confusing browser behavior
- Verifying fixes only by reading code — always reproduce in browser for UI bugs

## See Also

- `.github/skills/browser-testing/SKILL.md` — Chrome MCP procedure and test plans
- `.github/skills/github-cli/SKILL.md` — `gh issue create` patterns
- `.github/skills/branch-ci-promotion/SKILL.md` — verification before merge
- `docs/testing/qa-checklist.md` — living QA checklist
