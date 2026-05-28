import type { DateFilterConfig } from './types';

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

export interface DateRangeValue {
  preset?: string;
  start?: string | number;
  end?: string | number;
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

const DATE_BOUND_PATTERN = /^\d{4}-\d{2}-\d{2}(?:$|[T\s])/;

export function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function clampWeekday(value: unknown): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
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

export function coerceNonNegativeInteger(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : fallback;
}

export function startOfWeek(date: Date, weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6): Date {
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

export function isRangeLikeValue(value: unknown): value is DateRangeValue {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const presentKeys = ['start', 'end', 'min', 'max'].filter((key) => key in candidate);

  return (
    presentKeys.length > 0 && presentKeys.every((key) => isValidRangeBound(key, candidate[key]))
  );
}

/**
 * Backwards-compatible alias for the original public runtime helper.
 * Prefer isRangeLikeValue for new code.
 */
export function isDateRangeLike(value: unknown): value is DateRangeValue {
  return isRangeLikeValue(value);
}

function isValidRangeBound(key: string, value: unknown): boolean {
  if (value == null || value === '') {
    return true;
  }

  if (key === 'min' || key === 'max') {
    return typeof value === 'number' && Number.isFinite(value);
  }

  return (
    (typeof value === 'number' && Number.isFinite(value)) ||
    (typeof value === 'string' && DATE_BOUND_PATTERN.test(value))
  );
}

export function normalizeRangeBound(
  value: DateRangeValue['start'] | DateRangeValue['min'],
): string | number | undefined {
  if (value === '') {
    return undefined;
  }

  return value;
}
