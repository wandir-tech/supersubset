import type { NextApiRequest, NextApiResponse } from 'next';

const LOCAL_DEV_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
const DEFAULT_ALLOWED_HEADERS = 'Authorization, Content-Type';

function getRequestOrigin(req: NextApiRequest): string {
  return typeof req.headers.origin === 'string' ? req.headers.origin.trim() : '';
}

function getRequestedHeaders(req: NextApiRequest): string {
  return typeof req.headers['access-control-request-headers'] === 'string'
    ? req.headers['access-control-request-headers']
    : DEFAULT_ALLOWED_HEADERS;
}

export function handleLocalDevCors(
  req: NextApiRequest,
  res: NextApiResponse,
  allowedMethods: ReadonlyArray<'GET' | 'POST'>,
): boolean {
  const origin = getRequestOrigin(req);

  if (LOCAL_DEV_ORIGIN_PATTERN.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', [...allowedMethods, 'OPTIONS'].join(', '));
  res.setHeader('Access-Control-Allow-Headers', getRequestedHeaders(req));
  res.setHeader('Access-Control-Max-Age', '600');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }

  return false;
}
