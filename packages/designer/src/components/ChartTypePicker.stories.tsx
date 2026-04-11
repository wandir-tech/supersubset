/**
 * Storybook stories for the ChartTypePicker component.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { ChartTypePicker } from '../components/ChartTypePicker';

const meta: Meta<typeof ChartTypePicker> = {
  title: 'Designer/ChartTypePicker',
  component: ChartTypePicker,
  parameters: { layout: 'padded' },
  argTypes: {
    value: { control: 'text' },
    compact: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof ChartTypePicker>;

export const Default: Story = {
  args: {
    onChange: (type: string) => console.log('Selected:', type),
  },
};

export const WithSelection: Story = {
  args: {
    value: 'bar-chart',
    onChange: (type: string) => console.log('Selected:', type),
  },
};

export const Compact: Story = {
  args: {
    compact: true,
    onChange: (type: string) => console.log('Selected:', type),
  },
};

export const LimitedTypes: Story = {
  args: {
    allowedTypes: ['line-chart', 'bar-chart', 'pie-chart', 'scatter-chart'],
    onChange: (type: string) => console.log('Selected:', type),
  },
};
