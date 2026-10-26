# Terra-derived commenting conventions

These notes were gathered from the local `standards` quality package and the `terra-symposium-website` repository. They are evidence for the skill, not a replacement for checking the current repository or the live `terra_docs` Development leaf.

## Standards quality package

- Source files use three structural comment levels: full-width section fences, uppercase group comments inside sections, and uppercase line labels inside executable code.
- Sections commonly include `IMPORTS`, `CONFIG`, `HELPERS`, and `COMPONENTS`. Empty adjacent sections are removed.
- Imports are merged and sorted into `API`, `COMPONENTS`, `DATA`, and `TYPES` groups.
- Top-level types, interfaces, enums, and constants are managed under `CONFIG`; top-level functions under `HELPERS`; other declarations retain source order.
- Maintenance removes trailing whitespace, normalizes blank lines around fences/groups/labels, and avoids interpreting strings, templates, regex literals, or JSX text as source layout.
- Maintenance is intended to be idempotent: a second run over its output produces no changes.
- Function documentation is reconciled with the current signature: stale parameter tags are removed, missing parameter tags are added in signature order, and one return tag is maintained. Existing summaries and useful tag descriptions are preserved.

## Terra Symposium website

- The quality configuration applies JSDoc/TSDoc linting and requires documentation for function declarations and method definitions; the project uses JSDoc conventions while disabling the TSDoc syntax rule.
- Large test suites use uppercase section comments such as `// TOOLBAR`.
- A full-width `TESTS` fence is the file section, the top-level `describe`/`test.describe` names the suite, nested suites name independently understandable or selectable behaviors, and individual test titles state expected contracts.
- Use the shared `describeGroup` wrapper for selectable Node groups; it remains a normal `node:test` suite and is filtered by the runner's `--test-name-pattern` support. Use Playwright's native `test.describe` hierarchy and `--grep` filtering for browser suites.
- Use uppercase `// GROUP NAME` comments only for contiguous cases that do not need their own runner boundary. Put the marker immediately above the first test or scoped hook, keep tests contiguous with no blank lines inside a group, and leave one blank line between groups.
- Scope setup hooks to the smallest suite that needs them. Prefer independent tests; use serial execution only when tests truly share mutable state or depend on order.
- Use data-driven registration when cases exercise the same contract with different values; include each case label in its title. Keep scenarios with materially different expected behavior as separate cases or suites.
- Document suite purpose with concise TSDoc when the name is insufficient. Add test-level TSDoc only when group and test title do not make the expected contract clear; never repeat the title.
- Monolithic tests should first be split into suites/files when responsibilities differ. Within an individual end-to-end scenario, use uppercase phase labels only for meaningful boundaries such as evidence preparation, user action, persistence, and contract assertions; keep each phase together and omit narration of obvious mechanics.
- Test files follow a predictable order: imports/configuration, registration-time fixtures/data, test sections, then runtime helpers. Runtime-only helpers can move below the final test section; registration-time helpers cannot.
- Some comments are intentional AI/prompt context or generated-source guidance. Preserve them and avoid applying generic cleanup to those owned regions.

## MCP lookup

When the `terra_docs` MCP is connected, use its read-only search/tree tools to locate the commenting-practices leaf under the Development section, then read that exact leaf before applying local conventions. If the MCP is unavailable, say so internally and rely on repository evidence without fabricating leaf-specific rules.
