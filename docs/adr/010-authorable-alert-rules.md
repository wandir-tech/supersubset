# ADR-010: Authorable In-Dashboard Alert Rules

## Status

Accepted

## Date

2026-05-04

## Context

Supersubset currently ships an `alerts` widget, but it is only a presentational row renderer.

Today:

- the widget renders alert tiles from rows passed in as widget data
- the designer only authors field bindings such as title, message, severity, and timestamp
- the dev app demo injects fixture rows directly into widgets
- the public runtime does not yet expose a host-owned query execution surface for bound widgets

That creates a product gap between what the demo suggests and what the published runtime actually supports.

The next step is not just a widget enhancement.

Authorable alert rules require decisions across:

- schema contract
- runtime query execution
- host-owned validation and permissions
- designer authoring UX
- query-contract boundaries for structured and SQL-backed evaluation

The user requirement is also intentionally mixed:

- keep a fairly restricted builder for common alert cases
- also allow an expert mode that issues arbitrary SQL when the host already has a secure SQL execution boundary

Supersubset must support that without breaking its core constraints:

- library-first
- schema-first
- backend-agnostic
- host-owned auth and query execution

Superset is useful precedent here, but not a direct model to copy.

Superset supports arbitrary SQL in virtual datasets and metric expressions, and its alerts are SQL-backed scheduled checks with explicit validator semantics. It does not treat dashboard alerts as a purely visual rule builder, and it does not default to a generic "rows greater than zero means true" model for every alert. Instead, it uses explicit validation modes over SQL results.

Supersubset should take the same lesson: if arbitrary SQL is allowed, its result semantics must be explicit.

### Superset precedent

Superset is relevant in two different ways.

First, it already allows arbitrary SQL in author-facing analytical surfaces:

- virtual datasets defined by custom SQL
- calculated columns and ad hoc metric expressions backed by SQL
- SQL-first exploratory workflows outside dashboard tile configuration

Second, its alerting model is not a visual tile rule builder. It is a scheduled SQL-backed validator pipeline.

Based on the repository research used for this ADR:

- alerts are stored as SQL-backed report schedules rather than dashboard widget-local rules
- execution applies explicit validator semantics over SQL results
- validator modes include `NOT_NULL` and `OPERATOR`
- empty result sets do not trigger alerts
- operator-style validation expects a single result value rather than an arbitrary result shape
- the execution path constrains the query result shape instead of treating any non-empty result as universally valid

The design lesson for Supersubset is not to copy Superset's scheduling model, but to copy its discipline:

- arbitrary SQL is an advanced path
- SQL result semantics must be explicit
- validator behavior should be first-class contract, not implicit convention

That is why this ADR keeps SQL predicates as a host-optional expert mode with named validator types instead of treating raw SQL as the default alert authoring experience.

### Package survey: expression builders and adjacent libraries

The research for this ADR also surveyed existing packages that could help with structured rules, expression evaluation, or SQL validation.

The results fall into three distinct categories.

#### Restricted visual rule builders

- `react-awesome-query-builder`
  - strongest feature set for a configurable visual rule builder
  - supports configurable fields, operators, functions, nesting, and export/import paths including SQL and JsonLogic
  - best fit if Supersubset later wants a richer structured-rule authoring UI
  - heavier than needed for the first release slice
- `react-querybuilder`
  - lighter, simpler, and easier to adopt for a constrained builder UI
  - solid fit for a smaller structured-rule editor if Supersubset owns most compilation logic itself
  - better candidate than a large dependency if the first builder stays intentionally narrow

#### General expression DSL / evaluation libraries

- `json-logic-js`
  - strongest fit if Supersubset later wants a serializable, portable rule AST
  - useful for structured rule representation or cross-tier evaluation
  - not a SQL authoring tool
- `Jexl`
  - expressive context-based expression language with custom operators, functions, and transforms
  - useful for advanced expression evaluation, but with a larger extensibility and trust surface
  - not a SQL authoring tool
- `expr-eval`
  - good for safe math-heavy formulas and basic comparisons
  - too limited for full BI alert authoring
  - not a SQL authoring tool

#### SQL parsing / validation libraries

- `node-sql-parser`
  - strong fit for host-side validation of arbitrary SQL
  - supports multiple dialects and can inspect referenced tables and columns
  - appropriate when a host wants to allow SQL predicates while enforcing scope and authority checks
- `pgsql-ast-parser`
  - good Postgres-focused typed AST option
  - appropriate if a host or future package standardizes on Postgres semantics
  - narrower than `node-sql-parser` for a backend-agnostic product surface

The conclusion from this survey is:

- do not use a general expression library as a substitute for arbitrary SQL authoring
- do not force a visual query builder into v1 alert rules
- if structured rule UX later grows beyond a narrow custom editor, `react-querybuilder` and `react-awesome-query-builder` are the most relevant candidates
- if SQL-predicate mode is implemented, validation belongs in host-owned SQL parsing/authorization logic, not in a visual expression-builder dependency

## Decision

### 1. Add authorable alert rules as a host-evaluated capability, not as embedded backend logic

Supersubset will support authorable in-dashboard alert rules, but query execution and authorization remain host-owned.

The runtime and designer may author and consume alert definitions, but they must not connect directly to any backend, warehouse, or SQL engine.

Implications:

- the runtime needs an explicit host query/evaluation seam
- hosts decide whether alert evaluation is supported at all
- hosts remain responsible for permissions, SQL safety, and execution policy

### 2. Keep the existing Alerts widget presentational

The current Alerts widget remains a row renderer.

It should continue to render rows with:

- title
- message
- severity
- timestamp

Alert rule authoring does not turn the widget itself into a backend-aware evaluator.

Instead, alert rules produce alert result rows that the widget can render.

This preserves a clean boundary:

- widget = presentation
- host/runtime evaluation path = data production

### 2a. Keep the MVP backend-calculated alert mode as a supported path

The existing MVP-style mode, where the host or backend calculates alert rows and Supersubset simply renders them, is retained.

This means the following path remains valid:

- the host computes alert status outside Supersubset
- the host returns alert rows through its existing query or data path
- the Alerts widget renders those rows without requiring rule authoring inside the library

Authorable alert rules are an additive capability on top of that path, not a replacement for it.

In other words:

- host-computed alerts stay supported
- authorable structured rules add a portable in-library authoring mode
- SQL-predicate rules add an expert host-optional mode for SQL-capable hosts

This avoids regressing the MVP behavior while still moving toward a richer schema-first contract.

### 3. Support two authored rule modes

Supersubset will support two alert-rule modes:

1. `structured`
2. `sql-predicate`

The `structured` mode is the portable default.

The `sql-predicate` mode is optional and only available when the host explicitly supports it.

#### Structured mode

Structured mode is intended for the common, safe, backend-agnostic cases.

Initial release scope:

- threshold comparisons on aggregated values

Future structured-mode extensions may add:

- previous-period metric change
- optional grouping for repeated alert rows

Structured mode should compile into the existing logical query contract or the smallest compatible extension of it. It must not require raw SQL authoring.

This is the primary path for release because it preserves schema portability and clearer designer UX.

#### SQL-predicate mode

SQL-predicate mode is an expert escape hatch.

It allows a host to accept an authored SQL predicate query and evaluate it inside the host's existing secure SQL boundary.

This mode is:

- host-optional
- explicitly capability-gated
- not required for every backend or adapter
- not the foundation of the feature

The designer should only expose it when the host declares support.

### 4. SQL-predicate mode must use explicit validator semantics

Raw SQL is allowed only with explicit result semantics.

Supersubset should not define one implicit truth model for all SQL-backed alerts.

At minimum, the model must support these validator types:

- `exists`: the predicate is true when the query returns one or more rows
- `scalar-threshold`: the predicate is true when a single scalar value satisfies an operator/threshold comparison

Examples:

- `exists` is appropriate for queries like "show this tile when any rows match the anomaly condition"
- `scalar-threshold` is appropriate for queries like "show this tile when failed_orders_count greater than 10"

If additional validator types are later needed, they should be added as explicit modes rather than overloaded into the same result contract.

### 5. Introduce a host-owned runtime query surface before rule-driven alerts ship

The public runtime must expose a host-owned query execution surface before rule-driven alerts can work in a real embedding.

This is required not only for alerts, but because the current runtime already advertises widget props such as:

- `data`
- `columns`
- `loading`
- `error`

Yet the public renderer does not currently populate them.

The first implementation step is therefore to expose an optional host query adapter or equivalent runtime query surface that can hydrate bound widgets from authored `dataBinding` definitions.

Alert rules then build on top of that seam instead of inventing a second execution path.

### 6. Structured mode should reuse canonical schema fields and logical-query bindings

The structured rule mode should be expressed using canonical dataset/field references and query-contract shapes rather than ad hoc backend expressions.

That means:

- dataset references remain explicit
- field references remain explicit
- comparison windows and thresholds are canonical config, not backend syntax
- the host may translate the logical intent into SQL, Prisma, or any other backend-specific plan

This keeps the authored contract inspectable and portable.

### 7. Defer full visual Boolean rule-builder UX

Supersubset should not block this feature on a general-purpose Boolean expression builder.

For the first release slice:

- structured mode should be constrained to the most valuable alert patterns
- SQL-predicate mode should use a focused expert editor, not a fake visual abstraction over arbitrary SQL

General expression-builder libraries may still be useful later for advanced structured predicates, but they are not required to unlock the initial capability.

If a future release adopts an external builder for structured rules, the current research points to these likely candidates:

- prefer `react-querybuilder` for a narrow, lighter-weight structured-rule UI
- prefer `react-awesome-query-builder` only if Supersubset intentionally wants a richer, more configurable rule-builder surface

Neither package should be treated as the solution for raw SQL authoring.

## Consequences

### Positive

- The product gains a clear path from today's display-only alerts to real authorable alert logic.
- The design stays aligned with Supersubset's host-owned execution model.
- Structured mode preserves backend-agnostic portability for common alert cases.
- SQL-capable hosts still get an expert escape hatch without forcing every host to support SQL authoring.
- Explicit validator semantics avoid ambiguous or unsafe SQL result interpretation.

### Negative

- This is not a small widget-only enhancement; it requires coordinated changes across runtime, schema, designer, and tests.
- The runtime must gain a host query surface before the alert feature is truly usable in public embeddings.
- SQL-predicate mode introduces additional capability negotiation, validation, and host documentation burden.
- The designer must communicate clearly which rule mode is portable and which one is host-specific.

### Neutral

- The existing Alerts widget can continue to be used as a plain row-rendering status surface.
- Existing MVP-style backend-calculated alert rows remain a valid integration pattern.
- Hosts that do not support alert evaluation or SQL predicates can still embed Supersubset normally.
- This ADR does not define notification delivery, scheduling, or email/report pipelines.

## Alternatives Considered

| Alternative                                                           | Pros                         | Cons                                                                                                             | Why Rejected                                                             |
| --------------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Keep alerts purely data-driven and host-authored outside the schema   | Minimal new product surface  | Leaves a visible product gap and keeps alert behavior outside the schema-first contract                          | Rejected because the user requirement is explicit authorable alert logic |
| Build only a structured rule mode and ban SQL predicates entirely     | Cleaner portability story    | Blocks legitimate expert use cases where the host already has a safe SQL boundary                                | Rejected because it is too restrictive for SQL-capable hosts             |
| Make raw SQL the primary alert model                                  | Fast path for advanced users | Breaks backend-agnostic design and pushes most users into an unsafe or opaque authoring model                    | Rejected because SQL must be an optional escape hatch, not the baseline  |
| Treat any SQL result with more than zero rows as the only truth model | Simple to explain            | Too limited for scalar metric checks and inconsistent with stronger validator-based designs                      | Rejected because SQL result semantics need explicit modes                |
| Build a full visual Boolean/query builder before shipping alert rules | More expressive long term    | Larger scope, slower delivery, unnecessary dependency on a generic builder before the main execution seam exists | Rejected because the first release should stay narrow and pragmatic      |

## References

- [ADR-003: Canonical Schema Format](./003-canonical-schema.md)
- [ADR-006: Multi-Dashboard Navigation, Alerts Widget, and Reusable Filter Rule Editor](./006-multi-dashboard-navigation-alerts-and-filter-editor.md)
- [ADR-008: Supersubset HTTP Probe Contract](./008-supersubset-http-probe-contract.md)
- [docs/status/master-plan.md](../status/master-plan.md)
- Superset repository research on SQL-backed alerts, validator semantics, and SQL-authored analytical surfaces
- Package survey: `react-awesome-query-builder`, `react-querybuilder`, `json-logic-js`, `Jexl`, `expr-eval`, `node-sql-parser`, `pgsql-ast-parser`
