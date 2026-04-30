// Demo-only credentials and token for the local workbench example.
// Do not copy this pattern into production hosts.
export const WORKBENCH_LOGIN_EMAIL = 'operator@northstar.test';
export const WORKBENCH_LOGIN_PASSWORD = 'supersubset-demo';
export const WORKBENCH_ACCESS_TOKEN = 'northstar-local-demo-token';

export const WORKBENCH_LOGIN_MUTATION = `mutation login($email: String!, $password: String!) {
  login(data: { email: $email, password: $password }) {
    accessToken
  }
}`;

export function isValidWorkbenchCredentials(email: string, password: string): boolean {
  return (
    email.trim().toLowerCase() === WORKBENCH_LOGIN_EMAIL && password === WORKBENCH_LOGIN_PASSWORD
  );
}

export function createWorkbenchAccessToken(): string {
  return WORKBENCH_ACCESS_TOKEN;
}

function extractBearerToken(headerValue: string | string[] | undefined): string {
  if (Array.isArray(headerValue)) {
    return extractBearerToken(headerValue[0]);
  }

  if (!headerValue) {
    return '';
  }

  return headerValue.replace(/^Bearer\s+/i, '').trim();
}

export function isAuthorizedHeader(headerValue: string | string[] | undefined): boolean {
  return extractBearerToken(headerValue) === WORKBENCH_ACCESS_TOKEN;
}

export function requireWorkbenchAuthorization(headerValue: string | string[] | undefined): boolean {
  return isAuthorizedHeader(headerValue);
}
