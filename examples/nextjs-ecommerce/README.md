# Next.js E-Commerce Example

Next.js host app showing two levels of Supersubset integration in the same example package.

## What it demonstrates

- `/` — minimal runtime-only embedding with host-owned theme propagation and fixture data
- `/workbench` — a full-stack local host with login, secured metadata discovery, live preview queries, publish/persist, and runtime re-querying

## Run

```bash
pnpm dev:nextjs-example
```

Then open:

- `http://localhost:3001` for the minimal runtime-only page
- `http://localhost:3001/workbench` for the production-like local test bed

To run this example in parallel with another checkout, lease a port first:

```bash
SUPERSUBSET_EXAMPLE_NEXTJS_PORT=3111 pnpm dev:nextjs-example
```

## Notes

- The root page stays intentionally runtime-only.
- The workbench route is the stronger end-to-end validation surface for host integration bugs.
- The local backend is Next.js API routes, so the sample is deployable in principle rather than being locked to an in-browser-only backend.
