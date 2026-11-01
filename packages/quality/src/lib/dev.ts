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

/** Starts a configured development server after applying boundaries and reserving its port. */
async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const separator = args.indexOf('--');
	if (separator < 0 || separator === args.length - 1) throw new Error('Usage: terra-quality-dev [--port PORT] -- <dev-server> [arguments...]');
	const wrapperArgs = args.slice(0, separator);
	const cmd = args[separator + 1];
	const cmdArgs = args.slice(separator + 2);
	const wrapperPort = readPortOption(wrapperArgs);
	const childPort = readPortOption(cmdArgs);
	const configuredPort = process.env.DOCS_DEV_PORT ?? process.env.TERRA_DEV_PORT ?? process.env.PORT;
	const port = configuredPort !== undefined ? Number(configuredPort) : (wrapperPort ?? childPort ?? defaultPort(cmd));
	if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Development port must be an integer between 1 and 65535.');
	if (childPort !== undefined && childPort !== port) throw new Error('The wrapper port and dev server --port must match.');
	applyErrBoundaries();
	await acquirePort(port);
	const finalArgs = [...cmdArgs];
	if (childPort === undefined) finalArgs.push('--port', String(port));
	if (!finalArgs.includes('--strictPort')) finalArgs.push('--strictPort');
	await run(cmd, finalArgs);
}

/**
 * Applies mandatory React and Astro boundaries before a configured JS/TS app starts.
 *
 */
function applyErrBoundaries(): void {
	if (!existsSync('quality.json')) return;
	const runner = fileURLToPath(new URL('./runner.js', import.meta.url));
	const result = spawnSync(process.execPath, [runner, 'error-boundaries', '--all'], { cwd: process.cwd(), env: process.env, stdio: 'inherit' });
	if (result.status !== 0) throw new Error('Could not apply the configured application error boundaries.');
}

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

/**
 * Selects the conventional local port for the configured development server.
 *
 * @param cmdName Executable used to start the server.
 *
 * @return Vite's default port, or the Astro development port for other servers.
 */
function defaultPort(cmdName: string): number {
	const executable = basename(cmdName).toLowerCase();
	return executable === 'vite' || executable.startsWith('vite.') ? 5173 : 4321;
}

/**
 * Runs the development server while forwarding termination signals to its child process.
 *
 * @param executable Command or executable path to launch.
 * @param executableArgs Arguments passed to the development server.
 */
function run(executable: string, executableArgs: string[]): Promise<void> {
	return new Promise((resolve) => {
		const child = spawn(executable, executableArgs, { cwd: process.cwd(), env: process.env, stdio: 'inherit' });
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
		child.once('error', (error) => {
			console.error('[terra-quality-dev] Could not start the dev server: ' + error.message);
			finish(1, null);
		});
		child.once('exit', finish);
	});
}
main().catch((error) => {
	console.error('[terra-quality-dev] ' + (error instanceof Error ? error.message : String(error)));
	process.exitCode = 1;
});
