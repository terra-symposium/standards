---
name: compact
description: Reduce documents and source files by removing duplication while preserving meaning, behavior, and comments.
---

# Compact

Compact every file in the requested scope until further reduction would hide intent or change behavior. For UI repositories, standardize shared component variants before compacting call sites.

## 1. Prepare the repository

### 1.1 Establish scope

Read repository instructions, confirm branch and worktree state, inventory the full target, and identify existing changes. Preserve unrelated work. If the user names a peer repository or an existing implementation as a reference, inspect its matching components and documentation before editing; transfer the convention that fits while preserving the target repository's own APIs and architecture.

### 1.2 Complete the UI contract first

If the repository has UI controls, follow [the UI matrix process](references/ui-matrix.md) before compacting their callers. At call sites, use the repository's shared accessible component for an interactive control whenever one exists; do not restyle a native control beside an equivalent shared component. Add or extend the shared component when needed, and keep semantic native elements such as `section`, `article`, and headings in page structure. Native controls may remain inside shared component implementations when needed for semantics or accessibility.

## 2. Run the compact sweep

### 2.1 Use quality scans to find component migrations

In a repository that installs the standards quality package, run `terra-quality ui-recommendations` (for example, `pnpm exec terra-quality ui-recommendations`) before compacting UI call sites. The inventory scans Astro, JSX, and TSX for native controls, button-like anchors, and styled text links that may have shared component equivalents; it can include a suggested variant. Review each match against its semantics, behavior, and the component matrix; the scan is a guide, not a bulk fixer. Migrate applicable call sites to the shared component and its canonical variant, then rerun the scan to find remaining candidates. An empty result confirms that this configured inventory is clear; it does not justify replacing semantic native elements or controls without a matching component.

### 2.2 Parallelize by area

For a whole-repository run, divide independent areas among subagents. The parent sets and owns the shared matrix. Agents may inventory disjoint areas in parallel; once the contract is fixed, they migrate and compact only their assigned paths. Never assign shared files or the same call sites to multiple agents.

### 2.3 Compact every file

Search callers and receiving components together. Start from the existing component API and variant contract. Express repeated color and treatment choices with the component's canonical `variant` value at the call site (for example, `variant='primary-outline'`), and use its size or other named props for presentation. Do not replace long class lists with a caller-side object or map of utility strings; define a real typed variant in the owning component family and compose its static recipe there. Delete caller classes already supplied by the component. Approximate low-level presentation with the closest valid variant and remove the classes that variant replaces. Keep caller classes only for layout or genuine one-off geometry the component API does not own.

Preserve behavior, semantics, accessibility, types, evaluation order, side effects, component identity, and meaningful comments. For repeated homogeneous content, store semantic data in an array or map and render it with `.map()` rather than duplicating JSX. Keep data semantic; do not turn it into a private class-name matrix that bypasses shared variants. Prefer maps or helpers only when they reduce repetition without hiding differences. Keep documentation easy to scan: group related guidance under headings, separate headings and paragraphs with blank lines, and use whitespace between distinct examples or table sections instead of dense prose blocks.

## 3. Integrate and finish

The parent reviews every diff, checks that every requested area and file was covered, and repeats the repository-wide search after integration. Respect each workspace's own component, icon, and formatting conventions instead of assuming packages share an implementation. Continue until no meaningful compaction remains. When commits are requested, commit each completed area on the requested development branch. Do not add or run tests unless the user asks for testing or verification.

When compaction is part of a quality or maintenance remediation, complete the requested fix rather than returning only an inventory. Run the configured quality check after the full edit batch and continue fixing actionable findings until it is green. If an external blocker or behavior constraint prevents a safe fix, leave that item explicit and mark the work incomplete; do not report an unresolved finding as complete.
