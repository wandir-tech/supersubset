/**
 * Storybook stories for the ImportExportPanel component.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { ImportExportPanel } from '../components/ImportExportPanel';
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
        {
          id: 'kpi-1',
          type: 'kpi-card',
          title: 'Revenue',
          config: {},
        },
      ],
      layout: { type: 'flow', children: ['kpi-1'] },
    },
  ],
};

const meta: Meta<typeof ImportExportPanel> = {
  title: 'Designer/ImportExportPanel',
  component: ImportExportPanel,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof ImportExportPanel>;

export const Default: Story = {
  args: {
    dashboard: sampleDashboard,
    onImport: (d) => console.log('Imported:', d.title),
  },
};
