import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, relative, resolve } from 'node:path';

const repositoryRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const skillsRoot = join(repositoryRoot, '.agents', 'skills');
const outputDirectory = join(repositoryRoot, 'docs/src/content/docs/skills');
const generatedDirectory = join(repositoryRoot, 'docs/src/generated');
const indexPath = join(outputDirectory, 'index.mdx');
const dataPath = join(generatedDirectory, 'skills.json');

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

const skills = await Promise.all(
	(await findSkills(skillsRoot)).map(async (path) => {
		const source = await readFile(path, 'utf8');
		const metadata = source.match(/^---\n([\s\S]*?)\n---\n/);
		const title = source.match(/^#\s+(.+)$/m)?.[1];
		const name = metadata?.[1].match(/^name:\s*(.+)$/m)?.[1]?.trim();
		const description = metadata?.[1].match(/^description:\s*(.+)$/m)?.[1]?.trim();
		const body = source.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/)?.[1]?.trim();
		if (!metadata || !title || !name || !description || !body) {
			throw new Error(`Incomplete skill metadata: ${relative(repositoryRoot, path)}`);
		}
		const directory = relative(skillsRoot, path).split(/[\\/]/).slice(0, -1).join('/');
		return { body, description, directory, name, title };
	}),
);
skills.sort((first, second) => first.directory.localeCompare(second.directory));

// Keep one documentation route and generate its data from the canonical agent skills.
await mkdir(outputDirectory, { recursive: true });
for (const entry of await readdir(outputDirectory, { withFileTypes: true })) {
	if (entry.name === 'index.mdx') continue;
	await rm(join(outputDirectory, entry.name), { recursive: true, force: true });
}
await mkdir(generatedDirectory, { recursive: true });
await writeFile(dataPath, `${JSON.stringify(skills, null, '\t')}\n`);

const index = `---\ntitle: Skills\ndescription: Browse the shared Terra agent skills.\n---\n\nimport SkillsExplorer from '../../../components/SkillsExplorer.tsx';\n\nBrowse the shared agent skills. Expand a group to find nested skills, then select a skill to inspect its Markdown source.\n\n<SkillsExplorer client:load />\n`;
await writeFile(indexPath, index);
