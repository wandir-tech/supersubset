/**
 * Control block definitions for Puck editor.
 * FilterBar and other interactive controls.
 */
import type { ComponentConfig } from '@puckeditor/core';
import React from 'react';

export const FilterBarBlock: ComponentConfig = {
  label: 'Filter Bar',
  fields: {
    title: { type: 'text' as const, label: 'Title' },
    scope: {
      type: 'select' as const,
      label: 'Scope',
      options: [
        { label: 'Global', value: 'global' },
        { label: 'Page', value: 'page' },
      ],
    },
    layout: {
      type: 'radio' as const,
      label: 'Layout',
      options: [
        { label: 'Horizontal', value: 'horizontal' },
        { label: 'Vertical', value: 'vertical' },
      ],
    },
  },
  defaultProps: {
    title: 'Filters',
    scope: 'global',
    layout: 'horizontal',
  },
  render: ({ title, layout }: Record<string, unknown>) => {
    return React.createElement(
      'div',
      {
        style: {
          border: '1px dashed #b0c4de',
          borderRadius: 8,
          padding: 12,
          minHeight: 48,
          display: 'flex',
          flexDirection: layout === 'vertical' ? 'column' as const : 'row' as const,
          alignItems: 'center',
          gap: 8,
          background: '#f0f5ff',
          fontFamily: 'sans-serif',
        },
      },
      React.createElement('span', { style: { fontSize: 18 } }, '🔍'),
      React.createElement(
        'span',
        { style: { fontWeight: 600, fontSize: 13 } },
        (title as string) || 'Filter Bar'
      ),
      React.createElement(
        'span',
        { style: { fontSize: 11, color: '#666' } },
        'Filters will appear at runtime'
      )
    );
  },
};

export const CONTROL_BLOCK_NAMES = ['FilterBarBlock'] as const;

export const CONTROL_PUCK_NAME_TO_TYPE: Record<string, string> = {
  FilterBarBlock: 'filter-bar',
};
