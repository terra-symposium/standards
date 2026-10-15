---
name: cloud-playwright
description: Run Playwright suites in Terra Cloud tasks.
---

# Cloud Playwright

Use for browser tests in an authorized Terra Codex Cloud task.

## Preflight

1. Fetch the connected usage allowance before every Cloud run.
2. Dispatch when `ordinaryUsageAllowed` is true.
   Empty reset credits alone do not block work.
3. Record the usage account ID. Do not require a Cloud UI ID match.
4. If the limit is exhausted, explain the shared allowance.
   Ask the user to switch accounts.
   Wait for confirmation, then fetch usage again and reverify access.
5. Never switch accounts or edit auth caches automatically.
6. Verify the repo, environment, branch, and task before dispatch or resume.
7. Read the task's current executor readiness and enforced network policy.
8. Use Codex task controls. Never simulate Cloud in a browser or local guard.

## Run

1. Read the repository's Cloud test instructions and environment manifest.
2. Verify checkout identity, requested ref, and current base SHA.
3. Use the declared setup, diagnostic, preflight, and test commands in order.
4. Keep credentials in Infisical and login credentials in the account store.
5. Do not put secrets, tokens, credentials, or browser storage in prompts or artifacts.
6. Preserve network policy and report infrastructure failures accurately.
7. Follow the repository's cleanup steps and keep generated credentials out of commits.

## Report

Record the account ID, task URL, revision, branch, SHA, commands, results, and cleanup.
Report authentication, usage, and environment-access failures separately.
