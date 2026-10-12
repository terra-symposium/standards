export async function enqueue(payload: Record<string, unknown>): Promise<void> {
  const origin = process.env.APP_ORIGIN;
  const secret = process.env.INTERNAL_JOB_SECRET;
  if (!origin || !secret) throw new Error('APP_ORIGIN and INTERNAL_JOB_SECRET are required');
  const response = await fetch(new URL('/api/ingest-background', origin), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-internal-secret': secret },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Could not enqueue workflow report ingestion: ${response.status}`);
}
