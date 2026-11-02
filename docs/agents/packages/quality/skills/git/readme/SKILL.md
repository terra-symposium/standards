---
name: readme-standardisation
description: Create or audit repository READMEs that help readers succeed while preserving verified, repository-specific information.
---

# README authoring and audit

Use this skill when creating, auditing, or standardising repository README files.
The companion [`README.template.md`](README.template.md) is a starting point, not
a form to publish unchanged. Keep the six user-fixed H2 headings below, in this
exact spelling and order. Add no other H2 headings; use descriptive H3 headings
when useful. Keep each bullet item at or below 100 characters, including its
marker.

## Quality rubric

Score each criterion 0–2: 0 = missing or wrong, 1 = partial, 2 = verified and
useful. A README is 10/10 only when all five criteria score 2. Fix every defect
that can be resolved from repository evidence; report any remaining uncertainty.

1. **Reader success:** A new reader can identify the project and complete the
   shortest useful first run from the README, including expected result.
2. **Accurate, specific facts:** Purpose, scope, requirements, behavior, versions,
   ownership, and constraints match this repository and its intended audience.
3. **Concise overview and structure:** The introduction is short; headings are
   descriptive; details appear where readers expect them; repetition is limited.
4. **Runnable instructions and links:** Commands are exact, prerequisites and
   working directories are clear, and local links resolve to the intended files.
5. **Responsible project details:** Applicable security, privacy, limitations,
   contribution, reference, credit, and license information is specific and true.

Also require one descriptive H1, a valid heading hierarchy, no empty or duplicate
headings, no visible template prompts, and no unsupported claims. These are
release gates, not extra points that can compensate for a weak score.

Use industry guidance as an editorial baseline: [Google's heading guidance](https://developers.google.com/style/headings)
recommends descriptive, sentence-case headings and logical hierarchy; [GitHub's README guidance](https://docs.github.com/en/repositories/creating-and-managing-repositories/quickstart-for-repositories)
describes the README as front-page project, installation, and usage information.
The six user-fixed headings above take precedence over general heading style.

## Claim evidence

Substantiate every factual instruction or claim before publishing it:

- Verify runtimes against manifests, version files, lockfiles, and platform configs.
- Verify commands against scripts, CI, executable entry points, and schemas; state cwd.
- Check features and boundaries against source, exports, tests, and API docs.
- Check environment names and purposes against code; never copy secret values.
- Verify operations against current workflows and runbooks; do not infer steps.
- Check privacy, data handling, attribution, and licenses against code and policy.
- Resolve local links from this README; link canonical guides instead of copying details.

When evidence is unavailable or contradictory, do not guess. Preserve the issue
as an explicit unresolved note for the maintainer or report it with the audit.
The absence of a license or contribution policy is not itself a README defect
when the README states that status clearly and points to the responsible owner.
For dates, versions, status, benchmark results, and other changing claims, cite
the source or date them, or explain how to obtain the current value.

## Fixed README structure

Keep these headings exactly once and in this order:

1. `## Getting started`
2. `## Security and Limitations`
3. `## Structure`
4. `## References`
5. `## Contributing`
6. `## Credits and license`

Place the H1 and a concise project summary before the first H2. Explain purpose,
audience, and useful outcome in the summary and/or `Getting started`; do not add
a separate H2 for them. Put prerequisites and the shortest working setup under
`Getting started`, with exact commands, working directory, expected result, and
links to fuller guides as needed. Put validation and project checks under a
`### Commands` heading inside `Getting started`. Keep this H3 in every README;
when no local check applies, state that accurately and point to the relevant
parent check if one exists.

Use `Security and Limitations` for actual configuration and secret handling,
permissions, data/privacy behavior, external-service requirements, and known
limits. Use `Structure` for package boundaries, important paths, and data flow.
Keep links in `References`, real contribution steps in `Contributing`, and
verified attribution and licensing in `Credits and license`.

Do not add boilerplate just to fill a section. Give each fixed section useful,
repo-specific content. If a topic does not apply, omit that topic; state that it
does not apply only when readers need that clarification. Each heading must still
have useful content, so resolve a truly empty section with one concise, verified
fact relevant to that section, not a generic placeholder. Do not publish empty
tables, generic security assurances, repeated “Not applicable” text, or template
prompts. A README for a nested package, test area, asset, or procedure should
describe that local scope and link to shared instructions where useful.

## Workflow

1. **Establish scope.** Identify the repository root, applicable `AGENTS.md`
   files, target audience, and every README in scope. For cross-repository work,
   inventory root and nested READMEs, including packages, tests, examples, and
   operational areas. Check status and preserve unrelated user changes.
2. **Inventory unique information.** Record each source README's purpose,
   audience, features, commands, prerequisites, configuration names, boundaries,
   tests, deployment, data handling, limitations, references, attribution,
   license, examples, and useful tables. Do not discard distinct information.
3. **Verify claims.** Use the evidence sources above. Confirm command syntax,
   required tools, cwd, expected output, local links, and current versions. Never
   put secrets, credentials, or private browser state in the README.
4. **Write for the reader.** Lead with what the project is and the shortest useful
   first run. Keep the six H2s in order. Use task-focused steps for procedures,
   concise prose for concepts, code fences for commands, and tables only for
   genuine comparisons or mappings. Keep bullets within 100 characters.
5. **Review the result.** Apply every rubric gate. Check heading hierarchy,
   spelling, code-fence language, relative links, command consistency, and that
   all unique source information remains in the README or a working link. Do not
   run tests unless the user requests them.
6. **Report.** Name files changed, summarize preserved or moved information,
   state checks performed, and identify claims or links that remain unresolved.

For a mechanical check of the fixed headings, H1, bullets, placeholders, fences,
empty sections, and local links, run `python3 scripts/audit_readmes.py <path>`
from this skill directory. The check does not verify prose quality or whether
commands and claims match the repository; complete the rubric review as well.
