/**
 * Tests for component icons.
 */
import { describe, it, expect } from 'vitest';
import { getComponentIcon, ICON_COMPONENT_NAMES } from '../src/icons/component-icons';
import { CHART_BLOCK_NAMES } from '../src/blocks/charts';
import { CONTENT_BLOCK_NAMES } from '../src/blocks/content';
import { CONTROL_BLOCK_NAMES } from '../src/blocks/controls';
import { LAYOUT_BLOCK_NAMES } from '../src/blocks/layout';

describe('getComponentIcon', () => {
  const allBlocks = [
    ...CHART_BLOCK_NAMES,
    ...CONTENT_BLOCK_NAMES,
    ...CONTROL_BLOCK_NAMES,
    ...LAYOUT_BLOCK_NAMES,
  ];

  it('returns a React element for each chart block', () => {
    for (const name of CHART_BLOCK_NAMES) {
      const icon = getComponentIcon(name);
      expect(icon).not.toBeNull();
      expect(icon?.type).toBe('svg');
    }
  });

  it('returns a React element for each content block', () => {
    for (const name of CONTENT_BLOCK_NAMES) {
      const icon = getComponentIcon(name);
      expect(icon).not.toBeNull();
      expect(icon?.type).toBe('svg');
    }
  });

  it('returns a React element for each control block', () => {
    for (const name of CONTROL_BLOCK_NAMES) {
      const icon = getComponentIcon(name);
      expect(icon).not.toBeNull();
      expect(icon?.type).toBe('svg');
    }
  });

  it('returns a React element for each layout block', () => {
    for (const name of LAYOUT_BLOCK_NAMES) {
      const icon = getComponentIcon(name);
      expect(icon).not.toBeNull();
      expect(icon?.type).toBe('svg');
    }
  });

  it('returns null for unknown component names', () => {
    expect(getComponentIcon('NonExistent')).toBeNull();
    expect(getComponentIcon('')).toBeNull();
  });

  it('accepts a custom size parameter', () => {
    const icon = getComponentIcon('LineChart', 24);
    expect(icon).not.toBeNull();
    expect(icon?.props.width).toBe(24);
    expect(icon?.props.height).toBe(24);
  });

  it('uses default size of 18', () => {
    const icon = getComponentIcon('BarChart');
    expect(icon?.props.width).toBe(18);
    expect(icon?.props.height).toBe(18);
  });

  it('ICON_COMPONENT_NAMES covers all registered blocks', () => {
    for (const name of allBlocks) {
      expect(ICON_COMPONENT_NAMES).toContain(name);
    }
  });

  it('has an icon definition for every registered block', () => {
    expect(ICON_COMPONENT_NAMES).toHaveLength(allBlocks.length);
  });
});
