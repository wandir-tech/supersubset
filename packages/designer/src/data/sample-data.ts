/**
 * Sample data provider for chart previews in the designer.
 * Provides deterministic, realistic-looking data for each widget type.
 *
 * Usage:
 *   const data = getSampleData('line-chart');
 *   // → { data: [...], columns?: [...] }
 */

export interface SampleDataSet {
  data: Record<string, unknown>[];
  columns?: Array<{ key: string; title: string }>;
}

/**
 * Get sample data for a given widget type.
 * Returns null if no sample data is defined for the type.
 */
export function getSampleData(widgetType: string): SampleDataSet | null {
  switch (widgetType) {
    case 'line-chart':
    case 'area-chart':
      return {
        data: [
          { month: 'Jan', revenue: 120, orders: 55 },
          { month: 'Feb', revenue: 150, orders: 62 },
          { month: 'Mar', revenue: 180, orders: 78 },
          { month: 'Apr', revenue: 140, orders: 65 },
          { month: 'May', revenue: 200, orders: 85 },
          { month: 'Jun', revenue: 230, orders: 92 },
        ],
      };

    case 'bar-chart':
      return {
        data: [
          { category: 'Electronics', sales: 240, target: 200 },
          { category: 'Clothing', sales: 180, target: 200 },
          { category: 'Food', sales: 320, target: 300 },
          { category: 'Books', sales: 150, target: 180 },
          { category: 'Sports', sales: 280, target: 250 },
        ],
      };

    case 'pie-chart':
      return {
        data: [
          { category: 'Electronics', value: 35 },
          { category: 'Clothing', value: 25 },
          { category: 'Food', value: 20 },
          { category: 'Books', value: 12 },
          { category: 'Sports', value: 8 },
        ],
      };

    case 'scatter-chart':
      return {
        data: [
          { x: 15, y: 42, size: 12, group: 'North' },
          { x: 28, y: 65, size: 8, group: 'South' },
          { x: 45, y: 30, size: 15, group: 'East' },
          { x: 55, y: 72, size: 10, group: 'West' },
          { x: 70, y: 55, size: 20, group: 'North' },
          { x: 35, y: 48, size: 6, group: 'South' },
          { x: 62, y: 38, size: 14, group: 'East' },
          { x: 80, y: 60, size: 18, group: 'West' },
          { x: 22, y: 75, size: 9, group: 'North' },
          { x: 50, y: 20, size: 11, group: 'South' },
        ],
      };

    case 'combo-chart':
      return {
        data: [
          { month: 'Jan', bar: 120, line: 100 },
          { month: 'Feb', bar: 150, line: 130 },
          { month: 'Mar', bar: 180, line: 160 },
          { month: 'Apr', bar: 140, line: 150 },
          { month: 'May', bar: 200, line: 180 },
          { month: 'Jun', bar: 170, line: 190 },
        ],
      };

    case 'heatmap':
      return {
        data: [
          { x: 'Jan', y: 'North', value: 45 },
          { x: 'Jan', y: 'South', value: 72 },
          { x: 'Jan', y: 'East', value: 30 },
          { x: 'Jan', y: 'West', value: 58 },
          { x: 'Feb', y: 'North', value: 62 },
          { x: 'Feb', y: 'South', value: 48 },
          { x: 'Feb', y: 'East', value: 80 },
          { x: 'Feb', y: 'West', value: 35 },
          { x: 'Mar', y: 'North', value: 55 },
          { x: 'Mar', y: 'South', value: 90 },
          { x: 'Mar', y: 'East', value: 42 },
          { x: 'Mar', y: 'West', value: 68 },
        ],
      };

    case 'radar-chart':
      return {
        data: [
          { indicator: 'Speed', valueA: 80, valueB: 60 },
          { indicator: 'Strength', valueA: 60, valueB: 80 },
          { indicator: 'Defense', valueA: 90, valueB: 50 },
          { indicator: 'Magic', valueA: 40, valueB: 85 },
          { indicator: 'Agility', valueA: 70, valueB: 65 },
          { indicator: 'Luck', valueA: 55, valueB: 70 },
        ],
      };

    case 'funnel-chart':
      return {
        data: [
          { stage: 'Visits', value: 1000 },
          { stage: 'Sign-ups', value: 600 },
          { stage: 'Trials', value: 300 },
          { stage: 'Purchases', value: 150 },
          { stage: 'Renewals', value: 80 },
        ],
      };

    case 'treemap':
      return {
        data: [
          { name: 'Electronics', value: 450 },
          { name: 'Clothing', value: 320 },
          { name: 'Food', value: 280 },
          { name: 'Books', value: 190 },
          { name: 'Sports', value: 160 },
        ],
      };

    case 'sankey':
      return {
        data: [
          { source: 'Web', target: 'Sign Up', value: 100 },
          { source: 'Mobile', target: 'Sign Up', value: 60 },
          { source: 'Sign Up', target: 'Trial', value: 120 },
          { source: 'Sign Up', target: 'Free', value: 40 },
          { source: 'Trial', target: 'Purchase', value: 80 },
          { source: 'Trial', target: 'Churn', value: 40 },
        ],
      };

    case 'waterfall':
      return {
        data: [
          { category: 'Revenue', value: 500 },
          { category: 'COGS', value: -200 },
          { category: 'Gross Profit', value: 300 },
          { category: 'OpEx', value: -150 },
          { category: 'Net Income', value: 150 },
        ],
      };

    case 'box-plot':
      return {
        data: [
          { category: 'Electronics', min: 12, q1: 35, median: 52, q3: 68, max: 88 },
          { category: 'Clothing', min: 18, q1: 30, median: 45, q3: 72, max: 90 },
          { category: 'Food', min: 25, q1: 40, median: 55, q3: 65, max: 82 },
          { category: 'Books', min: 10, q1: 28, median: 48, q3: 70, max: 95 },
          { category: 'Sports', min: 15, q1: 38, median: 58, q3: 75, max: 85 },
        ],
      };

    case 'gauge':
      return {
        data: [{ value: 72, target: 80 }],
      };

    case 'table':
      return {
        data: [
          { id: 1, product: 'Electronics', quantity: 42, price: 150, revenue: 6300 },
          { id: 2, product: 'Clothing', quantity: 78, price: 45, revenue: 3510 },
          { id: 3, product: 'Food', quantity: 95, price: 12, revenue: 1140 },
          { id: 4, product: 'Books', quantity: 33, price: 25, revenue: 825 },
          { id: 5, product: 'Sports', quantity: 56, price: 80, revenue: 4480 },
        ],
        columns: [
          { key: 'id', title: 'ID' },
          { key: 'product', title: 'Product' },
          { key: 'quantity', title: 'Qty' },
          { key: 'price', title: 'Price' },
          { key: 'revenue', title: 'Revenue' },
        ],
      };

    case 'kpi-card':
      return {
        data: [{ value: 12450, comparison: 11200, label: 'Revenue' }],
      };

    case 'alerts':
      return {
        data: [
          {
            alert_title: 'Payment retries elevated',
            alert_message: 'Checkout API retry volume is 8.2%, above the 3% operating threshold.',
            severity: 'warning',
            detected_at: '2026-04-11 09:12 UTC',
          },
          {
            alert_title: 'EU warehouse backlog cleared',
            alert_message: 'Fulfillment latency returned below 2 hours for the last 30 minutes.',
            severity: 'success',
            detected_at: '2026-04-11 08:45 UTC',
          },
          {
            alert_title: 'North America revenue feed delayed',
            alert_message: 'The daily ETL is 37 minutes late. Revenue visuals may lag fresh orders.',
            severity: 'danger',
            detected_at: '2026-04-11 08:21 UTC',
          },
          {
            alert_title: 'Q2 forecast refresh scheduled',
            alert_message: 'A model refresh is queued for 10:00 UTC after finance sign-off completes.',
            severity: 'info',
            detected_at: '2026-04-11 07:55 UTC',
          },
        ],
      };

    default:
      return null;
  }
}

/** All widget types that have sample data defined. */
export const SAMPLE_DATA_TYPES = [
  'line-chart', 'bar-chart', 'pie-chart', 'scatter-chart',
  'area-chart', 'combo-chart', 'heatmap', 'radar-chart',
  'funnel-chart', 'treemap', 'sankey', 'waterfall',
  'alerts',
  'box-plot', 'gauge', 'table', 'kpi-card',
] as const;
