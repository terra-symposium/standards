/**
 * apps/hygiene/src/lib/server/github.ts
 */

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

const API = 'https://api.github.com';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Requests a JSON resource from the GitHub REST API.
 *
 * @param path API path appended to the GitHub API base URL.
 * @param token OAuth or installation access token sent as a bearer credential.
 * @returns The decoded response body.
 * @throws {Error} If GitHub returns a non-success status.
 */
async function github<T>(path: string, token: string): Promise<T> {
	const response = await fetch(`${API}${path}`, { headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' } });
	if (!response.ok) throw new Error(`GitHub ${response.status}: ${path}`);
	return (await response.json()) as T;
}
/**
 * Checks whether a GitHub account has administrator permission on a repository.
 *
 * @param owner Repository owner login.
 * @param name Repository name.
 * @param login GitHub login whose collaborator permission should be checked.
 * @param token Access token used for the GitHub API request.
 * @returns Whether GitHub reports administrator permission; a 404 is treated as `false`.
 * @throws {Error} If the permission request fails for a reason other than a missing resource.
 */
export async function repositoryAdmin(owner: string, name: string, login: string, token: string): Promise<boolean> {
	try {
		const result = await github<{ permission: string }>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/collaborators/${encodeURIComponent(login)}/permission`, token);
		return result.permission === 'admin';
	} catch (err) {
		if (String(err).includes('GitHub 404:')) return false;
		throw err;
	}
}
/** GitHub repository fields used by the dashboard's installation and repository sync. */
export type GithubRepository = { id: number; name: string; private: boolean; owner?: { login: string }; full_name?: string };
