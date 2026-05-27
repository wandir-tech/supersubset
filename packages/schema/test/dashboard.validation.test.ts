import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import {
  dashboardDefinitionSchema,
  validatedWidgetDefinitionSchema,
  widgetDefinitionSchema,
} from '../src/validation';

function createAlertsWidget(alertRule: Record<string, unknown>) {
  return {
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
  };
}

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
        widgets: [createAlertsWidget(alertRule)],
      },
    ],
  };
}

describe('dashboardDefinitionSchema alert rules', () => {
  it('keeps widgetDefinitionSchema chainable for sub-schema consumers', () => {
    const extendedWidgetSchema = widgetDefinitionSchema.extend({
      note: z.string().optional(),
    });

    const result = extendedWidgetSchema.safeParse({
      id: 'widget-1',
      type: 'kpi-card',
      config: {},
      note: 'consumer metadata',
    });

    expect(result.success).toBe(true);
  });

  it('[navigation-and-alerts.ALERT_RULES.1] accepts structured alert rules on alerts widgets', () => {
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

  it('keeps a validated widget schema for direct alerts-widget parsing', () => {
    const result = validatedWidgetDefinitionSchema.safeParse(
      createAlertsWidget({
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

  it('[navigation-and-alerts.ALERT_RULES.2] rejects malformed structured alert rules on alerts widgets', () => {
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

  it('[navigation-and-alerts.ALERT_RULES.3] rejects unknown keys in structured alert rules on alerts widgets', () => {
    const result = dashboardDefinitionSchema.safeParse(
      createAlertsDashboard({
        mode: 'structured',
        metricFieldRef: 'revenue',
        aggregation: 'sum',
        operator: 'gte',
        threshold: 1000,
        unexpected: 'stale-field',
        alert: {
          title: 'Revenue threshold breached',
          message: 'Revenue crossed the configured threshold.',
          severity: 'warning',
        },
      }),
    );

    expect(result.success).toBe(false);
    expect(
      result.success
        ? false
        : result.error.issues.some(
            (issue) => issue.path.join('.') === 'pages.0.widgets.0.config.alertRule',
          ),
    ).toBe(true);
  });
});
