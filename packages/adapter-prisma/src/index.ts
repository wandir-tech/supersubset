/**
 * @supersubset/adapter-prisma — Prisma schema adapter.
 *
 * Parses Prisma schema text and normalizes models into the analytical metadata model.
 * Uses regex-based parsing — no @prisma/sdk dependency.
 */
import type {
  MetadataAdapter,
  NormalizedDataset,
  NormalizedField,
  FieldDataType,
  DatasetRelationship,
} from '@supersubset/data-model';
import { inferFieldRole, inferAggregation, humanizeFieldName } from '@supersubset/data-model';

// ─── Prisma Type Mapping ─────────────────────────────────────

const PRISMA_TYPE_MAP: Record<string, FieldDataType> = {
  String: 'string',
  Int: 'integer',
  Float: 'number',
  Decimal: 'number',
  BigInt: 'integer',
  Boolean: 'boolean',
  DateTime: 'datetime',
  Json: 'json',
  Bytes: 'unknown',
};

// ─── Internal Parse Types ────────────────────────────────────

interface ParsedModel {
  name: string;
  fields: ParsedField[];
}

interface ParsedField {
  name: string;
  type: string;
  isOptional: boolean;
  isList: boolean;
  isId: boolean;
  relationAttrs?: { fields: string[]; references: string[] };
}

// ─── Parser ──────────────────────────────────────────────────

const MODEL_REGEX = /model\s+(\w+)\s*\{([^}]*)}/g;

function parseFieldLine(line: string): ParsedField | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) return null;

  // Match: fieldName Type? []? @attributes...
  const fieldMatch = trimmed.match(/^(\w+)\s+(\w+)(\?)?(\[\])?(.*)$/);
  if (!fieldMatch) return null;

  const [, name, type, optional, list, attrs] = fieldMatch;
  const isId = /@id\b/.test(attrs);

  let relationAttrs: ParsedField['relationAttrs'] | undefined;
  const relationMatch = attrs.match(/@relation\(([^)]*)\)/);
  if (relationMatch) {
    const relContent = relationMatch[1];
    const fieldsMatch = relContent.match(/fields:\s*\[([^\]]*)\]/);
    const refsMatch = relContent.match(/references:\s*\[([^\]]*)\]/);
    if (fieldsMatch && refsMatch) {
      relationAttrs = {
        fields: fieldsMatch[1].split(',').map((s) => s.trim()),
        references: refsMatch[1].split(',').map((s) => s.trim()),
      };
    }
  }

  return {
    name,
    type,
    isOptional: optional === '?',
    isList: list === '[]',
    isId,
    relationAttrs,
  };
}

function parsePrismaSchema(schema: string): ParsedModel[] {
  const models: ParsedModel[] = [];
  let match: RegExpExecArray | null;

  MODEL_REGEX.lastIndex = 0;
  while ((match = MODEL_REGEX.exec(schema)) !== null) {
    const modelName = match[1];
    const body = match[2];
    const lines = body.split('\n');
    const fields: ParsedField[] = [];

    for (const line of lines) {
      const parsed = parseFieldLine(line);
      if (parsed) fields.push(parsed);
    }

    models.push({ name: modelName, fields });
  }

  return models;
}

// ─── Normalization ───────────────────────────────────────────

function mapPrismaType(prismaType: string): FieldDataType {
  return PRISMA_TYPE_MAP[prismaType] ?? 'unknown';
}

function isScalarField(field: ParsedField, modelNames: Set<string>): boolean {
  return !modelNames.has(field.type) && !field.isList;
}

function convertModel(model: ParsedModel, allModels: ParsedModel[]): NormalizedDataset {
  const modelNames = new Set(allModels.map((m) => m.name));
  const fields: NormalizedField[] = [];
  const relationships: DatasetRelationship[] = [];

  for (const f of model.fields) {
    // Skip relation navigations (fields whose type is another model)
    if (modelNames.has(f.type) && !f.relationAttrs) {
      // It's a list nav (e.g., orders Order[]) — skip
      continue;
    }

    if (f.relationAttrs) {
      // This is a relation field like: user User @relation(fields: [userId], references: [id])
      // Create the relationship but don't add the field itself
      for (let i = 0; i < f.relationAttrs.fields.length; i++) {
        relationships.push({
          targetDatasetId: f.type.toLowerCase(),
          type: f.isList ? 'one-to-many' : 'many-to-one',
          sourceFieldId: f.relationAttrs.fields[i],
          targetFieldId: f.relationAttrs.references[i],
        });
      }
      continue;
    }

    if (!isScalarField(f, modelNames)) continue;

    const dataType = mapPrismaType(f.type);
    const role = f.isId ? 'key' : inferFieldRole(f.name, dataType);
    const defaultAggregation = inferAggregation(role, dataType);

    fields.push({
      id: f.name,
      label: humanizeFieldName(f.name),
      dataType,
      role,
      ...(defaultAggregation !== undefined && { defaultAggregation }),
    });
  }

  return {
    id: model.name.toLowerCase(),
    label: model.name,
    fields,
    ...(relationships.length > 0 && { relationships }),
  };
}

// ─── Adapter ─────────────────────────────────────────────────

export class PrismaAdapter implements MetadataAdapter<string> {
  readonly name = 'prisma';

  async getDatasets(source: string): Promise<NormalizedDataset[]> {
    if (typeof source !== 'string' || source.trim().length === 0) {
      throw new Error('PrismaAdapter: source must be a non-empty Prisma schema string');
    }
    const models = parsePrismaSchema(source);
    return models.map((m) => convertModel(m, models));
  }

  async getDataset(source: string, datasetId: string): Promise<NormalizedDataset | undefined> {
    const datasets = await this.getDatasets(source);
    return datasets.find((d) => d.id === datasetId);
  }
}
