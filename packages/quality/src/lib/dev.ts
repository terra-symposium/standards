#!/usr/bin/env node

/**
 * Starts a local development server after acquiring its configured TCP port.
 */

import { spawn } from 'node:child_process';
import { basename } from 'node:path';
import { acquirePort } from './port.js';

main().catch(error => {
	console.error('[terra-quality-dev] ' + (error instanceof Error ? error.message : String(error)));
	process.exitCode = 1;
});

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const separator = args.indexOf('--');
	if (separator < 0 || separator === args.length - 1) {
		throw new Error('Usage: terra-quality-dev [--port PORT] -- <dev-server> [arguments...]');
	}

	const wrapperArgs = args.slice(0, separator);
	const command = args[separator + 1];
	const commandArgs = args.slice(separator + 2);
	const wrapperPort = readPortOption(wrapperArgs);
	const childPort = readPortOption(commandArgs);
	const configuredPort = process.env.DOCS_DEV_PORT ?? process.env.TERRA_DEV_PORT ?? process.env.PORT;
	const port = configuredPort !== undefined ? Number(configuredPort) : wrapperPort ?? childPort ?? defaultPort(command);

	if (!Number.isInteger(port) || port < 1 || port > 65535) {
		throw new Error('Development port must be an integer between 1 and 65535.');
	}
	if (childPort !== undefined && childPort !== port) {
		throw new Error('The wrapper port and dev server --port must match.');
	}

	await acquirePort(port);

	const finalArgs = [...commandArgs];
	if (childPort === undefined) finalArgs.push('--port', String(port));
	if (!finalArgs.includes('--strictPort')) finalArgs.push('--strictPort');
	await run(command, finalArgs);
}

function readPortOption(values: string[]): number | undefined {
	for (let index = 0; index < values.length; index += 1) {
		const value = values[index];
		if (value === '--port') {
			const next = values[index + 1];
			if (!next || next.startsWith('--')) throw new Error('Expected a value after --port.');
			return Number(next);
		}
		if (value.startsWith('--port=')) return Number(value.slice('--port='.length));
	}
	return undefined;
}

function defaultPort(commandName: string): number {
	const executable = basename(commandName).toLowerCase();
	return executable === 'vite' || executable.startsWith('vite.') ? 5173 : 4321;
}

function run(executable: string, executableArgs: string[]): Promise<void> {
	return new Promise(resolve => {
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
		child.once('error', error => {
			console.error('[terra-quality-dev] Could not start the dev server: ' + error.message);
			finish(1, null);
		});
		child.once('exit', finish);
	});
}
