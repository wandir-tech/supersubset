import type { WidgetProps } from '@supersubset/runtime';

type ColumnList = NonNullable<WidgetProps['columns']>;

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** Prefer plural array keys; fall back to singular host config (e.g. yField) then query columns. */
export function resolveYFields(config: Record<string, unknown>, columns?: ColumnList): string[] {
  const singular = readString(config.yField);
  const plural = readStringArray(config.yFields);

  // Host apps often keep the query output alias on yField while dataBinding fills
  // yFields with mart field ids (e.g. event_id vs count).
  if (singular && plural.length > 0 && !plural.includes(singular)) {
    return [singular];
  }
  if (plural.length > 0) return plural;
  if (singular) return [singular];

  return (
    columns
      ?.slice(1)
      .map((column) => column.fieldId)
      .filter(Boolean) ?? []
  );
}

export function resolveBarFields(config: Record<string, unknown>, columns?: ColumnList): string[] {
  const singular = readString(config.barField);
  const plural = readStringArray(config.barFields);

  if (singular && plural.length > 0 && !plural.includes(singular)) {
    return [singular];
  }
  if (plural.length > 0) return plural;
  if (singular) return [singular];

  return (
    columns
      ?.slice(1)
      .map((column) => column.fieldId)
      .filter(Boolean) ?? []
  );
}

export function resolveLineFields(
  config: Record<string, unknown>,
  _columns?: ColumnList,
): string[] {
  const singular = readString(config.lineField);
  const plural = readStringArray(config.lineFields);

  if (singular && plural.length > 0 && !plural.includes(singular)) {
    return [singular];
  }
  if (plural.length > 0) return plural;
  if (singular) return [singular];

  return [];
}

export function resolveCategoryField(
  config: Record<string, unknown>,
  columns?: ColumnList,
): string {
  return (
    readString(config.xField) ??
    readString(config.categoryField) ??
    readString(config.nameField) ??
    columns?.[0]?.fieldId ??
    ''
  );
}

export function resolveValueField(config: Record<string, unknown>, columns?: ColumnList): string {
  return readString(config.valueField) ?? readString(config.yField) ?? columns?.[1]?.fieldId ?? '';
}
