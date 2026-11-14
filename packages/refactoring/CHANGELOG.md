# @terra-symposium/standards-refactoring

## 0.2.3

### Patch Changes

- 62bfc19: Keep a reasoned, declaration-local single-use marker valid when a repository-wide scan sees additional consumers in another module. Package scans still enforce the marker for a sole consumer, and malformed, detached, duplicate, or genuinely stale markers remain errors.

## 0.2.2

### Patch Changes

- Updated dependencies
  - @terra-symposium/standards-quality-core@0.2.1

## 0.2.1

### Patch Changes

- 38157d8: Prevent overlapping Quality fix runs and restore files if an autofix introduces syntax errors. Reject token-changing object layout rewrites. Support reasoned, declaration-specific single-use exceptions.

## 0.2.0

### Minor Changes

- Publish quality checks by capability family while keeping the aggregate CLI and compatibility exports.

### Patch Changes

- Updated dependencies
  - @terra-symposium/standards-quality-core@0.2.0
