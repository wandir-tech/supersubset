/**
 * @supersubset/cli — Schema Import CLI.
 *
 * Reads schema from various sources (Prisma, SQL, JSON, dbt) and
 * outputs a starter DashboardDefinition.
 */

import type {
  DashboardDefinition,
  PageDefinition,
  WidgetDefinition,
  LayoutMap,
} from '@supersubset/schema';
import { CURRENT_SCHEMA_VERSION } from '@supersubset/schema';
import type { NormalizedDataset, NormalizedField } from '@supersubset/data-model';
import { humanizeFieldName } from '@supersubset/data-model';
import { PrismaAdapter } from '@supersubset/adapter-prisma';
import { SqlAdapter } from '@supersubset/adapter-sql';
import { JsonAdapter } from '@supersubset/adapter-json';
import { DbtAdapter } from '@supersubset/adapter-dbt';

// ─── Public Types ────────────────────────────────────────────

export interface ImportSchemaOptions {
  /** Source type: prisma | sql | json | dbt */
  sourceType: 'prisma' | 'sql' | 'json' | 'dbt';
  /** Raw source data (file content string, or parsed JSON object) */
  source: string | object;
  /** Dashboard title (defaults to "Imported Dashboard") */
  title?: string;
  /** Dashboard ID (defaults to generated) */
  id?: string;
}

export interface ImportSchemaResult {
  /** The generated DashboardDefinition */
  dashboard: DashboardDefinition;
  /** Metadata about the import */
  datasets: NormalizedDataset[];
  /** Summary stats */
  stats: {
    datasetsCount: number;
    fieldsCount: number;
    widgetsGenerated: number;
  };
}

// ─── Helpers ─────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function hasFieldWithRole(fields: NormalizedField[], role: string): boolean {
  return fields.some((f) => f.role === role);
}

function getFieldsWithRole(fields: NormalizedField[], role: string): NormalizedField[] {
  return fields.filter((f) => f.role === role);
}

// ─── Widget Generation ───────────────────────────────────────

function generateWidgets(dataset: NormalizedDataset): WidgetDefinition[] {
  const widgets: WidgetDefinition[] = [];
  const slug = slugify(dataset.label);
  const measures = getFieldsWithRole(dataset.fields, 'measure');
  const dimensions = getFieldsWithRole(dataset.fields, 'dimension');
  const timeFields = getFieldsWithRole(dataset.fields, 'time');

  // Time + measure → Line Chart
  if (timeFields.length > 0 && measures.length > 0) {
    const timeField = timeFields[0];
    const measure = measures[0];
    widgets.push({
      id: `widget-${slug}-line`,
      type: 'line-chart',
      title: `${humanizeFieldName(measure.id)} over ${humanizeFieldName(timeField.id)}`,
      config: {
        xField: timeField.id,
        yField: measure.id,
        datasetRef: dataset.id,
      },
    });
  }

  // Dimension + measure → Bar Chart
  if (dimensions.length > 0 && measures.length > 0) {
    const dimension = dimensions[0];
    const measure = measures[0];
    widgets.push({
      id: `widget-${slug}-bar`,
      type: 'bar-chart',
      title: `${humanizeFieldName(measure.id)} by ${humanizeFieldName(dimension.id)}`,
      config: {
        xField: dimension.id,
        yField: measure.id,
        datasetRef: dataset.id,
      },
    });
  }

  // Any measure → KPI Card for first measure
  if (measures.length > 0) {
    const measure = measures[0];
    widgets.push({
      id: `widget-${slug}-kpi`,
      type: 'kpi-card',
      title: humanizeFieldName(measure.id),
      config: {
        field: measure.id,
        aggregation: measure.defaultAggregation ?? 'sum',
        datasetRef: dataset.id,
      },
    });
  }

  // Always add a Table widget
  widgets.push({
    id: `widget-${slug}-table`,
    type: 'table',
    title: `${dataset.label} Table`,
    config: {
      columns: dataset.fields.map((f) => f.id),
      datasetRef: dataset.id,
    },
  });

  return widgets;
}

// ─── Page Generation ─────────────────────────────────────────

function generatePage(dataset: NormalizedDataset): PageDefinition {
  const slug = slugify(dataset.label);
  const widgets = generateWidgets(dataset);
  const widgetIds = widgets.map((w) => w.id);

  const layout: LayoutMap = {
    root: {
      id: 'root',
      type: 'root',
      children: ['grid-main'],
      meta: {},
    },
    'grid-main': {
      id: 'grid-main',
      type: 'grid',
      children: widgetIds,
      parentId: 'root',
      meta: { columns: 12 },
    },
  };

  return {
    id: `page-${slug}`,
    title: dataset.label,
    layout,
    rootNodeId: 'root',
    widgets,
  };
}

// ─── Main Import Function ────────────────────────────────────

async function getDatasets(options: ImportSchemaOptions): Promise<NormalizedDataset[]> {
  switch (options.sourceType) {
    case 'prisma': {
      const adapter = new PrismaAdapter();
      return adapter.getDatasets(options.source as string);
    }
    case 'sql': {
      const adapter = new SqlAdapter();
      const source = typeof options.source === 'string'
        ? JSON.parse(options.source)
        : options.source;
      return adapter.getDatasets(source);
    }
    case 'json': {
      const adapter = new JsonAdapter();
      const source = typeof options.source === 'string'
        ? JSON.parse(options.source)
        : options.source;
      return adapter.getDatasets(source);
    }
    case 'dbt': {
      const adapter = new DbtAdapter();
      const source = typeof options.source === 'string'
        ? JSON.parse(options.source)
        : options.source;
      return adapter.getDatasets(source);
    }
    default:
      throw new Error(`Unsupported source type: ${options.sourceType as string}`);
  }
}

export async function importSchema(options: ImportSchemaOptions): Promise<ImportSchemaResult> {
  const datasets = await getDatasets(options);

  const pages = datasets.map(generatePage);
  const totalWidgets = pages.reduce((sum, p) => sum + p.widgets.length, 0);
  const totalFields = datasets.reduce((sum, ds) => sum + ds.fields.length, 0);

  const dashboard: DashboardDefinition = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: options.id ?? `dashboard-${slugify(options.title ?? 'imported')}`,
    title: options.title ?? 'Imported Dashboard',
    pages,
  };

  return {
    dashboard,
    datasets,
    stats: {
      datasetsCount: datasets.length,
      fieldsCount: totalFields,
      widgetsGenerated: totalWidgets,
    },
  };
}
