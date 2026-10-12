import { createSign } from 'node:crypto';

const API = 'https://api.github.com';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function appPrivateKey(): string {
  const value = required('GITHUB_APP_PRIVATE_KEY');
  const key = value.startsWith('base64:') ? Buffer.from(value.slice(7), 'base64').toString('utf8') : value;
  return key.replace(/\\n/g, '\n');
}

export function appJwt(): string {
  const now = Math.floor(Date.now() / 1000);
  const head = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ iat: now - 60, exp: now + 540, iss: required('GITHUB_APP_ID') })).toString('base64url');
  const sign = createSign('RSA-SHA256');
  sign.update(`${head}.${body}`);
  const signature = sign.sign(appPrivateKey(), 'base64url');
  return `${head}.${body}.${signature}`;
}

async function githubResponse<T>(path: string, token: string, init: RequestInit = {}): Promise<{ data: T; headers: Headers }> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', ...init.headers },
  });
  if (!response.ok) throw new Error(`GitHub ${response.status}: ${path}`);
  return { data: await response.json() as T, headers: response.headers };
}

export async function github<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  return (await githubResponse<T>(path, token, init)).data;
}

export async function installationToken(id: number): Promise<string> {
  const data = await github<{ token: string }>(`/app/installations/${id}/access_tokens`, appJwt(), { method: 'POST' });
  return data.token;
}

export async function repositoryAdmin(owner: string, name: string, login: string, token: string): Promise<boolean> {
  try {
    const result = await github<{ permission: string }>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/collaborators/${encodeURIComponent(login)}/permission`, token);
    return result.permission === 'admin';
  } catch (error) {
    if (String(error).includes('GitHub 404:')) return false;
    throw error;
  }
}

export type GithubRepository = { id: number; name: string; private: boolean; owner?: { login: string }; full_name?: string };
export type WorkflowRun = { id: number; run_attempt: number; event: string; status: string; conclusion: string | null; head_branch: string | null; head_sha: string; updated_at: string; repository: GithubRepository; installation?: { id: number } };

export async function downloadArtifact(owner: string, name: string, artifactId: number, token: string): Promise<Uint8Array> {
  const response = await fetch(`${API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/actions/artifacts/${artifactId}/zip`, {
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' },
  });
  if (!response.ok) throw new Error(`Artifact ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > 30_000_000) throw new Error('Artifact exceeds 30 MB');
  return bytes;
}
