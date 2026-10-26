/**
 * packages/quality/src/lib/ui-recommendations.ts
 * On-demand recommendations for native UI elements with shared component equivalents.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import ts from 'typescript';
import { displayPath, srcFiles } from './files.js';
import { readFileSync } from 'node:fs';

// TYPES
import type { QualityCfg } from './runner.js';

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const S_U_REGEX = /\s+/u;

/** One configured native JSX element and its suggested shared component. */
export type UiRecommendationRule = { element: string; component: string; import: string; variant?: string; types?: string[]; when?: 'always' | 'button-like' | 'text-link'; reason?: string };

/** Source scope and native-element mappings for the on-demand recommendation pass. */
export type UiRecommendationSettings = { rules?: UiRecommendationRule[]; extensions?: string[]; ignoredFiles?: string[]; ignoredDirectories?: string[] };

/** A source location and the shared component that may replace its native JSX element. */
export type UiComponentRecommendation = { file: string; line: number; column: number; element: string; component: string; import: string; variant?: string; reason: string };
const DEFAULT_RULES: UiRecommendationRule[] = [
	{ element: 'button', component: 'Button', import: '@/components/ui/button', reason: 'Use the shared button primitive to keep action variants and interaction states consistent.' },
	{
		element: 'input',
		component: 'Input',
		import: '@/components/ui/input',
		types: ['date', 'datetime-local', 'email', 'file', 'month', 'number', 'password', 'search', 'tel', 'text', 'time', 'url', 'week'],
		reason: 'Use the shared input primitive to keep control sizing, focus, and validation states consistent.',
	},
	{
		element: 'input',
		component: 'Button',
		import: '@/components/ui/button',
		types: ['button', 'reset', 'submit'],
		reason: 'Use the shared button primitive for this input-based action while preserving its type.',
	},
	{ element: 'a', component: 'ButtonLink', import: '@/components/ui/button', when: 'button-like', reason: 'This action-styled link can use ButtonLink while retaining anchor navigation semantics.' },
	{ element: 'a', component: 'ButtonLink', import: '@/components/ui/button', when: 'text-link', reason: 'This styled text link can use ButtonLink while retaining anchor navigation semantics.' },
];
const DEFAULT_EXTS = ['.astro', '.jsx', '.tsx'];

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Reads a literal JSX attribute value without evaluating runtime expressions.
 *
 * @param attr JSX attribute to inspect.
 *
 * @return Static string value, or undefined when the value is dynamic or absent.
 */
function staticAttrValue(attr: ts.JsxAttribute | undefined): string | undefined {
	const init = attr?.initializer;
	if (!init) return attr ? '' : undefined;
	if (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) return init.text;
	if (!ts.isJsxExpression(init) || !init.expression) return undefined;
	let expr = init.expression;
	while (ts.isParenthesizedExpression(expr)) expr = expr.expression;
	return ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr) ? expr.text : undefined;
}

/**
 * Returns one JSX attribute by its exact lower-case name.
 *
 * @param element JSX opening element to inspect.
 * @param name Attribute name to find.
 *
 * @return Matching attribute when present.
 */
function jsxAttr(element: ts.JsxOpeningLikeElement, name: string): ts.JsxAttribute | undefined {
	return element.attributes.properties.find((property): property is ts.JsxAttribute => ts.isJsxAttribute(property) && ts.isIdentifier(property.name) && property.name.text === name);
}

/**
 * Checks whether static anchor classes resemble an action control.
 *
 * @param value Static class attribute value.
 *
 * @return `true` when the link has button-like spacing and shape.
 */
function isButtonLike(value: string | undefined): boolean {
	const classes = new Set((value ?? '').split(S_U_REGEX).filter(Boolean));
	const hasHorizontalPadding = [...classes].some((className) => /^px-/u.test(className));
	const hasVerticalPadding = [...classes].some((className) => /^py-/u.test(className));
	const hasShape = [...classes].some((className) => className === 'border' || className === 'inline-flex' || className === 'flex' || className.startsWith('rounded'));
	const hasActionStyle = [...classes].some((className) => className === 'font-medium' || className === 'no-underline' || className.startsWith('bg-'));
	return hasHorizontalPadding && hasVerticalPadding && hasShape && hasActionStyle;
}

/**
 * Resolves the shared text-link variant represented by static anchor classes.
 *
 * @param value Static class attribute value.
 *
 * @return A ButtonLink variant for recognized text-link styling.
 */
function textLinkVariant(value: string | undefined): string | undefined {
	const classes = new Set((value ?? '').split(S_U_REGEX).filter(Boolean));
	const color = classes.has('text-primary')
		? 'primary'
		: classes.has('text-secondary-foreground')
			? 'secondary'
			: classes.has('text-destructive')
				? 'destructive'
				: classes.has('text-foreground')
					? 'gray'
					: undefined;
	const underlined = classes.has('underline');
	if (!color || (!underlined && !classes.has('hover:underline'))) return undefined;
	return `${color}-${underlined ? 'underline' : 'link'}`;
}

/**
 * Reads static classes from JSX/TSX or Astro's `class` attribute.
 *
 * @param element JSX opening element to inspect.
 *
 * @return Static class string when available.
 */
function staticClasses(element: ts.JsxOpeningLikeElement): string | undefined {
	return staticAttrValue(jsxAttr(element, 'className')) ?? staticAttrValue(jsxAttr(element, 'class'));
}

/**
 * Checks whether a recommendation rule applies to one intrinsic JSX element.
 *
 * @param rule Configured replacement and conditions.
 * @param element JSX opening element to inspect.
 *
 * @return `true` when the rule's element, input type, and style conditions match.
 */
function ruleMatches(rule: UiRecommendationRule, element: ts.JsxOpeningLikeElement): boolean {
	const type = jsxAttr(element, 'type');
	if (rule.types) {
		const typeValue = type ? staticAttrValue(type) : 'text';
		if (typeValue === undefined || !rule.types.includes(typeValue.toLowerCase())) return false;
	}
	if (rule.when === 'button-like') return isButtonLike(staticClasses(element));
	if (rule.when === 'text-link') return Boolean(textLinkVariant(staticClasses(element)));
	return true;
}

/**
 * Checks whether a source file belongs to a UI primitive implementation directory.
 *
 * @param file Repository-relative source path.
 * @param ignoredDirs Explicit repository-relative directories to skip.
 * @param ignoredFiles Explicit repository-relative files to skip.
 *
 * @return `true` when the file is an implementation or an explicitly skipped path.
 */
function isIgnoredFile(file: string, ignoredDirs: string[], ignoredFiles: Set<string>): boolean {
	const norm = file.replaceAll('\\', '/');
	const segments = norm.split('/');
	const primitiveDir = segments.some((segment, i) => segment === 'components' && segments[i + 1] === 'ui');
	return (
		primitiveDir ||
		ignoredFiles.has(norm) ||
		ignoredDirs.some((directory) => {
			const prefix = directory.replaceAll('\\', '/').replace(/^\/+|\/+$/gu, '');
			return prefix && (norm === prefix || norm.startsWith(`${prefix}/`));
		})
	);
}

/*//////////////////////////////////////////////////
RECOMMENDATIONS
//////////////////////////////////////////////////*/

/**
 * Finds UI elements that have a configured or conventional shared-component equivalent.
 *
 * The scan reports quality errors on demand and does not alter files or run in normal full-quality checks.
 * Astro, JSX, and TSX are parsed so comments, text, and already-shared components are not reported.
 *
 * @param cfg Repository quality configuration and optional UI recommendation policy.
 *
 * @return Sorted native-element recommendations with source positions and import guidance.
 */
export function uiComponentRecommendations(cfg: QualityCfg): UiComponentRecommendation[] {
	const settings = cfg.uiRecommendations;
	const rules = settings?.rules ?? DEFAULT_RULES;
	const exts = settings?.extensions ?? DEFAULT_EXTS;
	const ignoredFiles = new Set((settings?.ignoredFiles ?? []).map((file) => file.replaceAll('\\', '/')));
	const findings: UiComponentRecommendation[] = [];
	for (const file of srcFiles({ ...cfg, extensions: exts })) {
		const relativeFile = displayPath(cfg, file).replaceAll('\\', '/');
		if (isIgnoredFile(relativeFile, settings?.ignoredDirectories ?? [], ignoredFiles)) continue;
		const source = readFileSync(file, 'utf8');
		const scriptKind = file.endsWith('.jsx') ? ts.ScriptKind.JSX : ts.ScriptKind.TSX;
		const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, scriptKind);
		/**
		 *
		 * @param node
		 */
		const visit = (node: ts.Node): void => {
			if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && ts.isIdentifier(node.tagName)) {
				const element = node.tagName.text;
				if (element === element.toLowerCase()) {
					const rule = rules.find((candidate) => candidate.element === element && ruleMatches(candidate, node));
					if (rule) {
						const { line, character } = parsed.getLineAndCharacterOfPosition(node.getStart(parsed));
						const variant = rule.variant ?? (element === 'a' && rule.when === 'text-link' ? textLinkVariant(staticClasses(node)) : undefined);
						findings.push({
							file: relativeFile,
							line: line + 1,
							column: character + 1,
							element,
							component: rule.component,
							import: rule.import,
							...(variant ? { variant } : {}),
							reason: rule.reason ?? `Review whether this native <${element}> should use the shared ${rule.component} component.`,
						});
					}
				}
			}
			ts.forEachChild(node, visit);
		};
		visit(parsed);
	}
	return findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column);
}
