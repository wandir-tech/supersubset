# Getting Started

This guide is the fastest way to get Supersubset running from the current repository state.

Today, the packages are workspace-local and the best supported entry point is to run the examples in this monorepo. The embedding snippets below show the minimal runtime and designer integration surface that the host app owns.

Need package-level surface details after the quick start? See [API Reference](./api/README.md).

## Prerequisites

- Node.js 20+
- pnpm 9+
- macOS, Linux, or Windows with a working browser

## Repo Quick Start

From the repository root:

```bash
pnpm install
pnpm build
```

That builds the workspace packages into `dist/`, which is what the host examples consume.

## Run The Examples

### Next.js runtime host

```bash
pnpm dev:nextjs-example
```

Open `http://localhost:3001`.

What to look for:

- runtime-only embedding
- host-owned theme switching
- host-supplied fixture data injected through the widget registry

### Vite + SQLite host

```bash
pnpm dev:vite-sqlite-example
```

Open `http://localhost:3002`.

What to look for:

- runtime + designer embedding in the same host app
- host-owned persistence via `localStorage`
- host-owned SQL execution via `sql.js`
- filter state translated into host-side queries

## Minimal Runtime Host

Use the runtime when the host app already owns routing, persistence, and data delivery.

```tsx
import { useMemo } from 'react';
import { SupersubsetRenderer, createWidgetRegistry, type NavigateRequest } from '@supersubset/runtime';
import { registerAllCharts } from '@supersubset/charts-echarts';
import { resolveTheme, themeToCssVariables } from '@supersubset/theme';

export function DashboardScreen({ definition, filterOptions, widgetData }) {
  const registry = useMemo(() => {
    const instance = createWidgetRegistry();
    registerAllCharts(instance);
    return instance;
  }, []);

  const theme = resolveTheme({
    type: 'inline',
    colors: {
      primary: '#0d5c63',
      background: '#f4fbfb',
      surface: '#ffffff',
      text: '#11333a',
      info: '#0b6bcb',
      success: '#1f7a45',
      warning: '#a05a00',
      danger: '#b42318',
      border: '#d7e7e9',
    },
  });

  function handleNavigate(request: NavigateRequest) {
    if (request.target.kind === 'page') {
      console.log('Switch to page', request.target.pageId, request.filterState);
      return;
    }

    // Dashboard targets are valid API values today, but host orchestration is deferred.
    console.warn('Dashboard navigation target reserved for future host routing', request.target);
  }

  return (
    <SupersubsetRenderer
      definition={definition}
      registry={registry}
      theme={theme}
      cssVariables={themeToCssVariables(theme)}
      filterOptions={filterOptions}
      onNavigate={handleNavigate}
    />
  );
}
```

Host responsibilities:

- provide the dashboard definition
- register the widgets you want to allow
- provide filter options and query-backed data
- handle page navigation requests and reserve room for future dashboard targets
- persist filter state or analytics state if needed

Notes:

- `registerAllCharts()` includes the full bundled widget catalog, including `alerts`.
- `onNavigate` now receives `{ target, filterState }` rather than a raw `pageId`.
- Inline theme colors support semantic status tokens: `info`, `success`, `warning`, `danger`, and `border`.

## Minimal Designer Host

Use the designer when the host wants to let users edit a dashboard definition but still own persistence.

```tsx
import { useState } from 'react';
import { SupersubsetDesigner } from '@supersubset/designer';

export function DashboardDesigner({ initialDefinition, onSave }) {
  const [definition, setDefinition] = useState(initialDefinition);

  return (
    <SupersubsetDesigner
      value={definition}
      onChange={setDefinition}
      onPublish={onSave}
      headerTitle="Supersubset Designer"
      height="100vh"
    />
  );
}
```

Host responsibilities:

- keep the canonical schema in host state
- save the schema wherever persistence belongs
- decide which metadata and capabilities are available to the user
- mount the runtime separately from the designer if needed

## Common Commands

```bash
pnpm build
pnpm build:examples
pnpm test
pnpm typecheck
pnpm lint
```

## Troubleshooting

### Workspace package changes are not showing up

Examples resolve workspace packages from built `dist/` output, not from `src/`.

Rebuild the affected package first:

```bash
pnpm --filter @supersubset/runtime build
pnpm --filter @supersubset/designer build
pnpm --filter @supersubset/charts-echarts build
```

If the Vite example still looks stale, clear its cache and restart it:

```bash
cd examples/vite-sqlite
rm -rf node_modules/.vite
cd ../..
pnpm dev:vite-sqlite-example
```

### The Next.js example returns a 500 after a rebuild

If you rebuilt the workspace while an older `pnpm dev:nextjs-example` process was still running, restart that server cleanly before assuming the example is broken.

Stop the old dev server first, then rerun:

```bash
rm -rf examples/nextjs-ecommerce/.next
pnpm dev:nextjs-example
```

### I only want the smallest widget bundle for a host app

Use `@supersubset/charts-echarts/essentials` instead of the full chart entrypoint.

That essentials bundle does not include `alerts`. If you need alerts in a smaller bundle, register `AlertsWidget` manually alongside the essentials set.

### I want to verify the examples before editing code

```bash
pnpm build:examples
```

That is the fastest full-pass check for the two Phase 5 host examples.