export interface PreviewStatus {
  kind: 'idle' | 'loading' | 'success' | 'empty' | 'error';
  url?: string;
  datasetRef?: string;
  rowCount?: number;
  errorMessage?: string;
  timestamp?: number;
  requestBody?: string;
  fieldBindings?: string;
}

export type ConnectStageStatus = 'pending' | 'success' | 'error';

export interface ConnectStage {
  id: string;
  label: string;
  status: ConnectStageStatus;
  detail?: string;
}
