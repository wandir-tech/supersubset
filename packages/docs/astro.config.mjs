import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  integrations: [
    starlight({
      title: 'Supersubset Docs',
      description: 'End-user documentation for Supersubset dashboard authors',
      logo: {
        dark: './src/assets/logo-dark.svg',
        light: './src/assets/logo-light.svg',
        replacesTitle: false,
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/supersubset/supersubset' },
      ],
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', slug: 'getting-started/introduction' },
            { label: 'Your First Dashboard', slug: 'getting-started/first-dashboard' },
          ],
        },
        {
          label: 'Chart Types',
          items: [
            { label: 'Overview', slug: 'chart-types/overview' },
            { label: 'Line Chart', slug: 'chart-types/line-chart' },
            { label: 'Bar Chart', slug: 'chart-types/bar-chart' },
            { label: 'Area Chart', slug: 'chart-types/area-chart' },
            { label: 'Pie Chart', slug: 'chart-types/pie-chart' },
            { label: 'Scatter Chart', slug: 'chart-types/scatter-chart' },
            { label: 'Radar Chart', slug: 'chart-types/radar-chart' },
            { label: 'Funnel Chart', slug: 'chart-types/funnel-chart' },
            { label: 'Gauge', slug: 'chart-types/gauge' },
            { label: 'Heatmap', slug: 'chart-types/heatmap' },
            { label: 'Sankey Diagram', slug: 'chart-types/sankey' },
            { label: 'Treemap', slug: 'chart-types/treemap' },
            { label: 'Waterfall Chart', slug: 'chart-types/waterfall' },
            { label: 'Box Plot', slug: 'chart-types/box-plot' },
            { label: 'Combo Chart', slug: 'chart-types/combo-chart' },
          ],
        },
        {
          label: 'Widgets',
          items: [
            { label: 'KPI Card', slug: 'widgets/kpi-card' },
            { label: 'Table', slug: 'widgets/table' },
            { label: 'Markdown', slug: 'widgets/markdown' },
            { label: 'Alerts', slug: 'widgets/alerts' },
          ],
        },
        {
          label: 'Layout',
          items: [
            { label: 'Grid', slug: 'layout/grid' },
            { label: 'Rows & Columns', slug: 'layout/rows-columns' },
            { label: 'Tabs', slug: 'layout/tabs' },
            { label: 'Header', slug: 'layout/header' },
            { label: 'Divider', slug: 'layout/divider' },
          ],
        },
        {
          label: 'Filters',
          items: [
            { label: 'Select Filter', slug: 'filters/select-filter' },
            { label: 'Date Filter', slug: 'filters/date-filter' },
            { label: 'Filter Scope', slug: 'filters/filter-scope' },
            { label: 'Cross-Filtering', slug: 'filters/cross-filtering' },
          ],
        },
        {
          label: 'Interactions',
          items: [
            { label: 'Click Actions', slug: 'interactions/click-actions' },
            { label: 'Drill-Down', slug: 'interactions/drill-down' },
          ],
        },
        {
          label: 'Pages & Navigation',
          items: [
            { label: 'Multi-Page Dashboards', slug: 'pages/multi-page' },
            { label: 'Page Navigation', slug: 'pages/navigation' },
          ],
        },
        {
          label: 'Import & Export',
          items: [
            { label: 'JSON Export', slug: 'import-export/json-export' },
            { label: 'Import', slug: 'import-export/import' },
            { label: 'Code View', slug: 'import-export/code-view' },
          ],
        },
      ],
    }),
  ],
});
