import type { NormalizedDataset } from '@supersubset/data-model';

import {
  performProbeLogin,
  toAuthHeader,
  type ProbeAuthMode,
  type ProbeMetadataSourceMode,
} from './auth';
import { toProbeErrorMessage } from './errors';
import { HttpMetadataAdapter } from './http-adapters';
import { parseProbeMetadataJson } from './metadata';
import type { ConnectStage } from './probe-workspace-types';

export interface ResolveProbeDatasetsParams {
  metadataSourceMode: ProbeMetadataSourceMode;
  normalizedDiscoveryUrl: string;
  metadataJsonInput: string;
  authMode: ProbeAuthMode;
  authHeader?: { name: string; value: string };
  loginUrlInput: string;
  loginMutationInput: string;
  loginEmailInput: string;
  loginPasswordInput: string;
  loginTokenPathInput: string;
  jwtInput: string;
  customHeaderName: string;
  customHeaderValue: string;
}

export interface ResolveProbeDatasetsCallbacks {
  pushStage: (stage: ConnectStage) => void;
  updateStage: (id: string, patch: Partial<ConnectStage>) => void;
}

export interface ResolveProbeDatasetsResult {
  datasets: NormalizedDataset[];
  loginToken?: string;
}

export async function resolveProbeDatasets(
  params: ResolveProbeDatasetsParams,
  { pushStage, updateStage }: ResolveProbeDatasetsCallbacks,
): Promise<ResolveProbeDatasetsResult> {
  const {
    metadataSourceMode,
    normalizedDiscoveryUrl,
    metadataJsonInput,
    authMode,
    authHeader,
    loginUrlInput,
    loginMutationInput,
    loginEmailInput,
    loginPasswordInput,
    loginTokenPathInput,
    jwtInput,
    customHeaderName,
    customHeaderValue,
  } = params;

  let effectiveAuthHeader = authHeader;
  let loginToken: string | undefined;

  if (authMode === 'login') {
    pushStage({
      id: 'login',
      label: `Login: POST ${loginUrlInput.trim() || '(no URL)'}`,
      status: 'pending',
      detail: `User: ${loginEmailInput || '(empty)'}`,
    });
    console.info('[Supersubset Probe] Attempting login', {
      url: loginUrlInput.trim(),
      email: loginEmailInput,
      tokenPath: loginTokenPathInput,
    });

    try {
      const result = await performProbeLogin({
        loginUrl: loginUrlInput,
        loginMutation: loginMutationInput,
        loginEmail: loginEmailInput,
        loginPassword: loginPasswordInput,
        loginTokenPath: loginTokenPathInput,
      });
      loginToken = result.token;
      effectiveAuthHeader = toAuthHeader(
        'login',
        jwtInput,
        customHeaderName,
        customHeaderValue,
        result.token,
      );
      const tokenPreview = `${result.token.slice(0, 12)}…${result.token.slice(-6)} (${result.token.length} chars)`;
      updateStage('login', {
        status: 'success',
        detail: `Token captured: ${tokenPreview}`,
      });
      console.info('[Supersubset Probe] Login succeeded', { tokenPreview });
    } catch (loginError) {
      const message = toProbeErrorMessage(loginError);
      updateStage('login', { status: 'error', detail: message });
      console.warn('[Supersubset Probe] Login failed', loginError);
      throw loginError;
    }
  }

  if (metadataSourceMode === 'discovery-url') {
    pushStage({
      id: 'metadata',
      label: `Metadata: GET ${normalizedDiscoveryUrl}`,
      status: 'pending',
    });
    console.info('[Supersubset Probe] Fetching metadata', {
      url: normalizedDiscoveryUrl,
      authHeader: effectiveAuthHeader?.name,
    });
  } else {
    pushStage({
      id: 'metadata',
      label: 'Metadata: parsing pasted JSON',
      status: 'pending',
    });
  }

  let datasets: NormalizedDataset[];
  try {
    datasets =
      metadataSourceMode === 'discovery-url'
        ? await new HttpMetadataAdapter({ authHeader: effectiveAuthHeader }).getDatasets(
            normalizedDiscoveryUrl,
          )
        : await parseProbeMetadataJson(metadataJsonInput);
  } catch (metadataError) {
    const message = toProbeErrorMessage(metadataError);
    updateStage('metadata', { status: 'error', detail: message });
    console.warn('[Supersubset Probe] Metadata fetch failed', metadataError);
    throw metadataError;
  }

  if (datasets.length === 0) {
    const emptyMessage = 'Metadata loaded successfully, but no datasets were discovered.';
    updateStage('metadata', { status: 'error', detail: emptyMessage });
    console.warn('[Supersubset Probe]', emptyMessage);
    throw new Error(emptyMessage);
  }

  updateStage('metadata', {
    status: 'success',
    detail: `${datasets.length} dataset(s) discovered`,
  });
  console.info('[Supersubset Probe] Metadata loaded', {
    datasetCount: datasets.length,
    datasetIds: datasets.map((dataset) => dataset.id),
  });

  return { datasets, loginToken };
}
