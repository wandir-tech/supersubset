---
name: schema-design
description: "Design and validate canonical dashboard schemas for Supersubset. Use when creating TypeScript types, Zod validation schemas, JSON Schema generation, schema migrations, or serialization contracts. Covers dashboard definitions, widget configs, layout trees, filter models, and interaction definitions."
---

# Schema Design Skill

## When to Use
- Designing or modifying canonical dashboard schema types
- Adding new widget types or configuration options
- Implementing schema validation with Zod
- Generating JSON Schema from TypeScript/Zod types
- Writing schema migration logic
- Testing round-trip serialization (JSON ↔ YAML)

## Canonical Schema Structure

The canonical schema is the product contract. It must support:

```
DashboardDefinition
├── schemaVersion: string
├── id: string
├── title: string
├── description?: string
├── pages: PageDefinition[]
│   ├── id, title
│   ├── layout: LayoutNode (recursive tree)
│   │   ├── type: 'grid' | 'flex' | 'tabs' | 'stack'
│   │   ├── children: LayoutNode[]
│   │   └── props: LayoutProps
│   └── widgets: WidgetDefinition[]
│       ├── id, type, title
│       ├── dataBinding: DataBinding
│       ├── config: WidgetConfig (per-type)
│       ├── filters: FilterBinding[]
│       └── interactions: InteractionDefinition[]
├── theme?: ThemeRef | ThemeDefinition
├── dataModelRef?: string
├── defaults?: DashboardDefaults
├── filters?: GlobalFilterDefinition[]
└── permissions?: VisibilityRule[]
```

## Design Principles

1. **Human-readable**: Schema should be understandable in raw JSON/YAML
2. **Deterministic serialization**: Same AST → same output every time
3. **Stable IDs**: All nodes use UUID or developer-assigned stable IDs
4. **Version field required**: `schemaVersion` on every document
5. **Backward-compatible migrations**: Never break existing documents
6. **Encoding-agnostic**: JSON and YAML are just encodings of the same AST

## Procedure

1. Define TypeScript interfaces in `packages/schema/src/types/`
2. Create corresponding Zod schemas in `packages/schema/src/validation/`
3. Generate JSON Schema via `zod-to-json-schema` in build step
4. Write serializers in `packages/schema/src/serializers/`
5. Write migration functions in `packages/schema/src/migrations/`
6. Test with fixtures in `packages/schema/test/fixtures/`

## Key References
- [Initial spec](../../initial-spec.md) — full schema requirements
- [ADR template](../../docs/adr/000-template.md) — for documenting schema decisions
