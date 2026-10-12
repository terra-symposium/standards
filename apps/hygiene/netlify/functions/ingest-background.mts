import { validInternalSecret } from '../../src/server/auth.js';
import { ingestRun } from '../../src/server/ingest.js';

export const config = { background: true };

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST' || !validInternalSecret(request.headers.get('x-internal-secret') ?? '', process.env.INTERNAL_JOB_SECRET)) return new Response('Forbidden', { status: 403 });
  const data = await request.json() as { repositoryId: number; runId: number };
  await ingestRun(data.repositoryId, data.runId);
  return new Response(null, { status: 204 });
}
