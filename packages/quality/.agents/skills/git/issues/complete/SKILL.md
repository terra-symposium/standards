---
name: issue-completion
description: Complete clear GitHub issues in isolated, tested pull requests.
---

# Issue completion

Use after an issue audit to implement issues that are ready for agentic work.

## Select issues

Run the `issues` audit first.
Select issues with clear scope, observable criteria, and runnable tests.
Exclude complete, active, unclear, stale, or duplicate issues.
Hold unresolved product choices, credentials, production changes, and unclear ownership.

Summarize selected issues and acceptance criteria before dispatch.
If none qualify, report why and stop.

## Dispatch and review

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

## Test new behavior

Use the repository's test skill to choose coverage.
Test new behavior and failure-prone nuances with focused assertions.
Skip tests for decorative changes that add no breakable behavior.

Record each test command, result, and blocker.
Separate test failures from setup failures.
Never report an unrun or blocked test as passing.

## Present commit evidence

Create a baseline deck after reviewing the commits.
Treat the export as a draft for review and polish.
Use the presentation skill and Terra test skill.
Give every issue commit its own evidence slide.
Tie every screenshot, example, and test to its commit.

### Build evidence

Show the before and after for every commit.
Use matched screenshots for visible changes.
Capture every distinct changed UI context.
For generated output, show a varied sample large enough to judge its range.
Use about twelve examples when taste or consistency matters.
For non-visual changes, show concise code, data, or flow evidence.

Map each test to the behavior it covers.
Record the command, result, and any setup failure.
Use the test skill to find missing regression coverage.
Add tests for new behavior and failure-prone nuances.
Skip tests for purely decorative changes with no new behavior.
Never use a screenshot as proof that behavior works.

### Evaluate and polish

Review the baseline as an agentic evaluator before polishing.
Read the exported PowerPoint and compare it with every issue and commit.
Render every slide and inspect each at full size.
Use a contact sheet to check flow and consistency.
Build it from the current deck's slides, excluding stale renders.
Check that slide and render counts match.
Look for missing slides, screenshots, tests, contexts, and evidence.
Flag sparse slides, small text, clipping, overlap, and awkward wrapping.
Check sample variety and every affected implementation context.
Use the test skill to find missing behavior and edge-case tests.
Add needed tests, rerun them, and record exact results.
Fix gaps, polish the deck, export again, and repeat the review.
Deliver only after visual and test gaps are resolved or clearly blocked.
Record blockers and incomplete acceptance checks separately.
Use final commit IDs and keep issue, PR, and deck status consistent.
Link the polished deck in the report.

## Open interactive review

Make browser review part of the default handoff.
Use the final source revision or its verified deployment.
Open a visible in-app browser tab for each changed interface.
Include distinct consumers and meaningful interaction states.
For non-visual commits, open source or evidence instead.

Use real components with safe, isolated data where needed.
Label fixtures and external behavior they cannot verify.
Keep fixture state usable after refresh.
Never publish real posts or make payments while preparing review.

Check that every tab loads and exposes working controls.
Provide a short checklist and URL for each tab.
Keep local review servers running for the user.
Record the revision, runtime limits, and cleanup instructions.
Deliver the polished deck alongside the interactive tabs.

## Merge and closure gate

Do not call a branch merge-ready while required checks are blocked.
Do not close an issue until its criteria are integrated and verified.
Keep production, credential, and external-runtime checks explicit.
Report which issues are complete, blocked, or out of scope.
