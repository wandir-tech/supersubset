import type { NormalizedDataset } from '@supersubset/data-model';

import { getDatasetsFromSource, type MetadataSourceOptions } from './metadata-source.js';

export type ExportMetadataOptions = MetadataSourceOptions;

export interface ExportMetadataEnvelope {
  datasets: NormalizedDataset[];
}

export interface ExportMetadataResult {
  datasets: NormalizedDataset[];
  stats: {
    datasetsCount: number;
    fieldsCount: number;
  };
}

export async function exportMetadata(
  options: ExportMetadataOptions,
): Promise<ExportMetadataResult> {
  const datasets = await getDatasetsFromSource(options);
  const fieldsCount = datasets.reduce((sum, dataset) => sum + dataset.fields.length, 0);

  return {
    datasets,
    stats: {
      datasetsCount: datasets.length,
      fieldsCount,
    },
  };
}

export function createExportMetadataEnvelope(
  datasets: NormalizedDataset[],
): ExportMetadataEnvelope {
  return { datasets };
}
