---
description: "Use when modifying data model adapters in packages/adapter-* or packages/data-model/ or packages/query-client/. Covers metadata normalization, adapter interfaces, query abstractions, and field inference. Enforces adapter-first architecture."
applyTo: ["packages/data-model/**", "packages/adapter-*/**", "packages/query-client/**"]
---

# Adapter Package Rules

- All adapters must implement the common interface from `packages/data-model`
- Adapter-specific dependencies (prisma, dbt, etc.) stay in their own packages
- Core packages (runtime, designer) must never import adapter-specific code
- Normalize all metadata into: entities, fields (dimension/measure/time/key), relationships
- Query abstraction must support: dataset, fields, aggregations, filters, sort, limit
- Support both logical query plan (to host adapter) and direct SQL generation
- Write fixture-based tests with sample schemas (Prisma, SQL catalog, dbt manifests)
- Field role inference heuristics must be documented and testable
- Validate all external metadata input at system boundaries
