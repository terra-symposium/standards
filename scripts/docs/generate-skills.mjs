import { access, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, relative, resolve } from 'node:path';

const repositoryRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const sharedSkillsRoot = join(repositoryRoot, '.agents', 'skills');
const docsSkillsRoot = join(repositoryRoot, 'docs', '.agents', 'skills');
const packagesRoot = join(repositoryRoot, 'packages');
const generatedDirectory = join(repositoryRoot, 'scripts/docs');
const dataPath = join(generatedDirectory, 'skills.generated.json');

const skillRoots = [];
if (
	await access(sharedSkillsRoot)
		.then(() => true)
		.catch(() => false)
) {
	skillRoots.push({ package: 'shared', path: sharedSkillsRoot });
}
if (
	await access(docsSkillsRoot)
		.then(() => true)
		.catch(() => false)
) {
	skillRoots.push({ package: 'docs', path: docsSkillsRoot });
}
const packageEntries = await readdir(packagesRoot, { withFileTypes: true }).catch((error) => {
	if (error.code === 'ENOENT') return [];
	throw error;
});
for (const entry of packageEntries) {
	if (!entry.isDirectory()) continue;
	const packageSkillsRoot = join(packagesRoot, entry.name, '.agents', 'skills');
	if (
		await access(packageSkillsRoot)
			.then(() => true)
			.catch(() => false)
	) {
		skillRoots.push({ package: entry.name, path: packageSkillsRoot });
	}
}

// The portfolio build vendors this Docs site without the Standards repository root.
// Its committed skills snapshot remains the source until the next repository build.
if (skillRoots.length === 0) {
	await access(dataPath);
	process.exit(0);
}

async function findSkills(directory) {
	const entries = await readdir(directory, { withFileTypes: true });
	const nested = await Promise.all(
		entries.map(async (entry) => {
			const path = join(directory, entry.name);
			if (entry.isDirectory()) return findSkills(path);
			return entry.name === 'SKILL.md' ? [path] : [];
		}),
	);
	return nested.flat();
}

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
				if (!metadata || !title || !name || !description || !body) {
					throw new Error(`Incomplete skill metadata: ${relative(repositoryRoot, path)}`);
				}
				const directory = relative(root, path).split(/[\\/]/).slice(0, -1).join('/');
				const sourcePath = relative(repositoryRoot, path).split(/[\\/]/).join('/');
				return { body, description, directory, name, package: packageName, sourcePath, title };
			}),
		),
	),
);
const skills = skillsByRoot.flat();
skills.sort((first, second) => `${first.package}/${first.directory}`.localeCompare(`${second.package}/${second.directory}`));

await mkdir(generatedDirectory, { recursive: true });
await writeFile(dataPath, `${JSON.stringify(skills, null, '\t')}\n`);
