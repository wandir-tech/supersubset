export function toProbeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (/Failed to fetch/i.test(error.message)) {
      return 'Connection failed. Check the backend URL and CORS policy, then try again.';
    }

    return error.message;
  }

  return 'Unexpected probe error. Please try again.';
}

export async function parseErrorResponse(response: Response): Promise<never> {
  let details = '';

  try {
    const payload = await response.json();
    if (typeof payload === 'object' && payload && 'message' in payload) {
      details = String((payload as { message?: unknown }).message ?? '').trim();
    }
  } catch {
    // Ignore body parsing errors and fallback to status text.
  }

  const suffix = details || response.statusText || 'Unknown error';
  throw new Error(`Probe request failed (${response.status}): ${suffix}`);
}
