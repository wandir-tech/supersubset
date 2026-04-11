/**
 * YAML serializer/parser for DashboardDefinition.
 * YAML is an interchangeable encoding with JSON — no format-specific semantics.
 */
import YAML from 'yaml';
import type { DashboardDefinition } from '../types';
import { migrateDashboardDefinition } from '../migrations';

/**
 * Serialize a DashboardDefinition to YAML string.
 * Uses sorted keys for deterministic output.
 */
export function serializeToYAML(definition: DashboardDefinition): string {
  return YAML.stringify(definition, {
    sortMapEntries: true,
  });
}

/**
 * Parse a YAML string into a validated DashboardDefinition.
 * Throws ZodError if validation fails.
 */
export function parseFromYAML(yamlString: string): DashboardDefinition {
  const raw: unknown = YAML.parse(yamlString);
  return migrateDashboardDefinition(raw);
}
