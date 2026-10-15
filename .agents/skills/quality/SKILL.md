---
name: quality
description: Run Terra Quality, fix actionable findings, and report reliable evidence.
---

# Terra Quality

Use this skill to audit or repair a Terra repository with `@terra-symposium/quality`.

## Workflow

1. Read the repository's `quality.json`, package scripts, and installed Quality README.
2. Record branch, status, scope, and existing changes. Preserve unrelated work.
3. Run the configured quality command. Keep its full result, warnings, and exit status.
4. Group findings by cause and owner. Fix the smallest complete set at its canonical source.
5. Review autofixes and the full diff. Never treat an autofix exit code as proof of correctness.
6. Rerun the affected checks and the required repository command.

## Guidance

- Shared runner behavior belongs in `packages/quality`.
- Consumer configuration belongs in that repository's `quality.json`.
- Missing access or unavailable inputs are unknown, not zero findings.
- Do not hide warnings, skip configured commands, or expose secrets.
- The runner does not prove runtime correctness, security, or visual quality.

## Report

List commands, scope, exit status, counts, warnings, fixes, and remaining blockers.
