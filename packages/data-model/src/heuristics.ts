import type { FieldDataType, FieldRole, AggregationType } from './index.js';

// Patterns for measure-like field names (float/number fields)
const MEASURE_NAME_PATTERNS = [
  /_amount$/i, /_total$/i, /_count$/i, /_sum$/i, /_avg$/i,
  /_price$/i, /_cost$/i, /_revenue$/i, /_qty$/i, /_quantity$/i,
  /amount$/i, /total$/i, /price$/i, /cost$/i, /revenue$/i,
];

// Patterns for key fields
const KEY_PATTERNS = [
  /^id$/i,
  /_id$/,
  /Id$/,
];

// Patterns for time fields
const TIME_NAME_PATTERNS = [
  /_at$/i, /_date$/i, /Date$/, /Time$/,
  /^created/i, /^updated/i,
];

const NUMERIC_TYPES: FieldDataType[] = ['number', 'integer'];
const TIME_TYPES: FieldDataType[] = ['date', 'datetime'];

/**
 * Infer the semantic role of a field based on its name and data type.
 */
export function inferFieldRole(fieldName: string, dataType: FieldDataType): FieldRole {
  // Key patterns: *_id, *Id, "id", primary key hint
  if (KEY_PATTERNS.some((p) => p.test(fieldName))) {
    return 'key';
  }

  // Time: date/datetime types or time-like names
  if (TIME_TYPES.includes(dataType)) {
    return 'time';
  }
  if (TIME_NAME_PATTERNS.some((p) => p.test(fieldName))) {
    return 'time';
  }

  // Measure: numeric type without _id/Id suffix (already handled above)
  if (NUMERIC_TYPES.includes(dataType)) {
    return 'measure';
  }

  // Measure: float-like names (amount, total, count, etc.)
  if (MEASURE_NAME_PATTERNS.some((p) => p.test(fieldName))) {
    return 'measure';
  }

  // String, boolean → dimension
  if (dataType === 'string' || dataType === 'boolean') {
    return 'dimension';
  }

  return 'unknown';
}

/**
 * Infer the default aggregation for a field based on its role and data type.
 */
export function inferAggregation(role: FieldRole, dataType: FieldDataType): AggregationType | undefined {
  if (role === 'measure' && NUMERIC_TYPES.includes(dataType)) {
    return 'sum';
  }
  if (role === 'time') {
    return 'none';
  }
  return undefined;
}

/**
 * Convert snake_case or camelCase field name to human-readable Title Case.
 *
 * Examples:
 *   order_date → Order Date
 *   orderId   → Order Id
 *   created_at → Created At
 *   firstName  → First Name
 */
export function humanizeFieldName(fieldName: string): string {
  // First, split camelCase into words (insert space before uppercase letters)
  const deCameled = fieldName.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  // Replace underscores/hyphens with spaces
  const spaced = deCameled.replace(/[_-]+/g, ' ');
  // Title case each word
  return spaced
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
