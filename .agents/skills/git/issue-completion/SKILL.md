---
name: issue-completion
description: Complete clear GitHub issues in isolated, tested pull requests.
---

# Issue Completion

Use after an issue audit to implement issues that are ready for agentic work.

## Select Issues

Run the `issues` audit first.
Select issues with clear scope, observable criteria, and runnable tests.
Exclude complete, active, unclear, stale, or duplicate issues.
Hold unresolved product choices, credentials, production changes, and unclear ownership.

Summarize selected issues and acceptance criteria before dispatch.
If none qualify, report why and stop.

## Dispatch and Review

Spawn one subagent per selected issue.
Give each the issue URL, repository, target branch, criteria, and audit evidence.
Use one isolated worktree and branch per issue.

Each agent reads repository guidance and implements its issue.
It adds focused tests, runs relevant checks, reviews the diff, and commits.
It opens one linked PR with behavior and validation evidence.

Review every result before reporting completion.
Check scope, tests, diff, and PR links; request corrections as needed.
Report the exact question or missing evidence for blocked work.
Do not close issues or comment. Keep secrets out of task text and artifacts.

## Test New Behavior

Use the repository's test skill to choose coverage.
Test new behavior and failure-prone nuances with focused assertions.
Skip tests for decorative changes that add no breakable behavior.

Record each test command, result, and blocker.
Separate test failures from setup failures.
Never report an unrun or blocked test as passing.

## Present Commit Evidence

Create a baseline deck after reviewing the commits.
Use the presentation skill and the repository's test evidence skill.
Keep one slide or clear section for every issue commit.
Tie each example to its commit and actual test run.

### Build Evidence

Show before and after for every commit.
Use matching screenshots for visible changes.
Capture every distinct UI context changed by the commit.
For generated output, show a varied sample large enough to judge its range.
Use about twelve examples when taste or consistency matters.
For non-visual changes, show concise code, data, or flow evidence.

Map each test to the behavior it covers.
Record the command, result, and any setup failure.
Use the test skill to find missing regression coverage.
Add tests for new behavior and failure-prone nuances.
Skip tests for purely decorative changes with no new behavior.
Never use a screenshot as proof that behavior works.

### Evaluate and Polish

Treat the first export as a draft, not the deliverable.
Read the exported deck and compare it with the issue and commit list.
Render every final slide and inspect each one at full size.
Use a contact sheet to review the deck's flow and consistency.
Check that every commit, screenshot, test, and required context appears.
Look for missing slides, missing or broken images, sparse evidence,
small text, clipping, overlap, awkward wrapping, and UI regressions.
Review generated samples for variety, quality, and visual consistency.
Review screenshots from every affected implementation context.
Check that tests cover meaningful new behavior and not just the happy path.

Fix evidence gaps and visual problems, then export and inspect again.
Do not deliver a first-pass deck while reviewable gaps remain.
If a required check cannot run, record the exact blocker.
Link the polished presentation in the report.
List blocked tests and incomplete commits separately.
