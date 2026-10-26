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

/**
 *
 */
type NameState = 'named' | 'empty' | 'unknown';
/**
 *
 */
type StaticValue = { state: 'static'; value: string; source: string } | { state: 'empty' } | { state: 'unknown' };

/**
 *
 */
type ElementRef = ts.JsxElement | ts.JsxSelfClosingElement;
/**
 *
 */
type NameCandidate = { parsed: ts.SourceFile; opening: ts.JsxOpeningLikeElement; title: Extract<StaticValue, { state: 'static' }>; emptyAriaLabel?: ts.JsxAttribute };
/**
 *
 */
type DecorativeIconCandidate = { parsed: ts.SourceFile; opening: ts.JsxOpeningLikeElement };

/*//////////////////////////////////////////////////
CONSTANTS
//////////////////////////////////////////////////*/

const JSX_EXTS = /\.(?:jsx|tsx|js|ts)$/i;
const NATIVE_LABELABLE = new Set(['button', 'input', 'select', 'textarea']);
const INPUT_BUTTON_TYPES = new Set(['button', 'submit', 'reset']);
const INTERACTIVE_ROLES = new Set([
	'button',
	'checkbox',
	'combobox',
	'gridcell',
	'link',
	'listbox',
	'menuitem',
	'menuitemcheckbox',
	'menuitemradio',
	'option',
	'radio',
	'searchbox',
	'slider',
	'spinbutton',
	'progressbar',
	'switch',
	'tab',
	'textbox',
	'treeitem',
]);
const INTERACTIVE_NATIVE = new Set(['button', 'input', 'select', 'textarea', 'summary']);

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Selects a TypeScript parser mode for a JSX-capable source path.
 *
 * @param fileName
 *
 * @return
 */
function scriptKind(fileName: string): ts.ScriptKind {
	if (/\.tsx?$/i.test(fileName)) return ts.ScriptKind.TSX;
	return ts.ScriptKind.JSX;
}

/**
 * Returns JSX attributes from either an element or self-closing element.
 *
 * @param element
 *
 * @return
 */
function attrsOf(element: ElementRef): ts.JsxAttributes {
	return ts.isJsxElement(element) ? element.openingElement.attributes : element.attributes;
}

/**
 * Returns JSX child nodes from either an element or self-closing element.
 *
 * @param element
 *
 * @return
 */
function childrenOf(element: ElementRef): readonly ts.JsxChild[] {
	return ts.isJsxElement(element) ? element.children : [];
}

/**
 * Returns the JSX tag name as written in source.
 *
 * @param element
 *
 * @return
 */
function tagOf(element: ElementRef): string {
	return ts.isJsxElement(element) ? element.openingElement.tagName.getText() : element.tagName.getText();
}

/**
 * Finds a named JSX attribute without interpreting spreads.
 *
 * @param element
 * @param name
 *
 * @return
 */
function attrOf(element: ElementRef, name: string): ts.JsxAttribute | undefined {
	return attrsOf(element).properties.find((property): property is ts.JsxAttribute => ts.isJsxAttribute(property) && ts.isIdentifier(property.name) && property.name.text === name);
}

/**
 * Reads a statically available string-like JSX attribute and preserves its expression source for safe copying.
 *
 * @param attr
 *
 * @return
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
 * @param attr
 *
 * @return
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
 * @param value
 *
 * @return
 */
function meaningful(value: string): boolean {
	return value.replace(/[\s\u00a0\u200b\ufeff]/g, '').replace(/&(?:nbsp|#0*160|#x0*a0);/gi, '').length > 0;
}

/**
 * Returns whether the HTML hidden attribute is present, false, or uncertain.
 *
 * @param element
 *
 * @return
 */
function hiddenAttrState(element: ElementRef): NameState {
	const attr = attrOf(element, 'hidden');
	if (!attr) return 'empty';
	if (!attr.initializer) return 'named';
	if (ts.isStringLiteral(attr.initializer)) return 'named';
	if (!ts.isJsxExpression(attr.initializer) || !attr.initializer.expression) return 'unknown';
	const expr = attr.initializer.expression;
	if (expr.kind === ts.SyntaxKind.TrueKeyword) return 'named';
	if (expr.kind === ts.SyntaxKind.FalseKeyword || expr.kind === ts.SyntaxKind.NullKeyword) return 'empty';
	if (ts.isNumericLiteral(expr)) return Number(expr.text) === 0 ? 'empty' : 'named';
	return 'unknown';
}

/**
 * Determines whether an element or an ancestor is hidden from the accessibility tree.
 *
 * @param element
 *
 * @return
 */
function hiddenState(element: ElementRef): NameState {
	const hidden = hiddenAttrState(element);
	const ariaHiddenAttr = attrOf(element, 'aria-hidden');
	const ariaHidden = ariaHiddenAttr && !ariaHiddenAttr.initializer ? { state: 'static' as const, value: 'true', source: 'true' } : staticAttr(ariaHiddenAttr);
	if (hidden === 'named' || (ariaHidden.state === 'static' && ariaHidden.value.toLowerCase() === 'true')) return 'named';
	if (hidden === 'unknown' || ariaHidden.state === 'unknown') return 'unknown';
	return 'empty';
}

/**
 * Reads the static value of an input type, using HTML's default text type.
 *
 * @param element
 *
 * @return
 */
function inputType(element: ElementRef): StaticValue {
	const type = attrOf(element, 'type');
	return type ? staticAttr(type) : { state: 'static', value: 'text', source: '"text"' };
}

/**
 * Identifies JSX elements that are native controls or explicitly assigned an interactive ARIA role.
 *
 * @param element
 *
 * @return
 */
function targetKind(element: ElementRef): { element: string; labelable: boolean } | undefined {
	const tag = tagOf(element);
	if (A_Z_A_Z_D_REGEX.test(tag) && (INTERACTIVE_NATIVE.has(tag) || tag === 'progress')) {
		if (tag === 'input') {
			const type = inputType(element);
			if (type.state === 'unknown' || (type.state === 'static' && type.value.toLowerCase() === 'hidden')) return undefined;
		}
		return { element: `<${tag}>`, labelable: NATIVE_LABELABLE.has(tag) };
	}
	if (A_Z_A_Z_D_REGEX.test(tag) && tag === 'a' && attrOf(element, 'href')) return { element: '<a>', labelable: false };
	if (A_Z_A_Z_D_REGEX.test(tag) && tag === 'area' && attrOf(element, 'href')) return { element: '<area>', labelable: false };
	const role = staticAttr(attrOf(element, 'role'));
	if (role.state === 'static' && INTERACTIVE_ROLES.has(role.value.toLowerCase())) return { element: `<${tag}>[role="${role.value}"]`, labelable: false };
	return undefined;
}

/**
 * Combines child text evidence; a definite name takes precedence over uncertain extra children.
 *
 * @param states
 *
 * @return
 */
function combine(states: NameState[]): NameState {
	if (states.includes('named')) return 'named';
	if (states.includes('unknown')) return 'unknown';
	return 'empty';
}

/**
 * Determines whether a JSX element has static text or image alternative text in its children.
 *
 * @param element
 * @param forLabel
 *
 * @return
 */
function contentState(element: ElementRef, forLabel = false): NameState {
	const children = childrenOf(element);
	if (!children.length) return 'empty';
	return combine(children.map((child) => childContentState(child, forLabel)));
}

/**
 * Examines one JSX child for visible static text without guessing about component output.
 *
 * @param child
 * @param forLabel
 *
 * @return
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
 * @param element
 * @param forLabel
 *
 * @return
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
 * @param element
 *
 * @return
 */
function ariaNameState(element: ElementRef): NameState {
	const label = staticAttr(attrOf(element, 'aria-label'));
	if (label.state !== 'empty') return label.state === 'static' ? 'named' : 'unknown';
	return 'empty';
}

/**
 * Extracts text from an aria-labelledby target, even when the target itself is hidden.
 *
 * @param element
 *
 * @return
 */
function referencedContentState(element: ElementRef): NameState {
	const tag = tagOf(element);
	if (!A_Z_A_Z_D_REGEX.test(tag) || tag.includes('-')) return 'unknown';
	const label = staticAttr(attrOf(element, 'aria-label'));
	if (label.state === 'static') return 'named';
	if (label.state === 'unknown') return 'unknown';
	if (tag === 'img') {
		const alt = staticAttr(attrOf(element, 'alt'));
		return alt.state === 'static' ? 'named' : alt.state === 'unknown' ? 'unknown' : 'empty';
	}
	const labelledBy = staticAttr(attrOf(element, 'aria-labelledby'));
	if (labelledBy.state !== 'empty') return 'unknown';
	return combine(childrenOf(element).map((child) => childContentState(child, false)));
}

/**
 * Builds conservative source evidence for literal JSX ids and their referenced text.
 *
 * @param source
 *
 * @return
 */
function idContentStates(source: ts.SourceFile): Map<string, NameState> {
	const ids = new Map<string, NameState>();
	const duplicates = new Set<string>();
	/**
	 *
	 * @param node
	 */
	const visit = (node: ts.Node): void => {
		if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
			const id = staticAttr(attrOf(node, 'id'));
			if (id.state === 'static') {
				if (ids.has(id.value)) duplicates.add(id.value);
				else ids.set(id.value, referencedContentState(node));
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(source);
	for (const id of duplicates) ids.set(id, 'unknown');
	return ids;
}

/**
 * Resolves a literal aria-labelledby value only when its source references establish a name.
 *
 * @param element
 * @param ids
 *
 * @return
 */
function labelledByState(element: ElementRef, ids: Map<string, NameState>): NameState {
	const value = staticAttr(attrOf(element, 'aria-labelledby'));
	if (value.state !== 'static') return value.state;
	const references = value.value.trim().split(/\s+/).filter(Boolean);
	if (!references.length) return 'empty';
	return combine(references.map((id) => ids.get(id) ?? 'empty'));
}

/**
 * Finds labels associated by a literal id and records whether each label has meaningful text.
 *
 * @param source
 *
 * @return
 */
function associatedLabels(source: ts.SourceFile): Map<string, NameState> {
	const labels = new Map<string, NameState>();
	/**
	 *
	 * @param node
	 * @param hidden
	 */
	const visit = (node: ts.Node, hidden: boolean): void => {
		if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
			const state = hiddenState(node);
			const isHidden = hidden || state === 'named' || state === 'unknown';
			if (!isHidden && tagOf(node) === 'label') {
				const target = staticAttr(attrOf(node, 'htmlFor') ?? attrOf(node, 'for'));
				if (target.state === 'static') {
					const content = contentState(node, true);
					const previous = labels.get(target.value);
					labels.set(target.value, previous === 'named' || content === 'named' ? 'named' : previous === 'unknown' || content === 'unknown' ? 'unknown' : 'empty');
				}
			}
		}
		const currentHidden = hidden || ((ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) && hiddenState(node) !== 'empty');
		ts.forEachChild(node, (child) => visit(child, currentHidden));
	};
	visit(source, false);
	return labels;
}

/**
 * Returns accessible-name evidence for one control, including nested and id-associated labels.
 *
 * @param element
 * @param kind
 * @param labels
 * @param nestedLabel
 *
 * @return
 */
function elementNameState(
	element: ElementRef,
	kind: { element: string; labelable: boolean },
	labels: Map<string, NameState>,
	nestedLabel: NameState,
): { state: NameState; title?: StaticValue; emptyAriaLabel?: ts.JsxAttribute; iconOnly: boolean } {
	const aria = ariaNameState(element);
	if (aria !== 'empty') return { state: aria, iconOnly: false };
	const id = kind.labelable ? staticAttr(attrOf(element, 'id')) : { state: 'empty' as const };
	if (id.state === 'static') {
		const label = labels.get(id.value) ?? 'empty';
		if (label !== 'empty') return { state: label, iconOnly: false };
	} else if (id.state === 'unknown') return { state: 'unknown', iconOnly: false };
	if (kind.labelable && nestedLabel !== 'empty') return { state: nestedLabel, iconOnly: false };
	const tag = tagOf(element);
	if (tag === 'input') {
		const type = inputType(element);
		if (type.state === 'unknown') return { state: 'unknown', iconOnly: false };
		const inputTypeValue = type.state === 'static' ? type.value.toLowerCase() : 'text';
		if (inputTypeValue === 'image') {
			const alt = staticAttr(attrOf(element, 'alt'));
			if (alt.state === 'static') return { state: 'named', iconOnly: false };
			if (alt.state === 'unknown') return { state: 'unknown', iconOnly: false };
		} else if (INPUT_BUTTON_TYPES.has(inputTypeValue)) {
			const value = staticAttr(attrOf(element, 'value'));
			if (value.state === 'static') return { state: 'named', iconOnly: false };
			if (value.state === 'unknown') return { state: 'unknown', iconOnly: false };
			if ((inputTypeValue === 'submit' || inputTypeValue === 'reset') && !attrOf(element, 'value')) return { state: 'named', iconOnly: false };
		}
	}
	if (tag === 'area') {
		const alt = staticAttr(attrOf(element, 'alt'));
		if (alt.state === 'static') return { state: 'named', iconOnly: false };
		if (alt.state === 'unknown') return { state: 'unknown', iconOnly: false };
	}
	const role = staticAttr(attrOf(element, 'role'));
	const nameFromContent = tag !== 'progress' && !(role.state === 'static' && role.value.toLowerCase() === 'progressbar');
	const childState = nameFromContent ? contentState(element) : 'empty';
	if (childState === 'named' || childState === 'unknown') return { state: childState, iconOnly: false };
	const spreads = attrsOf(element).properties.some(ts.isJsxSpreadAttribute);
	if (spreads) return { state: 'unknown', iconOnly: false };
	const title = literalTitle(attrOf(element, 'title'));
	if (title.state === 'unknown') return { state: 'unknown', title, iconOnly: false };
	const emptyAriaLabel = attrOf(element, 'aria-label');
	return { state: 'empty', title, emptyAriaLabel, iconOnly: true };
}

/**
 * Finds unnamed, non-focusable inline SVG images inside a named native control.
 *
 * @param element
 *
 * @return
 */
function decorativeIcons(element: ElementRef): ElementRef[] {
	const icons: ElementRef[] = [];
	/**
	 *
	 * @param node
	 */
	const visit = (node: ts.Node): void => {
		if (!ts.isJsxElement(node) && !ts.isJsxSelfClosingElement(node)) {
			ts.forEachChild(node, visit);
			return;
		}
		const tag = tagOf(node);
		if (tag === 'svg') {
			const role = staticAttr(attrOf(node, 'role'));
			const ownName = ariaNameState(node);
			const title = literalTitle(attrOf(node, 'title'));
			const hidden = hiddenState(node);
			const hasUncertainAttrs = attrsOf(node).properties.some(ts.isJsxSpreadAttribute) || ['focusable', 'tabIndex'].some((name) => attrOf(node, name));
			if (role.state === 'empty' && ownName === 'empty' && title.state === 'empty' && contentState(node) === 'empty' && hidden === 'empty' && !hasUncertainAttrs) icons.push(node);
			return;
		}
		if (!A_Z_A_Z_D_REGEX.test(tag) || hiddenState(node) !== 'empty') return;
		if (ts.isJsxElement(node)) node.children.forEach(visit);
	};
	childrenOf(element).forEach(visit);
	return icons;
}

/**
 * Collects findings and candidate source edits for one parsed source file.
 *
 * @param cfg
 * @param file
 * @param parsed
 *
 * @return
 */
function inspectFile(cfg: QualityCfg, file: string, parsed: ts.SourceFile): { findings: AccessibilityFinding[]; candidates: NameCandidate[]; decorativeCandidates: DecorativeIconCandidate[] } {
	const parseDiagnostics = (parsed as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics;
	if (parseDiagnostics?.length) return { findings: [], candidates: [], decorativeCandidates: [] };
	const labels = associatedLabels(parsed);
	const ids = idContentStates(parsed);
	const findings: AccessibilityFinding[] = [];
	const candidates: NameCandidate[] = [];
	const decorativeCandidates: DecorativeIconCandidate[] = [];
	/**
	 *
	 * @param node
	 * @param hidden
	 * @param nestedLabel
	 */
	const visit = (node: ts.Node, hidden: boolean, nestedLabel: NameState): void => {
		if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
			const elementHidden = hiddenState(node);
			const currentHidden = hidden || elementHidden !== 'empty';
			const tag = tagOf(node);
			let childLabel = nestedLabel;
			if (tag === 'label') childLabel = contentState(node, true);
			const kind = targetKind(node);
			if (!currentHidden && kind) {
				const ariaLabel = ariaNameState(node);
				const ariaName = ariaLabel === 'empty' ? labelledByState(node, ids) : ariaLabel;
				const name = ariaName === 'empty' ? elementNameState(node, kind, labels, nestedLabel) : { state: ariaName, iconOnly: false };
				if (name.state === 'empty') {
					const titleCanFix = name.title?.state === 'static' && name.iconOnly;
					const position = parsed.getLineAndCharacterOfPosition(node.getStart(parsed));
					const message = titleCanFix
						? `${kind.element} has no accessible name; copy its non-empty title into aria-label.`
						: `${kind.element} has no accessible name; add static text, an ARIA name, or an associated label.`;
					findings.push({ file: displayPath(cfg, file), line: position.line + 1, column: position.character + 1, element: kind.element, message, fixable: titleCanFix });
					if (name.title?.state === 'static') {
						const opening = ts.isJsxElement(node) ? node.openingElement : node;
						candidates.push({ parsed, opening, title: name.title, emptyAriaLabel: name.emptyAriaLabel });
					}
				} else if (name.state === 'named') {
					for (const icon of decorativeIcons(node)) {
						const opening = ts.isJsxElement(icon) ? icon.openingElement : icon;
						const position = parsed.getLineAndCharacterOfPosition(icon.getStart(parsed));
						findings.push({
							file: displayPath(cfg, file),
							line: position.line + 1,
							column: position.character + 1,
							element: '<svg>',
							message: 'Decorative SVG inside an already named control is exposed to assistive technology; add aria-hidden="true".',
							fixable: true,
						});
						decorativeCandidates.push({ parsed, opening });
					}
				}
			}
			ts.forEachChild(node, (child) => visit(child, currentHidden, childLabel));
			return;
		}
		ts.forEachChild(node, (child) => visit(child, hidden, nestedLabel));
	};
	visit(parsed, false, 'empty');
	return { findings, candidates, decorativeCandidates };
}

/**
 * Returns configured files that contain JSX syntax supported by this check.
 *
 * @param cfg
 * @param analysis
 *
 * @return
 */
function sourceFiles(cfg: QualityCfg, analysis?: QualityAnalysis): string[] {
	return (analysis?.files ?? srcFiles(cfg)).filter((file) => JSX_EXTS.test(file));
}

/**
 * Loads the source and parsed AST from the shared analysis cache when available.
 *
 * @param file
 * @param analysis
 *
 * @return
 */
function sourceFor(file: string, analysis?: QualityAnalysis): { text: string; parsed: ts.SourceFile } {
	const text = analysis?.texts.get(file) ?? readFileSync(file, 'utf8');
	const parsed = analysis?.sources.get(file) ?? ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, scriptKind(file));
	return { text, parsed };
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
		const diagnostics = ts.transpileModule(updated, {
			fileName: file,
			reportDiagnostics: true,
			compilerOptions: { allowJs: true, jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ESNext },
		}).diagnostics;
		if (diagnostics?.length) continue;
		writeFileSync(file, updated);
		fixed += edits.length;
	}
	return { fixed };
}
