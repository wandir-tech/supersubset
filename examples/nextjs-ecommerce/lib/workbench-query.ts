import type {
  AggregationType,
  LogicalQuery,
  NormalizedField,
  QueryFilter,
  QueryResult,
  QueryResultColumn,
} from '@supersubset/data-model';
import { shipmentPerformanceRows, type ShipmentPerformanceRow } from './workbench-data';
import { WORKBENCH_DATASET_ID, workbenchDatasets } from './workbench-shared';

function getDatasetField(fieldId: string): NormalizedField | undefined {
  return workbenchDatasets[0]?.fields.find((field) => field.id === fieldId);
}

function comparePrimitive(left: unknown, right: unknown): number {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  return String(left).localeCompare(String(right));
}

function matchesFilter(row: ShipmentPerformanceRow, filter: QueryFilter): boolean {
  const value = row[filter.fieldId as keyof ShipmentPerformanceRow];

  switch (filter.operator) {
    case 'eq':
      return value === filter.value;
    case 'in':
      return Array.isArray(filter.value) ? filter.value.includes(value) : false;
    case 'gte':
      return comparePrimitive(value, filter.value) >= 0;
    case 'lte':
      return comparePrimitive(value, filter.value) <= 0;
    case 'between': {
      if (Array.isArray(filter.value)) {
        const [start, end] = filter.value;
        const lower = start == null || comparePrimitive(value, start) >= 0;
        const upper = end == null || comparePrimitive(value, end) <= 0;
        return lower && upper;
      }

      if (filter.value && typeof filter.value === 'object') {
        const range = filter.value as { start?: unknown; end?: unknown };
        const lower = range.start == null || comparePrimitive(value, range.start) >= 0;
        const upper = range.end == null || comparePrimitive(value, range.end) <= 0;
        return lower && upper;
      }

      return true;
    }
    default:
      return true;
  }
}

function applyFilters(rows: ShipmentPerformanceRow[], filters: QueryFilter[] | undefined) {
  if (!filters || filters.length === 0) {
    return rows;
  }

  return rows.filter((row) => filters.every((filter) => matchesFilter(row, filter)));
}

function aggregateRows(
  rows: ShipmentPerformanceRow[],
  fieldId: keyof ShipmentPerformanceRow,
  aggregation: AggregationType,
): number {
  if (aggregation === 'count') {
    return rows.length;
  }

  if (aggregation === 'count_distinct') {
    return new Set(rows.map((row) => row[fieldId])).size;
  }

  const numericValues = rows
    .map((row) => row[fieldId])
    .filter((value): value is number => typeof value === 'number');

  if (numericValues.length === 0) {
    return 0;
  }

  switch (aggregation) {
    case 'avg':
      return Number(
        (numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length).toFixed(2),
      );
    case 'min':
      return Math.min(...numericValues);
    case 'max':
      return Math.max(...numericValues);
    case 'none':
      return numericValues[0] ?? 0;
    case 'sum':
    default:
      return Number(numericValues.reduce((sum, value) => sum + value, 0).toFixed(2));
  }
}

function buildColumns(query: LogicalQuery): QueryResultColumn[] {
  return query.fields.map((field) => {
    const sourceField = getDatasetField(field.fieldId);
    return {
      fieldId: field.alias ?? field.fieldId,
      label: sourceField?.label ?? field.alias ?? field.fieldId,
      dataType: sourceField?.dataType ?? 'unknown',
    };
  });
}

function sortRows(rows: Record<string, unknown>[], query: LogicalQuery): Record<string, unknown>[] {
  if (query.sort && query.sort.length > 0) {
    return [...rows].sort((left, right) => {
      for (const rule of query.sort ?? []) {
        const direction = rule.direction === 'desc' ? -1 : 1;
        const diff = comparePrimitive(left[rule.fieldId], right[rule.fieldId]);
        if (diff !== 0) {
          return diff * direction;
        }
      }
      return 0;
    });
  }

  return rows;
}

export function executeWorkbenchQuery(query: LogicalQuery): QueryResult {
  if (query.datasetId !== WORKBENCH_DATASET_ID) {
    throw new Error(`Unknown dataset: ${query.datasetId}`);
  }

  const filteredRows = applyFilters(shipmentPerformanceRows, query.filters);
  const dimensions = query.fields.filter(
    (field) => !field.aggregation || field.aggregation === 'none',
  );
  const measures = query.fields.filter(
    (field) => field.aggregation && field.aggregation !== 'none',
  );
  let rows: Record<string, unknown>[];

  if (measures.length === 0) {
    rows = filteredRows.map((row) => {
      const projected: Record<string, unknown> = {};
      for (const field of dimensions) {
        projected[field.alias ?? field.fieldId] =
          row[field.fieldId as keyof ShipmentPerformanceRow];
      }
      return projected;
    });
  } else {
    const groups = new Map<string, ShipmentPerformanceRow[]>();

    for (const row of filteredRows) {
      const key = JSON.stringify(
        dimensions.map((field) => row[field.fieldId as keyof ShipmentPerformanceRow]),
      );
      const next = groups.get(key);
      if (next) {
        next.push(row);
      } else {
        groups.set(key, [row]);
      }
    }

    rows = Array.from(groups.entries()).map(([key, groupRows]) => {
      const values = JSON.parse(key) as unknown[];
      const projected: Record<string, unknown> = {};

      dimensions.forEach((field, index) => {
        projected[field.alias ?? field.fieldId] = values[index];
      });

      measures.forEach((field) => {
        projected[field.alias ?? field.fieldId] = aggregateRows(
          groupRows,
          field.fieldId as keyof ShipmentPerformanceRow,
          field.aggregation ?? 'sum',
        );
      });

      return projected;
    });
  }

  const sortedRows = sortRows(rows, query);
  const offset = query.offset ?? 0;
  const limit = query.limit ?? sortedRows.length;
  const slicedRows = sortedRows.slice(offset, offset + limit);

  return {
    columns: buildColumns(query),
    rows: slicedRows,
    totalRows: sortedRows.length,
  };
}
