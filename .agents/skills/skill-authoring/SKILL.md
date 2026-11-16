---
name: skill-authoring
description: Create, revise, and audit repository skills against their source evidence.
metadata:
  related-files:
    - scripts/skills_catalog.py
    - scripts/build-skills-plugin.py
    - config/terra-skills-plugin.json
    - package.json
---

# Skill authoring

Use this skill to create or change an executable repository skill. Start from the [template](assets/SKILL.template.md). Keep its canonical source at `.agents/skills/<unique-name>/SKILL.md`; generated plugin files are output.

## Establish the contract

1. Identify a repeatable task and its trigger. Use a unique, short, task-oriented name. Distinguish a skill from reference documentation or a prompt persona.
2. Read the current source, tests, configuration, and documentation that prove the proposed commands and behavior. Put their repository-relative file paths in `metadata.related-files`. Use `[]` only if no repository files establish the workflow. Do not list directories, generated output, or another repo's files.
3. Write a concise description that says when to invoke the skill. In the body, give the task sequence, decision points, verification, and relevant links. Keep external state changes and approval boundaries explicit. Move lengthy reference material into supporting files beside the skill.
4. Check every option, example, supported feature, and claimed default against the related files. If evidence disagrees, correct the skill or the source; do not rely on an old catalog entry.

Use the Docs repository's [docs-authoring skill](https://github.com/Terra-Symposium/docs/blob/development/.agents/skills/docs-authoring/SKILL.md) when adding rich blocks. Use ordinary Markdown for linear instructions. Docs accordions (`=== [Name]`) and single-item tab sections (`||| [Name]`) are allowed in `SKILL.md`; for a multi-choice tab group, use one structured `:::terra-docs tabs` JSON block. The raw Markdown must still make sense to an agent. For any structured block, use the parser's `:::terra-docs type` JSON syntax and verify the type against the owning Docs block registry. Rich blocks are optional.

## Audit without inherited context

For **each** changed skill, create a fresh subagent without conversation history. Give it the candidate `SKILL.md`, a realistic task with its owning repository and relevant source or CLI artifact, and the minimum raw files needed to perform a read-only simulation. Ask what it could complete, what context was missing, and which claims were wrong. Never let the audit publish, delete, push, or change external state. Record its result, repair gaps, and repeat the audit if the skill was insufficient. The subagent must not run catalog generation or plugin packaging because those commands write files; the author runs them during verification below. Supply the relevant source files and registry as raw artifacts when the scenario depends on their behavior, and mark unprovided behavior as unverified.

## Verify and package

After the read-only audit, inspect the current working trees of all catalogued repositories. The catalog command writes each repository's `.agents/README.md` and Standards' `docs/contributing/4-skills/catalog.mdx`; run it only after reviewing that cross-repository write scope. `--check` reads without writing. The plugin packager removes and rebuilds `dist/terra-skills-plugin/` and rewrites its ZIP archive. Preserve any needed content in those generated paths before running it. The author then runs `python3 scripts/skills_catalog.py` and `python3 scripts/skills_catalog.py --check` from Standards. Run `pnpm run skills:package` for Standards skills and inspect the bundled skill's frontmatter and supporting files. For other repositories, inspect the canonical skill. For packaged skills, keep local links within the copied skill folder or use an external URL; verify links again inside the archive. Manually inspect external URLs and image targets, which the catalog check does not validate. Check related paths and duplicate names, repository diffs, and `git diff --check`. Run the owning documentation build when a linked page changed. Report the audit results and remaining limits.
