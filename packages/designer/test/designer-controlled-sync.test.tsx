import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { SupersubsetDesigner } from '../src/components/SupersubsetDesigner';
import { UndoRedoToolbar, useUndoRedo } from '../src/components/UndoRedo';
import type { DashboardDefinition } from '@supersubset/schema';

vi.mock('@puckeditor/core', async () => {
  const ReactModule = await import('react');

  return {
    Puck: (props: Record<string, unknown>) => {
      const [data] = ReactModule.useState(
        props.data as { content?: Array<Record<string, unknown>> } | undefined,
      );
      const overrides = props.overrides as Record<string, unknown> | undefined;
      const headerActionsOverride = overrides?.headerActions as
        | ((p: { children: React.ReactNode }) => React.ReactElement)
        | undefined;

      return ReactModule.createElement(
        'div',
        {
          'data-testid': 'sticky-puck-editor',
          'data-puck-payload': JSON.stringify(data?.content ?? []),
        },
        headerActionsOverride
          ? headerActionsOverride({
              children: ReactModule.createElement('span', { 'data-testid': 'default-actions' }),
            })
          : null,
      );
    },
    blocksPlugin: () => ({ name: 'blocks', label: 'Blocks' }),
    outlinePlugin: () => ({ name: 'outline', label: 'Outline' }),
  };
});

vi.mock('@puckeditor/core/puck.css', () => ({}));

const dashboardA: DashboardDefinition = {
  schemaVersion: '0.2.0',
  id: 'sync-dash',
  title: 'Sync Dashboard',
  pages: [
    {
      id: 'page-1',
      title: 'Overview',
      rootNodeId: 'root',
      layout: {
        root: { id: 'root', type: 'root', children: ['grid-main'], meta: {} },
        'grid-main': {
          id: 'grid-main',
          type: 'grid',
          children: ['header-1'],
          parentId: 'root',
          meta: { columns: 12 },
        },
        'header-1': {
          id: 'header-1',
          type: 'header',
          children: [],
          parentId: 'grid-main',
          meta: { text: 'Original Header', headerSize: 'large' },
        },
      },
      widgets: [],
    },
  ],
};

const dashboardB: DashboardDefinition = {
  ...dashboardA,
  pages: [
    {
      ...dashboardA.pages[0],
      layout: {
        root: { id: 'root', type: 'root', children: ['grid-main'], meta: {} },
        'grid-main': {
          id: 'grid-main',
          type: 'grid',
          children: ['header-2'],
          parentId: 'root',
          meta: { columns: 12 },
        },
        'header-2': {
          id: 'header-2',
          type: 'header',
          children: [],
          parentId: 'grid-main',
          meta: { text: 'Updated Header', headerSize: 'large' },
        },
      },
    },
  ],
};

function UndoHarness() {
  const undoRedo = useUndoRedo(dashboardA, { debounceMs: 0 });

  return React.createElement(SupersubsetDesigner, {
    value: undoRedo.current,
    onChange: undoRedo.push,
    headerActions: React.createElement(UndoRedoToolbar, {
      canUndo: undoRedo.canUndo,
      canRedo: undoRedo.canRedo,
      onUndo: undoRedo.undo,
      onRedo: undoRedo.redo,
      undoCount: undoRedo.undoCount,
      redoCount: undoRedo.redoCount,
    }),
  });
}

describe('SupersubsetDesigner controlled sync', () => {
  afterEach(() => {
    cleanup();
  });

  it('re-mounts Puck when a controlled value changes externally on the same page', () => {
    const { rerender } = render(
      React.createElement(SupersubsetDesigner, {
        value: dashboardA,
        onChange: vi.fn(),
      }),
    );

    expect(screen.getByTestId('sticky-puck-editor').getAttribute('data-puck-payload')).toContain(
      'header-1',
    );

    rerender(
      React.createElement(SupersubsetDesigner, {
        value: dashboardB,
        onChange: vi.fn(),
      }),
    );

    expect(screen.getByTestId('sticky-puck-editor').getAttribute('data-puck-payload')).toContain(
      'header-2',
    );
  });

  it('keeps dashboard title edits on the host undo stack', async () => {
    render(React.createElement(UndoHarness));

    const undoButton = screen.getByTestId('undo-btn');
    expect(undoButton.hasAttribute('disabled')).toBe(true);

    const titleInput = screen.getByTestId('designer-dashboard-title-input');
    fireEvent.change(titleInput, { target: { value: 'Executive Dashboard' } });
    fireEvent.blur(titleInput);

    await waitFor(() => {
      expect(screen.getByTestId('undo-btn').hasAttribute('disabled')).toBe(false);
    });
  });
});
