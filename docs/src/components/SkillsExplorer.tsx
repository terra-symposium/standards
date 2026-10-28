import { useMemo, useState } from 'react';
import skills from '../generated/skills.json';

type Skill = {
	body: string;
	description: string;
	directory: string;
	name: string;
	package?: string;
	sourcePath?: string;
	title: string;
};

type SkillNode = {
	children: Map<string, SkillNode>;
	skill?: Skill;
};

type SkillTreeProps = {
	expanded: Set<string>;
	node: SkillNode;
	onSelect: (skill: Skill) => void;
	onToggle: (path: string) => void;
	pathPrefix?: string;
	selectedPath?: string;
};

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

function sourcePathForSkill(skill: Skill) {
	return skill.sourcePath ?? `.agents/skills/${skill.directory}/SKILL.md`;
}

function humanize(value: string) {
	return value
		.split('-')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

function SkillTree({ expanded, node, onSelect, onToggle, pathPrefix = '', selectedPath }: SkillTreeProps) {
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
								<button
									aria-expanded={isExpanded}
									className="skills-tree__group"
									onClick={() => onToggle(path)}

								>
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

export default function SkillsExplorer() {
	const tree = useMemo(() => createTree(skills as Skill[]), []);
	const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
	const [activeSkill, setActiveSkill] = useState<Skill | null>(null);

	function toggle(path: string) {
		setExpanded((current) => {
			const next = new Set(current);
			if (next.has(path)) next.delete(path);
			else next.add(path);
			return next;
		});
	}

	return (
		<section aria-label="Skills browser" className="skills-explorer">
			<div className="skills-explorer__tree">
				<SkillTree expanded={expanded} node={tree} onSelect={setActiveSkill} onToggle={toggle} selectedPath={activeSkill ? sourcePathForSkill(activeSkill) : undefined} />
			</div>
			<section aria-atomic="false" aria-live="polite" className="skills-explorer__detail">
				{activeSkill ? (
					<>
						<div className="skills-explorer__detail-header">
							<div>
								<p className="skills-explorer__eyebrow">Selected skill</p>
								<h2 className="m-0">{activeSkill.title}</h2>
							</div>
							<span className="skills-explorer__path">{sourcePathForSkill(activeSkill)}</span>
						</div>
						<p className="skills-explorer__description">{activeSkill.description}</p>
						<pre className="skills-explorer__source">
							<code>{activeSkill.body}</code>
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
