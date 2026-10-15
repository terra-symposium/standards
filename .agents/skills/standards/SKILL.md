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
5. Explain intent and constraints in comments; omit obvious narration.
6. Verify with the narrowest reliable checks and review the full diff.

## Boundaries

- Keep application logic in its owning package.
- Fix shared tooling at its source in `terra-shared`.
- Avoid one-off consumer checks when a reusable rule belongs in shared tooling.
- Do not suppress findings without a documented reason.
- Keep secrets in approved stores. Never place credentials in source or artifacts.

## Report

Summarize changes, checks, evidence, and unresolved risks.
Separate observed results from assumptions.
