---
name: agents
description: Organize repository agent instructions, skills, and prompt references.
metadata:
  related-files:
    - scripts/skills_catalog.py
    - scripts/build-skills-plugin.py
---

# Agent files

Use this skill when creating or reorganizing agent-facing files in a repository. Read any existing `AGENTS.md`, `.agents/README.md`, and relevant docs first; do not assume each repository already has an `AGENTS.md`.

- Put repeatable executable workflows in `.agents/skills/<unique-name>/SKILL.md`.
- Put scoped instructions in the nearest applicable `AGENTS.md`; keep root rules brief.
- Put background explanation in `docs/` and supporting details in skill `references/`.
- Keep personas and prompt examples clearly labelled as prompts, not executable skills.
- Keep one canonical source for each skill and link to it from documentation.

Keep skill names globally unique across the shared plugin and repository skills, and use one flat `.agents/skills/<name>/` home for each canonical skill. Validate frontmatter, `metadata.related-files`, unique names, links, and referenced files with `scripts/skills_catalog.py` where available. Regenerate the repository skill catalog. When moving a skill, search authored docs, `AGENTS.md`, scripts, and package metadata for incoming references to its old path and update the callers. For Standards, run `pnpm run skills:package` and inspect that the canonical skill and support files appear in the archive. Resolve the skill's links from the archived location too; a link back to a repository file can work in the source tree but break in the plugin. Review the diff and run `git diff --check`.
