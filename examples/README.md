# Examples

This directory contains host-app examples for Supersubset.

Start with [docs/getting-started.md](../docs/getting-started.md) for the repo-level quick start and minimal embedding examples.

## Apps

- `nextjs-ecommerce` — Next.js runtime host with e-commerce fixtures and theme propagation
- `vite-sqlite` — Vite host using an in-browser SQLite database with local query orchestration

## Run

```bash
pnpm dev:nextjs-example
pnpm dev:vite-sqlite-example
```

Each example is `private: true` and workspace-local. They are not intended for npm publishing.