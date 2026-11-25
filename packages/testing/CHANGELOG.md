# @terra-symposium/standards-testing

## 0.3.0

### Minor Changes

- Consolidate Quality capabilities under one package with named subpath exports and publish the separate runtime, reporting, and testing packages under one-word names.
- Add a shared linear-history check and an extensible test-plan runner and GitHub Action for Terra repositories.

## 0.2.0

### Minor Changes

- 61cbf91: Add a reusable test-plan runner and Standards-owned shared CI checks for consuming repositories.

### Patch Changes

- 4885156: Prefer `config/terra-tests.json` for default test-plan discovery while keeping explicit manifest selection and existing paths compatible.
- 70f1a07: Validate expanded test file ownership globs and reject overlapping or uncovered test files.
