'use client';

import { useMemo, useState } from 'react';
import { SupersubsetRenderer, createWidgetRegistry, type WidgetProps } from '@supersubset/runtime';
import { registerEssentialWidgets } from '@supersubset/charts-echarts/essentials';
import { resolveTheme, themeToCssVariables } from '@supersubset/theme';
import type { InlineThemeDefinition } from '@supersubset/schema';
import { ecommerceDashboard } from '../lib/dashboard';
import { ecommerceFilterOptions, ecommerceWidgetData } from '../lib/fixtures';

const warmTheme: InlineThemeDefinition = ecommerceDashboard.theme as InlineThemeDefinition;
const coolTheme: InlineThemeDefinition = {
  ...warmTheme,
  colors: {
    ...warmTheme.colors,
    primary: '#1767a5',
    background: '#f4f9ff',
    surface: '#ffffff',
    border: '#d7e5f2',
  },
};

export function EcommerceHost() {
  const [themeMode, setThemeMode] = useState<'warm' | 'cool'>('warm');

  const activeTheme = themeMode === 'warm' ? warmTheme : coolTheme;
  const resolvedTheme = useMemo(() => resolveTheme(activeTheme), [activeTheme]);
  const cssVariables = useMemo(() => themeToCssVariables(resolvedTheme), [resolvedTheme]);

  const registry = useMemo(() => {
    const registryInstance = createWidgetRegistry();
    registerEssentialWidgets(registryInstance);

    const originalGet = registryInstance.get.bind(registryInstance);
    registryInstance.get = (type: string) => {
      const Original = originalGet(type);
      if (!Original) return undefined;

      const Wrapped = (props: WidgetProps) => {
        const fixture = ecommerceWidgetData[props.widgetId];
        return (
          <Original
            {...props}
            data={fixture?.data ?? props.data}
            columns={fixture?.columns ?? props.columns}
          />
        );
      };

      Wrapped.displayName = `EcommerceFixture(${type})`;
      return Wrapped;
    };

    return registryInstance;
  }, []);

  return (
    <main style={{ padding: '32px 36px 48px' }}>
      <section
        style={{
          maxWidth: 1280,
          margin: '0 auto 24px',
          padding: '28px 32px',
          borderRadius: 28,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.92), rgba(255,244,231,0.88))',
          border: '1px solid rgba(181, 93, 38, 0.12)',
          boxShadow: '0 24px 60px rgba(83, 52, 24, 0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 24,
            alignItems: 'flex-start',
          }}
        >
          <div style={{ maxWidth: 760 }}>
            <div
              style={{
                fontSize: 13,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: '#8f6f59',
              }}
            >
              Next.js Runtime Host
            </div>
            <h1 style={{ margin: '12px 0 10px', fontSize: 48, lineHeight: 1.05 }}>
              Supersubset inside a storefront operations shell.
            </h1>
            <p style={{ margin: 0, fontSize: 18, lineHeight: 1.6, color: '#5b4637' }}>
              This example shows the runtime package embedded in a Next.js app with host-owned theme
              propagation, host-supplied data, and no backend dependency on Supersubset itself.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setThemeMode((current) => (current === 'warm' ? 'cool' : 'warm'))}
            style={{
              border: '1px solid rgba(38, 27, 18, 0.16)',
              background: '#fff',
              borderRadius: 999,
              padding: '12px 18px',
              cursor: 'pointer',
              color: '#36281e',
            }}
          >
            Switch to {themeMode === 'warm' ? 'cool' : 'warm'} theme
          </button>
        </div>
      </section>

      <section style={{ maxWidth: 1280, margin: '0 auto' }}>
        <SupersubsetRenderer
          definition={ecommerceDashboard}
          registry={registry}
          theme={resolvedTheme as unknown as Record<string, unknown>}
          cssVariables={cssVariables}
          filterOptions={ecommerceFilterOptions}
        />
      </section>
    </main>
  );
}
