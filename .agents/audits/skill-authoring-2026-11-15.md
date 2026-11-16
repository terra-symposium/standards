# Skill migration audit — 2026-11-15

Thirty canonical skills across six Desktop repositories were audited. Each scenario used a fresh subagent with no inherited conversation context, the candidate skill, a realistic task, and only the raw artifacts needed to assess its instructions. Audits were read-only, including workflows that normally publish, delete, deploy, or change external state. A finding was repaired and repeated with a fresh subagent where the skill lacked a safe instruction. “Pass” means the instructions supported the simulated task; it does not claim a live external operation occurred.

## Personal / Uni

- `uni-canvas-scraping` — Could plan an already-authorized local Canvas export after the skill named its route, layout, and coverage record. Initial audit lacked those details; repeat passed. No live account or export was used.

## Terra Docs

- `docs-authoring` — Could choose and render the registered blocks after aligning the skill with the parser and block registry. Initial block coverage gaps were repaired; repeat passed. Parser and round-trip tests passed separately.
- `align` — Could align authored content to source after clarifying its input and output boundaries. Fresh repeat passed; no production page was edited by the auditor.
- `gem` — Could prepare the Gem prompt under the supported fenced transport format after repairing its delimiter example. Fresh repeat passed; no model call was made.
- `generation-content-authoring` — Could map source to draft and rendered links after adding explicit coverage. Initial audit lacked that parity check; repeat passed. No packet was supplied.

## Terra Scraping

- `canvas` — Could plan an in-app browser export with per-item `coverage.json`, path, status, capture method, and reason. Initial audit found a prohibited automation route; repeat passed. No account was used.
- `syllabus` — Could plan a NSW Mathematics Stage 4 download and separate review records. Added an exact-label picker example and review-record fields. Final repeat confirmed the documented CLI invocation and conditional tests. The live label, version, and Stage 4 coverage require source inspection; no syllabus was fetched.

## Terra Standards

- `agents` — Could select AGENTS, skill, documentation, or prompt homes. Initial audit lacked absent-AGENTS and flat-layout guidance. The skill now requires incoming-reference and packaged link checks; final repeat passed. The auditor did not regenerate plugin output.
- `all-repos` — Could identify the six Terra repositories and report each exact gate and exit. Initial audit lacked read-only and dirty-tree boundaries; repeat passed. No Quality run occurred.
- `ci` — Could distinguish PR head from a synthetic merge SHA and treat missing logs as unknown. Initial SHA and log gaps were repaired; repeat passed. No CI run was accessed.
- `commit` — Could stage the requested set and stop after a local commit when appropriate. Initial skill overreached into push and PR creation; repeat passed. No commit was made.
- `dependabot-remediation` — Could select the highest-severity, oldest-numbered alert when one alert was unspecified, then distinguish local repair from remote closure. Repeat passed. No live alert data was supplied.
- `deploy` — Could choose the development site, context, and target SHA after correcting the configuration and authentication guidance. Repeat passed. No live deployment occurred.
- `issues` — Could audit or complete the exact requested issues with a Ready check and update boundary. Initial scope and edit ambiguity were repaired; repeat passed. No issue was changed.
- `package` — Could distinguish scripts from root proxies and smoke-test callers from their actual directories. Initial proxy ban contradicted Docs/Netlify launchers; repeat passed.
- `port` — Could identify ownership, assign a unique port, update references, and probe the HTTP endpoint. Initial helper behavior and reassignment gaps were repaired; repeat passed.
- `pr-review` — Could review a specified ref with conditional fetch and checks. Initial branch and cleanup ambiguity was repaired; repeat passed. No branch ID was supplied.
- `pruning` — Could plan Git and device cleanup, stopping before removing active worktrees. Initial plan-only and symlink gaps were repaired; repeat passed with its output reference.
- `quality` — Could record dirty/untracked state, run a matching read-only baseline, and review the autofix delta. Initial `--warn` and scope assumptions were repaired; repeat passed. No fixer was run by the auditor.
- `readme-standardisation` — Could follow the template and audit an existing README; initial audit passed with zero README audit errors. Minor example gap: a Get started section should state the repository-root directory and expected outcome. No rewrite was made by the auditor.
- `review` — Could route a weekly text review to contributors while keeping Drive mutation gated. Initial text-versus-deck ambiguity was repaired; repeat passed. No goals or dates were supplied.
- `semver-retcon` — Could compare committed tree parity, diverged refs, and package tags before planning a history rewrite. Initial grouping and scope ambiguity was repaired; repeat passed. No refs moved.
- `skill-authoring` — Could draft a source-backed skill, run a fresh read-only audit, and plan catalog and plugin verification. Initial audits found undisclosed generated write scope and fragile relative links; both were repaired. Final repeat passed with working-tree and external targets marked unverified until author-run checks.
- `standards` — Could require runtime and type exports plus a package-name consumer fixture. Initial test-path/API gaps were repaired; repeat passed. Existing tests still import `dist` directly, so a new public API needs the fixture before release.
- `test` — Could locate the canonical test manifest, build first, and run focused Node/TypeScript checks. Initial references to nonexistent scripts were repaired; repeat passed.

## Terra Styling

- `ui` — Could route a UI change to its owner and require viewport/browser evidence. Initial routing and related-file gaps were repaired; repeat passed. No route was supplied.
- `ui-variants` — Could check four icon sizes, default alias, and TypeScript compilation after correcting source paths. Repeat passed. Existing tests cover only `icon` and `icon-sm`; the future consolidation needs `icon-xs`, `icon-lg`, and primary-default coverage.

## Terra Website

- `document-gem` — Could prepare source-grounded Docs Markdown, including a valid `<Code>` template literal. Initial provider, provenance, and escaping gaps were repaired; parser round-trip repeat passed. No packet or model call was supplied.
- `sanity` — Could route add-query, migrate-query, field audit, and schema work to real files. Initial paths and commands were stale. Add-query now searches all field consumers, including inline GROQ, and treats Quality as an autofixing command. Final repeat passed; no live Sanity operation or build ran in the audit.
- `website-canvas-scraping` — Could plan a local Canvas-to-Markdown draft without AI or Sanity. Added concrete supplied-file coverage fields and distinguished that from course completeness. Final repeat confirmed a reconciled visible-item inventory and applicable transcript records are needed for a completeness claim. No export packet or live model was supplied.

## Author-run checks

The catalog and plugin checks, Docs parser tests, and both documentation builds passed. The focused rich-block browser tests passed. `git diff --check` passed in all six affected repositories. The full Docs browser suite had unrelated workspace failures and timeouts; that result is not counted as a pass. No changes were committed or published.
