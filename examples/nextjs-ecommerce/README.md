# Next.js E-Commerce Example

Runtime-focused host app showing how a Next.js application can embed Supersubset.

## What it demonstrates

- `@supersubset/runtime` embedded in a Next.js App Router app
- host-owned theme propagation using `@supersubset/theme`
- host-supplied fixture data injected through a wrapped widget registry
- dashboard-level filter options controlled by the host app

## Run

```bash
pnpm dev:nextjs-example
```

Then open `http://localhost:3001`.

## Notes

- This example is intentionally runtime-only.
- It models the common production pattern where the host owns routing, data fetching, and persistence while Supersubset only renders the dashboard definition.