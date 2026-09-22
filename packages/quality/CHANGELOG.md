# @terra-symposium/quality

## 0.4.33

### Patch Changes

- Remove detached ordinary comments and comment-only managed sections during source maintenance, including orphan documentation discovered through AST trivia around template literals.

## 0.4.32

### Patch Changes

- Resolve repository-local tools from pnpm stores and include TypeScript project language-service diagnostics in quality runs.
- 5b24ce2: Add AST-safe automatic fixers for exact object forwarding, repeated class literals, and non-stateful duplicate regular expressions. Reuse one cached analysis context across repository checks and keep unsafe or semantic findings advisory.
- Remove detached and superseded TSDoc after source mutations, and make the shared package source-of-truth workflow explicit.

## 0.4.1

### Patch Changes

- Exclude generated file-path headers from prose documentation findings while continuing to audit real TSDoc summaries and tags.

## 0.4.0

### Minor Changes

- 26dafc2: Add opt-in protection for canonical one-line imports that exceed the configured Prettier print width.
- Standardise quality domains around warning, automatic-fix, working-tree, and full-repository modes, including TypeScript-aware naming fixes.

### Patch Changes

- Make quality-stage output readable when stdout and stderr are combined, and ensure the CLI executes correctly when invoked through a symlinked package binary.
