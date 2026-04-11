# HC-8 — Checkpoint Brief: Getting-Started Validation

> **Gate**: HC-8 — Human follows the getting-started guide from scratch
> **Phase**: 5 — Developer Experience
> **Prepared**: 2026-04-11

---

## What Was Validated

The current getting-started guide in [docs/getting-started.md](../getting-started.md) was exercised directly from the repository root.

Guide deltas since the previous prep pass:

- the runtime embedding example now documents the structured `onNavigate({ target, filterState })` callback shape
- the runtime example now uses the full bundled widget registry path so alerts are represented in the documented host setup
- the guide now calls out that the essentials bundle excludes `alerts` unless the host registers it manually
- `pnpm build:examples` was rerun successfully after these guide updates

Commands run exactly as documented:

```bash
pnpm install
pnpm build
pnpm dev:nextjs-example
pnpm dev:vite-sqlite-example
```

Observed result:

- `pnpm install` completed cleanly with an up-to-date lockfile
- `pnpm build` completed successfully across the workspace
- `pnpm dev:nextjs-example` started on `http://localhost:3001`
- `pnpm dev:vite-sqlite-example` started on `http://localhost:3002`

---

## Browser Verification

### Next.js example

- Loaded successfully at `http://localhost:3001`
- Header and runtime shell matched the guide description
- Theme toggle worked
- No console errors on fresh load

### Vite + SQLite example

- Loaded successfully at `http://localhost:3002`
- Viewer mode rendered KPIs, charts, table, and query log
- Changing `Region` to `APAC` updated visible metrics and the SQL log
- Designer mode loaded successfully from the same host app
- No console errors on fresh viewer load

---

## Known Issues

- `pnpm build` still emits a non-blocking large-chunk warning from `packages/dev-app` during the workspace-wide build. The build succeeds.

---

## Recommended Human Check

Use the current guide exactly as written and verify:

1. `pnpm install`
2. `pnpm build`
3. `pnpm dev:nextjs-example`
4. `pnpm dev:vite-sqlite-example`
5. Open both example URLs
6. Confirm the Next theme toggle and the Vite viewer/designer flow

---

## Time Estimate

~15-20 minutes for the guide-specific walkthrough