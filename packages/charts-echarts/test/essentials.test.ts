import { describe, expect, it } from 'vitest';
import { createWidgetRegistry } from '@supersubset/runtime';
import { registerEssentialWidgets } from '../src/essentials';

describe('registerEssentialWidgets', () => {
  it('registers only the essential widget set', () => {
    const registry = createWidgetRegistry();

    registerEssentialWidgets(registry);

    expect(registry.getRegisteredTypes().sort()).toEqual([
      'bar-chart',
      'kpi-card',
      'line-chart',
      'pie-chart',
      'table',
    ]);
  });
});