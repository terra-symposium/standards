#!/usr/bin/env node

/**
 * Starts a local development server after acquiring its configured TCP port.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { acquirePort } from './port.js';
import { basename } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/*
 * Starts a configured development server after applying boundaries and reserving its port.
 *
 */
(async () => {
	const args = process.argv.slice(2);
	const separator = args.indexOf('--');
	if (separator < 0 || separator === args.length - 1) throw new Error('Usage: terra-quality-dev [--port PORT] -- <dev-server> [arguments...]');
	const cmd = args[separator + 1];
	const cmdArgs = args.slice(separator + 2);
	const ports = {
		wrapper: readPortOption(args.slice(0, separator)),
		child: readPortOption(cmdArgs),
	};
	const configuredPort = process.env.DOCS_DEV_PORT ?? process.env.TERRA_DEV_PORT ?? process.env.PORT;
	const port = configuredPort !== undefined ? Number(configuredPort) : (ports.wrapper ?? ports.child ?? (/^vite(?:\.|$)/.test(basename(cmd).toLowerCase()) ? 5173 : 4321));
	if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Development port must be an integer between 1 and 65535.');
	if (ports.child !== undefined && ports.child !== port) throw new Error('The wrapper port and dev server --port must match.');
	if (
		(existsSync('quality.json') || existsSync('config/quality.json')) &&
		spawnSync(process.execPath, [fileURLToPath(new URL('./runner.js', import.meta.url)), 'error-boundaries', '--all'], { cwd: process.cwd(), env: process.env, stdio: 'inherit' }).status !== 0
	)
		throw new Error('Could not apply the configured application error boundaries.');
	await acquirePort(port);
	const finalArgs = [...cmdArgs];
	if (ports.child === undefined) finalArgs.push('--port', String(port));
	if (!finalArgs.includes('--strictPort')) finalArgs.push('--strictPort');
	await new Promise<void>((resolve) => {
		const child = spawn(cmd, finalArgs, {
			cwd: process.cwd(),
			env: process.env,
			stdio: 'inherit',
		});
		let finished = false;
		const finish = (code: number | null, signal: NodeJS.Signals | null) => {
			if (finished) return;
			finished = true;
			process.removeListener('SIGINT', forwardInterrupt);
			process.removeListener('SIGTERM', forwardTerminate);
			process.exitCode = code ?? (signal ? 1 : 0);
			resolve();
		};
		const forwardInterrupt = () => child.kill('SIGINT');
		const forwardTerminate = () => child.kill('SIGTERM');
		process.once('SIGINT', forwardInterrupt);
		process.once('SIGTERM', forwardTerminate);
		child.once('error', (err) => {
			console.error('[terra-quality-dev] Could not start the dev server: ' + err.message);
			finish(1, null);
		});
		child.once('exit', finish);
	});
})().catch((err) => {
	console.error('[terra-quality-dev] ' + (err instanceof Error ? err.message : String(err)));
	process.exitCode = 1;
});

/**
 * Reads a development-server port from either supported CLI option form.
 *
 * @param values Arguments to scan for `--port value` or `--port=value`.
 *
 * @return The parsed port, or `undefined` when neither option is present.
 */
function readPortOption(values: string[]): number | undefined {
	for (let index = 0; index < values.length; index += 1) {
		const value = values[index];
		if (value === '--port') {
			const n = values[index + 1];
			if (!n || n.startsWith('--')) throw new Error('Expected a value after --port.');
			return Number(n);
		}
		if (value.startsWith('--port=')) return Number(value.slice('--port='.length));
	}
	return undefined;
}
