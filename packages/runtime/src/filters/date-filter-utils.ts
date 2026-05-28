import type { QueryFilter, QueryFilterOperator } from '@supersubset/data-model';
import {
  DATE_PRESETS,
  generateWeeklyDateRangeOptions,
  isDateRangeLike,
  normalizeRangeBound,
  resolveRelativeDate,
  type DateRangeValue,
  type WeeklyDateRangeOption,
  type FilterDefinition,
} from '@supersubset/schema';

export {
  DATE_PRESETS,
  generateWeeklyDateRangeOptions,
  isDateRangeLike,
  resolveRelativeDate,
  type DateRangeValue,
  type WeeklyDateRangeOption,
};

const DIRECT_QUERY_OPERATORS = new Set<QueryFilterOperator>([
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

export function compileFilterDefinitionValue(
  definition: FilterDefinition,
  value: unknown,
): QueryFilter | null {
  if (value == null) {
    return null;
  }

  if (Array.isArray(value)) {
    const values = value.filter((entry) => entry != null && entry !== '');
    if (values.length === 0) {
      return null;
    }

    return {
      fieldId: definition.fieldRef,
      operator: definition.operator === 'not_in' ? 'not_in' : 'in',
      value: values,
    };
  }

  if (isDateRangeLike(value)) {
    return compileRangeLikeValue(definition.fieldRef, value);
  }

  if (isDatePresetValue(value)) {
    const resolved = resolveRelativeDate(value.preset, new Date(), definition.dateConfig);

    return resolved ? compileRangeLikeValue(definition.fieldRef, resolved) : null;
  }

  if (typeof value === 'string' && value.length === 0) {
    return null;
  }

  const operator = normalizeFilterOperator(definition.operator);
  if (!operator) {
    return null;
  }

  return {
    fieldId: definition.fieldRef,
    operator,
    ...(operator === 'is_null' || operator === 'is_not_null' ? {} : { value }),
  };
}

function isDatePresetValue(value: unknown): value is { preset: string } {
  if (typeof value !== 'object' || value === null || !('preset' in value)) {
    return false;
  }

  return typeof (value as { preset?: unknown }).preset === 'string';
}

function compileRangeLikeValue(fieldId: string, value: DateRangeValue): QueryFilter | null {
  const lower = normalizeRangeBound(value.start ?? value.min);
  const upper = normalizeRangeBound(value.end ?? value.max);

  if (lower == null && upper == null) {
    return null;
  }

  if (lower != null && upper != null) {
    return {
      fieldId,
      operator: 'between',
      value: [lower, upper],
    };
  }

  return {
    fieldId,
    operator: lower != null ? 'gte' : 'lte',
    value: lower ?? upper,
  };
}

function normalizeFilterOperator(operator: string): QueryFilterOperator | null {
  if (DIRECT_QUERY_OPERATORS.has(operator as QueryFilterOperator)) {
    return operator as QueryFilterOperator;
  }

  switch (operator) {
    case 'equals':
      return 'eq';
    case 'not_equals':
      return 'neq';
    case 'contains':
      return 'like';
    case 'not_contains':
      return 'not_like';
    default:
      return null;
  }
}
