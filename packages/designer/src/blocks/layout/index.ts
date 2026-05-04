/**
 * Layout block definitions for the Puck editor.
 *
 * Row — a 12-column CSS Grid container (drop Columns into it).
 * Column — a grid-spanning child with its own content slot.
 *
 * Inspired by Apache Superset's ROW → COLUMN → CHART layout model,
 * adapted by Supersubset contributors. See NOTICE for attribution.
 */
import type { ComponentConfig } from '@puckeditor/core';
import React from 'react';

// ─── Row Block ───────────────────────────────────────────────

export const RowBlock: ComponentConfig = {
  label: 'Row (12-col Grid)',
  fields: {
    content: { type: 'slot' as const },
    gap: { type: 'number' as const, label: 'Gap (px)' },
    padding: { type: 'number' as const, label: 'Padding (px)' },
    minHeight: { type: 'number' as const, label: 'Min Height (px)' },
    background: { type: 'text' as const, label: 'Background Color' },
  },
  defaultProps: {
    gap: 16,
    padding: 0,
    minHeight: 80,
    background: '',
    // Pre-populate with two equal columns for immediate usability
    content: [
      { type: 'ColumnBlock', props: { span: 6, verticalAlign: 'stretch' } },
      { type: 'ColumnBlock', props: { span: 6, verticalAlign: 'stretch' } },
    ],
  },
  render: (props: Record<string, unknown>) => {
    const Content = props.content as React.ComponentType<{ style?: React.CSSProperties }>;
    const gap = Number(props.gap) || 16;
    const padding = Number(props.padding) || 0;
    const minHeight = Number(props.minHeight) || 80;
    const background = (props.background as string) || undefined;
    const puck = props.puck as { isEditing?: boolean } | undefined;
    const isEditing = puck?.isEditing;

    return React.createElement(Content, {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: `${gap}px`,
        padding: padding ? `${padding}px` : undefined,
        minHeight: `${minHeight}px`,
        background,
        border: isEditing ? '1px dashed #b0c4de' : undefined,
        borderRadius: isEditing ? 6 : undefined,
        position: 'relative' as const,
      },
    });
  },
};

// ─── Column Block ────────────────────────────────────────────

export const ColumnBlock: ComponentConfig = {
  label: 'Column',
  inline: true,
  fields: {
    span: { type: 'number' as const, label: 'Column Span (1–12)' },
    content: { type: 'slot' as const },
    verticalAlign: {
      type: 'select' as const,
      label: 'Vertical Align',
      options: [
        { label: 'Top', value: 'start' },
        { label: 'Center', value: 'center' },
        { label: 'Bottom', value: 'end' },
        { label: 'Stretch', value: 'stretch' },
      ],
    },
  },
  defaultProps: {
    span: 6,
    verticalAlign: 'stretch',
    content: [],
  },
  render: (props: Record<string, unknown>) => {
    const Content = props.content as React.ComponentType;
    const puck = props.puck as {
      dragRef?: React.Ref<HTMLDivElement>;
      isEditing?: boolean;
    };
    const span = Math.min(12, Math.max(1, Number(props.span) || 6));
    const verticalAlign = (props.verticalAlign as string) || 'stretch';
    const isEditing = puck?.isEditing;

    return React.createElement(
      'div',
      {
        ref: puck?.dragRef,
        style: {
          gridColumn: `span ${span}`,
          alignSelf: verticalAlign,
          minHeight: 40,
          border: isEditing ? '1px dashed #d0e0f0' : undefined,
          borderRadius: isEditing ? 4 : undefined,
          padding: isEditing ? 4 : undefined,
          position: 'relative' as const,
        },
      },
      // Span indicator visible during editing
      isEditing
        ? React.createElement(
            'div',
            {
              style: {
                position: 'absolute',
                top: -10,
                left: 4,
                fontSize: 10,
                color: '#8899aa',
                background: '#fff',
                padding: '0 4px',
                borderRadius: 2,
                lineHeight: '16px',
                fontFamily: 'monospace',
                zIndex: 1,
              },
            },
            `${span}/12`,
          )
        : null,
      React.createElement(Content),
    );
  },
};

// ─── Exports ─────────────────────────────────────────────────

export const LAYOUT_BLOCK_NAMES = ['RowBlock', 'ColumnBlock'] as const;

/** Map Puck component name → canonical layout type */
export const LAYOUT_PUCK_NAME_TO_TYPE: Record<string, string> = {
  RowBlock: 'row',
  ColumnBlock: 'column',
};
