import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_LOGIN_MUTATION,
  DEFAULT_LOGIN_TOKEN_PATH,
  clearProbeSession,
  createDefaultLoginConfig,
  extractByPath,
  loadProbeSession,
  normalizeBaseUrl,
  performProbeLogin,
  saveProbeSession,
  stripLeadingBearerPrefix,
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

  it('strips pasted Bearer prefix so the header is not doubled', () => {
    expect(stripLeadingBearerPrefix('  Bearer eyJhbG.test  ')).toBe('eyJhbG.test');
    expect(stripLeadingBearerPrefix('bearer abc')).toBe('abc');
    expect(toAuthHeader('bearer', 'Bearer eyJhbG', '', '')).toEqual({
      name: 'Authorization',
      value: 'Bearer eyJhbG',
    });
  });

  it('uses loginToken as bearer when in login auth mode', () => {
    expect(toAuthHeader('login', '', '', '', 'jwt-from-login')).toEqual({
      name: 'Authorization',
      value: 'Bearer jwt-from-login',
    });
  });

  it('returns undefined in login mode without a loginToken', () => {
    expect(toAuthHeader('login', '', '', '')).toBeUndefined();
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
      ...createDefaultLoginConfig(),
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
      loginUrl: '',
      loginMutation: DEFAULT_LOGIN_MUTATION,
      loginEmail: '',
      loginPassword: '',
      loginTokenPath: DEFAULT_LOGIN_TOKEN_PATH,
    });
  });

  it('persists and restores login mode credentials', () => {
    saveProbeSession({
      metadataSourceMode: 'discovery-url',
      discoveryUrl: 'https://api.example.com',
      metadataJson: '',
      queryUrl: '',
      authMode: 'login',
      jwt: '',
      customHeaderName: '',
      customHeaderValue: '',
      loginUrl: 'https://api.example.com/graphql',
      loginMutation: DEFAULT_LOGIN_MUTATION,
      loginEmail: 'dev@example.com',
      loginPassword: 'shh',
      loginTokenPath: 'data.login.accessToken',
    });

    const restored = loadProbeSession();
    expect(restored?.authMode).toBe('login');
    expect(restored?.loginUrl).toBe('https://api.example.com/graphql');
    expect(restored?.loginEmail).toBe('dev@example.com');
    expect(restored?.loginPassword).toBe('shh');
    expect(restored?.loginTokenPath).toBe('data.login.accessToken');
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
      ...createDefaultLoginConfig(),
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
      loginUrl: '',
      loginMutation: DEFAULT_LOGIN_MUTATION,
      loginEmail: '',
      loginPassword: '',
      loginTokenPath: DEFAULT_LOGIN_TOKEN_PATH,
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

describe('extractByPath', () => {
  it('walks a dotted path on nested objects', () => {
    expect(
      extractByPath({ data: { login: { accessToken: 'tok' } } }, 'data.login.accessToken'),
    ).toBe('tok');
  });

  it('returns undefined when any segment is missing', () => {
    expect(extractByPath({ data: {} }, 'data.login.accessToken')).toBeUndefined();
    expect(extractByPath(null, 'data.x')).toBeUndefined();
  });

  it('ignores leading/trailing dots and whitespace in path parts', () => {
    expect(extractByPath({ a: { b: 1 } }, ' a . b ')).toBe(1);
  });
});

describe('performProbeLogin', () => {
  it('posts a GraphQL login mutation with variables and returns the extracted token', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ data: { login: { accessToken: 'jwt-abc' } } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );

    const result = await performProbeLogin(
      {
        ...createDefaultLoginConfig(),
        loginUrl: 'https://api.example.com/graphql',
        loginEmail: 'dev@example.com',
        loginPassword: 'secret',
      },
      { fetcher },
    );

    expect(result.token).toBe('jwt-abc');

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.example.com/graphql');
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(String(init.body));
    expect(body.query).toContain('mutation login');
    expect(body.variables).toEqual({ email: 'dev@example.com', password: 'secret' });
  });

  it('throws a descriptive error when the response contains GraphQL errors', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ errors: [{ message: 'Invalid credentials' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );

    await expect(
      performProbeLogin(
        {
          ...createDefaultLoginConfig(),
          loginUrl: 'https://api.example.com/graphql',
          loginEmail: 'dev@example.com',
          loginPassword: 'wrong',
        },
        { fetcher },
      ),
    ).rejects.toThrow(/Invalid credentials/);
  });

  it('throws when the token path cannot be resolved', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ data: { login: {} } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );

    await expect(
      performProbeLogin(
        {
          ...createDefaultLoginConfig(),
          loginUrl: 'https://api.example.com/graphql',
          loginEmail: 'dev@example.com',
          loginPassword: 'secret',
        },
        { fetcher },
      ),
    ).rejects.toThrow(/no token was found/);
  });

  it('rejects when email or password is missing', async () => {
    const fetcher = vi.fn();
    await expect(
      performProbeLogin(
        {
          ...createDefaultLoginConfig(),
          loginUrl: 'https://api.example.com/graphql',
          loginEmail: '',
          loginPassword: '',
        },
        { fetcher: fetcher as unknown as typeof fetch },
      ),
    ).rejects.toThrow(/required/);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('surfaces HTTP errors with status code', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ errors: [{ message: 'Boom' }] }), {
          status: 500,
          statusText: 'Internal Server Error',
          headers: { 'Content-Type': 'application/json' },
        }),
    );

    await expect(
      performProbeLogin(
        {
          ...createDefaultLoginConfig(),
          loginUrl: 'https://api.example.com/graphql',
          loginEmail: 'dev@example.com',
          loginPassword: 'secret',
        },
        { fetcher },
      ),
    ).rejects.toThrow(/500.*Boom/);
  });
});
