---
name: standards
description: Apply shared Terra coding and review conventions.
---

# Standards

Use this skill to implement or review changes across Terra repositories.

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

`packages/quality` is the source for `@terra-symposium/standards-quality`. Change and test reusable checks here rather than copying their implementation or policy into a consumer repository.

- Add focused tests under `packages/quality/test`; exercise the public package boundary and assert autofix idempotence when relevant.
- Implement behavior under `packages/quality/src` and keep runner/config normalization, schema, package documentation, and examples aligned.
- Use the package's build and test scripts. Add a Changeset for publishable package changes; documentation-only edits do not need a version bump.
- Check consuming repositories' package manifests, lockfiles, and `quality.json` files when a published change affects them. Keep consumer configuration and domain-specific rules in the consuming repository.

## Report

Summarize changes, checks, evidence, and unresolved risks.
Separate observed results from assumptions.
