import type { NextApiRequest, NextApiResponse } from 'next';
import type { LogicalQuery } from '@supersubset/data-model';
import { requireWorkbenchAuthorization } from '../../../../lib/workbench-auth';
import { executeWorkbenchQuery } from '../../../../lib/workbench-query';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method not allowed.' });
  }

  if (!requireWorkbenchAuthorization(req.headers.authorization)) {
    return res.status(401).json({ message: 'Unauthorized. Provide the local demo bearer token.' });
  }

  try {
    const query = req.body as LogicalQuery;
    const result = executeWorkbenchQuery(query);
    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected local analytics error.';
    return res.status(400).json({ message });
  }
}
