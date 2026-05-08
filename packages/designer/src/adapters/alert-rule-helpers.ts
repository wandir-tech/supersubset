/**
 * Shared helpers for translating designer-side alert rule fields
 * (`ruleMetricField`, `ruleAggregation`, `ruleOperator`, `ruleThreshold`,
 * `ruleTitle`, `ruleMessage`, `ruleSeverity`) into the canonical
 * `alertRule` config and its in-progress `alertRuleDraft` shape.
 *
 * Both ChartPreview (live preview) and puck-canonical (save path) read
 * the same designer field set, so the translation lives in one place.
 */

export const ALERT_RULE_DESIGNER_KEYS = [
  'alertMode',
  'ruleMetricField',
  'ruleAggregation',
  'ruleOperator',
  'ruleThreshold',
  'ruleTitle',
  'ruleMessage',
  'ruleSeverity',
] as const;

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

export function buildStructuredAlertRuleConfig(
  source: Record<string, unknown>,
): Record<string, unknown> | null {
  if (source.alertMode !== 'structured') {
    return null;
  }

  const metricFieldRef = nonEmptyString(source.ruleMetricField);
  const aggregation = nonEmptyString(source.ruleAggregation);
  const operator = nonEmptyString(source.ruleOperator);
  const threshold = finiteNumber(source.ruleThreshold);
  const title = nonEmptyString(source.ruleTitle);
  const message = nonEmptyString(source.ruleMessage);
  const severity = nonEmptyString(source.ruleSeverity) ?? undefined;

  if (!metricFieldRef || !aggregation || !operator || threshold == null || !title || !message) {
    return null;
  }

  return {
    mode: 'structured',
    metricFieldRef,
    aggregation,
    operator,
    threshold,
    alert: {
      title,
      message,
      ...(severity ? { severity } : {}),
    },
  };
}

export function buildStructuredAlertRuleDraft(
  source: Record<string, unknown>,
): Record<string, unknown> | null {
  if (source.alertMode !== 'structured') {
    return null;
  }

  const draft: Record<string, unknown> = { mode: 'structured' };

  const metricFieldRef = nonEmptyString(source.ruleMetricField);
  if (metricFieldRef) draft.metricFieldRef = metricFieldRef;

  const aggregation = nonEmptyString(source.ruleAggregation);
  if (aggregation) draft.aggregation = aggregation;

  const operator = nonEmptyString(source.ruleOperator);
  if (operator) draft.operator = operator;

  const threshold = finiteNumber(source.ruleThreshold);
  if (threshold != null) draft.threshold = threshold;

  const alert: Record<string, unknown> = {};

  const title = nonEmptyString(source.ruleTitle);
  if (title) alert.title = title;

  const message = nonEmptyString(source.ruleMessage);
  if (message) alert.message = message;

  const severity = nonEmptyString(source.ruleSeverity);
  if (severity) alert.severity = severity;

  if (Object.keys(alert).length > 0) {
    draft.alert = alert;
  }

  return draft;
}
