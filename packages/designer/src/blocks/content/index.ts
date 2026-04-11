/**
 * Content block definitions for Puck editor.
 * Header, Markdown, Divider, Spacer blocks.
 */
import type { ComponentConfig } from '@puckeditor/core';
import React from 'react';

export const HeaderBlock: ComponentConfig = {
  label: 'Header',
  fields: {
    text: { type: 'text' as const, label: 'Text' },
    size: {
      type: 'select' as const,
      label: 'Size',
      options: [
        { label: 'Small', value: 'small' },
        { label: 'Medium', value: 'medium' },
        { label: 'Large', value: 'large' },
      ],
    },
    align: {
      type: 'radio' as const,
      label: 'Alignment',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
      ],
    },
  },
  defaultProps: {
    text: 'Header',
    size: 'medium',
    align: 'left',
  },
  render: ({ text, size, align }: Record<string, unknown>) => {
    const tag =
      size === 'large' ? 'h1' : size === 'small' ? 'h3' : 'h2';
    return React.createElement(tag, {
      style: {
        textAlign: (align as string) || 'left',
        margin: '0 0 8px 0',
        fontFamily: 'var(--ss-font-family, sans-serif)',
        color: 'var(--ss-color-text, #1a1a1a)',
      },
    }, text as string);
  },
};

export const MarkdownBlock: ComponentConfig = {
  label: 'Markdown / Rich Text',
  fields: {
    content: { type: 'textarea' as const, label: 'Markdown Content' },
  },
  defaultProps: {
    content: 'Enter your **markdown** content here.',
  },
  render: ({ content }: Record<string, unknown>) => {
    return React.createElement('div', {
      style: {
        padding: 12,
        fontFamily: 'var(--ss-font-family, sans-serif)',
        fontSize: 14,
        lineHeight: 1.6,
        color: 'var(--ss-color-text, #1a1a1a)',
        whiteSpace: 'pre-wrap' as const,
      },
    }, content as string);
  },
};

export const DividerBlock: ComponentConfig = {
  label: 'Divider',
  fields: {
    color: { type: 'text' as const, label: 'Color' },
    thickness: { type: 'number' as const, label: 'Thickness (px)' },
    margin: { type: 'number' as const, label: 'Margin (px)' },
  },
  defaultProps: {
    color: '#e0e0e0',
    thickness: 1,
    margin: 16,
  },
  render: ({ color, thickness, margin }: Record<string, unknown>) => {
    return React.createElement('hr', {
      style: {
        border: 'none',
        borderTop: `${thickness || 1}px solid ${color || '#e0e0e0'}`,
        margin: `${margin || 16}px 0`,
        width: '100%',
      },
    });
  },
};

export const SpacerBlock: ComponentConfig = {
  label: 'Spacer',
  fields: {
    height: { type: 'number' as const, label: 'Height (px)' },
  },
  defaultProps: {
    height: 24,
  },
  render: ({ height, puck }: Record<string, unknown>) => {
    const isEditing = (puck as { isEditing?: boolean })?.isEditing;
    return React.createElement('div', {
      style: {
        height: `${height || 24}px`,
        background: isEditing ? 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.03) 5px, rgba(0,0,0,0.03) 10px)' : 'transparent',
        borderRadius: 4,
      },
    });
  },
};

export const CONTENT_BLOCK_NAMES = [
  'HeaderBlock',
  'MarkdownBlock',
  'DividerBlock',
  'SpacerBlock',
] as const;

/** Map Puck component name → canonical layout type for content */
export const CONTENT_PUCK_NAME_TO_TYPE: Record<string, string> = {
  HeaderBlock: 'header',
  MarkdownBlock: 'markdown',
  DividerBlock: 'divider',
  SpacerBlock: 'spacer',
};
