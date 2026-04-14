/**
 * Storybook stories for the CodeViewPanel component.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { CodeViewPanel } from '../components/CodeViewPanel';
import type { DashboardDefinition } from '@supersubset/schema';

const sampleDashboard: DashboardDefinition = {
  id: 'demo-dashboard',
  schemaVersion: '1.0',
  title: 'Sales Overview',
  pages: [
    {
      id: 'page-1',
      title: 'Overview',
      rootNodeId: 'root-1',
      widgets: [
        { id: 'kpi-1', type: 'kpi-card', title: 'Revenue', config: {} },
        { id: 'chart-1', type: 'line-chart', title: 'Trend', config: {} },
      ],
      layout: {
        'root-1': { id: 'root-1', type: 'root', children: ['grid-1'], meta: {} },
        'grid-1': { id: 'grid-1', type: 'grid', children: ['w-kpi-1', 'w-chart-1'], parentId: 'root-1', meta: {} },
        'w-kpi-1': { id: 'w-kpi-1', type: 'widget', children: [], parentId: 'grid-1', meta: { widgetRef: 'kpi-1' } },
        'w-chart-1': { id: 'w-chart-1', type: 'widget', children: [], parentId: 'grid-1', meta: { widgetRef: 'chart-1' } },
      },
    },
    {
      id: 'page-2',
      title: 'Details',
      rootNodeId: 'root-2',
      widgets: [
        { id: 'table-1', type: 'table', title: 'Orders', config: {} },
      ],
      layout: {
        'root-2': { id: 'root-2', type: 'root', children: ['grid-2'], meta: {} },
        'grid-2': { id: 'grid-2', type: 'grid', children: ['w-table-1'], parentId: 'root-2', meta: {} },
        'w-table-1': { id: 'w-table-1', type: 'widget', children: [], parentId: 'grid-2', meta: { widgetRef: 'table-1' } },
      },
    },
  ],
};

const meta: Meta<typeof CodeViewPanel> = {
  title: 'Designer/CodeViewPanel',
  component: CodeViewPanel,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof CodeViewPanel>;

export const Default: Story = {
  args: {
    dashboard: sampleDashboard,
  },
};

export const FixedHeight: Story = {
  args: {
    dashboard: sampleDashboard,
    height: '400px',
  },
};
