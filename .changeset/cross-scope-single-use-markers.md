---
"@terra-symposium/standards-refactoring": patch
"@terra-symposium/standards-quality": patch
---

Keep a reasoned, declaration-local single-use marker valid when a repository-wide scan sees additional consumers in another module. Package scans still enforce the marker for a sole consumer, and malformed, detached, duplicate, or genuinely stale markers remain errors.
