# Vite + SQLite Example

Host app showing Supersubset wired to an in-browser SQLite database.

## What it demonstrates

- `@supersubset/runtime` and `@supersubset/designer` embedded in a Vite app
- host-owned dashboard persistence with localStorage
- host-owned query execution with `sql.js`
- dashboard filters translated into SQLite `WHERE` clauses by the host app
- visible query log for debugging and onboarding

## Run

```bash
pnpm dev:vite-sqlite-example
```

Then open `http://localhost:3002`.

## Notes

- Supersubset does not talk to SQLite directly here.
- The host app receives filter state from the renderer, runs SQLite queries, and injects result rows into the widget registry.