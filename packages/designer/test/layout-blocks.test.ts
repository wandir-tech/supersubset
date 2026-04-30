/**
 * Tests for layout blocks (Row and Column).
 */
import { describe, it, expect } from 'vitest';
import React from 'react';
import {
  RowBlock,
  ColumnBlock,
  LAYOUT_BLOCK_NAMES,
  LAYOUT_PUCK_NAME_TO_TYPE,
} from '../src/blocks/layout';

describe('RowBlock', () => {
  it('has label', () => {
    expect(RowBlock.label).toBe('Row (12-col Grid)');
  });

  it('has content slot field', () => {
    expect(RowBlock.fields?.content).toBeDefined();
    expect((RowBlock.fields!.content as { type: string }).type).toBe('slot');
  });

  it('has gap, padding, minHeight, background fields', () => {
    expect(RowBlock.fields?.gap).toBeDefined();
    expect(RowBlock.fields?.padding).toBeDefined();
    expect(RowBlock.fields?.minHeight).toBeDefined();
    expect(RowBlock.fields?.background).toBeDefined();
  });

  it('has defaultProps with gap=16 and two default columns', () => {
    expect(RowBlock.defaultProps?.gap).toBe(16);
    const content = RowBlock.defaultProps?.content as unknown[];
    expect(content).toHaveLength(2);
  });

  it('render function returns a React element', () => {
    // Create a mock Content component (simulating Puck slot behavior)
    const MockContent = (props: { style?: React.CSSProperties }) =>
      React.createElement('div', { style: props.style, 'data-testid': 'row-content' });

    const result = RowBlock.render({
      content: MockContent,
      gap: 16,
      padding: 0,
      minHeight: 80,
      background: '',
      puck: { isEditing: false },
    });
    expect(result).toBeDefined();
  });
});

describe('ColumnBlock', () => {
  it('has label', () => {
    expect(ColumnBlock.label).toBe('Column');
  });

  it('is not inline so nested widgets can own canvas selection', () => {
    expect(ColumnBlock.inline).toBe(false);
  });

  it('has content slot field', () => {
    expect(ColumnBlock.fields?.content).toBeDefined();
    expect((ColumnBlock.fields!.content as { type: string }).type).toBe('slot');
  });

  it('has span and verticalAlign fields', () => {
    expect(ColumnBlock.fields?.span).toBeDefined();
    expect(ColumnBlock.fields?.verticalAlign).toBeDefined();
  });

  it('has defaultProps with span=6', () => {
    expect(ColumnBlock.defaultProps?.span).toBe(6);
  });

  it('render function returns a React element', () => {
    const MockContent = () => React.createElement('div');
    const mockRef = { current: null };

    const result = ColumnBlock.render({
      span: 4,
      content: MockContent,
      verticalAlign: 'start',
      puck: { dragRef: mockRef, isEditing: true },
    });
    expect(result).toBeDefined();
  });
});

describe('Layout block exports', () => {
  it('LAYOUT_BLOCK_NAMES has 2 entries', () => {
    expect(LAYOUT_BLOCK_NAMES).toHaveLength(2);
    expect(LAYOUT_BLOCK_NAMES).toContain('RowBlock');
    expect(LAYOUT_BLOCK_NAMES).toContain('ColumnBlock');
  });

  it('LAYOUT_PUCK_NAME_TO_TYPE maps correctly', () => {
    expect(LAYOUT_PUCK_NAME_TO_TYPE.RowBlock).toBe('row');
    expect(LAYOUT_PUCK_NAME_TO_TYPE.ColumnBlock).toBe('column');
  });
});
