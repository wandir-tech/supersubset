export interface AuthHeader {
  name: string;
  value: string;
}

export type ProbeAuthMode = 'bearer' | 'custom';

export interface ProbeSessionConfig {
  baseUrl: string;
  authMode: ProbeAuthMode;
  jwt: string;
  customHeaderName: string;
  customHeaderValue: string;
}

const SESSION_STORAGE_KEY = 'supersubset.dev.probe.session';

export function normalizeBaseUrl(input: string): string {
  return input.trim().replace(/\/+$/, '');
}

export function toAuthHeader(
  authMode: ProbeAuthMode,
  jwt: string,
  customHeaderName: string,
  customHeaderValue: string,
): AuthHeader | undefined {
  if (authMode === 'bearer') {
    const token = jwt.trim();
    if (!token) return undefined;
    return { name: 'Authorization', value: `Bearer ${token}` };
  }

  const name = customHeaderName.trim();
  const value = customHeaderValue.trim();
  if (!name || !value) return undefined;
  return { name, value };
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
    const parsed = JSON.parse(raw) as ProbeSessionConfig;
    if (!parsed?.baseUrl || !parsed?.authMode) {
      return null;
    }

    return {
      baseUrl: parsed.baseUrl,
      authMode: parsed.authMode,
      jwt: parsed.jwt ?? '',
      customHeaderName: parsed.customHeaderName ?? '',
      customHeaderValue: parsed.customHeaderValue ?? '',
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
