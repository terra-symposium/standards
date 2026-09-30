# @terra-symposium/quality

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
