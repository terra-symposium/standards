import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import test from 'node:test';
import { acquirePort, portOwners } from '../dist/port.js';

test('acquirePort terminates an existing listener and releases the port', async () => {
	const port = 47_654;
	const child = spawn(process.execPath, ['--input-type=module', '-e', `import net from 'node:net'; net.createServer().listen(${port}, '127.0.0.1'); setInterval(() => {}, 1000);`]);
	await new Promise(resolve => setTimeout(resolve, 200));
	assert.ok(portOwners(port).includes(child.pid));
	await acquirePort(port);
	assert.deepEqual(portOwners(port), []);
	child.kill('SIGKILL');
});
