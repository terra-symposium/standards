---
name: <unique-skill-name>
description: <when to use this skill, in one sentence>
metadata:
  related-files:
    - <repository-relative/source-or-test-file>
---

# <Task name>

Use this skill when <specific trigger and scope>. Read the listed source and
configuration before relying on commands, defaults, or examples.

## Workflow

1. Establish the current state and preserve existing work.
2. Perform the task with the applicable decision points and safety boundary.
3. Review the result against the source of truth.

## Verification

Run <exact, current checks>. Report observed results and remaining limits.

## References

- Link focused source or a supporting file only when it exists and supports
  this workflow.

Remove placeholders and unused sections. Use `related-files: []` only when no
repository files establish the workflow. Docs tabs or structured blocks are
optional when they make alternatives clearer; follow the Docs repository's
[docs-authoring skill](https://github.com/Terra-Symposium/docs/blob/development/.agents/skills/docs-authoring/SKILL.md)
and keep the raw file readable.
