---
name: issue-completion
description: Complete clearly specified GitHub issues through isolated, tested pull requests.
---

# Issue Completion

Use after an issue audit to implement issues that are ready for agentic work.

## Select Issues

Run the `issues` audit first. Select only issues with clear scope, observable acceptance criteria,
and tests that can be run in the repository. Exclude issues marked complete, in progress,
needs clarification, stale, or duplicate. Hold work involving unresolved product choices,
credentials, production changes, or unclear cross-repository ownership.

Summarize the selected issues and their acceptance criteria before dispatch. If none qualify,
report why and stop.

## Dispatch and Review

Spawn one subagent per selected issue. Give each agent the issue URL, repository, target branch,
acceptance criteria, and relevant audit evidence. Use an isolated worktree and branch per issue.

Each agent must inspect repository guidance, implement the issue, add or update focused tests,
run those tests and relevant checks, review its diff, commit the change, and open one pull request
linked to the issue. The pull request must summarize behavior and validation evidence.

Review every agent result before reporting completion. Check scope, tests, diff, and pull request
links; request corrections when needed. Report blocked work with the exact question or missing
evidence. Do not close issues or post issue comments. Never include secrets in task text or artifacts.

## Test New Behavior

Use the repository's test skill to decide which tests the change needs. Test new behavior and
failure-prone nuances with focused assertions. Do not add tests that only prove decorative changes,
such as a color adjustment, when they introduce no behavior that can break.

Record each test command, its result, and any blocker. Distinguish test failures from setup or
environment failures. Never describe an unrun or blocked test as passing.

## Present Commit Evidence

After review, create one presentation showing the before and after for every issue commit and the
tests used to verify that commit. Use the presentation skill and the repository's test evidence
skill. Keep evidence tied to the exact commit and test run.

For visible changes, show comparable before and after screenshots at the same viewport. For
nonvisual changes, show a concise before and after code or data example. Include the behavior each
test protects, its command, and its result. Include new regression tests for newly breakable
behavior; do not count visual changes as test evidence unless behavior changed.

Inspect every slide for readability, clipping, and accurate evidence. Link the final presentation
from the completion report. List blocked tests and incomplete commits separately.
