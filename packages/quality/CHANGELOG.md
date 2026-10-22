# @terra-symposium/standards-quality

## 2.0.4

### Patch Changes

- Show each configured quality check before it runs and report its result afterward.

## 2.0.3

### Patch Changes

- Run full ESLint and Prettier file sets in one invocation when they fit the argument limit, avoiding repeated project and file discovery.

## 2.0.2

### Patch Changes

- Disable ESLint's internal concurrency after its runtime reported a lower linting ratio. Keep the reused ESLint engine and file batches, which measured faster for the website's full check without changing findings.

## 2.0.1

### Patch Changes

- Honor configured source exclusions, group full-run diagnostics after completed progress, and reuse a bounded ESLint engine to reduce quality-run overhead.

## 2.0.0

### Major Changes

- acdba7a: Treat every quality finding as an error and remove non-blocking warning policies.

### Patch Changes

- Wait for each test suite's progress to finish before printing its output, and group all quality findings at the end of the run.

## 1.0.0

### Major Changes

- Remove repository-specific source exclusion settings so configured source roots are scanned consistently. Update consumer `quality.json` files that use removed exclusion fields.

## 0.10.0

### Minor Changes

- 7e75525: Add safe JSX accessible-name and React forwardRef display-name checks and autofixes.

## 0.9.1

### Patch Changes

- Scan Astro templates and recommend canonical ButtonLink variants for styled text links.
- Include inferred ButtonLink variants in recommendation output.

## 0.9.0

### Minor Changes

- Add an advisory scan for native UI controls that have configured shared component equivalents.

## 0.8.1

### Patch Changes

- Standardize full quality phases and test progress, group dead-code output, and remove duplicate test declarations.

## 0.8.0

### Minor Changes

- Fail quality by default when dead-code findings require manual review, with an opt-in warning policy and clear one-by-one remediation guidance.

### Patch Changes

- Preserve transitive alias chains when identifying removable declarations.

## 0.7.0

### Minor Changes

- Treat manual dead-code findings as errors by default, with a configuration option to report them as warnings. Complete all configured checks before failing and give agents actionable fix-before-commit guidance.

## 0.6.0

### Minor Changes

- Add a Tailwind canonical-class check and autofix for arbitrary CSS variable utilities.
- 10a5480: Add read-only GitHub analytics and agent-ready remediation guidance to quality reports.

### Patch Changes

- ea70e9d: Run dead-code ESLint detection in one focused sweep and recheck only changed files when safe removals expose cascaded unused declarations.

## 0.5.0

### Minor Changes

- d8ad7c5: Add versioned quality and local Git history reports for CI hygiene artifacts.

## 0.4.54

### Patch Changes

- Run ESLint in ten-file batches so long full-source checks update progress more frequently.
- Report missing parameter and return documentation for documented functions whose signatures expose those contracts.
- Inline all single-use declarations with syntax-checked, context-aware rewrites and support a rule-specific skipped-directory list.

## 0.4.53

### Patch Changes

- 5b9bdd8: Run read-only dead-code analysis once instead of repeating the full scan in a temporary autofix preview.

## 0.4.52

### Patch Changes

- Fail before quality mutations with an actionable error when a lint-enabled repository is missing an ESLint flat config.

## 0.4.50

### Patch Changes

- Exclude explicitly skipped generated files from dead-code inventory comparisons.

## 0.4.49

### Patch Changes

- Include the repository's shared support modules in read-only dead-code preview copies so ESLint rules can resolve imported source dependencies.

## 0.4.48

### Patch Changes

- Copy TypeScript ESLint configs and their Tailwind preset into read-only dead-code previews so ESLint can load the repository configuration.

## 0.4.47

### Patch Changes

- Run dead-code ESLint in ten-file batches with live progress and explicitly enable the discovered flat config.

## 0.4.46

### Patch Changes

- Pass the repository's discovered flat ESLint config explicitly to dead-code analysis so TypeScript configs are loaded consistently.

## 0.4.45

### Patch Changes

- Set the npm package homepage to https://standards-docs.netlify.app/.

## 0.4.44

### Patch Changes

- Run ESLint in ten-file batches so long full-source checks update progress more frequently.

## 0.4.43

### Patch Changes

- Cache TypeScript module resolution and identifier scans while classifying Knip consumers, and report progress during full-source consumer analysis.
- Report each dead-code analysis, single-use rewrite pass, and transactional TypeScript safety-check batch so long-running work has visible progress.
- Report remaining dead-code findings with safe-fix classification and explicit agent remediation guidance; manual-only warnings no longer fail dead-code checks.
- Never delete unreachable files automatically, avoid broad detached-comment cleanup, and preserve safe fixes in unaffected files when TypeScript validation rejects one file's edits.
- Consolidate Knip, unused declarations, one-use inlining, and detached TSDoc into one autofixing and read-only dead-code workflow.
- Validate automatic rewrites against TypeScript diagnostics and roll back only the rejected source file.
- Make `--warn` preflight the same fixes in an isolated temporary source copy so type-rejected rewrites are manual warnings without mutating the configured repository.
- Keep Astro frontmatter out of name autofixes; textual replacement could corrupt framework properties and string literals.
- Keep callback parameters as full words unless the repository's explicit semantic alias map defines a conventional short form.

## 0.4.40

### Patch Changes

- Support safe cross-file regex deduplication through an opt-in shared ESM registry.

## 0.4.39

### Patch Changes

- Make CLI help exit before quality dispatch so help requests cannot run checks or autofixes.

## 0.4.38

### Patch Changes

- Detect TSDoc attached to declarations and scaffold missing parameter and return tags during quality autofix.
- Report missing TSDoc descriptions with explicit agent-authorship guidance without generating prose.

## 0.4.37

### Patch Changes

- Limit post-inline import and comment maintenance to source files changed by the single-use fixer.
- Restrict the TypeScript runtime dependency to the supported 5.x API.

## 0.4.36

### Patch Changes

- Normalize imports and remove detached section fragments immediately after single-use fixes, including interrupted one-line fixer output.

## 0.4.35

### Patch Changes

- Expand one-line TSDoc blocks with missing parameter and return scaffolds while preserving existing tag content.
- Report missing parameter and return documentation for documented functions whose signatures expose those contracts.
- Inline all single-use declarations with syntax-checked, context-aware rewrites and support a rule-specific skipped-directory list.

## 0.4.33

### Patch Changes

- Add AST-safe automatic fixers for exact object forwarding, repeated class literals, and non-stateful duplicate regular expressions. Reuse one cached analysis context across repository checks and keep unsafe or semantic findings advisory.
- Shorten parameters for inline callbacks passed to project-specific helper functions.
- Fix documentation maintenance so prose-only leading file comments receive and preserve their canonical relative filepath header.

## 0.4.1

### Patch Changes

- Exclude generated file-path headers from prose documentation findings while continuing to audit real TSDoc summaries and tags.

## 0.4.0

### Minor Changes

- 26dafc2: Add opt-in protection for canonical one-line imports that exceed the configured Prettier print width.
- Standardise quality domains around warning, automatic-fix, working-tree, and full-repository modes, including TypeScript-aware naming fixes.

### Patch Changes

- Make quality-stage output readable when stdout and stderr are combined, and ensure the CLI executes correctly when invoked through a symlinked package binary.
