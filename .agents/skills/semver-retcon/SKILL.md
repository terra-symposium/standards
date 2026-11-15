---
name: semver-retcon
description: Rewrite Git history into semantic commits.
metadata:
  related-files: []
---

# Semantic History Rewrite

Use when reconstructing development history from a production baseline or extending an existing rewrite. History work preserves the application tree unless source changes are explicitly requested.

## Invariants

Record production `main`, source development ref, their SHAs, merge base, and
target branch before rewriting. Check whether the branches diverged. If so,
inventory production-only and development-only commits and establish the
authorized baseline, source range, and target tree. Do not silently drop
production-only work or replay onto the wrong tree.

Produce linear history without merge commits. Map every source commit to a
replacement or an explicit no-op. Record many-to-one mapping for coherent
groups and one-to-many mapping for split commits. For merge commits, show which
parent changes and conflict resolutions were preserved, or why the merge maps
to no new tree change.

Preserve each replacement's primary author name, email, and author timestamp. Use the operator as committer and retain verified co-authors as trailers.

Never group across primary-author boundaries. Group only contiguous, same-author commits with one coherent observable topic. Prefer atomicity; split heterogeneous work even when files overlap.

- Do not infer authorship from the operator, branch owner, or blame. Verify final author metadata.
- Preserve the exact committed target tree SHA unless the task includes source
  changes. Dirty working-tree content is outside tree parity; inventory and
  protect it separately unless the user explicitly includes it in the rewrite.

## Commit contract

Every replacement uses this form:

```text
<type>(<scope>): <imperative summary>

Version: X.Y.Z

Features:
- <observable outcome>

Reasoning:
- <evidence-based purpose or grouping rationale>
```

Assign a unique, monotonically increasing plain SemVer to every commit,
including development and audit commits. Derive the first replacement version
from the verified baseline. Distinguish the repository-wide semantic sequence
from package-scoped tags and manifest versions: use the latter as evidence for
affected package boundaries, not as a substitute for the repository sequence.
Record the source-to-version mapping. For grouped commits, use the
latest source commit's author timestamp and record which commit supplied it;
retain all other source timestamps in the audit map.

Use major for breaking integration changes; minor for additive capability/API/schema; patch for fixes, maintenance, docs, tests, refactors, styling, CI, and non-additive work. Reset lower components normally.

- Record evidence for major boundaries. Do not inflate a version to hide unrelated work.

Describe all contributing commits' observable outcomes in `Features`; describe intent, compatibility, attribution, or grouping in `Reasoning`. Do not invent motivation.

## Workflow

1. Snapshot status, refs, baseline, source tip, and target. Protect unrelated work before checkout, fetch, or rewrite.
2. Inventory every source commit and merge parent: author identity/date, trailers, paths, subject/body, and resulting tree.
3. Establish capability milestones and a machine-readable source-to-replacement map with SemVer decisions.
4. Rebuild chronologically, grouping only coherent contiguous work. Apply later source activity under the same rules.
5. Verify tree parity, complete mapping, authorship, unique increasing versions, no merges, object integrity, whitespace, and requested application checks.
6. Keep blocked runtime/quality checks separate from history proof.

## Evidence and safety

Keep audit records reviewable. Never expose credentials or rewrite a protected branch directly. Push only to a dedicated review branch; use `--force-with-lease` only when the user authorized updating an existing rewritten ref.
