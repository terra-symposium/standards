import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

for (const file of ['index.js', ...(await readdir('lib')).filter(file => file.endsWith('.js')).map(file => `lib/${file}`)]) {
	const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
	if (result.error) throw result.error;
	if (result.status !== 0) process.exit(result.status ?? 1);
}
