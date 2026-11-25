---
name: readme-standardisation
description: Write consistent repository, package, and folder READMEs.
metadata:
  related-files:
    - docs/developer/readme-standardisation/README.template.md
skill: true
---

# README standardisation

Use the [template](README.template.md). Its section names and order are the default for repository and package READMEs; include a section only when it has useful content. A folder README follows the smaller rule below.

## 1. Establish scope and reader

- Read the existing README, linked guides, applicable `AGENTS.md`, manifests, scripts, and configuration before rewriting claims or commands. Inventory root and nested READMEs for a multi-repository task.
- **Repository root:** state the project's purpose and the quickest way to run or use it. In a monorepo, add a short package/app map linking to the owning READMEs; do not copy their API guides.
- **Published package:** state the package name, supported runtime, installation command, and one working public API or CLI example. Treat the README as the landing page on the package registry.
- **Folder:** keep a README only when the folder needs distinct context or instructions. Use an H1 and a plain-language purpose statement. Link to the root README for validation and contribution; do not pad the folder file with repository sections.

## 2. Follow the content hierarchy

1. **H1 and lead:** use the project or package name, followed by one or two plain-language sentences saying what it does, for whom, and why it is useful. Avoid a second heading that merely repeats the lead.
2. **Get started:** give the shortest working path from a named directory. State only necessary prerequisites; provide copyable commands and the expected result or next action. Choose one default path before listing alternatives.
3. **Usage:** show one representative task or public API example when the quick start does not already show ordinary use. Add a small command table only when several commands serve distinct purposes.
4. **Configuration:** include only the settings needed for first use or a consequential choice. Link to the full configuration and security reference; never publish secret values.
5. **Validation:** distinguish changed-file Quality, full Quality, unit tests, browser or Playwright tests, and builds when those commands exist. Name the exact scripts and note when a category has no separate command. Do not imply that Quality runs functional tests.
6. **Contributing:** say where changes belong, which branch receives pull requests when verified, and what review or CI gate applies. Link to longer contribution and release guidance.
7. **Documentation and license:** link to canonical guides near the relevant instructions or in a short `Documentation` section. Add `License` only when a verified license file or statement exists.

Use these H2 names and this order for the sections you include: `Get started`, `Usage`, `Configuration`, `Validation`, `Contributing`, `Documentation`, `License`. Use H3s for substantial subsections only. Omit sections with no useful content; never write `Not applicable.` or placeholder prose. Add a domain-specific H2 only when the standard sections cannot express an essential reader task.

## 3. Reduce without losing useful information

- Keep the README focused on choosing, starting, and commonly using the project. Move long API reference, architecture, data policy, deployment, troubleshooting, test matrices, and tutorials to their owning documents, then link to them. Preserve unique current facts at the destination; remove duplicated, stale, and generated filler.
- Put shared setup in the root README and package-specific setup beside the package. Repeat a short command only when it makes that package independently usable.
- Prefer prose for explanations, lists for steps, tables for real comparisons or mappings, and fenced code with a language for executable examples. Do not add badges, status claims, version numbers, or benchmarks without a maintained source.
- Keep Markdown source lines at or below 100 characters. Reflow prose and use reference links for long URLs; do not split executable commands merely to meet the width.

## 4. Verify the result

Check every command, package name, path, relative link, prerequisite, and license claim against the repository. Review the first screen as a new reader: purpose and first action must be clear without scrolling through policy. Run the optional [audit](scripts/audit_readmes.py) for broken links, empty sections, placeholders, and code-fence errors; it does not judge content completeness.
