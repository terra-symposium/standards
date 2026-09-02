import { readFileSync } from 'node:fs';
import ts from 'typescript';
import type { QualityConfig } from './config.js';
import { displayPath, sourceFiles } from './files.js';

export const IDENTIFIER_REPLACEMENTS = Object.freeze({
	organization: 'org', organisation: 'org', organizations: 'orgs', organisations: 'orgs', member: 'mem', members: 'mems', error: 'err', errors: 'errs', request: 'req', requests: 'reqs', response: 'res', contexts: 'ctxs', context: 'ctx', configuration: 'cfg', configurations: 'cfgs', option: 'opt', options: 'opts', parameter: 'param', parameters: 'params', source: 'src', target: 'tgt', value: 'val', values: 'vals', record: 'rec', records: 'recs', current: 'curr', previous: 'prev',
});

export const PREFIX_REPLACEMENTS = Object.freeze({ safe: 's', normalise: 'norm', normalised: 'norm', normalises: 'norm', normalize: 'norm', normalized: 'norm', normalizes: 'norm', clean: 'c', cleaned: 'c', cleaner: 'c', calculate: 'calc', calculated: 'calc', validate: 'valid', validated: 'valid', validation: 'valid', sanitize: 'san', sanitized: 'san' });

export const CALLBACK_ALIASES = Object.freeze({ workshop: 'w', workshops: 'w', customer: 'c', customers: 'c', opportunity: 'o', opportunities: 'o', organization: 'o', organisation: 'o', organizations: 'o', organisations: 'o', member: 'm', members: 'm', record: 'r', records: 'r', stage: 's', stages: 's', item: 'i', items: 'i', entry: 'e', entries: 'e', event: 'e', events: 'e', candidate: 'c', candidates: 'c', value: 'v', values: 'v', result: 'r', results: 'r', option: 'o', options: 'o', section: 's', sections: 's', group: 'g', groups: 'g', file: 'f', files: 'f', row: 'r', rows: 'r', column: 'c', columns: 'c', problem: 'p', problems: 'p', node: 'n', nodes: 'n', edge: 'e', edges: 'e', link: 'l', links: 'l', data: 'd', intent: 'v', intents: 'v' });
export const CALLBACK_METHODS = new Set(['map', 'flatMap']);
export const PROTECTED_IDENTIFIERS = new Set(['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE', 'default', 'Error', 'FormData', 'Headers', 'NextRequest', 'NextResponse', 'Request', 'Response', 'URL', 'URLSearchParams', 'WebSocket', 'ErrorBoundary', 'CarouselContextProps', 'ChartContextProps', 'FormSelectOptionProps', 'SidebarContextProps']);
export const PROTECTED_PATH_PARTS = new Set(['node_modules', '.next', 'out', 'build', 'coverage', 'src/components/ui']);
export const PROTECTED_FILENAMES = new Set(['page.tsx', 'page.ts', 'layout.tsx', 'layout.ts', 'route.ts', 'route.tsx', 'error.tsx', 'loading.tsx', 'not-found.tsx', 'index.ts', 'index.tsx']);
export const CODE_EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts']);

export function identifierTokens(name: string): string[] {
	return name.split(/[_-]/).flatMap(part => part.match(/[A-Z]+(?=[A-Z][a-z]|\d|$)|[A-Z]?[a-z]+|\d+/g) ?? [part]).filter(Boolean);
}

function renderIdentifier(original: string, tokens: string[]): string {
	if (/^[A-Z][A-Z0-9_]*$/.test(original)) return tokens.join(original.includes('_') ? '_' : '').toUpperCase();
	if (original.includes('_')) return tokens.join('_');
	if (original.includes('-')) return tokens.join('-');
	if (/^[A-Z]/.test(original)) return tokens.map(token => token.charAt(0).toUpperCase() + token.slice(1)).join('');
	return tokens.map((token, i) => (i === 0 ? token.toLowerCase() : token.charAt(0).toUpperCase() + token.slice(1))).join('');
}

export function callbackAlias(name: string, reserved: string[] = []): string {
	const preferred = CALLBACK_ALIASES[name.toLowerCase() as keyof typeof CALLBACK_ALIASES] ?? identifierTokens(name)[0]?.charAt(0).toLowerCase() ?? 'v';
	if (!reserved.includes(preferred)) return preferred;
	for (const fallback of ['v', 'r', 'x', 'd', 'n', 'e', 'c', 's']) if (!reserved.includes(fallback)) return fallback;
	return preferred;
}

export function renameIdentifier(name: string, kind: { numericIndex?: boolean; callback?: boolean; reserved?: string[] } = {}): string {
	if (PROTECTED_IDENTIFIERS.has(name) || name === '_') return name;
	if (kind.numericIndex && name === 'index') return 'i';
	if (kind.callback) return callbackAlias(name, kind.reserved);
	const tokens = identifierTokens(name);
	if (!tokens.some(token => Object.hasOwn(IDENTIFIER_REPLACEMENTS, token.toLowerCase()) || Object.hasOwn(PREFIX_REPLACEMENTS, token.toLowerCase()))) return name;
	return renderIdentifier(name, tokens.map((token, i) => {
		const lower = token.toLowerCase();
		return i === 0 && Object.hasOwn(PREFIX_REPLACEMENTS, lower) ? PREFIX_REPLACEMENTS[lower as keyof typeof PREFIX_REPLACEMENTS] : IDENTIFIER_REPLACEMENTS[lower as keyof typeof IDENTIFIER_REPLACEMENTS] ?? token;
	}));
}

export function hasPrefixReplacement(name: string): boolean {
	return Object.hasOwn(PREFIX_REPLACEMENTS, identifierTokens(name)[0]?.toLowerCase() ?? '');
}

export function isProtectedPath(fileName: string): boolean {
	const normalized = fileName.replaceAll('\\', '/');
	return normalized.endsWith('.d.ts') || [...PROTECTED_PATH_PARTS].some(part => part.includes('/') ? normalized === part || normalized.startsWith(`${part}/`) || normalized.includes(`/${part}/`) : normalized.split('/').includes(part));
}

export function isProtectedFilename(fileName: string): boolean {
	return PROTECTED_FILENAMES.has(fileName.split(/[\\/]/).at(-1) ?? fileName);
}

export function isApprovedIdentifier(name: string, kind: { numericIndex?: boolean; callback?: boolean; reserved?: string[] } = {}): boolean {
	return renameIdentifier(name, kind) === name;
}

export type NamingFinding = { file: string; name: string; suggestion: string; severity: 'error' | 'warning' };

/** Reports concise-name drift without mutating the consumer repository. */
export function namingFindings(config: QualityConfig): NamingFinding[] {
	const protectedNames = new Set([...PROTECTED_IDENTIFIERS, ...(config.protectedIdentifiers ?? [])]);
	const findings: NamingFinding[] = [];
	for (const fileName of sourceFiles(config)) {
		const file = ts.createSourceFile(fileName, readFileSync(fileName, 'utf8'), ts.ScriptTarget.Latest, true, fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
		const inspect = (node: ts.Node): void => {
			if (ts.isIdentifier(node) && !protectedNames.has(node.text)) {
				const suggestion = renameIdentifier(node.text);
				if (suggestion !== node.text && node.parent && !ts.isPropertyAccessExpression(node.parent) && !ts.isPropertyAssignment(node.parent)) findings.push({ file: displayPath(config, fileName), name: node.text, suggestion, severity: hasPrefixReplacement(node.text) ? 'warning' : 'error' });
			}
			ts.forEachChild(node, inspect);
		};
		inspect(file);
	}
	return findings;
}
