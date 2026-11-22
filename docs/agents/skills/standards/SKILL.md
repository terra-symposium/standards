---
name: standards
description: Apply Terra coding conventions and review workflow runtime.
metadata:
  related-files:
    - package.json
    - packages/hygiene/package.json
skill: true
---

# Standards

Use this skill to implement or review changes across Terra repositories, including application and library packages.

## Workflow

1. Read repository instructions and the relevant package or feature guidance.
2. Find the canonical source and current owner before editing.
3. Reuse established types, helpers, components, and conventions.
4. Make the smallest complete change. Preserve behavior, compatibility, and user work.
5. Prefer concise, strictly typed implementations; avoid `any`, use explicit return types where repository conventions expect them, and do not add speculative abstractions.
6. Represent repeated structures with shared data when it improves clarity, while keeping one-consumer behavior in its owning package.
7. Explain intent and constraints in comments; omit obvious narration.
8. Verify with the narrowest reliable checks and review the full diff.

## Boundaries

- Keep application logic in its owning package.
- Fix shared tooling at its source in `standards`.
- Avoid one-off consumer checks when a reusable rule belongs in shared tooling.
- Do not suppress findings without a documented reason.
- Keep secrets in approved stores. Never place credentials in source or artifacts.

## Shared quality package

`packages/hygiene` is the source for `@terra-symposium/hygiene`. Change and test reusable checks here rather than copying their implementation or policy into a consumer repository.

Add focused tests under `packages/hygiene/tests`; exercise the public package boundary and assert autofix idempotence when relevant. For a new public API, verify the runtime and types entries in `packages/hygiene/package.json` exports. Build the package, then test an isolated consumer import by package name and TypeScript type resolution so source aliases or direct `dist` imports cannot hide a broken export. Update the package map in Docs when the public surface changes.

Implement behavior under `packages/hygiene/src` and keep runner/config normalization, schema, package documentation, and examples aligned.

Use the package's build and test scripts. Add a Changeset for publishable package changes; documentation-only edits do not need a version bump.

Check consuming repositories' package manifests, lockfiles, and `quality.json` files when a published change affects them. Keep consumer configuration and domain-specific rules in the consuming repository.

## Workflow efficiency

For explicit requests to measure or improve the runtime of commands, builds, reports, or repository workflows, follow the [workflow efficiency guide](references/workflow-efficiency.md). Apply this specialized workflow only when runtime measurement or improvement is requested.

## Report

Summarize changes, checks, evidence, and unresolved risks. Separate observed results from assumptions.
