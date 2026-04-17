import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearProbeSession,
  loadProbeSession,
  normalizeBaseUrl,
  saveProbeSession,
  toAuthHeader,
} from './auth';

describe('probe auth helpers', () => {
  let memoryStore: Map<string, string>;

  beforeEach(() => {
    memoryStore = new Map<string, string>();
    vi.stubGlobal('window', {
      sessionStorage: {
        getItem: (key: string) => memoryStore.get(key) ?? null,
        setItem: (key: string, value: string) => {
          memoryStore.set(key, value);
        },
        removeItem: (key: string) => {
          memoryStore.delete(key);
        },
        clear: () => {
          memoryStore.clear();
        },
      },
    });

    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalizes base URL by trimming whitespace and trailing slash', () => {
    expect(normalizeBaseUrl('  https://api.example.com///  ')).toBe('https://api.example.com');
  });

  it('builds bearer auth header', () => {
    expect(toAuthHeader('bearer', 'token123', '', '')).toEqual({
      name: 'Authorization',
      value: 'Bearer token123',
    });
  });

  it('persists and restores session config', () => {
    saveProbeSession({
      metadataSourceMode: 'discovery-url',
      discoveryUrl: 'https://api.example.com/supersubset/datasets',
      metadataJson: '',
      queryUrl: 'https://api.example.com/supersubset/query',
      authMode: 'custom',
      jwt: '',
      customHeaderName: 'X-Token',
      customHeaderValue: 'abc',
    });

    expect(loadProbeSession()).toEqual({
      metadataSourceMode: 'discovery-url',
      discoveryUrl: 'https://api.example.com/supersubset/datasets',
      metadataJson: '',
      queryUrl: 'https://api.example.com/supersubset/query',
      authMode: 'custom',
      jwt: '',
      customHeaderName: 'X-Token',
      customHeaderValue: 'abc',
    });
  });

  it('clears session config', () => {
    saveProbeSession({
      metadataSourceMode: 'paste-json',
      discoveryUrl: '',
      metadataJson: '{"datasets":[]}',
      queryUrl: '',
      authMode: 'bearer',
      jwt: 'jwt',
      customHeaderName: '',
      customHeaderValue: '',
    });

    clearProbeSession();
    expect(loadProbeSession()).toBeNull();
  });

  it('returns null for malformed session payload', () => {
    window.sessionStorage.setItem('supersubset.dev.probe.session', 'invalid-json');

    expect(loadProbeSession()).toBeNull();
  });

  it('supports legacy session payloads that stored a single baseUrl', () => {
    window.sessionStorage.setItem(
      'supersubset.dev.probe.session',
      JSON.stringify({
        baseUrl: 'https://api.example.com',
        authMode: 'bearer',
        jwt: 'jwt',
      }),
    );

    expect(loadProbeSession()).toEqual({
      metadataSourceMode: 'discovery-url',
      discoveryUrl: 'https://api.example.com',
      metadataJson: '',
      queryUrl: 'https://api.example.com',
      authMode: 'bearer',
      jwt: 'jwt',
      customHeaderName: '',
      customHeaderValue: '',
    });
  });

  it('returns undefined when credentials are not provided', () => {
    expect(toAuthHeader('bearer', '', '', '')).toBeUndefined();
    expect(toAuthHeader('custom', '', 'X-Test', '')).toBeUndefined();
  });

  it('is resilient if sessionStorage is unavailable', () => {
    const getItem = vi.spyOn(window.sessionStorage, 'getItem').mockImplementation(() => {
      throw new Error('disabled');
    });

    expect(loadProbeSession()).toBeNull();

    getItem.mockRestore();
  });
});
