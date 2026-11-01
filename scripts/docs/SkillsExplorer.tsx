/**
 * scripts/docs/SkillsExplorer.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import './skills-explorer.css';
import skills from './skills.generated.json';
import { useMemo, useState } from 'react';

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/** Metadata and source content displayed for one available skill. */
type Skill = {
	body: string;
	description: string;
	directory: string;
	name: string;
	package?: string;
	sourcePath?: string;
	title: string;
};
/** Tree node grouping skills by package and nested directory. */
type SkillNode = {
	children: Map<string, SkillNode>;
	skill?: Skill;
};

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Builds the package and directory tree used by the skills browser.
 *
 * @param entries - Skill metadata to place in the tree.
 * @returns A root node containing the grouped skill entries.
 */
function createTree(entries: Skill[]): SkillNode {
	const root: SkillNode = { children: new Map() };
	for (const skill of entries) {
		let current = root;
		for (const segment of [skill.package ?? 'shared', ...skill.directory.split('/')]) {
			if (!current.children.has(segment)) current.children.set(segment, { children: new Map() });
			current = current.children.get(segment)!;
		}
		current.skill = skill;
	}
	return root;
}

/**
 * Resolves the repository path for a skill source file.
 *
 * @param skill - Skill whose Markdown source should be opened.
 * @returns The stored source path or its shared-skills fallback path.
 */
function sourcePathForSkill(skill: Skill): string {
	return skill.sourcePath ?? `.agents/skills/${skill.directory}/SKILL.md`;
}

/**
 * Converts a hyphenated identifier to a title-style label.
 *
 * @param value - Hyphen-separated identifier to format.
 * @returns The identifier with each segment capitalized and spaces between segments.
 */
function humanize(value: string): string {
	return value
		.split('-')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

/**
 * Renders one level of the expandable skill directory tree.
 *
 * @param props - Tree node, expansion state, selected path, and interaction callbacks.
 * @returns The nested list UI for this node and its visible children.
 */
function SkillTree({
	expanded,
	node,
	onSelect,
	onToggle,
	pathPrefix = '',
	selectedPath,
}: {
	expanded: Set<string>;
	node: SkillNode;
	onSelect: (skill: Skill) => void;
	onToggle: (path: string) => void;
	pathPrefix?: string;
	selectedPath?: string;
}) {
	return (
		<ul aria-label={pathPrefix ? undefined : 'Available skills'} className="skills-tree__list">
			{[...node.children.entries()].map(([name, child]) => {
				const path = pathPrefix ? `${pathPrefix}/${name}` : name;
				const hasChildren = child.children.size > 0;
				const isExpanded = expanded.has(path);
				const skill = child.skill;
				return (
					<li className="skills-tree__item" key={path}>
						<div className="skills-tree__row">
							{hasChildren ? (
								<button aria-expanded={isExpanded} className="skills-tree__group" onClick={() => onToggle(path)}>
									<span aria-hidden="true" className="skills-tree__chevron">
										{isExpanded ? '⌄' : '›'}
									</span>
									<span>{skill?.title ?? humanize(name)}</span>
								</button>
							) : null}
							{skill ? (
								<button
									aria-current={selectedPath === sourcePathForSkill(skill) ? 'true' : undefined}
									className={`skills-tree__skill ${selectedPath === sourcePathForSkill(skill) ? 'is-selected' : ''}`}
									onClick={() => onSelect(skill)}
								>
									{hasChildren ? `Open ${skill.title} skill` : skill.title}
								</button>
							) : null}
						</div>
						{hasChildren && isExpanded ? (
							<div className="skills-tree__children">
								<SkillTree expanded={expanded} node={child} onSelect={onSelect} onToggle={onToggle} pathPrefix={path} selectedPath={selectedPath} />
							</div>
						) : null}
					</li>
				);
			})}
		</ul>
	);
}

/**
 * Renders the skills directory and the selected skill's source details.
 *
 * @returns The skills tree and its selected-skill detail panel.
 */
export default function SkillsExplorer() {
	const tree = useMemo(() => createTree(skills as Skill[]), []);
	const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
	const [aSkill, setActiveSkill] = useState<Skill | null>(null);
	function toggle(path: string) {
		setExpanded((current) => {
			const n = new Set(current);
			if (n.has(path)) n.delete(path);
			else n.add(path);
			return n;
		});
	}
	return (
		<section aria-label="Skills browser" className="skills-explorer">
			<div className="skills-explorer__tree">
				<SkillTree expanded={expanded} node={tree} onSelect={setActiveSkill} onToggle={toggle} selectedPath={aSkill ? sourcePathForSkill(aSkill) : undefined} />
			</div>
			<section aria-atomic="false" aria-live="polite" className="skills-explorer__detail">
				{aSkill ? (
					<>
						<div className="skills-explorer__detail-header">
							<div>
								<p className="skills-explorer__eyebrow">Selected skill</p>
								<h2 className="m-0">{aSkill.title}</h2>
							</div>
							<span className="skills-explorer__path">{sourcePathForSkill(aSkill)}</span>
						</div>
						<p className="skills-explorer__description">{aSkill.description}</p>
						<pre className="skills-explorer__source">
							<code>{aSkill.body}</code>
						</pre>
					</>
				) : (
					<div className="skills-explorer__empty">
						<p className="skills-explorer__eyebrow">Skill source</p>
						<p className="skills-explorer__empty-description">Choose a skill above to view its Markdown content.</p>
					</div>
				)}
			</section>
		</section>
	);
}
