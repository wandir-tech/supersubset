/**
 * JSON Schema generation from Zod schemas.
 * Produces a standard JSON Schema (draft-07) for external tooling, documentation,
 * and validation in non-TypeScript environments.
 */
import { zodToJsonSchema } from 'zod-to-json-schema';
import { dashboardDefinitionSchema } from '../validation';

/**
 * Generate a JSON Schema (draft-07) for the DashboardDefinition type.
 * The generated schema can be used for:
 * - External validation (Python, Go, etc.)
 * - Documentation
 * - IDE autocompletion in JSON/YAML editors
 */
export function generateDashboardJsonSchema(): Record<string, unknown> {
  return zodToJsonSchema(dashboardDefinitionSchema, {
    name: 'DashboardDefinition',
    $refStrategy: 'none',
  }) as Record<string, unknown>;
}
