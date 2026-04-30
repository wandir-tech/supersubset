import type { NextApiRequest, NextApiResponse } from 'next';
import { requireWorkbenchAuthorization } from '../../../../lib/workbench-auth';
import { workbenchDatasets } from '../../../../lib/workbench-shared';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Method not allowed.' });
  }

  if (!requireWorkbenchAuthorization(req.headers.authorization)) {
    return res.status(401).json({ message: 'Unauthorized. Provide the local demo bearer token.' });
  }

  return res.status(200).json({ datasets: workbenchDatasets });
}
