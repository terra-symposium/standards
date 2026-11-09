/**
 * packages/quality/src/lib/accessibility.ts
 * Finds JSX controls without a source-evident accessible name and applies only
 * title-to-aria-label fixes whose meaning can be copied without inference.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import ts from 'typescript';
import { displayPath, srcFiles } from './files.js';
import { readFileSync, writeFileSync } from 'node:fs';

// TYPES
import type { QualityAnalysis, QualityCfg } from './runner.js';

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const A_Z_A_Z_D_REGEX = /^[a-z][a-z\d-]*$/;

/*//////////////////////////////////////////////////
TYPES
//////////////////////////////////////////////////*/

/** A source location whose interactive JSX element has no known accessible name. */
export type AccessibilityFinding = { file: string; line: number; column: number; element: string; message: string; fixable: boolean };

/** Describes whether source evidence proves content is named, empty, or uncertain. */
type NameState = 'named' | 'empty' | 'unknown';
/** Represents a statically read attribute value or an unavailable value. */
type StaticValue = { state: 'static'; value: string; source: string } | { state: 'empty' } | { state: 'unknown' };

/** Represents a JSX element with either paired or self-closing syntax. */
type ElementRef = ts.JsxElement | ts.JsxSelfClosingElement;
/** Stores a named-control element and the literal title used for a safe label fix. */
type NameCandidate = { parsed: ts.SourceFile; opening: ts.JsxOpeningLikeElement; title: Extract<StaticValue, { state: 'static' }>; emptyAriaLabel?: ts.JsxAttribute };
/** Stores an SVG that can safely be marked as decorative. */
type DecorativeIconCandidate = { parsed: ts.SourceFile; opening: ts.JsxOpeningLikeElement };

/*//////////////////////////////////////////////////
CONSTANTS
//////////////////////////////////////////////////*/

const INTERACTIVE_NATIVE = new Set(['button', 'input', 'select', 'textarea', 'summary']);

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Returns JSX attributes from either an element or self-closing element.
 *
 * @param element JSX element whose attributes are returned.
 *
 * @returns The opening element's JSX attributes.
 */
function attrsOf(element: ElementRef): ts.JsxAttributes {
	return ts.isJsxElement(element) ? element.openingElement.attributes : element.attributes;
}

/**
 * Returns JSX child nodes from either an element or self-closing element.
 *
 * @param element JSX element whose children are returned.
 *
 * @returns The element's children, or an empty array for a self-closing element.
 */
function childrenOf(element: ElementRef): readonly ts.JsxChild[] {
	return ts.isJsxElement(element) ? element.children : [];
}

/**
 * Returns the JSX tag name as written in source.
 *
 * @param element JSX element whose tag name is read.
 *
 * @returns The source text of the tag name.
 */
function tagOf(element: ElementRef): string {
	return ts.isJsxElement(element) ? element.openingElement.tagName.getText() : element.tagName.getText();
}

/**
 * Finds a named JSX attribute without interpreting spreads.
 *
 * @param element JSX element to search.
 * @param name Attribute name to find.
 *
 * @returns The matching JSX attribute, if present.
 */
function attrOf(element: ElementRef, name: string): ts.JsxAttribute | undefined {
	return attrsOf(element).properties.find((property): property is ts.JsxAttribute => ts.isJsxAttribute(property) && ts.isIdentifier(property.name) && property.name.text === name);
}

/**
 * Reads a statically available string-like JSX attribute and preserves its expression source for safe copying.
 *
 * @param attr JSX attribute to inspect, if present.
 *
 * @returns Its static string-like value, an empty state, or an unknown state.
 */
function staticAttr(attr: ts.JsxAttribute | undefined): StaticValue {
	if (!attr?.initializer) return { state: 'empty' };
	if (ts.isStringLiteral(attr.initializer)) {
		const value = attr.initializer.text;
		return meaningful(value) ? { state: 'static', value, source: attr.initializer.getText() } : { state: 'empty' };
	}
	if (!ts.isJsxExpression(attr.initializer) || !attr.initializer.expression) return { state: 'unknown' };
	const expr = attr.initializer.expression;
	if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr) || ts.isNumericLiteral(expr)) {
		const value = expr.text;
		return meaningful(value) ? { state: 'static', value, source: attr.initializer.getText() } : { state: 'empty' };
	}
	if (expr.kind === ts.SyntaxKind.TrueKeyword) return { state: 'static', value: 'true', source: attr.initializer.getText() };
	if (expr.kind === ts.SyntaxKind.FalseKeyword || expr.kind === ts.SyntaxKind.NullKeyword) return { state: 'empty' };
	return { state: 'unknown' };
}

/**
 * Reads a title only when its source is a string literal or a template literal without substitutions.
 *
 * @param attr JSX title attribute to inspect, if present.
 *
 * @returns The literal title value, an empty state, or an unknown state.
 */
function literalTitle(attr: ts.JsxAttribute | undefined): StaticValue {
	if (!attr?.initializer) return { state: 'empty' };
	if (ts.isStringLiteral(attr.initializer)) {
		const value = attr.initializer.text;
		return meaningful(value) ? { state: 'static', value, source: attr.initializer.getText() } : { state: 'empty' };
	}
	if (!ts.isJsxExpression(attr.initializer) || !attr.initializer.expression) return { state: 'unknown' };
	const expr = attr.initializer.expression;
	if (!ts.isStringLiteral(expr) && !ts.isNoSubstitutionTemplateLiteral(expr)) return { state: 'unknown' };
	return meaningful(expr.text) ? { state: 'static', value: expr.text, source: attr.initializer.getText() } : { state: 'empty' };
}

/**
 * Checks for meaningful text after trimming whitespace and zero-width padding.
 *
 * @param value Text to check for non-whitespace content.
 *
 * @returns Whether the text contains meaningful characters.
 */
function meaningful(value: string): boolean {
	return value.replace(/[\s\u00a0\u200b\ufeff]/g, '').replace(/&(?:nbsp|#0*160|#x0*a0);/gi, '').length > 0;
}

/**
 * Determines whether an element or an ancestor is hidden from the accessibility tree.
 *
 * @param element JSX element to check for hidden attributes.
 *
 * @returns `named` when hidden, `empty` when visible, or `unknown` when dynamic.
 */
function hiddenState(element: ElementRef): NameState {
	const attr = attrOf(element, 'hidden');
	let hidden: NameState = 'empty';
	if (attr) {
		if (!attr.initializer || ts.isStringLiteral(attr.initializer)) hidden = 'named';
		else if (!ts.isJsxExpression(attr.initializer) || !attr.initializer.expression) hidden = 'unknown';
		else {
			const expr = attr.initializer.expression;
			if (expr.kind === ts.SyntaxKind.TrueKeyword) hidden = 'named';
			else if (expr.kind === ts.SyntaxKind.FalseKeyword || expr.kind === ts.SyntaxKind.NullKeyword) hidden = 'empty';
			else if (ts.isNumericLiteral(expr)) hidden = Number(expr.text) === 0 ? 'empty' : 'named';
			else hidden = 'unknown';
		}
	}
	const ariaHiddenAttr = attrOf(element, 'aria-hidden');
	const ariaHidden = ariaHiddenAttr && !ariaHiddenAttr.initializer ? { state: 'static' as const, value: 'true', source: 'true' } : staticAttr(ariaHiddenAttr);
	if (hidden === 'named' || (ariaHidden.state === 'static' && ariaHidden.value.toLowerCase() === 'true')) return 'named';
	if (hidden === 'unknown' || ariaHidden.state === 'unknown') return 'unknown';
	return 'empty';
}

/**
 * Reads the static value of an input type, using HTML's default text type.
 *
 * @param element Input element whose type is read.
 *
 * @returns The input type value, defaulting to the HTML `text` type.
 */
function inputType(element: ElementRef): StaticValue {
	const type = attrOf(element, 'type');
	return type ? staticAttr(type) : { state: 'static', value: 'text', source: '"text"' };
}

/**
 * Combines child text evidence; a definite name takes precedence over uncertain extra children.
 *
 * @param states Evidence states collected from child content.
 *
 * @returns `named` if any child is named, otherwise `unknown` if any is uncertain, or `empty`.
 */
function combine(states: NameState[]): NameState {
	if (states.includes('named')) return 'named';
	if (states.includes('unknown')) return 'unknown';
	return 'empty';
}

/**
 * Determines whether a JSX element has static text or image alternative text in its children.
 *
 * @param element JSX element whose child content is checked.
 * @param forLabel Whether interactive descendants are being evaluated as label text.
 *
 * @returns The combined accessible-name evidence from the children.
 */
function contentState(element: ElementRef, forLabel = false): NameState {
	const children = childrenOf(element);
	if (!children.length) return 'empty';
	return combine(children.map((child) => childContentState(child, forLabel)));
}

/**
 * Examines one JSX child for visible static text without guessing about component output.
 *
 * @param child JSX child node to inspect.
 * @param forLabel Whether interactive descendants are being evaluated as label text.
 *
 * @returns Whether the child provides named, empty, or uncertain text evidence.
 */
function childContentState(child: ts.JsxChild, forLabel: boolean): NameState {
	if (ts.isJsxText(child)) return meaningful(child.text) ? 'named' : 'empty';
	if (ts.isJsxExpression(child)) {
		const expr = child.expression;
		if (!expr) return 'empty';
		if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr) || ts.isNumericLiteral(expr)) return meaningful(expr.text) ? 'named' : 'empty';
		if (expr.kind === ts.SyntaxKind.TrueKeyword || expr.kind === ts.SyntaxKind.FalseKeyword || expr.kind === ts.SyntaxKind.NullKeyword) return 'empty';
		return 'unknown';
	}
	if (ts.isJsxElement(child)) return elementContentState(child, forLabel);
	if (ts.isJsxSelfClosingElement(child)) return elementContentState(child, forLabel);
	if (ts.isJsxFragment(child)) return combine(child.children.map((nested) => childContentState(nested, forLabel)));
	return 'unknown';
}

/**
 * Examines a nested element, honoring hidden content, image alt, SVG names, and custom components.
 *
 * @param element Nested JSX element to inspect.
 * @param forLabel Whether interactive descendants are being evaluated as label text.
 *
 * @returns Whether the element provides named, empty, or uncertain text evidence.
 */
function elementContentState(element: ElementRef, forLabel: boolean): NameState {
	const hidden = hiddenState(element);
	if (hidden === 'named') return 'empty';
	if (hidden === 'unknown') return 'unknown';
	const tag = tagOf(element);
	if (tag === 'img') {
		const alt = staticAttr(attrOf(element, 'alt'));
		return alt.state === 'static' ? 'named' : alt.state === 'unknown' ? 'unknown' : 'empty';
	}
	if (!A_Z_A_Z_D_REGEX.test(tag)) return 'unknown';
	if (INTERACTIVE_NATIVE.has(tag)) return forLabel ? 'empty' : 'unknown';
	if (tag === 'svg') {
		const label = staticAttr(attrOf(element, 'aria-label'));
		if (label.state === 'static') return 'named';
		if (label.state === 'unknown') return 'unknown';
		const title = literalTitle(attrOf(element, 'title'));
		if (title.state === 'static') return 'named';
		if (title.state === 'unknown') return 'unknown';
	}
	return contentState(element, forLabel);
}

/**
 * Determines whether a source element supplies a usable name through ARIA attributes.
 *
 * @param element JSX element whose ARIA naming attributes are checked.
 *
 * @returns Whether a static ARIA name is present, absent, or uncertain.
 */
function ariaNameState(element: ElementRef): NameState {
	const label = staticAttr(attrOf(element, 'aria-label'));
	if (label.state !== 'empty') return label.state === 'static' ? 'named' : 'unknown';
	return 'empty';
}

/**
 * Collects findings and candidate source edits for one parsed source file.
 *
 * @param cfg Quality configuration used to format finding paths.
 * @param file Source file path being inspected.
 * @param parsed Parsed TypeScript source file.
 *
 * @returns Accessible-name findings and source locations eligible for safe fixes.
 */
function inspectFile(cfg: QualityCfg, file: string, parsed: ts.SourceFile): { findings: AccessibilityFinding[]; candidates: NameCandidate[]; decorativeCandidates: DecorativeIconCandidate[] } {
	if ((parsed as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics?.length) return { findings: [], candidates: [], decorativeCandidates: [] };
	const labels = new Map<string, NameState>();
	const labelPending: { node: ts.Node; hidden: boolean }[] = [{ node: parsed, hidden: false }];
	while (labelPending.length) {
		const { node, hidden } = labelPending.pop()!;
		const isElement = ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node);
		const descendants: ts.Node[] = [];
		ts.forEachChild(node, (child) => {
			descendants.push(child);
		});
		if (hidden || (isElement && hiddenState(node) !== 'empty')) {
			for (let index = descendants.length - 1; index >= 0; index--) labelPending.push({ node: descendants[index]!, hidden: true });
			continue;
		}
		if (isElement && tagOf(node) === 'label') {
			const target = staticAttr(attrOf(node, 'htmlFor') ?? attrOf(node, 'for'));
			if (target.state === 'static') {
				const content = contentState(node, true);
				const previous = labels.get(target.value);
				labels.set(target.value, previous === 'named' || content === 'named' ? 'named' : previous === 'unknown' || content === 'unknown' ? 'unknown' : 'empty');
			}
		}
		for (let index = descendants.length - 1; index >= 0; index--) labelPending.push({ node: descendants[index]!, hidden: false });
	}
	const ids = new Map<string, NameState>();
	const duplicateIds = new Set<string>();
	const idPending: ts.Node[] = [parsed];
	while (idPending.length) {
		const node = idPending.pop()!;
		if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
			const id = staticAttr(attrOf(node, 'id'));
			if (id.state === 'static') {
				if (ids.has(id.value)) duplicateIds.add(id.value);
				else {
					const tag = tagOf(node);
					let state: NameState;
					if (!A_Z_A_Z_D_REGEX.test(tag) || tag.includes('-')) state = 'unknown';
					else {
						const label = staticAttr(attrOf(node, 'aria-label'));
						if (label.state !== 'empty') state = label.state === 'static' ? 'named' : 'unknown';
						else if (tag === 'img') {
							const alt = staticAttr(attrOf(node, 'alt'));
							state = alt.state === 'static' ? 'named' : alt.state === 'unknown' ? 'unknown' : 'empty';
						} else if (staticAttr(attrOf(node, 'aria-labelledby')).state !== 'empty') state = 'unknown';
						else state = combine(childrenOf(node).map((child) => childContentState(child, false)));
					}
					ids.set(id.value, state);
				}
			}
		}
		const descendants: ts.Node[] = [];
		ts.forEachChild(node, (child) => {
			descendants.push(child);
		});
		for (let index = descendants.length - 1; index >= 0; index--) idPending.push(descendants[index]!);
	}
	for (const id of duplicateIds) ids.set(id, 'unknown');
	const findings: AccessibilityFinding[] = [];
	const candidates: NameCandidate[] = [];
	const decorativeCandidates: DecorativeIconCandidate[] = [];
	const pending: { node: ts.Node; hidden: boolean; nestedLabel: NameState }[] = [{ node: parsed, hidden: false, nestedLabel: 'empty' }];
	while (pending.length) {
		const { node, hidden, nestedLabel } = pending.pop()!;
		if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
			const tag = tagOf(node);
			const role = staticAttr(attrOf(node, 'role'));
			const normRole = role.state === 'static' ? role.value.toLowerCase() : '';
			let kind: { element: string; labelable: boolean } | undefined;
			if (A_Z_A_Z_D_REGEX.test(tag) && (INTERACTIVE_NATIVE.has(tag) || tag === 'progress')) {
				if (tag !== 'input') kind = { element: `<${tag}>`, labelable: tag === 'button' || tag === 'select' || tag === 'textarea' };
				else {
					const type = inputType(node);
					if (type.state !== 'unknown' && !(type.state === 'static' && type.value.toLowerCase() === 'hidden')) kind = { element: '<input>', labelable: true };
				}
			} else if (A_Z_A_Z_D_REGEX.test(tag) && (tag === 'a' || tag === 'area') && attrOf(node, 'href')) kind = { element: `<${tag}>`, labelable: false };
			else if (
				role.state === 'static' &&
				(normRole === 'button' ||
					normRole === 'checkbox' ||
					normRole === 'combobox' ||
					normRole === 'gridcell' ||
					normRole === 'link' ||
					normRole === 'listbox' ||
					normRole === 'menuitem' ||
					normRole === 'menuitemcheckbox' ||
					normRole === 'menuitemradio' ||
					normRole === 'option' ||
					normRole === 'radio' ||
					normRole === 'searchbox' ||
					normRole === 'slider' ||
					normRole === 'spinbutton' ||
					normRole === 'progressbar' ||
					normRole === 'switch' ||
					normRole === 'tab' ||
					normRole === 'textbox' ||
					normRole === 'treeitem')
			)
				kind = { element: `<${tag}>[role="${role.value}"]`, labelable: false };
			if (!(hidden || hiddenState(node) !== 'empty') && kind) {
				let ariaName = ariaNameState(node);
				if (ariaName === 'empty') {
					const labelledBy = staticAttr(attrOf(node, 'aria-labelledby'));
					if (labelledBy.state === 'static') {
						const references = labelledBy.value.trim().split(/\s+/).filter(Boolean);
						ariaName = references.length ? combine(references.map((id) => ids.get(id) ?? 'empty')) : 'empty';
					} else ariaName = labelledBy.state;
				}
				let nameState: NameState = ariaName;
				let title: StaticValue | undefined;
				if (nameState === 'empty') {
					const id = kind.labelable ? staticAttr(attrOf(node, 'id')) : { state: 'empty' as const };
					if (id.state === 'static' && (labels.get(id.value) ?? 'empty') !== 'empty') nameState = labels.get(id.value)!;
					else if (id.state === 'unknown') nameState = 'unknown';
					else if (kind.labelable && nestedLabel !== 'empty') nameState = nestedLabel;
					if (nameState === 'empty' && tag === 'input') {
						const input = inputType(node);
						if (input.state === 'unknown') nameState = 'unknown';
						else if ((input.state === 'static' ? input.value.toLowerCase() : 'text') === 'image') {
							const alt = staticAttr(attrOf(node, 'alt'));
							if (alt.state !== 'empty') nameState = alt.state === 'static' ? 'named' : 'unknown';
						} else if (input.state === 'static' && (input.value.toLowerCase() === 'button' || input.value.toLowerCase() === 'submit' || input.value.toLowerCase() === 'reset')) {
							const value = staticAttr(attrOf(node, 'value'));
							if (value.state !== 'empty') nameState = value.state === 'static' ? 'named' : 'unknown';
							else if ((input.value.toLowerCase() === 'submit' || input.value.toLowerCase() === 'reset') && !attrOf(node, 'value')) nameState = 'named';
						}
					}
					if (nameState === 'empty' && tag === 'area') {
						const alt = staticAttr(attrOf(node, 'alt'));
						if (alt.state !== 'empty') nameState = alt.state === 'static' ? 'named' : 'unknown';
					}
					if (nameState === 'empty') {
						const childState = tag !== 'progress' && normRole !== 'progressbar' ? contentState(node) : 'empty';
						if (childState !== 'empty') nameState = childState;
					}
					if (nameState === 'empty' && attrsOf(node).properties.some(ts.isJsxSpreadAttribute)) nameState = 'unknown';
					if (nameState === 'empty') {
						title = literalTitle(attrOf(node, 'title'));
						if (title.state === 'unknown') nameState = 'unknown';
					}
				}
				if (nameState === 'empty') {
					const titleCanFix = title?.state === 'static';
					const position = parsed.getLineAndCharacterOfPosition(node.getStart(parsed));
					findings.push({
						file: displayPath(cfg, file),
						line: position.line + 1,
						column: position.character + 1,
						element: kind.element,
						message: titleCanFix
							? `${kind.element} has no accessible name; copy its non-empty title into aria-label.`
							: `${kind.element} has no accessible name; add static text, an ARIA name, or an associated label.`,
						fixable: titleCanFix,
					});
					if (title?.state === 'static') candidates.push({ parsed, opening: ts.isJsxElement(node) ? node.openingElement : node, title, emptyAriaLabel: attrOf(node, 'aria-label') });
				} else if (nameState === 'named') {
					const iconPending: ts.Node[] = [...childrenOf(node)].reverse();
					while (iconPending.length) {
						const icon = iconPending.pop()!;
						if (!ts.isJsxElement(icon) && !ts.isJsxSelfClosingElement(icon)) {
							const descendants: ts.Node[] = [];
							ts.forEachChild(icon, (child) => {
								descendants.push(child);
							});
							for (let index = descendants.length - 1; index >= 0; index--) iconPending.push(descendants[index]!);
							continue;
						}
						if (tagOf(icon) === 'svg') {
							if (
								staticAttr(attrOf(icon, 'role')).state === 'empty' &&
								ariaNameState(icon) === 'empty' &&
								literalTitle(attrOf(icon, 'title')).state === 'empty' &&
								contentState(icon) === 'empty' &&
								hiddenState(icon) === 'empty' &&
								!attrsOf(icon).properties.some(ts.isJsxSpreadAttribute) &&
								!attrOf(icon, 'focusable') &&
								!attrOf(icon, 'tabIndex')
							) {
								const position = parsed.getLineAndCharacterOfPosition(icon.getStart(parsed));
								findings.push({
									file: displayPath(cfg, file),
									line: position.line + 1,
									column: position.character + 1,
									element: '<svg>',
									message: 'Decorative SVG inside an already named control is exposed to assistive technology; add aria-hidden="true".',
									fixable: true,
								});
								decorativeCandidates.push({ parsed, opening: ts.isJsxElement(icon) ? icon.openingElement : icon });
							}
							continue;
						}
						if (!A_Z_A_Z_D_REGEX.test(tagOf(icon)) || hiddenState(icon) !== 'empty' || ts.isJsxSelfClosingElement(icon)) continue;
						const descendants: ts.Node[] = [];
						icon.children.forEach((child) => {
							descendants.push(child);
						});
						for (let index = descendants.length - 1; index >= 0; index--) iconPending.push(descendants[index]!);
					}
				}
			}
		}
		const descendants: ts.Node[] = [];
		ts.forEachChild(node, (child) => {
			descendants.push(child);
		});
		for (let index = descendants.length - 1; index >= 0; index--) {
			pending.push({
				node: descendants[index]!,
				hidden: ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) ? hidden || hiddenState(node) !== 'empty' : hidden,
				nestedLabel: (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) && tagOf(node) === 'label' ? contentState(node, true) : nestedLabel,
			});
		}
	}
	return { findings, candidates, decorativeCandidates };
}

/**
 * Returns configured files that contain JSX syntax supported by this check.
 *
 * @param cfg Quality configuration that supplies source roots.
 * @param analysis Optional shared analysis containing the files to inspect.
 *
 * @returns Source paths with JavaScript or TypeScript extensions supported by this check.
 */
function sourceFiles(cfg: QualityCfg, analysis?: QualityAnalysis): string[] {
	return (analysis?.files ?? srcFiles(cfg)).filter((file) => /\.(?:jsx|tsx|js|ts)$/i.test(file));
}

/**
 * Loads the source and parsed AST from the shared analysis cache when available.
 *
 * @param file Source file path to load.
 * @param analysis Optional shared analysis containing cached text and parsed sources.
 *
 * @returns The source text and its parsed TypeScript source file.
 */
function sourceFor(file: string, analysis?: QualityAnalysis): { text: string; parsed: ts.SourceFile } {
	const text = analysis?.texts.get(file) ?? readFileSync(file, 'utf8');
	return { text, parsed: analysis?.sources.get(file) ?? ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, /\.tsx?$/i.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.JSX) };
}

/*//////////////////////////////////////////////////
PUBLIC API
//////////////////////////////////////////////////*/

/**
 * Finds JSX native controls and elements with explicit interactive roles that have no known accessible name.
 * Dynamic child output, dynamic ARIA values, hidden controls, and components without explicit roles are skipped.
 *
 * @param cfg Quality configuration selecting source roots and extensions.
 * @param analysis Optional shared parse context for the current quality run.
 *
 * @return Accessible-name findings with a flag for title-based fixes that can be applied safely.
 */
export function accessibilityFindings(cfg: QualityCfg, analysis?: QualityAnalysis): AccessibilityFinding[] {
	return sourceFiles(cfg, analysis).flatMap((file) => {
		const { parsed } = sourceFor(file, analysis);
		return inspectFile(cfg, file, parsed).findings;
	});
}

/**
 * Adds aria-label only when a non-empty literal title is the sole source-evident name for an icon-only control.
 * Existing visible text, labels, ARIA names, and uncertain component output are left unchanged.
 *
 * @param cfg Quality configuration selecting source roots and extensions.
 *
 * @return Result containing the number of aria-label attributes added or repaired.
 */
export function fixAccessibleNames(cfg: QualityCfg): { fixed: number } {
	let fixed = 0;
	for (const file of sourceFiles(cfg)) {
		const { text, parsed } = sourceFor(file);
		const { candidates, decorativeCandidates } = inspectFile(cfg, file, parsed);
		if (!candidates.length && !decorativeCandidates.length) continue;
		const edits: { start: number; end: number; text: string }[] = candidates.map((candidate) => {
			const text = `aria-label=${candidate.title.source}`;
			if (candidate.emptyAriaLabel) return { start: candidate.emptyAriaLabel.getStart(candidate.parsed), end: candidate.emptyAriaLabel.end, text };
			const attrs = candidate.opening.attributes;
			const insertion = attrs.properties.length ? attrs.properties.at(-1)!.end : candidate.opening.tagName.end;
			return { start: insertion, end: insertion, text: ` ${text}` };
		});
		for (const candidate of decorativeCandidates) {
			const attrs = candidate.opening.attributes;
			const insertion = attrs.properties.length ? attrs.properties.at(-1)!.end : candidate.opening.tagName.end;
			edits.push({ start: insertion, end: insertion, text: ' aria-hidden="true"' });
		}
		let updated = text;
		for (const edit of edits.sort((a, b) => b.start - a.start)) updated = `${updated.slice(0, edit.start)}${edit.text}${updated.slice(edit.end)}`;
		if (ts.transpileModule(updated, { fileName: file, reportDiagnostics: true, compilerOptions: { allowJs: true, jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ESNext } }).diagnostics?.length)
			continue;
		writeFileSync(file, updated);
		fixed += edits.length;
	}
	return { fixed };
}
