/**
 * packages/ui-quality/src/lib/accessibility.ts
 * Finds JSX controls without a source-evident accessible name and applies only
 * title-to-aria-label fixes whose meaning can be copied without inference.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import ts from 'typescript';
import { displayPath, srcFiles } from '@terra-symposium/standards-quality-core';
import { readFileSync, writeFileSync } from 'node:fs';

// TYPES
import type { QualityAnalysis, QualityCfg } from '@terra-symposium/standards-quality-core';

/*//////////////////////////////////////////////////
REGEX
//////////////////////////////////////////////////*/

const A_Z_A_Z_D_REGEX = /^[a-z][a-z\d-]*$/;

/*//////////////////////////////////////////////////
TYPES
//////////////////////////////////////////////////*/

/** A source location whose interactive JSX element has no known accessible name. */
export type AccessibilityFinding = { file: string; line: number; column: number; element: string; message: string; fixable: boolean };

/** Classification used while resolving an element's computed accessible name. */
type NameState = 'named' | 'empty' | 'unknown';
/** Static value discovered for an accessible-name source, or its resolution state. */
type StaticValue = { state: 'static'; value: string; source: string } | { state: 'empty' } | { state: 'unknown' };

/** JSX element shapes supported by the accessibility source analysis. */
type ElementRef = ts.JsxElement | ts.JsxSelfClosingElement;
/** Candidate title value and source attribute used to name an interactive element. */
type NameCandidate = { parsed: ts.SourceFile; opening: ts.JsxOpeningLikeElement; title: Extract<StaticValue, { state: 'static' }>; emptyAriaLabel?: ts.JsxAttribute };
/** JSX icon candidate whose decorative status can be inferred from its attributes. */
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
 * @param fileName Source path whose extension selects JSX or TSX parsing.
 *
 * @return JSX parsing for JavaScript paths and TSX parsing for TypeScript paths.
 */
function scriptKind(fileName: string): ts.ScriptKind {
	if (/\.tsx?$/i.test(fileName)) return ts.ScriptKind.TSX;
	return ts.ScriptKind.JSX;
}

/**
 * Returns JSX attributes from either an element or self-closing element.
 *
 * @param element JSX element or self-closing element whose attributes are requested.
 *
 * @return The JSX attribute collection attached to the element.
 */
function attrsOf(element: ElementRef): ts.JsxAttributes {
	return ts.isJsxElement(element) ? element.openingElement.attributes : element.attributes;
}

/**
 * Returns JSX child nodes from either an element or self-closing element.
 *
 * @param element JSX element or self-closing element whose children are requested.
 *
 * @return Child nodes, or an empty array for a self-closing element.
 */
function childrenOf(element: ElementRef): readonly ts.JsxChild[] {
	return ts.isJsxElement(element) ? element.children : [];
}

/**
 * Returns the JSX tag name as written in source.
 *
 * @param element JSX element or self-closing element whose tag should be read.
 *
 * @return Tag name as written in the source file.
 */
function tagOf(element: ElementRef): string {
	return ts.isJsxElement(element) ? element.openingElement.tagName.getText() : element.tagName.getText();
}

/**
 * Finds a named JSX attribute without interpreting spreads.
 *
 * @param element JSX element whose attributes are searched.
 * @param name Attribute identifier to match exactly.
 *
 * @return Matching JSX attribute, or `undefined` when absent.
 */
function attrOf(element: ElementRef, name: string): ts.JsxAttribute | undefined {
	return attrsOf(element).properties.find((p): p is ts.JsxAttribute => ts.isJsxAttribute(p) && ts.isIdentifier(p.name) && p.name.text === name);
}

/**
 * Reads a statically available string-like JSX attribute and preserves its expression source for safe copying.
 *
 * @param attr JSX attribute whose literal or expression value is inspected.
 *
 * @return Static value with source text when safe to copy, or an empty/unknown state.
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
 * @param attr `title` attribute whose value is tested for a literal string.
 *
 * @return Literal title with copyable source text, or an empty/unknown state.
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
 * @param value Text to check for visible content after whitespace normalization.
 *
 * @return Whether at least one non-whitespace, non-zero-width character remains.
 */
function meaningful(value: string): boolean {
	return value.replace(/[\s\u00a0\u200b\ufeff]/g, '').replace(/&(?:nbsp|#0*160|#x0*a0);/gi, '').length > 0;
}

/**
 * Returns whether the HTML hidden attribute is present, false, or uncertain.
 *
 * @param element JSX element whose `hidden` attribute is evaluated.
 *
 * @return `named` when hidden, `empty` when explicitly visible or absent, otherwise `unknown`.
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
 * @param element JSX element whose hidden and `aria-hidden` states are combined.
 *
 * @return `named` when hidden from the accessibility tree, `empty` when visible, otherwise `unknown`.
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
 * @param element Input element whose `type` attribute is read.
 *
 * @return Static input type, with HTML's default `text` type when no attribute exists.
 */
function inputType(element: ElementRef): StaticValue {
	const type = attrOf(element, 'type');
	return type ? staticAttr(type) : { state: 'static', value: 'text', source: '"text"' };
}

/**
 * Combines child text evidence; a definite name takes precedence over uncertain extra children.
 *
 * @param states Child-name evidence values to combine.
 *
 * @return `named` if any child names the element, else `unknown` if evidence is uncertain, else `empty`.
 */
function combine(states: NameState[]): NameState {
	if (states.includes('named')) return 'named';
	if (states.includes('unknown')) return 'unknown';
	return 'empty';
}

/**
 * Determines whether a JSX element has static text or image alternative text in its children.
 *
 * @param element JSX element whose child nodes are inspected.
 * @param forLabel Whether interactive descendants are being interpreted inside a label.
 *
 * @return Combined name evidence from the element's children.
 */
function contentState(element: ElementRef, forLabel = false): NameState {
	const children = childrenOf(element);
	if (!children.length) return 'empty';
	return combine(children.map(c => childContentState(c, forLabel)));
}

/**
 * Examines one JSX child for visible static text without guessing about component output.
 *
 * @param child JSX child node to inspect.
 * @param forLabel Whether interactive descendants are being interpreted inside a label.
 *
 * @return Evidence that the child provides static accessible-name text.
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
	if (ts.isJsxFragment(child)) return combine(child.children.map(n => childContentState(n, forLabel)));
	return 'unknown';
}

/**
 * Examines a nested element, honoring hidden content, image alt, SVG names, and custom components.
 *
 * @param element Nested JSX element to inspect.
 * @param forLabel Whether interactive descendants are being interpreted inside a label.
 *
 * @return Name evidence after hidden, image, SVG, native-control, and component checks.
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
 * @param element JSX element whose `aria-label` value is inspected.
 *
 * @return `named` for static non-empty text, `empty` when absent/empty, otherwise `unknown`.
 */
function ariaNameState(element: ElementRef): NameState {
	const label = staticAttr(attrOf(element, 'aria-label'));
	if (label.state !== 'empty') return label.state === 'static' ? 'named' : 'unknown';
	return 'empty';
}

/**
 * Builds conservative source evidence for literal JSX ids and their referenced text.
 *
 * @param source Parsed JSX source containing controls and candidate labels.
 *
 * @return Map from unique literal ids to accessible-name evidence; duplicate ids are `unknown`.
 */
function idContentStates(source: ts.SourceFile): Map<string, NameState> {
	const ids = new Map<string, NameState>();
	const duplicates = new Set<string>();

	const visit = (node: ts.Node): void => {
		if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
			const id = staticAttr(attrOf(node, 'id'));
			if (id.state === 'static') {
				if (ids.has(id.value)) duplicates.add(id.value);
				else
					ids.set(
						id.value,
						(function referencedContentState(element: ElementRef): NameState {
							const tag = tagOf(element);
							if (!A_Z_A_Z_D_REGEX.test(tag) || tag.includes('-')) return 'unknown';
							const label = staticAttr(attrOf(element, 'aria-label'));
							if (label.state === 'static') return 'named';
							if (label.state === 'unknown') return 'unknown';
							if (tag === 'img') {
								const alt = staticAttr(attrOf(element, 'alt'));
								return alt.state === 'static' ? 'named' : alt.state === 'unknown' ? 'unknown' : 'empty';
							}
							if (staticAttr(attrOf(element, 'aria-labelledby')).state !== 'empty') return 'unknown';
							return combine(childrenOf(element).map(c => childContentState(c, false)));
						})(node),
					);
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(source);
	for (const id of duplicates) ids.set(id, 'unknown');
	return ids;
}

/**
 * Finds labels associated by a literal id and records whether each label has meaningful text.
 *
 * @param source Parsed JSX source containing label elements and their controls.
 *
 * @return Map from literal `for`/`htmlFor` targets to their label-content evidence.
 */
function associatedLabels(source: ts.SourceFile): Map<string, NameState> {
	const labels = new Map<string, NameState>();

	const visit = (node: ts.Node, hidden: boolean): void => {
		if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
			const state = hiddenState(node);
			if (!(hidden || state === 'named' || state === 'unknown') && tagOf(node) === 'label') {
				const target = staticAttr(attrOf(node, 'htmlFor') ?? attrOf(node, 'for'));
				if (target.state === 'static') {
					const content = contentState(node, true);
					const previous = labels.get(target.value);
					labels.set(target.value, previous === 'named' || content === 'named' ? 'named' : previous === 'unknown' || content === 'unknown' ? 'unknown' : 'empty');
				}
			}
		}
		const currentHidden = hidden || ((ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) && hiddenState(node) !== 'empty');
		ts.forEachChild(node, c => visit(c, currentHidden));
	};
	visit(source, false);
	return labels;
}

/**
 * Returns accessible-name evidence for one control, including nested and id-associated labels.
 *
 * @param element Interactive JSX element whose accessible name is evaluated.
 * @param kind Element role and whether native label association applies.
 * @param labels Literal id-to-label evidence collected from the source file.
 * @param nestedLabel Label evidence inherited from a wrapping `<label>` element.
 *
 * @return Accessible-name state plus any safe title repair candidate and icon-only classification.
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
	const childState = tag !== 'progress' && !(role.state === 'static' && role.value.toLowerCase() === 'progressbar') ? contentState(element) : 'empty';
	if (childState === 'named' || childState === 'unknown') return { state: childState, iconOnly: false };
	if (attrsOf(element).properties.some(ts.isJsxSpreadAttribute)) return { state: 'unknown', iconOnly: false };
	const title = literalTitle(attrOf(element, 'title'));
	if (title.state === 'unknown') return { state: 'unknown', title, iconOnly: false };
	return { state: 'empty', title, emptyAriaLabel: attrOf(element, 'aria-label'), iconOnly: true };
}

/**
 * Finds unnamed, non-focusable inline SVG images inside a named native control.
 *
 * @param element Named control whose descendants are searched for decorative SVGs.
 *
 * @return SVG descendants that have no name, hidden state, focusability, or uncertain spread attributes.
 */
function decorativeIcons(element: ElementRef): ElementRef[] {
	const icons: ElementRef[] = [];

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
			const hasUncertainAttrs = attrsOf(node).properties.some(ts.isJsxSpreadAttribute) || ['focusable', 'tabIndex'].some(n => attrOf(node, n));
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
 * @param cfg Quality configuration used to report repository-relative locations.
 * @param file Absolute source path being analyzed.
 * @param parsed Parsed JSX source tree for the file.
 *
 * @return Accessibility findings and the source edits that can safely repair them.
 */
function inspectFile(cfg: QualityCfg, file: string, parsed: ts.SourceFile): { findings: AccessibilityFinding[]; candidates: NameCandidate[]; decorativeCandidates: DecorativeIconCandidate[] } {
	if ((parsed as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics?.length) return { findings: [], candidates: [], decorativeCandidates: [] };
	const labels = associatedLabels(parsed);
	const ids = idContentStates(parsed);
	const findings: AccessibilityFinding[] = [];
	const candidates: NameCandidate[] = [];
	const decorativeCandidates: DecorativeIconCandidate[] = [];

	const visit = (node: ts.Node, hidden: boolean, nestedLabel: NameState): void => {
		if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
			const elementHidden = hiddenState(node);
			const currentHidden = hidden || elementHidden !== 'empty';
			const tag = tagOf(node);
			let childLabel = nestedLabel;
			if (tag === 'label') childLabel = contentState(node, true);
			const kind = (function targetKind(element: ElementRef): { element: string; labelable: boolean } | undefined {
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
			})(node);
			if (!currentHidden && kind) {
				const ariaLabel = ariaNameState(node);
				const ariaName =
					ariaLabel === 'empty'
						? (function labelledByState(element: ElementRef, ids: Map<string, NameState>): NameState {
								const value = staticAttr(attrOf(element, 'aria-labelledby'));
								if (value.state !== 'static') return value.state;
								const references = value.value.trim().split(/\s+/).filter(Boolean);
								if (!references.length) return 'empty';
								return combine(references.map(i => ids.get(i) ?? 'empty'));
							})(node, ids)
						: ariaLabel;
				const name = ariaName === 'empty' ? elementNameState(node, kind, labels, nestedLabel) : { state: ariaName, iconOnly: false };
				if (name.state === 'empty') {
					const titleCanFix = name.title?.state === 'static' && name.iconOnly;
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
					if (name.title?.state === 'static') {
						candidates.push({ parsed, opening: ts.isJsxElement(node) ? node.openingElement : node, title: name.title, emptyAriaLabel: name.emptyAriaLabel });
					}
				} else if (name.state === 'named') {
					for (const icon of decorativeIcons(node)) {
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
				}
			}
			ts.forEachChild(node, c => visit(c, currentHidden, childLabel));
			return;
		}
		ts.forEachChild(node, c => visit(c, hidden, nestedLabel));
	};
	visit(parsed, false, 'empty');
	return { findings, candidates, decorativeCandidates };
}

/**
 * Returns configured files that contain JSX syntax supported by this check.
 *
 * @param cfg Quality configuration defining source roots and extensions.
 * @param analysis Optional shared analysis context containing discovered source files.
 *
 * @return Configured source files whose extensions support JSX parsing.
 */
function sourceFiles(cfg: QualityCfg, analysis?: QualityAnalysis): string[] {
	return (analysis?.files ?? srcFiles(cfg)).filter(f => JSX_EXTS.test(f));
}

/**
 * Loads the source and parsed AST from the shared analysis cache when available.
 *
 * @param file Absolute source path to load and parse.
 * @param analysis Optional shared analysis cache for file text and parsed sources.
 *
 * @return Source text and its parsed JSX tree.
 */
function sourceFor(file: string, analysis?: QualityAnalysis): { text: string; parsed: ts.SourceFile } {
	const text = analysis?.texts.get(file) ?? readFileSync(file, 'utf8');
	return { text, parsed: analysis?.sources.get(file) ?? ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, scriptKind(file)) };
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
	return sourceFiles(cfg, analysis).flatMap(f => {
		const { parsed } = sourceFor(f, analysis);
		return inspectFile(cfg, f, parsed).findings;
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
		const edits: { start: number; end: number; text: string }[] = candidates.map(c => {
			const text = `aria-label=${c.title.source}`;
			if (c.emptyAriaLabel) return { start: c.emptyAriaLabel.getStart(c.parsed), end: c.emptyAriaLabel.end, text };
			const attrs = c.opening.attributes;
			const insertion = attrs.properties.length ? attrs.properties.at(-1)!.end : c.opening.tagName.end;
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
