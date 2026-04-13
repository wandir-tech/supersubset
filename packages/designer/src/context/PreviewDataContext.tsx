/**
 * PreviewDataContext — Allows host apps to supply real data to chart previews.
 *
 * When a host provides a `fetchPreviewData` callback, ChartPreview uses it
 * instead of static sample data. This makes the designer show actual data
 * that changes when the user selects different fields.
 */
import React, { createContext, useContext } from 'react';

/**
 * Describes which fields a chart widget needs.
 * The host app uses this to build a query (e.g., SQL SELECT).
 */
export interface PreviewDataRequest {
  datasetRef: string;
  fields: Record<string, string | string[] | undefined>;
}

/**
 * Callback that the host app implements to supply real data.
 * Should return an array of row objects keyed by field id.
 */
export type FetchPreviewData = (
  request: PreviewDataRequest
) => Promise<Record<string, unknown>[]> | Record<string, unknown>[];

export interface PreviewDataContextValue {
  fetchPreviewData: FetchPreviewData | null;
}

const PreviewDataContext = createContext<PreviewDataContextValue>({
  fetchPreviewData: null,
});

export interface PreviewDataProviderProps {
  fetchPreviewData: FetchPreviewData;
  children?: React.ReactNode;
}

export function PreviewDataProvider(props: PreviewDataProviderProps) {
  const { fetchPreviewData, children } = props;
  const value = React.useMemo(
    () => ({ fetchPreviewData }),
    [fetchPreviewData]
  );
  return React.createElement(PreviewDataContext.Provider, { value }, children);
}

export function usePreviewData(): FetchPreviewData | null {
  return useContext(PreviewDataContext).fetchPreviewData;
}
