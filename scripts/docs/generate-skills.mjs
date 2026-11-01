/**
 * scripts/docs/generate-skills.mjs
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, relative, resolve } from 'node:path';

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const SHARED_REGEX = /[\\/]/;
const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const sharedSkillsRoot = join(repoRoot, '.agents', 'skills');
const docsSkillsRoot = join(repoRoot, 'docs', '.agents', 'skills');
const packagesRoot = join(repoRoot, 'packages');
const genDir = join(repoRoot, 'scripts/docs');
const dataPath = join(genDir, 'skills.generated.json');
const skillRoots = [];
const packageEntries = await readdir(packagesRoot, { withFileTypes: true }).catch((err) => {
	if (err.code === 'ENOENT') return [];
	throw err;
});
const skillsByRoot = await Promise.all(
	skillRoots.map(async ({ package: packageName, path: root }) =>
		Promise.all(
			(await findSkills(root)).map(async (path) => {
				const source = await readFile(path, 'utf8');
				const metadata = source.match(/^---\n([\s\S]*?)\n---\n/);
				const title = source.match(/^#\s+(.+)$/m)?.[1];
				const name = metadata?.[1].match(/^name:\s*(.+)$/m)?.[1]?.trim();
				const description = metadata?.[1].match(/^description:\s*(.+)$/m)?.[1]?.trim();
				const body = source.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/)?.[1]?.trim();
				if (!metadata || !title || !name || !description || !body) throw new Error(`Incomplete skill metadata: ${relative(repoRoot, path)}`);
				const dir = relative(root, path).split(SHARED_REGEX).slice(0, -1).join('/');
				const sourcePath = relative(repoRoot, path).split(SHARED_REGEX).join('/');
				return { body, description, directory: dir, name, package: packageName, sourcePath, title };
			}),
		),
	),
);
const skills = skillsByRoot.flat();

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Recursively finds skill Markdown files under a directory.
 *
 * @param dir - Directory to search for files named `SKILL.md`.
 * @returns The absolute paths of all discovered skill files.
 */
async function findSkills(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	const nested = await Promise.all(
		entries.map(async (entry) => {
			const path = join(dir, entry.name);
			if (entry.isDirectory()) return findSkills(path);
			return entry.name === 'SKILL.md' ? [path] : [];
		}),
	);
	return nested.flat();
}
if (
	await access(sharedSkillsRoot)
		.then(() => true)
		.catch(() => false)
)
	skillRoots.push({ package: 'shared', path: sharedSkillsRoot });
if (
	await access(docsSkillsRoot)
		.then(() => true)
		.catch(() => false)
)
	skillRoots.push({ package: 'docs', path: docsSkillsRoot });
for (const entry of packageEntries) {
	if (!entry.isDirectory()) continue;
	const packageSkillsRoot = join(packagesRoot, entry.name, '.agents', 'skills');
	if (
		await access(packageSkillsRoot)
			.then(() => true)
			.catch(() => false)
	)
		skillRoots.push({ package: entry.name, path: packageSkillsRoot });
}

// The portfolio build vendors this Docs site without the Standards repository root.
// Its committed skills snapshot remains the source until the next repository build.
if (skillRoots.length === 0) {
	await access(dataPath);
	process.exit(0);
}
skills.sort((first, second) => `${first.package}/${first.directory}`.localeCompare(`${second.package}/${second.directory}`));
await mkdir(genDir, { recursive: true });
await writeFile(dataPath, `${JSON.stringify(skills, null, '\t')}\n`);
