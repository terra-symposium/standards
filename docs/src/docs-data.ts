type MdxModule = { default: unknown; frontmatter?: { title?: string; description?: string } };
const files = import.meta.glob<MdxModule>('./content/docs/**/*.mdx', { eager: true });
export const entries = Object.entries(files).map(([path, module]) => {
  const slug = path.replace('./content/docs/', '').replace(/\.mdx$/, '').replace(/(?:^|\/)index$/, '');
  return { slug, title: module.frontmatter?.title ?? slug.split('/').at(-1) ?? 'Standards', description: module.frontmatter?.description ?? '', Component: module.default };
});
