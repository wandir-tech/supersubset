/**
 * DatasetContext — Provides NormalizedDataset[] to Puck custom field renderers.
 *
 * The SupersubsetDesigner wraps the Puck editor in this provider so that
 * custom field dropdowns can access available datasets and fields.
 */
import React, { createContext, useContext } from 'react';
import type { NormalizedDataset } from '@supersubset/data-model';

export interface DatasetContextValue {
  datasets: NormalizedDataset[];
}

export interface DatasetProviderProps {
  datasets: NormalizedDataset[];
  children?: React.ReactNode;
}

const DatasetContext = createContext<DatasetContextValue>({ datasets: [] });

export function DatasetProvider(props: DatasetProviderProps) {
  const { datasets, children } = props;
  const value = React.useMemo(() => ({ datasets }), [datasets]);
  return React.createElement(DatasetContext.Provider, { value }, children);
}

export function useDatasets(): NormalizedDataset[] {
  return useContext(DatasetContext).datasets;
}
