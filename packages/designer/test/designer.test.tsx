/**
 * Tests for SupersubsetDesigner component.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { SupersubsetDesigner } from '../src/components/SupersubsetDesigner';
import type { DashboardDefinition } from '@supersubset/schema';

// Mock Puck to avoid full editor rendering in unit tests
vi.mock('@puckeditor/core', () => ({
  Puck: (props: Record<string, unknown>) => {
    // Render headerActions if provided via overrides
    const overrides = props.overrides as Record<string, unknown> | undefined;
    const headerActionsOverride = overrides?.headerActions as
      | ((p: { children: React.ReactNode }) => React.ReactElement)
      | undefined;
    const plugins = props.plugins as Array<{ name: string; label: string }> | undefined;
    const data = props.data as { content?: Array<{ props?: { id?: string } }> } | undefined;
    return React.createElement('div', {
      'data-testid': 'puck-editor',
      'data-header-title': props.headerTitle,
      'data-has-on-publish': !!props.onPublish,
      'data-has-on-change': !!props.onChange,
      'data-plugin-labels': plugins?.map((p) => p.label).join(',') ?? '',
      'data-content-ids': data?.content?.map((item) => item.props?.id ?? '').join(',') ?? '',
    },
      // Render headerActions override so we can query its content
      headerActionsOverride
        ? headerActionsOverride({ children: React.createElement('span', { 'data-testid': 'default-actions' }) })
        : null,
      React.createElement(
        'select',
        {
          'data-testid': 'mock-viewport-zoom',
          className: '_ViewportControls-zoomSelect_mock',
        },
        React.createElement('option', { value: '1' }, '100%')
      ),
    );
  },
  blocksPlugin: () => ({ name: 'blocks', label: 'Blocks' }),
  outlinePlugin: () => ({ name: 'outline', label: 'Outline' }),
}));

vi.mock('@puckeditor/core/puck.css', () => ({}));

const minimalDashboard: DashboardDefinition = {
  schemaVersion: '0.2.0',
  id: 'test-dash',
  title: 'Test Dashboard',
  pages: [
    {
      id: 'page-1',
      title: 'Page 1',
      layout: {
        root: { id: 'root', type: 'root', children: ['grid-main'], meta: {} },
        'grid-main': { id: 'grid-main', type: 'grid', children: [], parentId: 'root', meta: { columns: 12 } },
      },
      rootNodeId: 'root',
      widgets: [],
    },
  ],
};

const multiPageDashboard: DashboardDefinition = {
  schemaVersion: '0.2.0',
  id: 'multi-page-dash',
  title: 'Multi Page Dashboard',
  pages: [
    {
      id: 'page-overview',
      title: 'Overview',
      layout: {
        root: { id: 'root', type: 'root', children: ['grid-main'], meta: {} },
        'grid-main': { id: 'grid-main', type: 'grid', children: ['header-overview'], parentId: 'root', meta: { columns: 12 } },
        'header-overview': { id: 'header-overview', type: 'header', children: [], parentId: 'grid-main', meta: { text: 'Overview Header', headerSize: 'large' } },
      },
      rootNodeId: 'root',
      widgets: [],
    },
    {
      id: 'page-detail',
      title: 'Detail',
      layout: {
        root: { id: 'root', type: 'root', children: ['grid-main'], meta: {} },
        'grid-main': { id: 'grid-main', type: 'grid', children: ['header-detail'], parentId: 'root', meta: { columns: 12 } },
        'header-detail': { id: 'header-detail', type: 'header', children: [], parentId: 'grid-main', meta: { text: 'Detail Header', headerSize: 'large' } },
      },
      rootNodeId: 'root',
      widgets: [],
    },
  ],
};

describe('SupersubsetDesigner', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the Puck editor', () => {
    render(React.createElement(SupersubsetDesigner, {}));
    expect(screen.getByTestId('puck-editor')).toBeDefined();
  });

  it('constrains the designer root to the requested height', () => {
    const { container } = render(
      React.createElement(SupersubsetDesigner, {
        height: '100%',
      })
    );

    const root = container.querySelector('[data-supersubset-designer-root="true"]') as HTMLDivElement | null;
    expect(root).not.toBeNull();
    expect(root?.style.height).toBe('100%');
    expect(root?.style.overflow).toBe('hidden');
    expect(root?.style.display).toBe('flex');
  });

  it('passes headerTitle from props', () => {
    render(
      React.createElement(SupersubsetDesigner, {
        headerTitle: 'My Editor',
      })
    );
    const editor = screen.getByTestId('puck-editor');
    expect(editor.getAttribute('data-header-title')).toBe('My Editor');
  });

  it('passes headerTitle from dashboard value', () => {
    render(
      React.createElement(SupersubsetDesigner, {
        value: minimalDashboard,
      })
    );
    const editor = screen.getByTestId('puck-editor');
    expect(editor.getAttribute('data-header-title')).toBe('Test Dashboard');
  });

  it('wires onPublish callback', () => {
    const onPublish = vi.fn();
    render(
      React.createElement(SupersubsetDesigner, { onPublish })
    );
    const editor = screen.getByTestId('puck-editor');
    expect(editor.getAttribute('data-has-on-publish')).toBe('true');
  });

  it('wires onChange callback', () => {
    const onChange = vi.fn();
    render(
      React.createElement(SupersubsetDesigner, {
        value: minimalDashboard,
        onChange,
      })
    );
    const editor = screen.getByTestId('puck-editor');
    expect(editor.getAttribute('data-has-on-change')).toBe('true');
  });

  it('renders without value (uncontrolled mode)', () => {
    render(
      React.createElement(SupersubsetDesigner, {
        onPublish: vi.fn(),
      })
    );
    const editor = screen.getByTestId('puck-editor');
    expect(editor.getAttribute('data-header-title')).toBe('Supersubset Designer');
  });

  it('uses defaultValue when provided', () => {
    render(
      React.createElement(SupersubsetDesigner, {
        defaultValue: { ...minimalDashboard, title: 'Default Title' },
      })
    );
    const editor = screen.getByTestId('puck-editor');
    expect(editor.getAttribute('data-header-title')).toBe('Default Title');
  });

  it('passes renamed sidebar plugins (Components + Layers)', () => {
    render(React.createElement(SupersubsetDesigner, {}));
    const editor = screen.getByTestId('puck-editor');
    expect(editor.getAttribute('data-plugin-labels')).toBe('Components,Layers');
  });

  it('renders headerActions in the header override', () => {
    render(
      React.createElement(SupersubsetDesigner, {
        headerActions: React.createElement('button', { 'data-testid': 'custom-action' }, 'Save'),
      })
    );
    expect(screen.getByTestId('custom-action')).toBeDefined();
    expect(screen.getByTestId('custom-action').textContent).toBe('Save');
    // Default actions should also be present (from the override wrapper)
    expect(screen.getByTestId('default-actions')).toBeDefined();
  });

  it('renders default actions even without headerActions', () => {
    render(React.createElement(SupersubsetDesigner, {}));
    // headerActions is undefined, but the override still renders children
    expect(screen.getByTestId('default-actions')).toBeDefined();
  });

  it('decorates the Puck viewport zoom control for accessibility', async () => {
    render(React.createElement(SupersubsetDesigner, {}));

    const zoomSelect = screen.getByTestId('mock-viewport-zoom');
    await waitFor(() => {
      expect(zoomSelect.getAttribute('aria-label')).toBe('Viewport zoom');
    });

    expect(zoomSelect.getAttribute('id')).toMatch(/^ss-puck-viewport-zoom-/);
    expect(zoomSelect.getAttribute('name')).toMatch(/^viewportZoom-/);
  });

  it('renders page tabs for multi-page dashboards and switches the edited page', () => {
    render(
      React.createElement(SupersubsetDesigner, {
        value: multiPageDashboard,
      })
    );

    expect(screen.getByTestId('designer-page-tab-page-overview')).toBeDefined();
    expect(screen.getByTestId('designer-page-tab-page-detail')).toBeDefined();
    expect(screen.getByTestId('puck-editor').getAttribute('data-content-ids')).toContain('header-overview');

    fireEvent.click(screen.getByTestId('designer-page-tab-page-detail'));

    expect(screen.getByTestId('puck-editor').getAttribute('data-content-ids')).toContain('header-detail');
  });

  it('adds a page and emits the next dashboard in controlled mode', () => {
    const onChange = vi.fn();

    render(
      React.createElement(SupersubsetDesigner, {
        value: minimalDashboard,
        onChange,
      })
    );

    fireEvent.click(screen.getByTestId('designer-page-add'));

    expect(onChange).toHaveBeenCalledTimes(1);
    const nextDashboard = onChange.mock.calls[0]?.[0] as DashboardDefinition;
    expect(nextDashboard.pages).toHaveLength(2);
    expect(nextDashboard.pages[1]?.title).toBe('Page 2');
    expect(nextDashboard.defaults?.activePage).toBe(nextDashboard.pages[1]?.id);
  });

  it('edits the dashboard title from the header controls', () => {
    const onChange = vi.fn();

    render(
      React.createElement(SupersubsetDesigner, {
        value: minimalDashboard,
        onChange,
      })
    );

    const titleInput = screen.getByTestId('designer-dashboard-title-input');
    fireEvent.change(titleInput, { target: { value: 'Executive Dashboard' } });
    fireEvent.blur(titleInput);

    expect(onChange).toHaveBeenCalledTimes(1);
    const nextDashboard = onChange.mock.calls[0]?.[0] as DashboardDefinition;
    expect(nextDashboard.title).toBe('Executive Dashboard');
  });

  it('adds, renames, and deletes pages in uncontrolled mode', () => {
    render(
      React.createElement(SupersubsetDesigner, {
        defaultValue: multiPageDashboard,
      })
    );

    fireEvent.click(screen.getByTestId('designer-page-add'));
    expect(screen.getByTestId('designer-page-tab-page-3')).toBeDefined();

    const titleInput = screen.getByTestId('designer-page-title-input');
    fireEvent.change(titleInput, { target: { value: 'Regional Detail' } });
    fireEvent.blur(titleInput);

    expect(screen.getByRole('button', { name: 'Regional Detail' })).toBeDefined();

    fireEvent.click(screen.getByTestId('designer-page-delete-trigger-page-3'));
    expect(screen.getByTestId('designer-page-delete-prompt').textContent).toContain('Regional Detail');
    fireEvent.click(screen.getByTestId('designer-page-delete-confirm'));

    expect(screen.queryByRole('button', { name: 'Regional Detail' })).toBeNull();
    expect(screen.getByTestId('designer-page-tab-page-overview')).toBeDefined();
    expect(screen.getByTestId('designer-page-tab-page-detail')).toBeDefined();
  });

  it('deletes the specifically targeted page without switching selection first', () => {
    render(
      React.createElement(SupersubsetDesigner, {
        defaultValue: multiPageDashboard,
      })
    );

    expect(screen.getByTestId('puck-editor').getAttribute('data-content-ids')).toContain('header-overview');

    fireEvent.click(screen.getByTestId('designer-page-delete-trigger-page-detail'));
    expect(screen.getByTestId('designer-page-delete-prompt').textContent).toContain('Detail');
    fireEvent.click(screen.getByTestId('designer-page-delete-confirm'));

    expect(screen.queryByRole('button', { name: 'Detail' })).toBeNull();
    expect(screen.getByTestId('designer-page-tab-page-overview')).toBeDefined();
    expect(screen.getByTestId('puck-editor').getAttribute('data-content-ids')).toContain('header-overview');
  });
});
