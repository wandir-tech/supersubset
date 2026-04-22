import type { NormalizedDataset } from '@supersubset/data-model';

import { PrismaAdapter } from '@supersubset/adapter-prisma';
import { SqlAdapter, type SqlCatalogSource } from '@supersubset/adapter-sql';
import { JsonAdapter, type JsonAdapterSource } from '@supersubset/adapter-json';
import { DbtAdapter, type DbtManifestSource } from '@supersubset/adapter-dbt';

export type SupportedSourceType = 'prisma' | 'sql' | 'json' | 'dbt';

export interface MetadataSourceOptions {
  sourceType: SupportedSourceType;
  source: string | object;
}

function parseStructuredSource<TExpected extends object>(source: string | object): TExpected {
  return (typeof source === 'string' ? JSON.parse(source) : source) as TExpected;
}

export async function getDatasetsFromSource(
  options: MetadataSourceOptions,
): Promise<NormalizedDataset[]> {
  switch (options.sourceType) {
    case 'prisma': {
      const adapter = new PrismaAdapter();
      return adapter.getDatasets(options.source as string);
    }
    case 'sql': {
      const adapter = new SqlAdapter();
      return adapter.getDatasets(parseStructuredSource<SqlCatalogSource>(options.source));
    }
    case 'json': {
      const adapter = new JsonAdapter();
      return adapter.getDatasets(parseStructuredSource<JsonAdapterSource>(options.source));
    }
    case 'dbt': {
      const adapter = new DbtAdapter();
      return adapter.getDatasets(parseStructuredSource<DbtManifestSource>(options.source));
    }
    default:
      throw new Error(`Unsupported source type: ${options.sourceType as string}`);
  }
}
