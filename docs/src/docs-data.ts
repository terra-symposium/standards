type MdxModule = { default: unknown; frontmatter?: { title?: string; description?: string; hero?: { tagline?: string; actions?: Array<{ text: string; link: string; variant?: string }> } } };
const files = import.meta.glob<MdxModule>('./content/docs/**/*.mdx', { eager: true });
const sources = import.meta.glob('./content/docs/**/*.mdx', { query: '?raw', import: 'default', eager: true });
export const entries = Object.entries(files).map(([path, module]) => {
  const slug = path.replace('./content/docs/', '').replace(/\.mdx$/, '').replace(/(?:^|\/)index$/, '');
  const raw = String(sources[path] ?? '').replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
  const markdown = slug === 'skills' ? raw.replace(/^import .*SkillsExplorer.*\n/m, '').replace(/<SkillsExplorer\s+client:load\s*\/>/g, '') : raw;
  return { slug, title: module.frontmatter?.title ?? slug.split('/').at(-1) ?? 'Standards', description: module.frontmatter?.description ?? '', hero: module.frontmatter?.hero, markdown, Component: module.default };
});
