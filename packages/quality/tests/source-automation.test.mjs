/**
 * packages/quality/test/source-automation.test.mjs
 * Verifies conservative JSX accessible-name and React display-name automation.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { accessibilityFindings, createQualityCfg, displayNameFindings, fixAccessibleNames, fixDisplayNames, qualityCheckEnabled, runQualityCli } from '../dist/index.js';
import { fixtureFile, fixtureRoot, fixtureText } from '../support/fixtures.mjs';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Creates a quality config scoped to one JSX fixture.
 *
 * @param source JSX contents written to the fixture's view component.
 *
 * @return Fixture root and quality configuration targeting the view component.
 */
function fixtureConfig(source) {
	const root = fixtureRoot('terra-quality-accessibility-');
	fixtureFile(root, 'src/view.tsx', source);
	return { root, cfg: createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx'] }) };
}

// terra-quality-ignore single-use -- Keep the documented verifySafeFixSourceOwnership declaration so its parameter and return contract remains attached.
/**
 * Confirms the explicit quality fix command preserves workflow behavior and generated assets.
 *
 * @return Nothing.
 */
function verifySafeFixSourceOwnership() {
	const root = fixtureRoot('terra-quality-source-fix-ownership-');
	execFileSync('git', ['init', '--quiet'], { cwd: root });
	fixtureFile(root, 'package.json', JSON.stringify({ type: 'module' }));
	fixtureFile(root, '.prettierrc.json', JSON.stringify({ useTabs: true, tabWidth: 2 }));
	const workflow = fixtureFile(
		root,
		'scripts/run-quality.mjs',
		`import { appendFileSync } from 'node:fs';
import { runQualityFromCfg } from './quality-stub.mjs';

/** Preserve the CLI argument order while identifiers receive concise aliases. */
function recordEvaluation(name, value) {
	appendFileSync('evaluation-order.log', name + '\\n');
	return value;
}

const repositoryRoot = recordEvaluation('root', process.cwd());
const command = recordEvaluation('args', process.argv.slice(2));
await runQualityFromCfg(repositoryRoot, command);
`,
	);
	fixtureFile(
		root,
		'scripts/quality-stub.mjs',
		`import { appendFileSync } from 'node:fs';
import { join } from 'node:path';

export async function runQualityFromCfg(root, args) {
	appendFileSync(join(root, 'forwarded-args.jsonl'), JSON.stringify(args) + '\\n');
}
`,
	);
	const courseDataPath = fixtureFile(root, 'content/course-data.js', `globalThis.COURSE_DATA = { title: 'Captured course', modules: [{ name: 'Week one' }] };\n`);
	fixtureFile(
		root,
		'src/vite-env.d.ts',
		`/// <reference types="vite/client" />\n\ninterface ImportMetaEnv {\n\treadonly VITE_API_URL: string;\n}\n\ninterface ImportMeta {\n\treadonly env: ImportMetaEnv;\n}\n`,
	);
	fixtureFile(
		root,
		'content/viewer/bundle.js',
		`!function(e){${'var module={};module.exports=function(value){return value+1};'.repeat(220)}};
//# sourceMappingURL=bundle.js.map
`,
	);
	const cfg = createQualityCfg({
		root,
		sourceRoots: ['.'],
		extensions: ['.js', '.mjs', '.ts', '.tsx'],
		tools: { prettier: fileURLToPath(new URL('../../../config/node_modules/.bin/prettier', import.meta.url)) },
		enabledChecks: {
			document: false,
			format: true,
			import: false,
			name: true,
			forward: false,
			accessibility: false,
			'display-name': false,
			'performance-patterns': false,
			'documented-commands': false,
			lint: false,
			knip: false,
			'dead-code': false,
			type: false,
			recommend: false,
			command: false,
			diff: false,
			alias: false,
			security: false,
			'repeated-classes': false,
			'tailwind-canonical': false,
			'regex-dedup': false,
			'ui-patterns': false,
			'ui-recommendations': false,
			'error-boundaries': false,
			github: false,
		},
	});
	const beforeCourseData = readFileSync(courseDataPath, 'utf8');
	const beforeDeclaration = readFileSync(join(root, 'src/vite-env.d.ts'), 'utf8');
	const beforeMinified = readFileSync(join(root, 'content/viewer/bundle.js'), 'utf8');
	const originalWorkflow = readFileSync(workflow, 'utf8');
	runQualityCli(cfg, ['quality', '--warn', '--skip-commands', '--skip-recommendations']);
	assert.equal(readFileSync(workflow, 'utf8'), originalWorkflow, 'warning mode must not modify an untracked source');
	assert.equal(readFileSync(courseDataPath, 'utf8'), beforeCourseData);
	assert.equal(readFileSync(join(root, 'src/vite-env.d.ts'), 'utf8'), beforeDeclaration);
	assert.equal(readFileSync(join(root, 'content/viewer/bundle.js'), 'utf8'), beforeMinified);
	runQualityCli(cfg, ['quality', '--safe-fix', '--skip-commands', '--skip-recommendations']);
	const fixedWorkflow = readFileSync(workflow, 'utf8');
	assert.match(fixedWorkflow, /const repoRoot = recordEvaluation\(["']root["'], process\.cwd\(\)\);/u);
	assert.match(fixedWorkflow, /const cmd = recordEvaluation\(["']args["'], process\.argv\.slice\(2\)\);/u);
	assert.match(fixedWorkflow, /runQualityFromCfg\(repoRoot, cmd\)/u);
	assert.match(fixedWorkflow, /\/\*\* Preserve the CLI argument order while identifiers receive concise aliases\. \*\//u);
	assert.ok(fixedWorkflow.indexOf('node:fs') < fixedWorkflow.indexOf('quality-stub.mjs'));
	assert.doesNotMatch(fixedWorkflow, /\/\/\s*(?:API|IMPORTS|HELPERS|CONFIG)\b/u);
	assert.equal(readFileSync(courseDataPath, 'utf8'), beforeCourseData);
	assert.equal(readFileSync(join(root, 'src/vite-env.d.ts'), 'utf8'), beforeDeclaration);
	assert.equal(readFileSync(join(root, 'content/viewer/bundle.js'), 'utf8'), beforeMinified);
	assert.deepEqual(execFileSync('git', ['ls-files', 'scripts/run-quality.mjs'], { cwd: root, encoding: 'utf8' }).trim(), '');
	const execution = spawnSync(process.execPath, [workflow, 'quality', '--warn', 'extra'], { cwd: root, encoding: 'utf8' });
	assert.equal(execution.status, 0, execution.stderr);
	assert.equal(readFileSync(join(root, 'evaluation-order.log'), 'utf8'), 'root\nargs\n');
	assert.deepEqual(JSON.parse(readFileSync(join(root, 'forwarded-args.jsonl'), 'utf8')), ['quality', '--warn', 'extra']);
	return root;
}

/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test('accessible names recognize ARIA, labels, static text, and image alternatives', () => {
	const { cfg } = fixtureConfig(`
const view = <>
	<button aria-label="Close" />
	<button aria-labelledby="closeText" />
	<span id="closeText">Close</span>
	<button>Save</button>
	<button><span>Close</span></button>
	<button>{'Save'}</button>
	<label htmlFor="email">Email <span>address</span></label>
	<input id="email" />
	<label><span>Notes</span><textarea /></label>
	<a href="/next">Next</a>
	<area href="/map" alt="Section" />
	<input type="image" alt="Search" />
	<button><img src="close.svg" alt="Close" /></button>
	<button><svg aria-label="Expand"><path /></svg></button>
	<div role="button">Open</div>
	<input type="submit" />
</>;
`);
	assert.deepEqual(accessibilityFindings(cfg), []);
});
test('new default-path checks require an explicit rollout toggle', () => {
	const cfg = createQualityCfg({ root: fixtureRoot('terra-quality-check-rollout-'), sourceRoots: ['src'], extensions: ['.tsx'] });
	assert.equal(qualityCheckEnabled(cfg, 'accessibility'), false);
	assert.equal(qualityCheckEnabled(cfg, 'display-name'), false);
	assert.equal(qualityCheckEnabled(cfg, 'documented-commands'), false);
	const enabled = createQualityCfg({ ...cfg, enabledChecks: { accessibility: true, 'display-name': true, 'documented-commands': true } });
	assert.equal(qualityCheckEnabled(enabled, 'accessibility'), true);
	assert.equal(qualityCheckEnabled(enabled, 'display-name'), true);
	assert.equal(qualityCheckEnabled(enabled, 'documented-commands'), true);
});
test('explicit safe fixes preserve untracked workflow semantics and leave captured assets untouched', () => {
	verifySafeFixSourceOwnership();
});
test('aria-labelledby requires a literal reference with source-evident content', () => {
	const { cfg } = fixtureConfig(`
const view = <>
	<button aria-labelledby="missing" />
	<button aria-labelledby="empty" />
	<span id="empty">{'   '}</span>
	<button aria-labelledby="dynamic" />
	<span id="dynamic">{label}</span>
	<button aria-labelledby="duplicate" />
	<span id="duplicate"></span>
	<span id="duplicate">Maybe</span>
	<button aria-labelledby="component" />
	<DisplayLabel id="component" />
	<button aria-labelledby="custom-element" />
	<custom-label id="custom-element" />
	<button aria-labelledby="known missing" />
	<span id="known">Save</span>
	<button aria-labelledby="known" />
</>;
`);
	assert.deepEqual(
		accessibilityFindings(cfg).map(({ element }) => element),
		['<button>', '<button>'],
	);
});
test('findings are limited to unnamed visible native and explicitly role-based controls', () => {
	const { cfg } = fixtureConfig(`
const view = <>
	<button />
	<input id="email" />
	<a href="/next" />
	<div role="switch" />
	<custom-button />
	<Button />
	<button hidden />
	<div aria-hidden="true"><button /></div>
	<input type="hidden" />
	<button>{label}</button>
	<button><Icon /></button>
	<button aria-label={label} />
	<button title={dynamicTitle} />
	<a>Not a link</a>
</>;
`);
	const findings = accessibilityFindings(cfg);
	assert.deepEqual(
		findings.map(({ element, fixable }) => [element, fixable]),
		[
			['<button>', false],
			['<input>', false],
			['<a>', false],
			['<div>[role="switch"]', false],
		],
	);
	assert.ok(findings.every(({ message }) => message.includes('add static text')));
});
test('progress values and aria-valuetext do not substitute for a progressbar accessible name', () => {
	const { cfg } = fixtureConfig(`
const view = <>
	<progress value={0.5}>50%</progress>
	<div role="progressbar" aria-valuenow="50" aria-valuetext="Halfway" />
	<progress aria-label="Upload progress" value={0.5} />
</>;
`);
	assert.deepEqual(
		accessibilityFindings(cfg).map(({ element }) => element),
		['<progress>', '<div>[role="progressbar"]'],
	);
});
test('title fixes copy only literal titles from controls with no visible or uncertain label', () => {
	const { root, cfg } = fixtureConfig(`
const view = <>
	<button title="Close" />
	<button title={'Open panel'} aria-label="" />
	<button title="Save">Save</button>
	<button title="Dynamic">{label}</button>
	<button title="Uncertain"><Icon /></button>
	<button title="Decorative"><svg aria-hidden="true"><path /></svg></button>
	<label htmlFor="search">Search</label>
	<input id="search" title="Search" />
</>;
`);
	assert.deepEqual(
		accessibilityFindings(cfg).map(({ fixable }) => fixable),
		[true, true, true],
	);
	assert.deepEqual(fixAccessibleNames(cfg), { fixed: 3 });
	const fixed = fixtureText(root, 'src/view.tsx');
	assert.match(fixed, /<button title="Close" aria-label="Close" \/>/);
	assert.match(fixed, /<button title=\{'Open panel'\} aria-label=\{'Open panel'\} \/>/);
	assert.match(fixed, /title="Decorative" aria-label="Decorative"/);
	assert.match(fixed, /<button title="Save">Save<\/button>/);
	assert.match(fixed, /<button title="Dynamic">\{label\}<\/button>/);
	assert.match(fixed, /<button title="Uncertain"><Icon \/><\/button>/);
	assert.deepEqual(fixAccessibleNames(cfg), { fixed: 0 });
});
test('decorative SVG fixes require an already named control and leave informative icons alone', () => {
	const { root, cfg } = fixtureConfig(`
const view = <>
	<button aria-label="Close"><svg><path /></svg></button>
	<button>Save <span><svg viewBox="0 0 10 10"><path /></svg></span></button>
	<button aria-label="Play"><svg role="img" aria-label="Play preview"><path /></svg></button>
</>;
`);
	assert.deepEqual(
		accessibilityFindings(cfg).map(({ element, fixable }) => [element, fixable]),
		[
			['<svg>', true],
			['<svg>', true],
		],
	);
	assert.deepEqual(fixAccessibleNames(cfg), { fixed: 2 });
	const fixed = fixtureText(root, 'src/view.tsx');
	assert.equal((fixed.match(/aria-hidden="true"/g) ?? []).length, 2);
	assert.match(fixed, /role="img" aria-label="Play preview"/);
	assert.deepEqual(fixAccessibleNames(cfg), { fixed: 0 });
});
test('malformed JSX is reported without edits', () => {
	const { root, cfg } = fixtureConfig('<button title="Save" aria-label=>');
	const before = fixtureText(root, 'src/view.tsx');
	assert.deepEqual(accessibilityFindings(cfg), []);
	assert.deepEqual(fixAccessibleNames(cfg), { fixed: 0 });
	assert.equal(fixtureText(root, 'src/view.tsx'), before);
});
test('displayName findings report direct forwardRef components and ignore wrapped forms', () => {
	const root = fixtureRoot('terra-quality-display-name-findings-');
	fixtureFile(
		root,
		'src/components.tsx',
		`const Missing = forwardRef<HTMLButtonElement, Props>((props, ref) => <button ref={ref} {...props} />);\nconst AlsoMissing = React.forwardRef((props, ref) => <button ref={ref} {...props} />);\nconst Wrapped = memo(forwardRef((props, ref) => <button ref={ref} {...props} />));\nconst Existing = React.forwardRef(() => null);\nExisting.displayName = 'Existing';\n`,
	);
	assert.deepEqual(displayNameFindings(createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx'] })), [
		{ file: 'src/components.tsx', line: 1, column: 7, component: 'Missing', recommendation: "add Missing.displayName = 'Missing'" },
		{ file: 'src/components.tsx', line: 2, column: 7, component: 'AlsoMissing', recommendation: "add AlsoMissing.displayName = 'AlsoMissing'" },
	]);
	assert.equal(fixtureText(root, 'src/components.tsx').includes("Missing.displayName = 'Missing'"), false);
});
test('displayName autofix is idempotent and preserves conflicting assignments', () => {
	const root = fixtureRoot('terra-quality-display-name-fix-');
	fixtureFile(
		root,
		'src/components.tsx',
		`const First = forwardRef(() => null);\nconst Existing = forwardRef(() => null);\nExisting.displayName = 'SpecializedName';\nconst Inline = forwardRef(() => null); const Other = React.forwardRef(() => null);\n`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx'] });
	assert.deepEqual(fixDisplayNames(cfg), { fixed: 1, skipped: 3 });
	assert.match(fixtureText(root, 'src/components.tsx'), /First\.displayName = 'First'/);
	assert.match(fixtureText(root, 'src/components.tsx'), /Existing\.displayName = 'SpecializedName'/);
	assert.deepEqual(fixDisplayNames(cfg), { fixed: 0, skipped: 3 });
});
test('displayName assignments resolve within lexical scope when component names repeat', () => {
	const root = fixtureRoot('terra-quality-display-name-scopes-');
	fixtureFile(
		root,
		'src/components.tsx',
		`function first() {\n\tconst Button = forwardRef(() => null);\n\tButton.displayName = 'Button';\n}\nfunction second() {\n\tconst Button = forwardRef(() => null);\n}\n`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx'] });
	assert.deepEqual(
		displayNameFindings(cfg).map(({ component, line }) => ({ component, line })),
		[{ component: 'Button', line: 6 }],
	);
	assert.deepEqual(fixDisplayNames(cfg), { fixed: 1, skipped: 0 });
	assert.match(fixtureText(root, 'src/components.tsx'), /function second\(\) \{\n\tconst Button = forwardRef\(\(\) => null\);\n\tButton\.displayName = 'Button';/);
	assert.deepEqual(displayNameFindings(cfg), []);
});
test('displayName accepts a shared primitive name while preserving review for custom strings', () => {
	const root = fixtureRoot('terra-quality-display-name-shared-primitive-');
	fixtureFile(
		root,
		'src/components.tsx',
		`const AccordionTrigger = React.forwardRef(() => null);\nAccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;\nconst Custom = React.forwardRef(() => null);\nCustom.displayName = 'SpecializedName';\n`,
	);
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx'] });
	assert.deepEqual(displayNameFindings(cfg), [{ file: 'src/components.tsx', line: 3, column: 7, component: 'Custom', recommendation: 'review existing Custom.displayName assignment' }]);
	assert.deepEqual(fixDisplayNames(cfg), { fixed: 0, skipped: 1 });
	assert.match(fixtureText(root, 'src/components.tsx'), /AccordionTrigger\.displayName = AccordionPrimitive\.Trigger\.displayName/);
	assert.match(fixtureText(root, 'src/components.tsx'), /Custom\.displayName = 'SpecializedName'/);
});
test('displayName fixer leaves malformed source untouched', () => {
	const root = fixtureRoot('terra-quality-display-name-malformed-');
	fixtureFile(root, 'src/components.tsx', 'const Broken = forwardRef(() => <button>');
	const cfg = createQualityCfg({ root, sourceRoots: ['src'], extensions: ['.tsx'] });
	const before = fixtureText(root, 'src/components.tsx');
	assert.deepEqual(displayNameFindings(cfg), []);
	assert.deepEqual(fixDisplayNames(cfg), { fixed: 0, skipped: 0 });
	assert.equal(fixtureText(root, 'src/components.tsx'), before);
});
