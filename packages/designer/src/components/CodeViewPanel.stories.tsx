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
      widgets: [
        { id: 'kpi-1', type: 'kpi-card', title: 'Revenue', config: {} },
        { id: 'chart-1', type: 'line-chart', title: 'Trend', config: {} },
      ],
      layout: { type: 'flow', children: ['kpi-1', 'chart-1'] },
    },
    {
      id: 'page-2',
      title: 'Details',
      widgets: [
        { id: 'table-1', type: 'table', title: 'Orders', config: {} },
      ],
      layout: { type: 'flow', children: ['table-1'] },
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
