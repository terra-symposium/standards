---
name: test-fixing
description: Diagnose and repair Terra test failures at the canonical source, fixture, test, or Cloud setup boundary until the requested inventory is genuinely green.
---

# Test Fixing

Use this skill for Terra test repair. It implements and verifies repairs; it is not a plan-only diagnostic. Execution mode defaults to local. Use Cloud only when the user explicitly requests Cloud workers, and never switch modes to work around a blocker.

## Local Repair Workflow (default)

- Run local subagents in separate managed worktrees, one per independent source-of-truth domain. Inspect the repository, branch, diff, and worktree state first. Managed worktrees start from a ref without dirty changes; preserve the user's working copy and carry only reviewed, relevant patches into worker worktrees.
- Verify each worker's worktree path, repository, base ref, and task scope before edits. Use the documented local runtime and dependency setup when needed. Never invoke Cloud task controls, Cloud usage checks, Cloud setup smoke tasks, or headed-browser automation to simulate Cloud.
- Give each worker the exact failing inventory and evidence, allowed files, prohibited compatibility changes, focused and adjacent checks, and required handoff details. Do not overlap files or mutable databases, Sanity datasets, sessions, indexes, or deployments; isolate or serialize those runs.
- If a local prerequisite requires unavailable secrets or services, preserve the blocker, continue independent diagnosis, and do not retrieve or copy credentials into the checkout.
- The parent reviews each diff, source ownership, and executed evidence; integrates repairs in dependency order; then runs focused and adjacent checks from the parent checkout. Keep one failure-ledger record per failing test and viewport. Never call a partial run green.

## Cloud Repair Workflow (explicit Cloud mode)

Read [Cloud Workflow Evidence](references/cloud-workflow.md) before dispatching a worker.

Run this fixed sequence: preflight, Cloud environment verification, domain collection, domain repair loops, one integration checkout, one PR. Application execution, repair, and integration validation run in repository-backed Codex Cloud checkouts; local tools may inspect diffs and coordinate only.

- Reuse the published workspace environment `terra-symposium-test-fixing` only after verifying its repository binding, workspace sharing, install script, Start skill, Node `22.19.0`, pnpm `10.30.3`, pinned Infisical CLI checksum, Chromium, Linux dependencies, Xvfb, current network policy, VPN and TCP grant. Resolve its current ID from the official environment resolver and verify the returned name and repository before dispatch; if that resolver is unavailable or cannot verify the binding, stop with an environment-access blocker. Never reuse an old account-specific ID, decode runtime IDs or create a duplicate as a workaround. Verify each task branch starts from the recorded current `origin/development` SHA separately.
- Use the environment-owned `INFISICAL_TOKEN` network secret only through the managed HTTPS proxy and only for the read-only development scope. Never print it, copy it into a file, pass it to an agent command, or fall back to a local Infisical login. Missing or unready proxy injection is a setup error. Restored application and Studio sessions are removed by the standard runner when the task finishes.
- Treat browser accessibility trees and screenshots as potential secret disclosure surfaces. Never reveal or copy a secret in a browser UI; secret values can appear in accessibility output even when the visual field looks masked. For credential creation, rotation, replacement, or entry, prepare the destination if useful, then hand control to the user for the secret entry and submission. Do not include secret values in task output, browser observations, logs, artifacts, or conversation.
- In every fresh and cached Cloud shell, prove `node`, `pnpm`, `infisical`, and Chromium executable paths and run `node scripts/test/cloud-workflow.mjs preflight` from the verified Terra website checkout before a suite. Run `node scripts/setup/with-secrets.mjs development -- pnpm run setup:verify`, then run `pnpm run test:cloud-preflight` to prove Chromium launch, development database connectivity, task-scoped authentication, and restored persistent sessions (`sessionRestored: true`). A missing persistent session remains a blocker for suites that require one. Then run the real source, public-browser, authenticated-fixture, cleanup, Astro readiness, and required Studio readiness smokes. Installation output alone is not a test count.
- Restore and validate the separate dashboard and Studio sessions before collection. A missing session is a preflight blocker, never a passing skip.
- Persist no-secret orchestration state in a committed run-state file using `cloud-workflow.mjs`. Record environment ID, task URL, checkout SHA, model, reasoning, commands, counts, diagnostics, artifacts, cleanup, and the failure ledger. Resume a recorded task instead of dispatching a duplicate.
- Before submitting any task, set the required `gpt-6-luna`, `medium`, one-attempt configuration using a supported model picker and confirm those values are selected. Prompt text does not set model metadata. If the Cloud composer has no model picker, do not submit a task expecting its default to match; use another supported task composer with an explicit picker. Change a workspace-wide default only with explicit user approval because it affects other members. After dispatch, confirm actual model and reasoning in task metadata before counting the task toward the evidence gate; cancel and exclude a mismatch before setup or domain work.
- For the Cloud web composer, inspect the visible controls rather than assuming a picker is hidden: the currently verified composer exposes environment and branch selectors, prompt, and submit, while its General settings page has no model control. The supported workspace fallback is Workspace settings > Models; OpenAI documents that owners/admins manage Work & Codex starting model and reasoning defaults, and role-specific model overrides when available. A member cannot change these defaults. Before changing accounts, identify the owner of the private Cloud environment and confirm the replacement account retains access. A successful `platform.openai.com` sign-in does not authenticate `chatgpt.com`; treat these as separate sessions. If no supported model picker or authorized owner/admin session is available, do not dispatch: keep the environment and task list unchanged and continue repository review/preparation until the model gate can be met.
- Every worker uses an actual Cloud task configured as `gpt-6-luna`, `medium`, one attempt, on `codex/luna-fix-<domain>`. Verify this from task metadata, not the prompt. The foundation owner exclusively owns shared runtime, runner, reporter, and fixture infrastructure.

Use the versioned `scripts/test/cloud-domains.json` manifest in the verified Terra website checkout. Collect actual test inventory before execution; reject a duplicate or unassigned test. Serialize domains sharing a mutable database, Sanity dataset, session, index, or fixed record until run-scoped isolation and cleanup are demonstrated.

On a deterministic provisioning failure, stop and diagnose immediately. Retry only after a relevant configuration change or evidence of a transient service failure. Readiness deadlines never justify increased assertion timeouts, retries, skips, or reduced viewports.

## Repair Boundary

Before editing, capture exact test ID, project, viewport, retry, command, output, branch/ref, fixture, current source path, recent history, renames, and diff. Classify one primary cause:

- application defect;
- stale test, fixture, selector, route, or source contract;
- test infrastructure or reporter defect;
- environment, authentication, data, or external-service blocker;
- intentional contract change requiring coordinated source and test updates.

Repair the current source of truth. Preserve intentional migrations by updating stale test mechanics; repair production only for a demonstrated regression. Do not add proxies, aliases, shims, duplicate routes, compatibility bridges, skipped cases, weakened assertions, broad selectors, swallowed errors, or unexplained timeout/retry increases.

Each worker first collects the suite, then runs source/unit checks, the smallest failing case, its domain, adjacent consumers, and finally responsive verification. Run all six required viewports: 390x844, 640x800, 768x900, 1024x768, 1280x720, and 1536x864. Changed layouts also require adjacent breakpoint and headed Xvfb screenshots. Preserve original failures, browser/server diagnostics, retries, traces, screenshots, workbook/deck reports, and cleanup outcomes.

## Cloud Integration And Acceptance

Create `codex/test-fix-foundation` for prerequisites, then `codex/test-fix-all` from the recorded remote `development` SHA. Incorporate foundation and domain commits in dependency order without squashing. Revalidate every affected domain after conflicts, rebase onto current `development`, then re-run the complete collected suite, responsive matrix, and applicable quality/type/schema/function/linear-history checks. Open exactly one PR against `development` only when the combined revision is complete.

## Local Integration And Acceptance

Integrate local worker patches in dependency order on the task branch. Revalidate every affected domain after conflicts, then run the collected relevant suite, required viewports, and applicable quality/type/schema/function checks. Report executed counts, unexecuted inventory, artifacts, cleanup, and blockers. Only report green when the requested inventory executed with zero unresolved failures, prerequisite skips, flaky passes, missing evidence, or fixture leaks.

Green means expected inventory equals completed inventory: zero unresolved failures, prerequisite skips, flaky passes, missing evidence, or fixture leaks. Include the following ledger in every handoff:

```text
Test/project/viewport:
Observed evidence:
Classification:
Canonical source of truth:
Fix owner:
Chosen repair:
Why the alternative would mislead:
Focused validation:
Broader regression validation:
Remaining blocker or evidence gap:
```

Record unexecuted inventory and blockers precisely; never report a partial run as green.
