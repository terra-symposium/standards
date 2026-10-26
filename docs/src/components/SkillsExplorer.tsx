import { useMemo, useState } from 'react';
import skills from '../generated/skills.json';

type Skill = {
	body: string;
	description: string;
	directory: string;
	name: string;
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
	selectedName?: string;
};

function createTree(entries: Skill[]): SkillNode {
	const root: SkillNode = { children: new Map() };
	for (const skill of entries) {
		let current = root;
		for (const segment of skill.directory.split('/')) {
			if (!current.children.has(segment)) current.children.set(segment, { children: new Map() });
			current = current.children.get(segment)!;
		}
		current.skill = skill;
	}
	return root;
}

function humanize(value: string) {
	return value
		.split('-')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

function SkillTree({ expanded, node, onSelect, onToggle, pathPrefix = '', selectedName }: SkillTreeProps) {
	return (
		<ul aria-label={pathPrefix ? undefined : 'Available skills'} className="m-0 grid list-none gap-1 p-0">
			{[...node.children.entries()].map(([name, child]) => {
				const path = pathPrefix ? `${pathPrefix}/${name}` : name;
				const hasChildren = child.children.size > 0;
				const isExpanded = expanded.has(path);
				const skill = child.skill;

				return (
					<li className="m-0 list-none p-0" key={path}>
						<div className="flex min-h-0 items-center gap-1 max-[40rem]:items-start max-[40rem]:flex-col">
							{hasChildren ? (
								<button
									aria-expanded={isExpanded}
									className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-md border-0 bg-transparent px-2 py-1 text-left font-[inherit] font-semibold text-[#202321] hover:bg-[#edf1ed] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#216750]"
									onClick={() => onToggle(path)}

								>
									<span aria-hidden="true" className="w-4 text-[#216750]">
										{isExpanded ? '⌄' : '›'}
									</span>
									<span>{skill?.title ?? humanize(name)}</span>
								</button>
							) : null}
							{skill ? (
								<button
									aria-current={selectedName === skill.name ? 'true' : undefined}
									className={`min-h-9 cursor-pointer rounded-md border-0 bg-transparent px-2 py-1 text-left font-[inherit] text-[#216750] hover:bg-[#edf1ed] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#216750] max-[40rem]:mx-0 ${
										selectedName === skill.name ? 'bg-[#eaf1ec] font-bold' : ''
									}`}
									onClick={() => onSelect(skill)}

								>
									{hasChildren ? `Open ${skill.title} skill` : skill.title}
								</button>
							) : null}
						</div>
						{hasChildren && isExpanded ? (
							<div className="ml-4 mt-1 border-l border-[#dfe4df] py-1 pl-3">
								<SkillTree expanded={expanded} node={child} onSelect={onSelect} onToggle={onToggle} pathPrefix={path} selectedName={selectedName} />
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
		<section aria-label="Skills browser" className="my-8 space-y-4">
			<div className="rounded-xl border border-[#dfe4df] bg-white p-2">
				<SkillTree expanded={expanded} node={tree} onSelect={setActiveSkill} onToggle={toggle} selectedName={activeSkill?.name} />
			</div>
			<section aria-atomic="false" aria-live="polite" className="overflow-hidden rounded-xl border border-[#dfe4df] bg-white">
				{activeSkill ? (
					<>
						<div className="flex items-end justify-between gap-4 px-5 pt-5 max-[40rem]:items-start max-[40rem]:flex-col">
							<div>
								<p className="mb-1 text-xs font-bold uppercase tracking-wider text-[#626762]">Selected skill</p>
								<h2 className="m-0">{activeSkill.title}</h2>
							</div>
							<span className="wrap-break-word text-right font-mono text-xs text-[#626762] max-[40rem]:text-left">.agents/skills/{activeSkill.directory}/SKILL.md</span>
						</div>
						<p className="mx-5 mt-3 text-[#626762]">{activeSkill.description}</p>
						<pre className="m-0 max-h-[70vh] overflow-auto whitespace-pre-wrap break-normal border-t border-[#dfe4df] bg-[#f1f4f1] p-5 font-mono text-sm leading-relaxed text-[#202321]">
							<code>{activeSkill.body}</code>
						</pre>
					</>
				) : (
					<div className="p-5">
						<p className="mb-1 text-xs font-bold uppercase tracking-wider text-[#626762]">Skill source</p>
						<p className="m-0 text-[#626762]">Choose a skill above to view its Markdown content.</p>
					</div>
				)}
			</section>
		</section>
	);
}
