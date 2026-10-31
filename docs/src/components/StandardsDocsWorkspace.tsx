import { DocsLocalWorkspace } from '@terra-symposium/docs';
import type { DocsLocalWorkspaceProps } from '@terra-symposium/docs';
import '../styles/skills-explorer.css';
import SkillsExplorer from './SkillsExplorer.js';
import { StandardsHero } from './StandardsHero.js';
import type { StandardsHeroData } from './StandardsHero.js';

type Props = DocsLocalWorkspaceProps & { showSkillsExplorer?: boolean; hero?: StandardsHeroData };

export function StandardsDocsWorkspace({ hero, showSkillsExplorer = false, ...props }: Props) {
  return (
    <DocsLocalWorkspace
      {...props}
      {...(hero ? { beforeContent: <StandardsHero hero={hero} /> } : {})}
      {...(showSkillsExplorer
        ? {
            afterContent: (
              <section className="standards-docs-hero">
                <SkillsExplorer />
              </section>
            ),
          }
        : {})}
    />
  );
}
