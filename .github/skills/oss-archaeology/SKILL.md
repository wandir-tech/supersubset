---
name: oss-archaeology
description: "Research and analyze open-source projects for code reuse in Supersubset. Use when performing code archaeology on Apache Superset, Rill, Dashbuilder, Perspective, Puck, or any candidate project. Covers repository analysis, module coupling assessment, license compliance, and reuse vs rewrite recommendations."
---

# Open-Source Archaeology Skill

## When to Use
- Analyzing an open-source project for reusable code or patterns
- Assessing module coupling and extraction feasibility
- Producing reuse vs rewrite recommendations
- Checking license compatibility
- Scanning the landscape for related projects

## Target Projects

### Tier 1 — Deep Analysis Required
| Project | Focus Areas | License |
|---------|-------------|---------|
| Apache Superset | Chart UX, dashboard composition, filter UX, plugin model | Apache 2.0 |
| Puck | Editor shell, drag-and-drop, property editing, host integration | MIT |
| Apache ECharts | Chart rendering, option model, theming, extensibility | Apache 2.0 |

### Tier 2 — Study for Patterns
| Project | Focus Areas | License |
|---------|-------------|---------|
| Rill | YAML resources, dashboard-as-files, component canvas | Apache 2.0 |
| Dashbuilder | YAML/JSON dashboard def, page/nav, editor/runtime split | Apache 2.0 |
| Perspective | Pivot/table runtime, save/restore config, high-perf interactive | Apache 2.0 |

### Tier 3 — Landscape Scan
| Project | Why |
|---------|-----|
| geOrchestra superset-core | Superset integration into larger platform |
| open-source-dashboard | Small MIT dashboard builder |
| React page builders | JSON/YAML-saving visual editors |

## Classification System

For every module/component analyzed:

| Classification | Meaning | Action |
|---------------|---------|--------|
| **Code donor** | Can extract/adapt code directly | Copy with attribution, adapt to our interfaces |
| **Architectural inspiration** | Good ideas, code too coupled | Clean-room reimplementation inspired by patterns |
| **Discarded** | Not useful | Document why, move on |

## Analysis Template

For each module analyzed:

```markdown
## [Module Name] from [Project]

**Source**: `repo/path/to/module`
**License**: Apache 2.0 / MIT / etc.
**Classification**: Code donor / Architectural inspiration / Discarded

### What it does
[Brief description]

### Coupling assessment
- Backend dependencies: [list]
- Required imports from other modules: [list]
- API surface used: [list]
- Extraction effort: Low / Medium / High / Infeasible

### Recommendation
[Specific recommendation: extract, adapt, rewrite, or skip]

### Attribution requirements
[What notices/headers must be preserved]
```

## Procedure

1. Clone or browse the target repository
2. Map the module structure and dependency graph
3. Identify modules relevant to Supersubset's needs
4. For each relevant module:
   a. Assess internal coupling
   b. Assess external dependencies
   c. Check license compatibility
   d. Classify as code donor / inspiration / discarded
5. Produce reuse matrix document
6. Write detailed findings per project in `docs/research/`

## License Compatibility Rules

| Source License | Compatible with Apache 2.0 output? | Notes |
|---------------|--------------------------------------|-------|
| Apache 2.0 | Yes | Preserve NOTICE file |
| MIT | Yes | Preserve copyright notice |
| BSD 2/3-Clause | Yes | Preserve copyright notice |
| MPL 2.0 | Yes (file-level) | Modified files stay MPL |
| LGPL | Careful | Dynamic linking OK, static problematic |
| GPL | No | Cannot use in Apache 2.0 project |
| AGPL | No | Cannot use |
