import type { QueryFilter, QueryFilterOperator } from '@supersubset/data-model';
import type { DateFilterConfig, FilterDefinition } from '@supersubset/schema';

export const DATE_PRESETS: { value: string; label: string }[] = [
  { value: '', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This week' },
  { value: 'last_week', label: 'Last week' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'this_quarter', label: 'This quarter' },
  { value: 'last_quarter', label: 'Last quarter' },
  { value: 'this_year', label: 'This year' },
  { value: 'last_year', label: 'Last year' },
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'last_90_days', label: 'Last 90 days' },
  { value: 'last_365_days', label: 'Last 365 days' },
  { value: 'custom', label: 'Custom range…' },
];

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

export interface DateRangeValue {
  preset?: string;
  start?: string;
  end?: string;
  min?: number;
  max?: number;
}

export interface WeeklyDateRangeOption {
  value: string;
  label: string;
  start: string;
  end: string;
  offset: number;
}

function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function clampWeekday(value: unknown): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  return value === 0 ||
    value === 1 ||
    value === 2 ||
    value === 3 ||
    value === 4 ||
    value === 5 ||
    value === 6
    ? value
    : 0;
}

function coerceNonNegativeInteger(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : fallback;
}

function startOfWeek(date: Date, weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6): Date {
  const dayOffset = (date.getDay() - weekStartsOn + 7) % 7;
  return addDays(date, -dayOffset);
}

function formatDateLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function generateWeeklyDateRangeOptions(
  config: DateFilterConfig | undefined,
  now = new Date(),
): WeeklyDateRangeOption[] {
  const weekStartsOn = clampWeekday(config?.weekStartsOn);
  const weeksBack = coerceNonNegativeInteger(config?.weeksBack, 4);
  const weeksForward = coerceNonNegativeInteger(config?.weeksForward, 0);
  const includeCurrentWeek = config?.includeCurrentWeek !== false;
  const currentWeekStart = startOfWeek(startOfLocalDay(now), weekStartsOn);
  const options: WeeklyDateRangeOption[] = [];

  for (let offset = -weeksBack; offset <= weeksForward; offset += 1) {
    if (!includeCurrentWeek && offset === 0) {
      continue;
    }

    const start = addDays(currentWeekStart, offset * 7);
    const end = addDays(start, 6);
    const startIso = formatIsoDate(start);
    const endIso = formatIsoDate(end);

    options.push({
      value: `week:${startIso}:${endIso}`,
      label: `${formatDateLabel(startIso)} - ${formatDateLabel(endIso)}`,
      start: startIso,
      end: endIso,
      offset,
    });
  }

  return options;
}

/**
 * Resolve a relative date preset to a concrete { start, end } range.
 * Returns undefined for empty/unknown presets.
 */
export function resolveRelativeDate(
  preset: string,
  now = new Date(),
  config?: DateFilterConfig,
): { start: string; end: string } | undefined {
  const today = startOfLocalDay(now);
  const weekStartsOn = clampWeekday(config?.weekStartsOn);

  switch (preset) {
    case 'today':
      return { start: formatIsoDate(today), end: formatIsoDate(today) };
    case 'yesterday': {
      const d = addDays(today, -1);
      return { start: formatIsoDate(d), end: formatIsoDate(d) };
    }
    case 'this_week': {
      const start = startOfWeek(today, weekStartsOn);
      const end = config?.mode === 'weekly' ? addDays(start, 6) : today;
      return { start: formatIsoDate(start), end: formatIsoDate(end) };
    }
    case 'last_week': {
      const currentStart = startOfWeek(today, weekStartsOn);
      const start = addDays(currentStart, -7);
      const end = addDays(currentStart, -1);
      return { start: formatIsoDate(start), end: formatIsoDate(end) };
    }
    case 'this_month':
      return {
        start: formatIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
        end: formatIsoDate(today),
      };
    case 'last_month': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: formatIsoDate(start), end: formatIsoDate(end) };
    }
    case 'this_quarter': {
      const q = Math.floor(today.getMonth() / 3);
      return {
        start: formatIsoDate(new Date(today.getFullYear(), q * 3, 1)),
        end: formatIsoDate(today),
      };
    }
    case 'last_quarter': {
      const q = Math.floor(today.getMonth() / 3);
      const start = new Date(today.getFullYear(), (q - 1) * 3, 1);
      const end = new Date(today.getFullYear(), q * 3, 0);
      return { start: formatIsoDate(start), end: formatIsoDate(end) };
    }
    case 'this_year':
      return {
        start: formatIsoDate(new Date(today.getFullYear(), 0, 1)),
        end: formatIsoDate(today),
      };
    case 'last_year':
      return {
        start: formatIsoDate(new Date(today.getFullYear() - 1, 0, 1)),
        end: formatIsoDate(new Date(today.getFullYear() - 1, 11, 31)),
      };
    case 'last_7_days':
      return { start: formatIsoDate(addDays(today, -6)), end: formatIsoDate(today) };
    case 'last_30_days':
      return { start: formatIsoDate(addDays(today, -29)), end: formatIsoDate(today) };
    case 'last_90_days':
      return { start: formatIsoDate(addDays(today, -89)), end: formatIsoDate(today) };
    case 'last_365_days':
      return { start: formatIsoDate(addDays(today, -364)), end: formatIsoDate(today) };
    default:
      return undefined;
  }
}

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

export function isDateRangeLike(value: unknown): value is DateRangeValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    ('start' in value || 'end' in value || 'min' in value || 'max' in value)
  );
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

function normalizeRangeBound(
  value: DateRangeValue['start'] | DateRangeValue['min'],
): string | number | undefined {
  if (value === '') {
    return undefined;
  }

  return value;
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
