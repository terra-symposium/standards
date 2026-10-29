import { createHmac, timingSafeEqual } from 'node:crypto';
import { db } from '../../src/lib/server/db.js';
import type { GithubRepository } from '../../src/lib/server/github.js';

type Event = { action?: string; installation?: { id: number; account?: { login?: string } }; repositories?: GithubRepository[]; repositories_added?: GithubRepository[]; repositories_removed?: GithubRepository[] };

export function repositoryOwner(repo: GithubRepository, installationOwner?: string): string {
  const fullNameOwner = repo.full_name?.split('/');
  const owner = repo.owner?.login ?? (fullNameOwner?.length === 2 ? fullNameOwner[0] : undefined) ?? installationOwner;
  if (!owner) throw new Error(`Repository ${repo.id} is missing an owner`);
  return owner;
}

export function verifySignature(body: string, signature: string, secret: string): boolean {
  const expected = Buffer.from(`sha256=${createHmac('sha256', secret).update(body).digest('hex')}`);
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function acceptDelivery(delivery: string | null, claim: () => Promise<boolean>, process: () => Promise<void>, release: () => Promise<void>): Promise<boolean> {
  if (delivery && !(await claim())) return false;
  try {
    await process();
    return true;
  } catch (error) {
    if (delivery) await release();
    throw error;
  }
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const body = await request.text();
  if (!process.env.GITHUB_WEBHOOK_SECRET || !verifySignature(body, request.headers.get('x-hub-signature-256') ?? '', process.env.GITHUB_WEBHOOK_SECRET)) return new Response('Invalid signature', { status: 401 });
  const event = JSON.parse(body) as Event;
  const kind = request.headers.get('x-github-event');
  const installationId = event.installation?.id;
  if (!installationId) return new Response('Missing installation', { status: 400 });
  const sql = db();
  const delivery = request.headers.get('x-github-delivery');
  await acceptDelivery(
    delivery,
    async () => (await sql`INSERT INTO deliveries (id) VALUES (${delivery}) ON CONFLICT (id) DO UPDATE SET received_at = now()
      WHERE deliveries.received_at < now() - INTERVAL '15 minutes' RETURNING id`).length > 0,
    async () => {
      if (kind === 'installation' || kind === 'installation_repositories') {
        for (const repo of event.repositories ?? event.repositories_added ?? []) {
          const owner = repositoryOwner(repo, event.installation?.account?.login);
          await sql`INSERT INTO repositories (id, installation_id, owner, name, private, active) VALUES (${repo.id}, ${installationId}, ${owner}, ${repo.name}, ${repo.private}, true)
            ON CONFLICT (id) DO UPDATE SET installation_id = excluded.installation_id, owner = excluded.owner, name = excluded.name, private = excluded.private, active = true, updated_at = now()`;
          const defaultBranches = ['main', 'development'];
          for (const branch of defaultBranches) await sql`INSERT INTO branches (repository_id, name) VALUES (${repo.id}, ${branch}) ON CONFLICT DO NOTHING`;
        }
        for (const repo of event.repositories_removed ?? []) await sql`UPDATE repositories SET active = false, updated_at = now() WHERE id = ${repo.id}`;
        if (event.action === 'deleted') await sql`UPDATE repositories SET active = false, updated_at = now() WHERE installation_id = ${installationId}`;
      }
    },
    async () => { await sql`DELETE FROM deliveries WHERE id = ${delivery}`; },
  );
  return new Response(null, { status: 202 });
}
