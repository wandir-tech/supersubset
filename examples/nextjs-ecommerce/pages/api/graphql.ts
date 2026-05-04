import type { NextApiRequest, NextApiResponse } from 'next';
import {
  createWorkbenchAccessToken,
  isValidWorkbenchCredentials,
  WORKBENCH_LOGIN_MUTATION,
} from '../../lib/workbench-auth';

function normalizeGraphqlDocument(document: string): string {
  return document.replace(/\s+/g, ' ').trim();
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ errors: [{ message: 'Method not allowed.' }] });
  }

  const query = typeof req.body?.query === 'string' ? req.body.query : '';
  const email = typeof req.body?.variables?.email === 'string' ? req.body.variables.email : '';
  const password =
    typeof req.body?.variables?.password === 'string' ? req.body.variables.password : '';

  if (normalizeGraphqlDocument(query) !== normalizeGraphqlDocument(WORKBENCH_LOGIN_MUTATION)) {
    return res
      .status(400)
      .json({ errors: [{ message: 'Only the login mutation is supported in local mode.' }] });
  }

  if (!isValidWorkbenchCredentials(email, password)) {
    return res
      .status(401)
      .json({ errors: [{ message: 'Invalid demo credentials for the local workbench.' }] });
  }

  return res.status(200).json({
    query: WORKBENCH_LOGIN_MUTATION,
    data: {
      login: {
        accessToken: createWorkbenchAccessToken(),
      },
    },
  });
}
