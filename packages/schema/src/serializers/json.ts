import type { DashboardDefinition } from '../types';
import { migrateDashboardDefinition } from '../migrations';

/**
 * Sort object keys deterministically for stable serialization.
 */
function sortKeys(obj: unknown): unknown {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortKeys);
  }
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
    sorted[key] = sortKeys((obj as Record<string, unknown>)[key]);
  }
  return sorted;
}

/**
 * Serialize a DashboardDefinition to a deterministic JSON string.
 * Keys are sorted for stable output.
 */
export function serializeToJSON(definition: DashboardDefinition): string {
  return JSON.stringify(sortKeys(definition), null, 2);
}

/**
 * Parse a JSON string into a validated DashboardDefinition.
 * Throws ZodError if validation fails.
 */
export function parseFromJSON(json: string): DashboardDefinition {
  const raw: unknown = JSON.parse(json);
  return migrateDashboardDefinition(raw);
}
