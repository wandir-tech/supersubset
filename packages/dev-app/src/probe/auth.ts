export interface AuthHeader {
  name: string;
  value: string;
}

export type ProbeAuthMode = 'bearer' | 'custom' | 'login';
export type ProbeMetadataSourceMode = 'discovery-url' | 'paste-json';

export interface ProbeLoginConfig {
  loginUrl: string;
  loginMutation: string;
  loginEmail: string;
  loginPassword: string;
  loginTokenPath: string;
}

export interface ProbeSessionConfig extends ProbeLoginConfig {
  metadataSourceMode: ProbeMetadataSourceMode;
  discoveryUrl: string;
  metadataJson: string;
  queryUrl: string;
  authMode: ProbeAuthMode;
  jwt: string;
  customHeaderName: string;
  customHeaderValue: string;
}

const SESSION_STORAGE_KEY = 'supersubset.dev.probe.session';

/**
 * Default login mutation targets the tripmatch/bi-data-mart GraphQL server
 * (`mutation login($email, $password) { login(data: { ... }) { accessToken } }`).
 * Users can edit the mutation text to match other GraphQL backends.
 */
export const DEFAULT_LOGIN_MUTATION = `mutation login($email: String!, $password: String!) {
  login(data: { email: $email, password: $password }) {
    accessToken
  }
}`;

export const DEFAULT_LOGIN_TOKEN_PATH = 'data.login.accessToken';

export function createDefaultLoginConfig(): ProbeLoginConfig {
  return {
    loginUrl: '',
    loginMutation: DEFAULT_LOGIN_MUTATION,
    loginEmail: '',
    loginPassword: '',
    loginTokenPath: DEFAULT_LOGIN_TOKEN_PATH,
  };
}

export function normalizeBaseUrl(input: string): string {
  return input.trim().replace(/\/+$/, '');
}

/**
 * JWT field already gets `Bearer ` prepended in bearer mode. Strip a pasted prefix
 * so we never send `Authorization: Bearer Bearer <token>`.
 */
export function stripLeadingBearerPrefix(input: string): string {
  return input
    .trim()
    .replace(/^bearer\s+/i, '')
    .trim();
}

export function toAuthHeader(
  authMode: ProbeAuthMode,
  jwt: string,
  customHeaderName: string,
  customHeaderValue: string,
  loginToken?: string,
): AuthHeader | undefined {
  if (authMode === 'bearer') {
    const token = stripLeadingBearerPrefix(jwt);
    if (!token) return undefined;
    return { name: 'Authorization', value: `Bearer ${token}` };
  }

  if (authMode === 'login') {
    const token = stripLeadingBearerPrefix(loginToken ?? '');
    if (!token) return undefined;
    return { name: 'Authorization', value: `Bearer ${token}` };
  }

  const name = customHeaderName.trim();
  const value = customHeaderValue.trim();
  if (!name || !value) return undefined;
  return { name, value };
}

/**
 * Walk a dotted path (e.g. `data.login.accessToken`) on an object tree.
 * Returns `undefined` if any segment is missing or not traversable.
 */
export function extractByPath(value: unknown, path: string): unknown {
  const parts = path
    .split('.')
    .map((part) => part.trim())
    .filter(Boolean);
  let current: unknown = value;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function summarizeGraphqlErrors(errors: unknown): string | undefined {
  if (!Array.isArray(errors) || errors.length === 0) return undefined;
  const messages = errors
    .map((err) => {
      if (err && typeof err === 'object' && 'message' in err) {
        return String((err as { message?: unknown }).message ?? '').trim();
      }
      return String(err);
    })
    .filter(Boolean);
  return messages.length > 0 ? messages.join('; ') : undefined;
}

export interface ProbeLoginResult {
  token: string;
  payload: unknown;
}

/**
 * Runs a GraphQL-style login mutation (POST with `{ query, variables }`) and
 * extracts a bearer token from the response at the configured path. This keeps
 * the dev probe compatible with any GraphQL server that returns a JWT under a
 * known response path (tripmatch/bi-data-mart is the preconfigured default).
 */
export async function performProbeLogin(
  config: ProbeLoginConfig,
  options: { fetcher?: typeof fetch } = {},
): Promise<ProbeLoginResult> {
  const loginUrl = config.loginUrl.trim();
  if (!loginUrl) {
    throw new Error('Login URL is required.');
  }

  const mutation = config.loginMutation.trim();
  if (!mutation) {
    throw new Error('Login mutation is required.');
  }

  const tokenPath = config.loginTokenPath.trim();
  if (!tokenPath) {
    throw new Error('Login token path is required.');
  }

  const email = config.loginEmail.trim();
  if (!email || !config.loginPassword) {
    throw new Error('Email and password are required for login.');
  }

  const fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
  const response = await fetcher(loginUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: mutation,
      variables: { email, password: config.loginPassword },
    }),
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }

  if (!response.ok) {
    const gqlError = summarizeGraphqlErrors(
      payload && typeof payload === 'object' && 'errors' in payload
        ? (payload as { errors?: unknown }).errors
        : undefined,
    );
    const suffix = gqlError ?? response.statusText ?? 'Unknown error';
    throw new Error(`Login failed (${response.status}): ${suffix}`);
  }

  const gqlError = summarizeGraphqlErrors(
    payload && typeof payload === 'object' && 'errors' in payload
      ? (payload as { errors?: unknown }).errors
      : undefined,
  );
  if (gqlError) {
    throw new Error(`Login failed: ${gqlError}`);
  }

  const rawToken = extractByPath(payload, tokenPath);
  const token = typeof rawToken === 'string' ? stripLeadingBearerPrefix(rawToken) : '';
  if (!token) {
    throw new Error(
      `Login succeeded but no token was found at "${tokenPath}". Adjust the token path to match the response shape.`,
    );
  }

  return { token, payload };
}

export function saveProbeSession(config: ProbeSessionConfig): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage write errors in restricted browser environments.
  }
}

export function loadProbeSession(): ProbeSessionConfig | null {
  if (typeof window === 'undefined') {
    return null;
  }

  let raw: string | null;
  try {
    raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ProbeSessionConfig> & { baseUrl?: string };
    if (!parsed?.authMode) {
      return null;
    }

    const legacyBaseUrl = typeof parsed.baseUrl === 'string' ? parsed.baseUrl : '';
    const metadataSourceMode: ProbeMetadataSourceMode =
      parsed.metadataSourceMode === 'paste-json' ? 'paste-json' : 'discovery-url';

    const loginDefaults = createDefaultLoginConfig();

    return {
      metadataSourceMode,
      discoveryUrl: parsed.discoveryUrl ?? legacyBaseUrl,
      metadataJson: parsed.metadataJson ?? '',
      queryUrl: parsed.queryUrl ?? legacyBaseUrl,
      authMode: parsed.authMode,
      jwt: parsed.jwt ?? '',
      customHeaderName: parsed.customHeaderName ?? '',
      customHeaderValue: parsed.customHeaderValue ?? '',
      loginUrl: parsed.loginUrl ?? loginDefaults.loginUrl,
      loginMutation: parsed.loginMutation ?? loginDefaults.loginMutation,
      loginEmail: parsed.loginEmail ?? loginDefaults.loginEmail,
      loginPassword: parsed.loginPassword ?? loginDefaults.loginPassword,
      loginTokenPath: parsed.loginTokenPath ?? loginDefaults.loginTokenPath,
    };
  } catch {
    return null;
  }
}

export function clearProbeSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage clear errors in restricted browser environments.
  }
}
