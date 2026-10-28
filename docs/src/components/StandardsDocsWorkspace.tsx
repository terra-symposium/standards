import { DocsLocalWorkspace } from '@terra-symposium/docs';
import type { DocsLocalWorkspaceProps } from '@terra-symposium/docs';
import '../styles/skills-explorer.css';
import SkillsExplorer from './SkillsExplorer.js';

type Props = DocsLocalWorkspaceProps & { showSkillsExplorer?: boolean };

export function StandardsDocsWorkspace({ showSkillsExplorer = false, ...props }: Props) {
  return (
    <DocsLocalWorkspace
      {...props}
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
