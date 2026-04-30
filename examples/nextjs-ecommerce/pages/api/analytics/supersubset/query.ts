import type { NextApiRequest, NextApiResponse } from 'next';
import type { AggregationType, LogicalQuery, QueryFilterOperator } from '@supersubset/data-model';
import { requireWorkbenchAuthorization } from '../../../../lib/workbench-auth';
import { executeWorkbenchQuery } from '../../../../lib/workbench-query';

const VALID_AGGREGATIONS: ReadonlySet<AggregationType> = new Set([
  'sum',
  'avg',
  'count',
  'count_distinct',
  'min',
  'max',
  'none',
]);

const VALID_FILTER_OPERATORS: ReadonlySet<QueryFilterOperator> = new Set([
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'not_in',
  'like',
  'not_like',
  'is_null',
  'is_not_null',
  'between',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isQueryField(value: unknown): value is LogicalQuery['fields'][number] {
  if (!isRecord(value)) {
    return false;
  }

  if (typeof value.fieldId !== 'string' || value.fieldId.length === 0) {
    return false;
  }

  if (value.alias !== undefined && typeof value.alias !== 'string') {
    return false;
  }

  return (
    value.aggregation === undefined || VALID_AGGREGATIONS.has(value.aggregation as AggregationType)
  );
}

function isQueryFilter(value: unknown): value is NonNullable<LogicalQuery['filters']>[number] {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.fieldId === 'string' &&
    value.fieldId.length > 0 &&
    VALID_FILTER_OPERATORS.has(value.operator as QueryFilterOperator) &&
    Object.hasOwn(value, 'value')
  );
}

function isQuerySort(value: unknown): value is NonNullable<LogicalQuery['sort']>[number] {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.fieldId === 'string' &&
    value.fieldId.length > 0 &&
    (value.direction === 'asc' || value.direction === 'desc')
  );
}

function isLogicalQuery(value: unknown): value is LogicalQuery {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.datasetId === 'string' &&
    value.datasetId.length > 0 &&
    Array.isArray(value.fields) &&
    value.fields.length > 0 &&
    value.fields.every(isQueryField) &&
    (value.filters === undefined ||
      (Array.isArray(value.filters) && value.filters.every(isQueryFilter))) &&
    (value.sort === undefined || (Array.isArray(value.sort) && value.sort.every(isQuerySort))) &&
    (value.limit === undefined ||
      (typeof value.limit === 'number' && Number.isInteger(value.limit) && value.limit >= 0)) &&
    (value.offset === undefined ||
      (typeof value.offset === 'number' && Number.isInteger(value.offset) && value.offset >= 0))
  );
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method not allowed.' });
  }

  if (!requireWorkbenchAuthorization(req.headers.authorization)) {
    return res.status(401).json({ message: 'Unauthorized. Provide the local demo bearer token.' });
  }

  if (!isLogicalQuery(req.body)) {
    return res.status(400).json({ message: 'Bad request.' });
  }

  try {
    const result = executeWorkbenchQuery(req.body);
    return res.status(200).json(result);
  } catch {
    return res.status(400).json({ message: 'Bad request.' });
  }
}
