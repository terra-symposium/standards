import { lstat, mkdir, readlink, symlink } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cache = resolve(project, '../../dist/cache/apps/hygiene');
const link = join(cache, 'node_modules');
const dependencies = join(project, 'node_modules');

await mkdir(cache, { recursive: true });
try {
	if (!(await lstat(link)).isSymbolicLink() || resolve(cache, await readlink(link)) !== dependencies) throw new Error(`Unexpected dependency path: ${link}`);
} catch (err) {
	if (err?.code !== 'ENOENT') throw err;
	await symlink(relative(cache, dependencies), link);
}
