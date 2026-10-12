const API = 'https://api.github.com';

async function github<T>(path: string, token: string): Promise<T> {
	const response = await fetch(`${API}${path}`, {
		headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' },
	});
	if (!response.ok) throw new Error(`GitHub ${response.status}: ${path}`);
	return await response.json() as T;
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
