import { describe, expect, it } from 'vitest';
import { dashboardDefinitionSchema } from '../src/validation';

function createAlertsDashboard(alertRule: Record<string, unknown>) {
  return {
    schemaVersion: '0.2.0',
    id: 'dashboard-alert-rules',
    title: 'Alert Rules',
    pages: [
      {
        id: 'page-1',
        title: 'Overview',
        rootNodeId: 'root',
        layout: {
          root: { id: 'root', type: 'root', children: ['grid-1'], meta: {} },
          'grid-1': {
            id: 'grid-1',
            type: 'grid',
            parentId: 'root',
            children: ['widget-1'],
            meta: {},
          },
          'widget-1': {
            id: 'widget-1',
            type: 'widget',
            parentId: 'grid-1',
            children: [],
            meta: { widgetRef: 'alerts-1' },
          },
        },
        widgets: [
          {
            id: 'alerts-1',
            type: 'alerts',
            title: 'Revenue Watch',
            config: {
              alertRule,
            },
            dataBinding: {
              datasetRef: 'sales',
              fields: [],
            },
          },
        ],
      },
    ],
  };
}

describe('dashboardDefinitionSchema alert rules', () => {
  it('accepts structured alert rules on alerts widgets', () => {
    const result = dashboardDefinitionSchema.safeParse(
      createAlertsDashboard({
        mode: 'structured',
        metricFieldRef: 'revenue',
        aggregation: 'sum',
        operator: 'gte',
        threshold: 1000,
        alert: {
          title: 'Revenue threshold breached',
          message: 'Revenue crossed the configured threshold.',
          severity: 'warning',
        },
      }),
    );

    expect(result.success).toBe(true);
  });

  it('rejects malformed structured alert rules on alerts widgets', () => {
    const result = dashboardDefinitionSchema.safeParse(
      createAlertsDashboard({
        mode: 'structured',
        metricFieldRef: 'revenue',
        aggregation: 'sum',
        operator: 'contains',
        threshold: 1000,
        alert: {
          title: 'Revenue threshold breached',
          message: 'Revenue crossed the configured threshold.',
        },
      }),
    );

    expect(result.success).toBe(false);
    expect(
      result.success
        ? false
        : result.error.issues.some(
            (issue) => issue.path.join('.') === 'pages.0.widgets.0.config.alertRule.operator',
          ),
    ).toBe(true);
  });
});
