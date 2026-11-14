# Complete repository test plan: standards

This checklist inventories repository-owned functions, documents, and configuration as of the current working tree. It is a plan, not a claim that every item is already tested. Update it when an owned source or document changes.

## Scope and method

- Function entries identify the source path and line. Exercise the stated normal, edge, and failure scenarios; link or add assertions as each entry is completed.
- Document entries require rendering, link checking, and content review. Execute documented commands against the current repository.
- Generated output, dependencies, vendored trees, bundled course viewers, and Portfolio pinned `projects/` snapshots are covered through build, package, and integration checks rather than individual upstream functions. Keep those boundaries under review when their inputs change.
- Put produced reports, screenshots, traces, and coverage under `tests/results/`.

## Function and executable source inventory

### `.agents/skills/all-repos/scripts/create-repo-chats.mjs`

- [ ] `callback@33` (line 33): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `gitRoot` (line 47): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@49` (line 49): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@49` (line 49): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `discover` (line 63): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@86` (line 86): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `run` (line 106): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@107` (line 107): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@123` (line 123): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@126` (line 126): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@129` (line 129): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@134` (line 134): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@143` (line 143): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `apps/hygiene/config/astro.config.mjs`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `apps/hygiene/migrations/001_initial.sql`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `apps/hygiene/migrations/003_local_history_reports.sql`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `apps/hygiene/migrations/004_build_report_tokens.sql`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `apps/hygiene/migrations/005_run_source.sql`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `apps/hygiene/migrations/006_quality_policy_source.sql`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `apps/hygiene/netlify/functions/callback.mts`

- [ ] `handler` (line 23): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@30` (line 30): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@31` (line 31): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@41` (line 41): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `apps/hygiene/netlify/functions/login.mts`

- [ ] `handler` (line 22): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `apps/hygiene/netlify/functions/logout.mts`

- [ ] `handler` (line 23): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `apps/hygiene/netlify/functions/repo.mts`

- [ ] `handler` (line 31): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `callback@53` (line 53): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `callback@74` (line 74): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).

### `apps/hygiene/netlify/functions/report-token.mts`

- [ ] `handler` (line 26): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `apps/hygiene/netlify/functions/report.mts`

- [ ] `authorizedRepo` (line 33): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `handle` (line 48): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `bearer` (line 49): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `handler` (line 103): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).

### `apps/hygiene/netlify/functions/repos.mts`

- [ ] `handler` (line 24): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@28` (line 28): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@30` (line 30): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `apps/hygiene/netlify/functions/webhook.mts`

- [ ] `repositoryOwner` (line 28): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `verifySignature` (line 44): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `acceptDelivery` (line 60): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `handler` (line 78): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@97` (line 97): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@102` (line 102): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@113` (line 113): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `apps/hygiene/scripts/import-local-build-report.ts`

- [ ] `option` (line 37): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `git` (line 52): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `run` (line 65): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `main` (line 75): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `optionalOption` (line 81): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `githubRepo` (line 92): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@184` (line 184): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `apps/hygiene/scripts/import-local-history.ts`

- [ ] `option` (line 37): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `git` (line 52): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@63` (line 63): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@98` (line 98): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `apps/hygiene/scripts/local-import-utils.ts`

- [ ] `option` (line 25): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `optionalOption` (line 40): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `git` (line 56): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `validateImportTarget` (line 68): Test valid, malformed, empty, and boundary input; assert exact output or error. No direct test file is linked yet.
- [ ] `resolveRevision` (line 83): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `apps/hygiene/scripts/migrate.ts`

- [ ] `callback@20` (line 20): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@27` (line 27): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `apps/hygiene/scripts/prepare-cache.mjs`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `apps/hygiene/src/components/Dashboard.tsx`

- [ ] `percent` (line 76): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `date` (line 86): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `year` (line 96): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `LineChart` (line 108): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@118` (line 118): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `Dashboard` (line 139): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@151` (line 151): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@153` (line 153): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@165` (line 165): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@170` (line 170): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@173` (line 173): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@180` (line 180): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@183` (line 183): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@187` (line 187): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@248` (line 248): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@252` (line 252): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@280` (line 280): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@281` (line 281): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@325` (line 325): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@325` (line 325): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@328` (line 328): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@328` (line 328): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@363` (line 363): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@364` (line 364): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@368` (line 368): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@378` (line 378): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `addBranch` (line 379): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@409` (line 409): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@426` (line 426): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@448` (line 448): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@449` (line 449): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@492` (line 492): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@515` (line 515): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@515` (line 515): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@521` (line 521): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@521` (line 521): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `apps/hygiene/src/env.d.ts`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `apps/hygiene/src/lib/server/auth.ts`

- [ ] `digest` (line 33): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`apps/hygiene/tests/auth.test.ts`](../apps/hygiene/tests/auth.test.ts).
- [ ] `cookieSecurityAttribute` (line 44): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`apps/hygiene/tests/auth.test.ts`](../apps/hygiene/tests/auth.test.ts).
- [ ] `key` (line 57): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`apps/hygiene/tests/auth.test.ts`](../apps/hygiene/tests/auth.test.ts).
- [ ] `encrypt` (line 70): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`apps/hygiene/tests/auth.test.ts`](../apps/hygiene/tests/auth.test.ts).
- [ ] `decrypt` (line 86): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`apps/hygiene/tests/auth.test.ts`](../apps/hygiene/tests/auth.test.ts).
- [ ] `sessionToken` (line 100): Test valid, malformed, empty, and boundary input; assert exact output or error. Candidate coverage: [`apps/hygiene/tests/auth.test.ts`](../apps/hygiene/tests/auth.test.ts).
- [ ] `callback@104` (line 104): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`apps/hygiene/tests/auth.test.ts`](../apps/hygiene/tests/auth.test.ts).
- [ ] `callback@105` (line 105): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`apps/hygiene/tests/auth.test.ts`](../apps/hygiene/tests/auth.test.ts).
- [ ] `createSession` (line 120): Test successful mutation, duplicate/conflict, validation, and failed-write behavior. Candidate coverage: [`apps/hygiene/tests/auth.test.ts`](../apps/hygiene/tests/auth.test.ts).
- [ ] `sessionCookie` (line 135): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`apps/hygiene/tests/auth.test.ts`](../apps/hygiene/tests/auth.test.ts).
- [ ] `session` (line 146): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`apps/hygiene/tests/auth.test.ts`](../apps/hygiene/tests/auth.test.ts).
- [ ] `removeSession` (line 181): Test successful mutation, duplicate/conflict, validation, and failed-write behavior. Candidate coverage: [`apps/hygiene/tests/auth.test.ts`](../apps/hygiene/tests/auth.test.ts).
- [ ] `canReadRepository` (line 194): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`apps/hygiene/tests/auth.test.ts`](../apps/hygiene/tests/auth.test.ts).
- [ ] `equalSecret` (line 206): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`apps/hygiene/tests/auth.test.ts`](../apps/hygiene/tests/auth.test.ts).

### `apps/hygiene/src/lib/server/db.ts`

- [ ] `db` (line 22): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `apps/hygiene/src/lib/server/github.ts`

- [ ] `repositoryAdmin` (line 21): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `github` (line 25): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).

### `apps/hygiene/src/lib/server/history.ts`

- [ ] `parseHistoryReport` (line 59): Test valid, malformed, empty, and boundary input; assert exact output or error. Candidate coverage: [`packages/quality/tests/reports/history-report.test.mjs`](../packages/quality/tests/reports/history-report.test.mjs).
- [ ] `callback@73` (line 73): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/history-report.test.mjs`](../packages/quality/tests/reports/history-report.test.mjs).
- [ ] `parseBuildReport` (line 106): Test valid, malformed, empty, and boundary input; assert exact output or error. Candidate coverage: [`packages/quality/tests/reports/history-report.test.mjs`](../packages/quality/tests/reports/history-report.test.mjs).
- [ ] `reportTargetsTrackedBranch` (line 142): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/reports/history-report.test.mjs`](../packages/quality/tests/reports/history-report.test.mjs).

### `apps/hygiene/src/lib/server/ingest.ts`

- [ ] `buildReportCounts` (line 30): Run on clean input; verify deterministic output and a useful failure on invalid input. No direct test file is linked yet.
- [ ] `buildRunId` (line 42): Run on clean input; verify deterministic output and a useful failure on invalid input. No direct test file is linked yet.
- [ ] `persistHistoryReport` (line 55): Test successful mutation, duplicate/conflict, validation, and failed-write behavior. No direct test file is linked yet.
- [ ] `ingestHistoryReport` (line 100): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `ingestBuildReport` (line 120): Run on clean input; verify deterministic output and a useful failure on invalid input. No direct test file is linked yet.

### `apps/hygiene/src/lib/server/metrics.ts`

- [ ] `parseJUnit` (line 34): Test valid, malformed, empty, and boundary input; assert exact output or error. Candidate coverage: [`apps/hygiene/tests/metrics.test.ts`](../apps/hygiene/tests/metrics.test.ts).
- [ ] `visit` (line 37): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`apps/hygiene/tests/metrics.test.ts`](../apps/hygiene/tests/metrics.test.ts).
- [ ] `parseQualityReport` (line 66): Test valid, malformed, empty, and boundary input; assert exact output or error. Candidate coverage: [`apps/hygiene/tests/metrics.test.ts`](../apps/hygiene/tests/metrics.test.ts).
- [ ] `score` (line 101): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`apps/hygiene/tests/metrics.test.ts`](../apps/hygiene/tests/metrics.test.ts).

### `apps/hygiene/src/lib/server/report-auth.ts`

- [ ] `hashReportToken` (line 22): Test valid, malformed, empty, and boundary input; assert exact output or error. No direct test file is linked yet.
- [ ] `matchesReportToken` (line 33): Test valid, malformed, empty, and boundary input; assert exact output or error. No direct test file is linked yet.

### `apps/hygiene/src/pages/index.astro`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `apps/hygiene/tests/auth.test.ts`

- [ ] `callback@19` (line 19): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@24` (line 24): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.

### `apps/hygiene/tests/metrics.test.ts`

- [ ] `callback@30` (line 30): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@35` (line 35): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@47` (line 47): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@51` (line 51): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@67` (line 67): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@96` (line 96): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@110` (line 110): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@122` (line 122): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@123` (line 123): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@144` (line 144): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@148` (line 148): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@152` (line 152): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@157` (line 157): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@163` (line 163): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@175` (line 175): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@182` (line 182): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@189` (line 189): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `claim` (line 192): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `process` (line 197): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `release` (line 200): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@208` (line 208): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `claim` (line 212): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `process` (line 217): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@219` (line 219): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@223` (line 223): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@229` (line 229): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@239` (line 239): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `claim` (line 242): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `process` (line 247): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `release` (line 250): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@260` (line 260): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@264` (line 264): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@266` (line 266): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@274` (line 274): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@276` (line 276): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.

### `config/eslint.config.mjs`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `config/prettier.config.cjs`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `config/scripts/build-docs.mjs`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `config/scripts/typecheck.mjs`

- [ ] `childDirs` (line 16): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/typecheck-discovery.test.mjs`](../packages/quality/tests/runner/typecheck-discovery.test.mjs).
- [ ] `callback@18` (line 18): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/typecheck-discovery.test.mjs`](../packages/quality/tests/runner/typecheck-discovery.test.mjs).
- [ ] `callback@19` (line 19): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/typecheck-discovery.test.mjs`](../packages/quality/tests/runner/typecheck-discovery.test.mjs).
- [ ] `hasTypeScriptSource` (line 29): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/typecheck-discovery.test.mjs`](../packages/quality/tests/runner/typecheck-discovery.test.mjs).
- [ ] `discoverTypecheckTargets` (line 49): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/runner/typecheck-discovery.test.mjs`](../packages/quality/tests/runner/typecheck-discovery.test.mjs).
- [ ] `callback@58` (line 58): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/typecheck-discovery.test.mjs`](../packages/quality/tests/runner/typecheck-discovery.test.mjs).
- [ ] `callback@66` (line 66): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/typecheck-discovery.test.mjs`](../packages/quality/tests/runner/typecheck-discovery.test.mjs).
- [ ] `runTypecheckTargets` (line 78): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/runner/typecheck-discovery.test.mjs`](../packages/quality/tests/runner/typecheck-discovery.test.mjs).
- [ ] `main` (line 95): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/typecheck-discovery.test.mjs`](../packages/quality/tests/runner/typecheck-discovery.test.mjs).

### `docs/agents/packages/quality/skills/git/readme/scripts/audit_readmes.py`

- [ ] `readmes` (line 28): Test found, missing, unauthorized, and upstream-failure results. No direct test file is linked yet.
- [ ] `check` (line 48): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `main` (line 150): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `docs/agents/packages/quality/skills/git/readme/scripts/test_audit_readmes.py`

- [ ] `test_directory_and_explicit_file_return_unique_sorted_readmes` (line 19): Test found, missing, unauthorized, and upstream-failure results. No direct test file is linked yet.
- [ ] `test_invalid_target_is_reported_without_becoming_a_readme` (line 31): Test valid, malformed, empty, and boundary input; assert exact output or error. No direct test file is linked yet.
- [ ] `test_valid_document_ignores_fenced_examples_and_accepts_local_links` (line 47): Test valid, malformed, empty, and boundary input; assert exact output or error. No direct test file is linked yet.
- [ ] `test_invalid_document_reports_structure_placeholders_and_broken_links` (line 86): Test valid, malformed, empty, and boundary input; assert exact output or error. No direct test file is linked yet.
- [ ] `test_main_reports_a_failed_readme_with_exit_code_one` (line 118): Test found, missing, unauthorized, and upstream-failure results. No direct test file is linked yet.

### `docs/agents/packages/quality/skills/quality/scripts/provision-quality-chats.mjs`

- [ ] `options` (line 18): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `findRepos` (line 53): Test found, missing, unauthorized, and upstream-failure results. No direct test file is linked yet.
- [ ] `callback@55` (line 55): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@57` (line 57): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@57` (line 57): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `repoIdentity` (line 69): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `promptFor` (line 84): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `submit` (line 97): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@98` (line 98): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@102` (line 102): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@103` (line 103): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@104` (line 104): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@105` (line 105): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `main` (line 110): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@114` (line 114): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@121` (line 121): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@123` (line 123): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@123` (line 123): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@142` (line 142): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@149` (line 149): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `docs/agents/packages/reporting/skills/review/weekly/scripts/generate-weekly-review.mjs`

- [ ] `git` (line 39): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `hue` (line 48): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@52` (line 52): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `hex` (line 69): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `theme` (line 78): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `addText` (line 101): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `rect` (line 134): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `card` (line 149): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `rule` (line 165): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `notes` (line 175): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@176` (line 176): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `wrapLines` (line 188): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@191` (line 191): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `header` (line 215): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `footer` (line 229): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `addCode` (line 244): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@250` (line 250): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@251` (line 251): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@272` (line 272): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `addScreenshot` (line 311): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `planDay` (line 334): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `validPlan` (line 351): Test valid, malformed, empty, and boundary input; assert exact output or error. No direct test file is linked yet.
- [ ] `callback@353` (line 353): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@359` (line 359): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@362` (line 362): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `assessBigFiveTimeline` (line 382): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@385` (line 385): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@387` (line 387): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@407` (line 407): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@407` (line 407): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@417` (line 417): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `addContributorSummary` (line 442): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@454` (line 454): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@476` (line 476): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `main` (line 484): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@489` (line 489): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@497` (line 497): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@502` (line 502): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@502` (line 502): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@503` (line 503): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@503` (line 503): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@535` (line 535): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@544` (line 544): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@552` (line 552): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `timelineX` (line 583): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@597` (line 597): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@624` (line 624): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@625` (line 625): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@626` (line 626): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@641` (line 641): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@656` (line 656): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@683` (line 683): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@684` (line 684): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@688` (line 688): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@688` (line 688): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@726` (line 726): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@763` (line 763): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@774` (line 774): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@801` (line 801): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@832` (line 832): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@852` (line 852): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/braces/index.js`

- [ ] `braces` (line 28): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@60` (line 60): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@76` (line 76): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@96` (line 96): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@118` (line 118): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@146` (line 146): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/braces/lib/compile.js`

- [ ] `compile` (line 16): Run on clean input; verify deterministic output and a useful failure on invalid input. No direct test file is linked yet.
- [ ] `walk` (line 17): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/braces/lib/constants.js`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `packages/braces/lib/expand.js`

- [ ] `append` (line 18): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@23` (line 23): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `expand` (line 46): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `walk` (line 47): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/braces/lib/parse.js`

- [ ] `parse` (line 40): Test valid, malformed, empty, and boundary input; assert exact output or error. No direct test file is linked yet.
- [ ] `advance` (line 58): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `push` (line 59): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@243` (line 243): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/braces/lib/stringify.js`

- [ ] `callback@7` (line 7): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `stringify` (line 8): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/braces/lib/utils.js`

- [ ] `isInteger` (line 12): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@20` (line 20): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@28` (line 28): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@39` (line 39): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@55` (line 55): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@62` (line 62): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@63` (line 63): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@71` (line 71): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `flat` (line 73): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/braces/scripts/build.mjs`

- [ ] `callback@4` (line 4): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@4` (line 4): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/braces/tests/public.test.mjs`

- [ ] `callback@5` (line 5): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/documentation/tests/public.test.mjs`](../packages/documentation/tests/public.test.mjs).
- [ ] `callback@9` (line 9): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/documentation/tests/public.test.mjs`](../packages/documentation/tests/public.test.mjs).
- [ ] `callback@11` (line 11): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/documentation/tests/public.test.mjs`](../packages/documentation/tests/public.test.mjs).
- [ ] `callback@14` (line 14): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/documentation/tests/public.test.mjs`](../packages/documentation/tests/public.test.mjs).
- [ ] `callback@18` (line 18): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/documentation/tests/public.test.mjs`](../packages/documentation/tests/public.test.mjs).
- [ ] `pattern` (line 23): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/documentation/tests/public.test.mjs`](../packages/documentation/tests/public.test.mjs).
- [ ] `callback@24` (line 24): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/documentation/tests/public.test.mjs`](../packages/documentation/tests/public.test.mjs).
- [ ] `callback@25` (line 25): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/documentation/tests/public.test.mjs`](../packages/documentation/tests/public.test.mjs).
- [ ] `callback@29` (line 29): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/documentation/tests/public.test.mjs`](../packages/documentation/tests/public.test.mjs).
- [ ] `callback@32` (line 32): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/documentation/tests/public.test.mjs`](../packages/documentation/tests/public.test.mjs).
- [ ] `callback@33` (line 33): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/documentation/tests/public.test.mjs`](../packages/documentation/tests/public.test.mjs).
- [ ] `callback@34` (line 34): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/documentation/tests/public.test.mjs`](../packages/documentation/tests/public.test.mjs).
- [ ] `callback@35` (line 35): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/documentation/tests/public.test.mjs`](../packages/documentation/tests/public.test.mjs).
- [ ] `callback@36` (line 36): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/documentation/tests/public.test.mjs`](../packages/documentation/tests/public.test.mjs).
- [ ] `callback@37` (line 37): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/documentation/tests/public.test.mjs`](../packages/documentation/tests/public.test.mjs).
- [ ] `callback@38` (line 38): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/documentation/tests/public.test.mjs`](../packages/documentation/tests/public.test.mjs).
- [ ] `callback@40` (line 40): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/documentation/tests/public.test.mjs`](../packages/documentation/tests/public.test.mjs).
- [ ] `callback@44` (line 44): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/documentation/tests/public.test.mjs`](../packages/documentation/tests/public.test.mjs).
- [ ] `pattern` (line 45): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/documentation/tests/public.test.mjs`](../packages/documentation/tests/public.test.mjs).
- [ ] `callback@46` (line 46): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/documentation/tests/public.test.mjs`](../packages/documentation/tests/public.test.mjs).
- [ ] `callback@47` (line 47): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/documentation/tests/public.test.mjs`](../packages/documentation/tests/public.test.mjs).
- [ ] `callback@48` (line 48): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/documentation/tests/public.test.mjs`](../packages/documentation/tests/public.test.mjs).

### `packages/documentation/src/cli.ts`

- [ ] `callback@10` (line 10): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/documentation/src/index.ts`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `packages/documentation/src/lib/documentation.ts`

- [ ] `S_S_G_REGEX` (line 49): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `documentedCommandFindings` (line 79): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@80` (line 80): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@82` (line 82): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@85` (line 85): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `fixDocumentedCommands` (line 107): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@108` (line 108): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@116` (line 116): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `writeValidatedSrc` (line 171): Test valid, malformed, empty, and boundary input; assert exact output or error. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `srcKind` (line 206): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `duplicateImportSource` (line 218): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `importGroup` (line 233): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `duplicateImportFindings` (line 247): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@273` (line 273): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `fixDuplicateImports` (line 290): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@314` (line 314): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@314` (line 314): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `maintainSrcFile` (line 330): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `removeNonCodeComments` (line 343): Test successful mutation, duplicate/conflict, validation, and failed-write behavior. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `protectLongImports` (line 356): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@373` (line 373): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `documentationScriptKind` (line 387): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `documentationSupported` (line 401): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `documentationSourceIncluded` (line 413): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@416` (line 416): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `cDocumentationFindings` (line 430): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `walk` (line 450): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@457` (line 457): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@457` (line 457): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@459` (line 459): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@467` (line 467): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@468` (line 468): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `parseCComment` (line 477): Test valid, malformed, empty, and boundary input; assert exact output or error. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `text` (line 479): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `report` (line 493): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@503` (line 503): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@505` (line 505): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@506` (line 506): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `documented` (line 532): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@545` (line 545): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@546` (line 546): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `exported` (line 556): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@558` (line 558): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `bindingParamNames` (line 568): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@570` (line 570): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `fnParamNames` (line 581): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `documentationNodeName` (line 594): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@598` (line 598): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `documentationTarget` (line 612): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `isNamedDocumentationFn` (line 630): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `containsNode` (line 655): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `tsdocBlocks` (line 668): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `add` (line 671): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `visit` (line 678): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@684` (line 684): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `tsdocLines` (line 694): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@698` (line 698): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `fileHeaderBlock` (line 713): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@714` (line 714): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@717` (line 717): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `tsdocTagEntries` (line 728): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `tagDescription` (line 745): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `returnsVal` (line 764): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `visit` (line 772): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `documentationBlockFor` (line 789): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `descriptionFindingsForFile` (line 806): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `markAttached` (line 814): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@843` (line 843): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@855` (line 855): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@859` (line 859): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `documentationCommentReport` (line 892): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `documentationReport` (line 910): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `documentationFindingsForFile` (line 925): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `visit` (line 939): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@950` (line 950): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@950` (line 950): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@951` (line 951): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@956` (line 956): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@960` (line 960): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@963` (line 963): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `documentationFindings` (line 985): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@988` (line 988): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@991` (line 991): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@993` (line 993): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@994` (line 994): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@995` (line 995): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `callback@998` (line 998): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).
- [ ] `documentSrcFile` (line 1015): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).

### `packages/documentation/tests/public.test.mjs`

- [ ] `callback@17` (line 17): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@22` (line 22): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@28` (line 28): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@32` (line 32): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).

### `packages/error-boundaries/src/components/AstroErrorBoundary.astro`

- [ ] `callback@24` (line 24): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@25` (line 25): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/error-boundaries/src/components/react.tsx`

- [ ] `withErrorBoundary` (line 37): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `BoundedComponent` (line 45): Render each state; check interactions, accessibility, loading, and error behavior. No direct test file is linked yet.
- [ ] `getDerivedStateFromError` (line 66): Test found, missing, unauthorized, and upstream-failure results. No direct test file is linked yet.
- [ ] `componentDidCatch` (line 75): Render each state; check interactions, accessibility, loading, and error behavior. No direct test file is linked yet.
- [ ] `componentDidUpdate` (line 83): Render each state; check interactions, accessibility, loading, and error behavior. No direct test file is linked yet.
- [ ] `render` (line 91): Render each state; check interactions, accessibility, loading, and error behavior. No direct test file is linked yet.

### `packages/error-boundaries/src/index.ts`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `packages/error-boundaries/src/lib/astro-integration.ts`

- [ ] `terraErrorBoundaryIntegration` (line 19): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `'astro:config:setup'` (line 23): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/error-boundaries/src/lib/astro.ts`

- [ ] `errorStatusCopy` (line 35): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/error-boundaries/src/lib/index.ts`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `packages/error-boundaries/src/lib/next.ts`

- [ ] `errorDigest` (line 26): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/error-boundaries/tests/error-boundaries.test.mjs`

- [ ] `callback@24` (line 24): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/checks/error-boundaries.test.mjs`](../packages/quality/tests/checks/error-boundaries.test.mjs).
- [ ] `callback@28` (line 28): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/checks/error-boundaries.test.mjs`](../packages/quality/tests/checks/error-boundaries.test.mjs).
- [ ] `injectScript` (line 31): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/checks/error-boundaries.test.mjs`](../packages/quality/tests/checks/error-boundaries.test.mjs).
- [ ] `callback@40` (line 40): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/checks/error-boundaries.test.mjs`](../packages/quality/tests/checks/error-boundaries.test.mjs).
- [ ] `onError` (line 44): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/checks/error-boundaries.test.mjs`](../packages/quality/tests/checks/error-boundaries.test.mjs).
- [ ] `Panel` (line 55): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/checks/error-boundaries.test.mjs`](../packages/quality/tests/checks/error-boundaries.test.mjs).

### `packages/formatting/src/cli.ts`

- [ ] `callback@10` (line 10): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/formatting/src/index.ts`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `packages/formatting/src/lib/collapse.ts`

- [ ] `candidateSpan` (line 34): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/collapse.test.mjs`](../packages/quality/tests/transforms/collapse.test.mjs).
- [ ] `findJsx` (line 38): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/transforms/collapse.test.mjs`](../packages/quality/tests/transforms/collapse.test.mjs).
- [ ] `collapseTypesAndObjects` (line 69): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/collapse.test.mjs`](../packages/quality/tests/transforms/collapse.test.mjs).
- [ ] `collapse` (line 86): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/collapse.test.mjs`](../packages/quality/tests/transforms/collapse.test.mjs).
- [ ] `protectLiterals` (line 90): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/collapse.test.mjs`](../packages/quality/tests/transforms/collapse.test.mjs).
- [ ] `isProtected` (line 113): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/collapse.test.mjs`](../packages/quality/tests/transforms/collapse.test.mjs).
- [ ] `callback@113` (line 113): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/collapse.test.mjs`](../packages/quality/tests/transforms/collapse.test.mjs).
- [ ] `visit` (line 139): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/collapse.test.mjs`](../packages/quality/tests/transforms/collapse.test.mjs).
- [ ] `callback@152` (line 152): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/collapse.test.mjs`](../packages/quality/tests/transforms/collapse.test.mjs).
- [ ] `callback@152` (line 152): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/collapse.test.mjs`](../packages/quality/tests/transforms/collapse.test.mjs).

### `packages/formatting/src/lib/inline-if.ts`

- [ ] `collapseInlineIfs` (line 25): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/inline-if.test.mjs`](../packages/quality/tests/transforms/inline-if.test.mjs).
- [ ] `visit` (line 30): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/inline-if.test.mjs`](../packages/quality/tests/transforms/inline-if.test.mjs).
- [ ] `callback@47` (line 47): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/inline-if.test.mjs`](../packages/quality/tests/transforms/inline-if.test.mjs).
- [ ] `callback@47` (line 47): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/inline-if.test.mjs`](../packages/quality/tests/transforms/inline-if.test.mjs).

### `packages/formatting/src/lib/run-formatting.ts`

- [ ] `runFormatting` (line 49): Render each state; check interactions, accessibility, loading, and error behavior. Candidate coverage: [`packages/formatting/tests/run-formatting.test.mjs`](../packages/formatting/tests/run-formatting.test.mjs).
- [ ] `callback@50` (line 50): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/formatting/tests/run-formatting.test.mjs`](../packages/formatting/tests/run-formatting.test.mjs).
- [ ] `callback@54` (line 54): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/formatting/tests/run-formatting.test.mjs`](../packages/formatting/tests/run-formatting.test.mjs).
- [ ] `callback@67` (line 67): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/formatting/tests/run-formatting.test.mjs`](../packages/formatting/tests/run-formatting.test.mjs).

### `packages/formatting/tests/public.test.mjs`

- [ ] `callback@15` (line 15): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@22` (line 22): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@28` (line 28): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).

### `packages/formatting/tests/run-formatting.test.mjs`

- [ ] `callback@21` (line 21): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@23` (line 23): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@33` (line 33): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@35` (line 35): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@48` (line 48): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@50` (line 50): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@69` (line 69): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@77` (line 77): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@79` (line 79): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@98` (line 98): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@105` (line 105): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@107` (line 107): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.

### `packages/imports/src/cli.ts`

- [ ] `callback@10` (line 10): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/imports/src/index.ts`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `packages/imports/src/lib/imports.ts`

- [ ] `resolveImport` (line 40): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/imports.test.mjs`](../packages/quality/tests/checks/imports.test.mjs).
- [ ] `callback@41` (line 41): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/imports.test.mjs`](../packages/quality/tests/checks/imports.test.mjs).
- [ ] `specifiers` (line 61): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/imports.test.mjs`](../packages/quality/tests/checks/imports.test.mjs).
- [ ] `callback@65` (line 65): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/imports.test.mjs`](../packages/quality/tests/checks/imports.test.mjs).
- [ ] `checkImports` (line 81): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/imports.test.mjs`](../packages/quality/tests/checks/imports.test.mjs).
- [ ] `callback@85` (line 85): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/imports.test.mjs`](../packages/quality/tests/checks/imports.test.mjs).
- [ ] `callback@86` (line 86): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/imports.test.mjs`](../packages/quality/tests/checks/imports.test.mjs).

### `packages/imports/tests/public.test.mjs`

- [ ] `callback@15` (line 15): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@19` (line 19): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@25` (line 25): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).

### `packages/language-checks/src/cli.ts`

- [ ] `callback@10` (line 10): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/language-checks/src/index.ts`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `packages/language-checks/src/lib/language-profiles.ts`

- [ ] `shared` (line 111): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `native` (line 119): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `notApplicable` (line 127): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `callback@188` (line 188): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `callback@192` (line 192): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `callback@199` (line 199): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `callback@209` (line 209): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `callback@214` (line 214): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `callback@224` (line 224): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `callback@229` (line 229): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `callback@239` (line 239): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `isLanguageProfileId` (line 465): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `resolveLanguageProfiles` (line 476): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `callback@479` (line 479): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `callback@493` (line 493): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `callback@493` (line 493): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `callback@498` (line 498): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `callback@506` (line 506): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `callback@510` (line 510): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `callback@515` (line 515): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `callback@515` (line 515): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `callback@516` (line 516): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `profileQualityCheckEnabled` (line 532): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `inspectLanguageProfileTool` (line 545): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `parseVersion` (line 549): Test valid, malformed, empty, and boundary input; assert exact output or error. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `compVersions` (line 556): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).

### `packages/language-checks/src/lib/run-language-checks.ts`

- [ ] `runLanguageChecks` (line 35): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@48` (line 48): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@49` (line 49): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `toolErr` (line 51): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `reportFailure` (line 60): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@74` (line 74): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@81` (line 81): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@92` (line 92): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@94` (line 94): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/language-checks/tests/public.test.mjs`

- [ ] `callback@15` (line 15): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@19` (line 19): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@25` (line 25): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).

### `packages/naming/src/cli.ts`

- [ ] `callback@10` (line 10): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/naming/src/index.ts`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `packages/naming/src/lib/naming.ts`

- [ ] `aliasTgt` (line 123): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `isStableLocalBinding` (line 133): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `replacementMap` (line 158): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@159` (line 159): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@159` (line 159): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `plural` (line 167): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `identifierTokens` (line 187): Test valid, malformed, empty, and boundary input; assert exact output or error. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@190` (line 190): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callbackAlias` (line 202): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `renameId` (line 216): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@224` (line 224): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `renderIdentifier` (line 225): Render each state; check interactions, accessibility, loading, and error behavior. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@229` (line 229): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@230` (line 230): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@233` (line 233): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `tokenCase` (line 243): Test valid, malformed, empty, and boundary input; assert exact output or error. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callbackKind` (line 260): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@268` (line 268): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `scan` (line 273): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@282` (line 282): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `findRef` (line 285): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@300` (line 300): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `collectBinding` (line 331): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@336` (line 336): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `collect` (line 339): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `parameterIndex` (line 344): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `initialAlias` (line 348): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@351` (line 351): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `isCallbackDeclaration` (line 372): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `renameDeclaration` (line 383): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `parameterRenameCapturesDefault` (line 396): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `withinInit` (line 399): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `isPropertyName` (line 405): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `visit` (line 412): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@417` (line 417): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `hasPrefixReplacement` (line 432): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `isProtectedPath` (line 443): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@447` (line 447): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `isProtectedFilename` (line 458): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `isApprovedId` (line 470): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `isRenamableDeclaration` (line 481): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@484` (line 484): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@487` (line 487): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@493` (line 493): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@495` (line 495): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@496` (line 496): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@498` (line 498): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@500` (line 500): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@501` (line 501): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `declarationScope` (line 512): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `namingFindings` (line 541): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@544` (line 544): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@548` (line 548): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@571` (line 571): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@571` (line 571): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `collect` (line 576): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `inspect` (line 590): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `astroFrontmatter` (line 624): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `isAstroCallbackFinding` (line 653): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `inspect` (line 656): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `fixNaming` (line 671): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@672` (line 672): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@673` (line 673): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@677` (line 677): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@685` (line 685): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@687` (line 687): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `getCompilationSettings` (line 702): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `getScriptFileNames` (line 703): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `getScriptVersion` (line 704): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `getScriptSnapshot` (line 705): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `getCurrentDirectory` (line 709): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `fileExists` (line 711): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `readFile` (line 712): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `collectIdentifiers` (line 742): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@764` (line 764): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@764` (line 764): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `aliasFindings` (line 782): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@784` (line 784): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@785` (line 785): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `inspect` (line 817): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@843` (line 843): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `externallyReferenced` (line 856): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@858` (line 858): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@868` (line 868): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `visit` (line 879): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@880` (line 880): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@888` (line 888): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@904` (line 904): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@907` (line 907): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@921` (line 921): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).
- [ ] `callback@921` (line 921): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).

### `packages/naming/tests/public.test.mjs`

- [ ] `callback@17` (line 17): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@23` (line 23): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@28` (line 28): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@31` (line 31): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@47` (line 47): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@61` (line 61): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@71` (line 71): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@82` (line 82): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@83` (line 83): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@97` (line 97): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@116` (line 116): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@129` (line 129): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@134` (line 134): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).

### `packages/patterns/src/cli.ts`

- [ ] `callback@10` (line 10): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/patterns/src/index.ts`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `packages/patterns/src/lib/patterns.ts`

- [ ] `S_S_G_REGEX` (line 27): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `A_ZA_Z0_9_G_REGEX` (line 36): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `G_REGEX` (line 42): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `G_CLASS_2` (line 48): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `EXPORT_CONST_A_ZA_Z_W_B_GM_REGEX` (line 54): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `S_G_REGEX` (line 61): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `stableReceiver` (line 82): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `isArrayLookupReceiver` (line 96): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@100` (line 100): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `collectionCallback` (line 110): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `performancePatternFindings` (line 129): Render each state; check interactions, accessibility, loading, and error behavior. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@134` (line 134): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `visit` (line 147): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `repeatedClassFindings` (line 181): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@186` (line 186): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@194` (line 194): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@194` (line 194): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@194` (line 194): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `repeatedClassAttrs` (line 205): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@206` (line 206): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `visit` (line 209): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `classConstName` (line 226): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@230` (line 230): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@236` (line 236): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `isInsideTemplateLiteral` (line 255): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `insertGenDeclarations` (line 273): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `writePatternSrc` (line 318): Test successful mutation, duplicate/conflict, validation, and failed-write behavior. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `fixRepeatedClasses` (line 336): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@346` (line 346): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@353` (line 353): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@356` (line 356): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@369` (line 369): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@371` (line 371): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `uiPatternFindings` (line 391): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@393` (line 393): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@396` (line 396): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@397` (line 397): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@400` (line 400): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@400` (line 400): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `resolveTailwindNodeImport` (line 417): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `runTailwindCanonical` (line 449): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `loadStylesheet` (line 475): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `lengthInPixels` (line 487): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `spacingSuggestion` (line 496): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `declarations` (line 506): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `collect` (line 508): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@529` (line 529): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@542` (line 542): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@542` (line 542): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `classVals` (line 548): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `locationAt` (line 587): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@595` (line 595): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@595` (line 595): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@597` (line 597): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@599` (line 599): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@599` (line 599): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `hasLeadingGenMarker` (line 626): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `genFilePrefix` (line 648): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `regexScriptKind` (line 664): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `regexCandidates` (line 678): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@682` (line 682): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@690` (line 690): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `visit` (line 706): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `isInlineTestRegex` (line 739): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `isGenLocalRegex` (line 751): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `hasRegExpBinding` (line 769): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `bindingHasRegExp` (line 777): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@779` (line 779): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `visit` (line 787): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `regexGroups` (line 813): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `regexFindings` (line 827): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@830` (line 830): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@831` (line 831): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@835` (line 835): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@836` (line 836): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `isEsmConsumer` (line 847): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `readRegexRegistry` (line 872): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@879` (line 879): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `regexRegistryEntry` (line 897): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@898` (line 898): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `resolvesRegexModule` (line 921): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@923` (line 923): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@924` (line 924): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `referencedRegexExports` (line 942): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `visit` (line 967): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `pruneUnusedRegexExports` (line 1001): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@1003` (line 1003): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@1008` (line 1008): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `pruneUnusedRegexBindings` (line 1020): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@1040` (line 1040): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@1045` (line 1045): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `visit` (line 1049): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@1057` (line 1057): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `visit` (line 1058): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@1073` (line 1073): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@1074` (line 1074): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@1074` (line 1074): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@1077` (line 1077): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `removeTemplateRegexReturnDocs` (line 1088): Test successful mutation, duplicate/conflict, validation, and failed-write behavior. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `removeEmptyRegexDocs` (line 1099): Test successful mutation, duplicate/conflict, validation, and failed-write behavior. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `regexCandidateDocumentation` (line 1110): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `directlyAttached` (line 1119): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@1123` (line 1123): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `regexExportDeclarations` (line 1136): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@1140` (line 1140): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@1143` (line 1143): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `regexExportDocumentation` (line 1158): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `regexDeclarationDocumentation` (line 1183): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `moduleSpecifier` (line 1195): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `packageRootFor` (line 1209): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `gitRootFor` (line 1231): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `sharesPackageBoundary` (line 1250): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `namespaceImport` (line 1264): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `insertNamespaceImport` (line 1282): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `identifierNames` (line 1310): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `visit` (line 1317): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `validRegexOutput` (line 1332): Test valid, malformed, empty, and boundary input; assert exact output or error. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `fixRegexDedup` (line 1352): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@1366` (line 1366): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@1378` (line 1378): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@1381` (line 1381): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `fixRegexDedupShared` (line 1398): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@1406` (line 1406): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@1408` (line 1408): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@1409` (line 1409): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@1410` (line 1410): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@1413` (line 1413): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@1413` (line 1413): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@1414` (line 1414): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@1419` (line 1419): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `regexExportName` (line 1422): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@1431` (line 1431): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@1440` (line 1440): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@1445` (line 1445): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@1448` (line 1448): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `declarationFor` (line 1453): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@1454` (line 1454): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@1458` (line 1458): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@1495` (line 1495): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@1506` (line 1506): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@1506` (line 1506): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).
- [ ] `callback@1506` (line 1506): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).

### `packages/patterns/tests/public.test.mjs`

- [ ] `callback@15` (line 15): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@21` (line 21): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@27` (line 27): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).

### `packages/quality-core/src/analysis.ts`

- [ ] `createQualityAnalysis` (line 35): Test successful mutation, duplicate/conflict, validation, and failed-write behavior. No direct test file is linked yet.
- [ ] `callback@38` (line 38): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@52` (line 52): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@53` (line 53): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@53` (line 53): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/quality-core/src/cli.ts`

- [ ] `runCapabilityCli` (line 28): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/quality-core/src/config.ts`

- [ ] `loadQualityConfig` (line 27): Test found, missing, unauthorized, and upstream-failure results. No direct test file is linked yet.
- [ ] `callback@38` (line 38): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@39` (line 39): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `qualityScope` (line 53): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `capabilityCheckEnabled` (line 65): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `capabilityAutofixEnabled` (line 108): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `capabilityCommandEnabled` (line 140): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/quality-core/src/index.ts`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `packages/quality-core/src/lib/files.ts`

- [ ] `hasGeneratedSourceHeader` (line 66): Run on clean input; verify deterministic output and a useful failure on invalid input. Candidate coverage: [`packages/quality/tests/checks/files.test.mjs`](../packages/quality/tests/checks/files.test.mjs).
- [ ] `withoutStaticImports` (line 79): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/files.test.mjs`](../packages/quality/tests/checks/files.test.mjs).
- [ ] `isProgramSource` (line 108): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/files.test.mjs`](../packages/quality/tests/checks/files.test.mjs).
- [ ] `sourceCandidates` (line 132): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/files.test.mjs`](../packages/quality/tests/checks/files.test.mjs).
- [ ] `callback@135` (line 135): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/files.test.mjs`](../packages/quality/tests/checks/files.test.mjs).
- [ ] `isSkippedDir` (line 144): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/files.test.mjs`](../packages/quality/tests/checks/files.test.mjs).
- [ ] `callback@146` (line 146): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/files.test.mjs`](../packages/quality/tests/checks/files.test.mjs).
- [ ] `isSkippedRootFile` (line 161): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/files.test.mjs`](../packages/quality/tests/checks/files.test.mjs).
- [ ] `walk` (line 173): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/files.test.mjs`](../packages/quality/tests/checks/files.test.mjs).
- [ ] `callback@194` (line 194): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/files.test.mjs`](../packages/quality/tests/checks/files.test.mjs).
- [ ] `callback@196` (line 196): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/files.test.mjs`](../packages/quality/tests/checks/files.test.mjs).
- [ ] `callback@196` (line 196): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/files.test.mjs`](../packages/quality/tests/checks/files.test.mjs).
- [ ] `callback@208` (line 208): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/files.test.mjs`](../packages/quality/tests/checks/files.test.mjs).
- [ ] `callback@210` (line 210): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/files.test.mjs`](../packages/quality/tests/checks/files.test.mjs).
- [ ] `srcFiles` (line 225): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/files.test.mjs`](../packages/quality/tests/checks/files.test.mjs).
- [ ] `nonProgramSrcFiles` (line 236): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/files.test.mjs`](../packages/quality/tests/checks/files.test.mjs).
- [ ] `callback@237` (line 237): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/files.test.mjs`](../packages/quality/tests/checks/files.test.mjs).
- [ ] `workingSrcFiles` (line 247): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/files.test.mjs`](../packages/quality/tests/checks/files.test.mjs).
- [ ] `callback@253` (line 253): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/files.test.mjs`](../packages/quality/tests/checks/files.test.mjs).
- [ ] `callback@255` (line 255): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/files.test.mjs`](../packages/quality/tests/checks/files.test.mjs).
- [ ] `displayPath` (line 266): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/files.test.mjs`](../packages/quality/tests/checks/files.test.mjs).
- [ ] `isFile` (line 277): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/files.test.mjs`](../packages/quality/tests/checks/files.test.mjs).

### `packages/quality-core/src/lib/progress.ts`

- [ ] `setQualityProgressSuppressed` (line 18): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/progress.test.mjs`](../packages/quality/tests/runner/progress.test.mjs).
- [ ] `qualityProgress` (line 37): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/progress.test.mjs`](../packages/quality/tests/runner/progress.test.mjs).
- [ ] `callback@37` (line 37): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/progress.test.mjs`](../packages/quality/tests/runner/progress.test.mjs).

### `packages/quality-core/src/lib/source-kind.ts`

- [ ] `sourceKind` (line 24): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/quality-core/src/types.ts`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `packages/quality-core/tests/public.test.mjs`

- [ ] `callback@17` (line 17): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@24` (line 24): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@30` (line 30): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `runGit` (line 36): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@52` (line 52): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).

### `packages/quality-reports/src/cli.ts`

- [ ] `callback@23` (line 23): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/quality-reports/src/index.ts`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `packages/quality-reports/src/lib/github-report.ts`

- [ ] `rec` (line 93): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `text` (line 104): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `ghApi` (line 116): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `apiState` (line 131): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `callback@155` (line 155): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `awaitlessSpawnSync` (line 173): Run on clean input; verify deterministic output and a useful failure on invalid input. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `resultItems` (line 189): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `flattenPages` (line 191): Render each state; check interactions, accessibility, loading, and error behavior. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `callback@193` (line 193): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `featureState` (line 205): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `apiSetting` (line 218): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `repoPath` (line 234): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `issueFindings` (line 247): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `callback@261` (line 261): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `callback@261` (line 261): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `dependabotFindings` (line 285): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `callback@286` (line 286): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `codeScanningFindings` (line 327): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `callback@328` (line 328): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `secretScanningFindings` (line 361): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `callback@362` (line 362): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `buildGitHubReport` (line 395): Run on clean input; verify deterministic output and a useful failure on invalid input. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `dependabotCfgState` (line 411): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `callback@461` (line 461): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `settingsFinding` (line 466): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `hasGitHubAuth` (line 521): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `formatGitHubReport` (line 533): Render each state; check interactions, accessibility, loading, and error behavior. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `callback@535` (line 535): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `callback@540` (line 540): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `callback@541` (line 541): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).
- [ ] `callback@541` (line 541): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/github-report.test.mjs`](../packages/quality/tests/reports/github-report.test.mjs).

### `packages/quality-reports/src/lib/history-report.ts`

- [ ] `isHistorySourcePath` (line 52): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/history-report.test.mjs`](../packages/quality/tests/reports/history-report.test.mjs).
- [ ] `callback@54` (line 54): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/history-report.test.mjs`](../packages/quality/tests/reports/history-report.test.mjs).
- [ ] `callback@55` (line 55): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/history-report.test.mjs`](../packages/quality/tests/reports/history-report.test.mjs).
- [ ] `git` (line 69): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/history-report.test.mjs`](../packages/quality/tests/reports/history-report.test.mjs).
- [ ] `gitBuffer` (line 82): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/history-report.test.mjs`](../packages/quality/tests/reports/history-report.test.mjs).
- [ ] `pushBase` (line 91): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/history-report.test.mjs`](../packages/quality/tests/reports/history-report.test.mjs).
- [ ] `srcChanges` (line 110): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/history-report.test.mjs`](../packages/quality/tests/reports/history-report.test.mjs).
- [ ] `readNumstatLog` (line 136): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/reports/history-report.test.mjs`](../packages/quality/tests/reports/history-report.test.mjs).
- [ ] `parseTree` (line 171): Test valid, malformed, empty, and boundary input; assert exact output or error. Candidate coverage: [`packages/quality/tests/reports/history-report.test.mjs`](../packages/quality/tests/reports/history-report.test.mjs).
- [ ] `isAncestor` (line 192): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/history-report.test.mjs`](../packages/quality/tests/reports/history-report.test.mjs).
- [ ] `createHistoryReport` (line 209): Test successful mutation, duplicate/conflict, validation, and failed-write behavior. Candidate coverage: [`packages/quality/tests/reports/history-report.test.mjs`](../packages/quality/tests/reports/history-report.test.mjs).
- [ ] `commitMetadata` (line 216): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/history-report.test.mjs`](../packages/quality/tests/reports/history-report.test.mjs).
- [ ] `callback@221` (line 221): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/history-report.test.mjs`](../packages/quality/tests/reports/history-report.test.mjs).
- [ ] `callback@233` (line 233): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/history-report.test.mjs`](../packages/quality/tests/reports/history-report.test.mjs).
- [ ] `blobLineCounts` (line 234): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/history-report.test.mjs`](../packages/quality/tests/reports/history-report.test.mjs).
- [ ] `callback@235` (line 235): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/history-report.test.mjs`](../packages/quality/tests/reports/history-report.test.mjs).
- [ ] `lineCount` (line 250): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/history-report.test.mjs`](../packages/quality/tests/reports/history-report.test.mjs).
- [ ] `callback@262` (line 262): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/history-report.test.mjs`](../packages/quality/tests/reports/history-report.test.mjs).
- [ ] `callback@272` (line 272): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/history-report.test.mjs`](../packages/quality/tests/reports/history-report.test.mjs).
- [ ] `repoName` (line 281): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/history-report.test.mjs`](../packages/quality/tests/reports/history-report.test.mjs).
- [ ] `writeHistoryReport` (line 307): Test successful mutation, duplicate/conflict, validation, and failed-write behavior. Candidate coverage: [`packages/quality/tests/reports/history-report.test.mjs`](../packages/quality/tests/reports/history-report.test.mjs).

### `packages/quality-reports/src/lib/node-reporter.ts`

- [ ] `qualityNodeReporterOptions` (line 49): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/node-reporter.test.mjs`](../packages/quality/tests/reports/node-reporter.test.mjs).
- [ ] `qualityNodeReporter` (line 88): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/node-reporter.test.mjs`](../packages/quality/tests/reports/node-reporter.test.mjs).
- [ ] `callback@89` (line 89): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/node-reporter.test.mjs`](../packages/quality/tests/reports/node-reporter.test.mjs).
- [ ] `identity` (line 110): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/node-reporter.test.mjs`](../packages/quality/tests/reports/node-reporter.test.mjs).
- [ ] `isFileSuite` (line 123): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/node-reporter.test.mjs`](../packages/quality/tests/reports/node-reporter.test.mjs).
- [ ] `basename` (line 132): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/node-reporter.test.mjs`](../packages/quality/tests/reports/node-reporter.test.mjs).
- [ ] `liveProgress` (line 145): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/node-reporter.test.mjs`](../packages/quality/tests/reports/node-reporter.test.mjs).
- [ ] `rememberPending` (line 151): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/node-reporter.test.mjs`](../packages/quality/tests/reports/node-reporter.test.mjs).
- [ ] `takePending` (line 162): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/node-reporter.test.mjs`](../packages/quality/tests/reports/node-reporter.test.mjs).
- [ ] `fmtNodeResult` (line 212): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/node-reporter.test.mjs`](../packages/quality/tests/reports/node-reporter.test.mjs).
- [ ] `defaultQualityNodeReporter` (line 246): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/node-reporter.test.mjs`](../packages/quality/tests/reports/node-reporter.test.mjs).

### `packages/quality-reports/src/lib/playwright-reporter.ts`

- [ ] `constructor` (line 64): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@65` (line 65): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@66` (line 66): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `onBegin` (line 75): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `onTestBegin` (line 95): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `onTestEnd` (line 105): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `onEnd` (line 115): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `qualityStatus` (line 122): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `testName` (line 135): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `printsToStdio` (line 150): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `finish` (line 159): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).

### `packages/quality-reports/tests/public.test.mjs`

- [ ] `callback@15` (line 15): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@21` (line 21): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@27` (line 27): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).

### `packages/quality/.agents/skills/quality/scripts/create-quality-chats.mjs`

- [ ] `parseArgs` (line 21): Test valid, malformed, empty, and boundary input; assert exact output or error. No direct test file is linked yet.
- [ ] `callback@49` (line 49): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `findRepos` (line 70): Test found, missing, unauthorized, and upstream-failure results. No direct test file is linked yet.
- [ ] `visit` (line 72): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@80` (line 80): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@82` (line 82): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@82` (line 82): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@85` (line 85): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `gitValue` (line 96): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `remoteIdentity` (line 109): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `uniqueRepos` (line 124): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@137` (line 137): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@138` (line 138): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@148` (line 148): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `isSkipped` (line 160): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@163` (line 163): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `taskPrompt` (line 174): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `printHelp` (line 189): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `submitTask` (line 217): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@218` (line 218): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@227` (line 227): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@233` (line 233): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@237` (line 237): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `main` (line 246): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@255` (line 255): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@257` (line 257): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@258` (line 258): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `worker` (line 270): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/quality/src/app/workspace-test-runner.ts`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `packages/quality/src/index.ts`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `packages/quality/src/lib/dev.ts`

- [ ] `applyErrBoundaries` (line 24): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/dev-error-boundaries.test.mjs`](../packages/quality/tests/dev-error-boundaries.test.mjs).
- [ ] `readPortOption` (line 43): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/dev-error-boundaries.test.mjs`](../packages/quality/tests/dev-error-boundaries.test.mjs).
- [ ] `defaultPort` (line 63): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/dev-error-boundaries.test.mjs`](../packages/quality/tests/dev-error-boundaries.test.mjs).
- [ ] `run` (line 74): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/dev-error-boundaries.test.mjs`](../packages/quality/tests/dev-error-boundaries.test.mjs).
- [ ] `callback@75` (line 75): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/dev-error-boundaries.test.mjs`](../packages/quality/tests/dev-error-boundaries.test.mjs).
- [ ] `finish` (line 78): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/dev-error-boundaries.test.mjs`](../packages/quality/tests/dev-error-boundaries.test.mjs).
- [ ] `forwardInterrupt` (line 86): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/dev-error-boundaries.test.mjs`](../packages/quality/tests/dev-error-boundaries.test.mjs).
- [ ] `forwardTerminate` (line 87): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/dev-error-boundaries.test.mjs`](../packages/quality/tests/dev-error-boundaries.test.mjs).
- [ ] `callback@90` (line 90): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/dev-error-boundaries.test.mjs`](../packages/quality/tests/dev-error-boundaries.test.mjs).
- [ ] `main` (line 102): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/dev-error-boundaries.test.mjs`](../packages/quality/tests/dev-error-boundaries.test.mjs).
- [ ] `callback@122` (line 122): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/dev-error-boundaries.test.mjs`](../packages/quality/tests/dev-error-boundaries.test.mjs).

### `packages/quality/src/lib/documentation.ts`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. Candidate coverage: [`packages/quality/tests/checks/documentation.test.mjs`](../packages/quality/tests/checks/documentation.test.mjs).

### `packages/quality/src/lib/error-boundaries-astro.ts`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `packages/quality/src/lib/error-boundaries-react.ts`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `packages/quality/src/lib/formatting.ts`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. Candidate coverage: [`packages/formatting/tests/run-formatting.test.mjs`](../packages/formatting/tests/run-formatting.test.mjs).

### `packages/quality/src/lib/imports.ts`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. Candidate coverage: [`packages/quality/tests/checks/imports.test.mjs`](../packages/quality/tests/checks/imports.test.mjs).

### `packages/quality/src/lib/index.ts`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `packages/quality/src/lib/language-checks.ts`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `packages/quality/src/lib/naming.ts`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. Candidate coverage: [`packages/quality/tests/transforms/naming.test.mjs`](../packages/quality/tests/transforms/naming.test.mjs).

### `packages/quality/src/lib/node-reporter.ts`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. Candidate coverage: [`packages/quality/tests/reports/node-reporter.test.mjs`](../packages/quality/tests/reports/node-reporter.test.mjs).

### `packages/quality/src/lib/object-forwarding.ts`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. Candidate coverage: [`packages/quality/tests/transforms/object-forwarding.test.mjs`](../packages/quality/tests/transforms/object-forwarding.test.mjs).

### `packages/quality/src/lib/patterns.ts`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. Candidate coverage: [`packages/quality/tests/checks/patterns.test.mjs`](../packages/quality/tests/checks/patterns.test.mjs).

### `packages/quality/src/lib/port.ts`

- [ ] `portOwners` (line 26): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/imports.test.mjs`](../packages/quality/tests/checks/imports.test.mjs).
- [ ] `acquirePort` (line 46): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/imports.test.mjs`](../packages/quality/tests/checks/imports.test.mjs).
- [ ] `callback@64` (line 64): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/imports.test.mjs`](../packages/quality/tests/checks/imports.test.mjs).
- [ ] `callback@67` (line 67): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/imports.test.mjs`](../packages/quality/tests/checks/imports.test.mjs).
- [ ] `callback@67` (line 67): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/imports.test.mjs`](../packages/quality/tests/checks/imports.test.mjs).

### `packages/quality/src/lib/reports.ts`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `packages/quality/src/lib/runner.ts`

- [ ] `G_REGEX` (line 89): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `findEslintConfig` (line 147): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@148` (line 148): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@148` (line 148): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@148` (line 148): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `isCommonJsSource` (line 159): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `eslintFilePattern` (line 183): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@184` (line 184): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `projectTsconfig` (line 194): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@197` (line 197): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `qualityCheckEnabled` (line 268): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `qualityAutofixEnabled` (line 283): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `qualityCmdEnabled` (line 296): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `qualityRecommendationEnabled` (line 308): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `loadQualityCfg` (line 319): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `createQualityCfg` (line 336): Test successful mutation, duplicate/conflict, validation, and failed-write behavior. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@339` (line 339): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@353` (line 353): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@354` (line 354): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@356` (line 356): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@360` (line 360): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@361` (line 361): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `toolPath` (line 375): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `canUseLocalEslintApi` (line 389): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `qualityLabel` (line 404): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@424` (line 424): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `qualityHeader` (line 435): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `printCheckStatus` (line 459): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `printSkippedCheckStatus` (line 473): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `startQualitySpinner` (line 487): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `stopQualitySpinner` (line 508): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `recordQualityDetail` (line 524): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@530` (line 530): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `printQualityDetails` (line 538): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `recordQualityFailure` (line 550): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `continueAfterFailure` (line 572): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `beginQualityPhase` (line 590): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `workspaceManifests` (line 602): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `visit` (line 611): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `scriptNameForInvocation` (line 645): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@647` (line 647): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `matchesWorkspaceFilter` (line 675): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `invocationText` (line 694): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `scriptsForInvocation` (line 695): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `workspaceFilters` (line 698): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@709` (line 709): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@709` (line 709): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@709` (line 709): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@711` (line 711): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@712` (line 712): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `phaseForInvocation` (line 724): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `isTestInvocation` (line 728): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@732` (line 732): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `testRunner` (line 752): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@757` (line 757): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@757` (line 757): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `compactOutput` (line 769): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@773` (line 773): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `printChildOutput` (line 784): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `run` (line 799): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `runTestSuite` (line 830): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `withoutNodeReporterArgs` (line 841): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@867` (line 867): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `runQualityPhase` (line 912): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `qualityInvocations` (line 913): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@915` (line 915): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@916` (line 916): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@918` (line 918): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@924` (line 924): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@926` (line 926): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `requireProfileTool` (line 932): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `uniqueTestSuites` (line 944): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@946` (line 946): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `rank` (line 959): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@966` (line 966): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@985` (line 985): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@987` (line 987): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `reportSkippedLangChecks` (line 1012): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `reportFailedLangChecks` (line 1027): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `runLangProfileFixes` (line 1044): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1046` (line 1046): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1056` (line 1056): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `isGitDiffCheck` (line 1070): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `hasCfgdGitDiffCheck` (line 1081): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1082` (line 1082): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `snapshotFiles` (line 1094): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1095` (line 1095): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `changedFileCount` (line 1107): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1108` (line 1108): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `argumentBatches` (line 1118): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `filesFor` (line 1144): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `scopedCfg` (line 1156): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `runLint` (line 1170): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1171` (line 1171): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `eslintApiSource` (line 1194): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1195` (line 1195): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1195` (line 1195): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `fixUnusedDeclarations` (line 1316): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1319` (line 1319): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1332` (line 1332): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `visit` (line 1339): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `isTopLevel` (line 1355): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `isExported` (line 1365): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1365` (line 1365): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1375` (line 1375): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1396` (line 1396): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1401` (line 1401): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `isPureUnusedInit` (line 1418): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1433` (line 1433): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1434` (line 1434): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `flattenKnipItems` (line 1453): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1455` (line 1455): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `canUseFocusedEslint` (line 1466): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `focusedEslintCfgSrc` (line 1483): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1484` (line 1484): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1485` (line 1485): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `runFocusedEslint` (line 1570): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `collectEslintReports` (line 1591): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1592` (line 1592): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `parseEslintReports` (line 1623): Test valid, malformed, empty, and boundary input; assert exact output or error. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1629` (line 1629): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1637` (line 1637): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1642` (line 1642): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1650` (line 1650): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1651` (line 1651): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1651` (line 1651): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `unusedDeclarationFindings` (line 1670): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1684` (line 1684): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `find` (line 1693): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1707` (line 1707): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1711` (line 1711): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `runCfgdCmd` (line 1764): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1766` (line 1766): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `runRecommendationCmds` (line 1786): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `runProjectTypecheck` (line 1808): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `repairMissingImports` (line 1843): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1847` (line 1847): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1848` (line 1848): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `isTypePos` (line 1867): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `isImportTypeReference` (line 1882): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `visit` (line 1907): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1925` (line 1925): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1932` (line 1932): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1945` (line 1945): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1946` (line 1946): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `readKnipIssues` (line 1960): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1962` (line 1962): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1969` (line 1969): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1970` (line 1970): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@1975` (line 1975): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `mappedKnipDependencyUsage` (line 2037): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2054` (line 2054): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2059` (line 2059): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2059` (line 2059): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `stylesheetFiles` (line 2083): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `sourcePackageSpecifiers` (line 2107): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `addLiteral` (line 2114): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `visit` (line 2117): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `packageNameFromSpecifier` (line 2148): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `loadKnipConfig` (line 2162): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `addConfiguredToolsToKnipConfig` (line 2200): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `configuredToolPath` (line 2225): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `toolDependencyOwner` (line 2243): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2250` (line 2250): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `mergeKnipNames` (line 2273): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2274` (line 2274): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `knipWorkingDir` (line 2288): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2294` (line 2294): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2295` (line 2295): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `knipWorkspaceRootScore` (line 2313): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2325` (line 2325): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `knipLiteralPrefix` (line 2349): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2350` (line 2350): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2350` (line 2350): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `knipRepoPath` (line 2364): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `assertKnipPath` (line 2377): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `isFrameworkEntryExport` (line 2396): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2398` (line 2398): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `deadCodeScriptKind` (line 2414): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `knipExportCanBeMadePrivate` (line 2428): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2435` (line 2435): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2436` (line 2436): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2438` (line 2438): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `fixKnipExports` (line 2453): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2466` (line 2466): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2466` (line 2466): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2471` (line 2471): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2474` (line 2474): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2482` (line 2482): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2493` (line 2493): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2494` (line 2494): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2495` (line 2495): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2501` (line 2501): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2507` (line 2507): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2507` (line 2507): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2511` (line 2511): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `importedExportConsumers` (line 2527): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2528` (line 2528): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2530` (line 2530): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2538` (line 2538): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2540` (line 2540): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `markupUses` (line 2558): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `collectReferences` (line 2567): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `hasImportedExportConsumer` (line 2630): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `acceptTypeSafeEdits` (line 2644): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `accept` (line 2660): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2674` (line 2674): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2677` (line 2677): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `runDeadCode` (line 2696): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `beginVerification` (line 2703): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2709` (line 2709): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `scanEslint` (line 2726): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `scanDirtyEslintFiles` (line 2740): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2741` (line 2741): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2741` (line 2741): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2755` (line 2755): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2755` (line 2755): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2768` (line 2768): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2776` (line 2776): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2789` (line 2789): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `collectKnipFindings` (line 2809): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2859` (line 2859): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2871` (line 2871): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `printDeadCodeFindings` (line 2883): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2897` (line 2897): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `runDeadCodeCmd` (line 2927): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `printFindings` (line 2943): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2958` (line 2958): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `runFindingCheck` (line 2974): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `runGitHubCheck` (line 2997): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@2999` (line 2999): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3024` (line 3024): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3027` (line 3027): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `updateGitHubStage` (line 3050): Test successful mutation, duplicate/conflict, validation, and failed-write behavior. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `inferGitHubRepo` (line 3065): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `runGenericChecks` (line 3079): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3081` (line 3081): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3082` (line 3082): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3083` (line 3083): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3084` (line 3084): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3085` (line 3085): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3086` (line 3086): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3087` (line 3087): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3088` (line 3088): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3089` (line 3089): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3097` (line 3097): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `runTailwindCanonicalCheck` (line 3118): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `onSkip` (line 3124): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3128` (line 3128): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3129` (line 3129): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `fixNames` (line 3148): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3151` (line 3151): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3153` (line 3153): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3170` (line 3170): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `isIntrinsicJsxTag` (line 3190): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `canonical` (line 3200): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `identifierSymbol` (line 3208): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `isPropertyName` (line 3217): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `hasInitShadow` (line 3228): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `visit` (line 3237): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `hasInitReferenceToOtherSymbol` (line 3252): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `visit` (line 3261): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `hasInitRenameCollision` (line 3277): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `visit` (line 3285): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `hasInitConsumerCollision` (line 3310): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `visit` (line 3322): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `check` (line 3330): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `inspect` (line 3359): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `inspect` (line 3389): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `inspect` (line 3413): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3442` (line 3442): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3442` (line 3442): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3449` (line 3449): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `visit` (line 3473): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3476` (line 3476): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3493` (line 3493): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3493` (line 3493): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `runQuality` (line 3509): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3537` (line 3537): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3545` (line 3545): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3557` (line 3557): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3558` (line 3558): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3564` (line 3564): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3565` (line 3565): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3571` (line 3571): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3572` (line 3572): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3578` (line 3578): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3579` (line 3579): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `runDocumentation` (line 3594): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `runQualityCli` (line 3608): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3612` (line 3612): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `writeReport` (line 3621): Test successful mutation, duplicate/conflict, validation, and failed-write behavior. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3622` (line 3622): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3651` (line 3651): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3652` (line 3652): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3653` (line 3653): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3656` (line 3656): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3657` (line 3657): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3661` (line 3661): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3663` (line 3663): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3663` (line 3663): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3663` (line 3663): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `runFullQuality` (line 3690): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `runConfiguredCmds` (line 3707): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `fix` (line 3715): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `sFix` (line 3731): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3735` (line 3735): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3740` (line 3740): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3743` (line 3743): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3744` (line 3744): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3745` (line 3745): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3747` (line 3747): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3753` (line 3753): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3758` (line 3758): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3762` (line 3762): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3763` (line 3763): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3765` (line 3765): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3769` (line 3769): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3774` (line 3774): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3778` (line 3778): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3778` (line 3778): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3786` (line 3786): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3787` (line 3787): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `continueStaticAndLater` (line 3793): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3796` (line 3796): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3801` (line 3801): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3808` (line 3808): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3818` (line 3818): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3819` (line 3819): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3820` (line 3820): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3821` (line 3821): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3823` (line 3823): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3826` (line 3826): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3830` (line 3830): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3832` (line 3832): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3834` (line 3834): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3836` (line 3836): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `runDiffCheck` (line 3837): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3844` (line 3844): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3850` (line 3850): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `dispatchQualityCli` (line 3866): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3883` (line 3883): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `fix` (line 3898): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3905` (line 3905): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `optVals` (line 3911): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3912` (line 3912): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3967` (line 3967): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@3977` (line 3977): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@4004` (line 4004): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `runQualityFromCfg` (line 4034): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@4036` (line 4036): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@4041` (line 4041): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `validCliArgs` (line 4065): Test valid, malformed, empty, and boundary input; assert exact output or error. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@4071` (line 4071): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@4076` (line 4076): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@4077` (line 4077): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@4078` (line 4078): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `optVal` (line 4090): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `runFormatter` (line 4104): Render each state; check interactions, accessibility, loading, and error behavior. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@4107` (line 4107): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@4109` (line 4109): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@4110` (line 4110): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@4111` (line 4111): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@4111` (line 4111): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `authoredTargets` (line 4112): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@4113` (line 4113): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@4117` (line 4117): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@4120` (line 4120): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@4123` (line 4123): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@4134` (line 4134): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@4143` (line 4143): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@4144` (line 4144): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@4145` (line 4145): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@4145` (line 4145): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@4170` (line 4170): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@4171` (line 4171): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@4172` (line 4172): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@4174` (line 4174): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@4175` (line 4175): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@4188` (line 4188): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `runTypecheck` (line 4228): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@4236` (line 4236): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@4236` (line 4236): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@4241` (line 4241): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@4241` (line 4241): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@4270` (line 4270): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).

### `packages/quality/src/lib/security.ts`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. Candidate coverage: [`packages/quality/tests/checks/security.test.mjs`](../packages/quality/tests/checks/security.test.mjs).

### `packages/quality/src/lib/single-use.ts`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).

### `packages/quality/src/lib/spinner-worker.ts`

- [ ] `draw` (line 23): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/quality/src/lib/ui-quality.ts`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `packages/quality/support/fixtures.mjs`

- [ ] `fixtureRoot` (line 29): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `fixtureFile` (line 43): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `fixtureText` (line 59): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `resetExitCode` (line 69): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/quality/tests/checks/documentation.test.mjs`

- [ ] `callback@24` (line 24): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@61` (line 61): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@65` (line 65): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@70` (line 70): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@75` (line 75): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@79` (line 79): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@104` (line 104): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@105` (line 105): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@106` (line 106): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@107` (line 107): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@108` (line 108): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@109` (line 109): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@110` (line 110): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@111` (line 111): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@112` (line 112): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@114` (line 114): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@133` (line 133): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@137` (line 137): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@144` (line 144): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@148` (line 148): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@167` (line 167): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@191` (line 191): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@200` (line 200): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@207` (line 207): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@233` (line 233): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@245` (line 245): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@264` (line 264): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@275` (line 275): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@291` (line 291): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@297` (line 297): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@301` (line 301): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@322` (line 322): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@326` (line 326): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@344` (line 344): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@352` (line 352): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@365` (line 365): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@373` (line 373): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@381` (line 381): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@387` (line 387): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@406` (line 406): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@410` (line 410): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@425` (line 425): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@429` (line 429): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@443` (line 443): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@457` (line 457): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@465` (line 465): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@493` (line 493): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@501` (line 501): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@503` (line 503): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@514` (line 514): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@521` (line 521): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@538` (line 538): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@548` (line 548): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@564` (line 564): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@586` (line 586): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@596` (line 596): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@602` (line 602): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@629` (line 629): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@641` (line 641): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@656` (line 656): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@665` (line 665): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.

### `packages/quality/tests/checks/error-boundaries.test.mjs`

- [ ] `callback@28` (line 28): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).
- [ ] `callback@36` (line 36): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).
- [ ] `callback@47` (line 47): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).
- [ ] `callback@61` (line 61): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).
- [ ] `callback@79` (line 79): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).
- [ ] `callback@91` (line 91): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).
- [ ] `callback@101` (line 101): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).
- [ ] `callback@111` (line 111): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).

### `packages/quality/tests/checks/files.test.mjs`

- [ ] `callback@25` (line 25): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `callback@56` (line 56): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `callback@72` (line 72): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `callback@80` (line 80): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `callback@121` (line 121): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `callback@133` (line 133): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `callback@136` (line 136): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `callback@142` (line 142): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `callback@158` (line 158): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `callback@168` (line 168): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `callback@185` (line 185): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `callback@188` (line 188): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).
- [ ] `callback@203` (line 203): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/runner/language-profiles.test.mjs`](../packages/quality/tests/runner/language-profiles.test.mjs).

### `packages/quality/tests/checks/imports.test.mjs`

- [ ] `callback@20` (line 20): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@46` (line 46): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.

### `packages/quality/tests/checks/patterns.test.mjs`

- [ ] `callback@24` (line 24): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@50` (line 50): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@73` (line 73): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@83` (line 83): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@95` (line 95): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@111` (line 111): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@114` (line 114): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@116` (line 116): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@163` (line 163): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@181` (line 181): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@207` (line 207): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@243` (line 243): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@266` (line 266): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@290` (line 290): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@311` (line 311): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@379` (line 379): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@412` (line 412): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@448` (line 448): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@471` (line 471): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@505` (line 505): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@537` (line 537): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@557` (line 557): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@577` (line 577): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@589` (line 589): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@629` (line 629): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@654` (line 654): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@671` (line 671): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@691` (line 691): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@708` (line 708): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@768` (line 768): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.

### `packages/quality/tests/checks/security.test.mjs`

- [ ] `callback@22` (line 22): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@38` (line 38): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@49` (line 49): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@53` (line 53): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@66` (line 66): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@73` (line 73): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.

### `packages/quality/tests/checks/ui-recommendations.test.mjs`

- [ ] `callback@20` (line 20): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@42` (line 42): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@60` (line 60): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@68` (line 68): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@78` (line 78): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@98` (line 98): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@105` (line 105): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@112` (line 112): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.

### `packages/quality/tests/dev-error-boundaries.test.mjs`

- [ ] `callback@23` (line 23): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.

### `packages/quality/tests/reports/github-report.test.mjs`

- [ ] `apiPath` (line 29): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@30` (line 30): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@120` (line 120): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@127` (line 127): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@128` (line 128): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@129` (line 129): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@131` (line 131): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@132` (line 132): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@134` (line 134): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `api` (line 135): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@151` (line 151): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@183` (line 183): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@189` (line 189): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.

### `packages/quality/tests/reports/history-report.test.mjs`

- [ ] `git` (line 30): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `historyFixture` (line 39): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `write` (line 45): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@69` (line 69): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@92` (line 92): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@98` (line 98): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@132` (line 132): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `write` (line 139): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@157` (line 157): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.

### `packages/quality/tests/reports/node-reporter.test.mjs`

- [ ] `D_D_GU_REGEX` (line 24): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `eSrc` (line 37): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `render` (line 48): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@51` (line 51): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@59` (line 59): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@79` (line 79): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@84` (line 84): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@90` (line 90): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@113` (line 113): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@118` (line 118): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@128` (line 128): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@131` (line 131): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@147` (line 147): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.

### `packages/quality/tests/reports/playwright-reporter.test.mjs`

- [ ] `testCase` (line 29): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `titlePath` (line 30): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `outcome` (line 30): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `testResult` (line 41): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@49` (line 49): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `write` (line 57): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `writeProgress` (line 57): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `allTests` (line 58): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@82` (line 82): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `write` (line 85): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `writeProgress` (line 85): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `allTests` (line 86): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.

### `packages/quality/tests/runner/knip-package-mapping.test.mjs`

- [ ] `callback@13` (line 13): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.

### `packages/quality/tests/runner/language-profiles.test.mjs`

- [ ] `fakeProfileTool` (line 63): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@76` (line 76): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@87` (line 87): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@106` (line 106): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@106` (line 106): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@110` (line 110): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@110` (line 110): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@114` (line 114): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@114` (line 114): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@117` (line 117): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@118` (line 118): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@122` (line 122): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@129` (line 129): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@135` (line 135): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@138` (line 138): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@141` (line 141): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@142` (line 142): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@144` (line 144): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@146` (line 146): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@147` (line 147): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@149` (line 149): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@160` (line 160): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@168` (line 168): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@172` (line 172): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@172` (line 172): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@176` (line 176): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@181` (line 181): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@183` (line 183): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@194` (line 194): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@203` (line 203): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@210` (line 210): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@214` (line 214): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@215` (line 215): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@223` (line 223): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@262` (line 262): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@263` (line 263): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@274` (line 274): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `append` (line 277): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@297` (line 297): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@319` (line 319): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@323` (line 323): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@337` (line 337): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@338` (line 338): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.

### `packages/quality/tests/runner/port.test.mjs`

- [ ] `callback@20` (line 20): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/checks/imports.test.mjs`](../packages/quality/tests/checks/imports.test.mjs).
- [ ] `callback@25` (line 25): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/checks/imports.test.mjs`](../packages/quality/tests/checks/imports.test.mjs).
- [ ] `callback@28` (line 28): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/checks/imports.test.mjs`](../packages/quality/tests/checks/imports.test.mjs).

### `packages/quality/tests/runner/progress.test.mjs`

- [ ] `callback@19` (line 19): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `capture` (line 21): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@43` (line 43): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@46` (line 46): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@56` (line 56): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@57` (line 57): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@58` (line 58): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@60` (line 60): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@64` (line 64): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@68` (line 68): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.

### `packages/quality/tests/runner/quality.test.mjs`

- [ ] `callback@26` (line 26): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@29` (line 29): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@33` (line 33): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@48` (line 48): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@53` (line 53): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@56` (line 56): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@73` (line 73): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@74` (line 74): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@78` (line 78): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@116` (line 116): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@118` (line 118): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@154` (line 154): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@158` (line 158): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@170` (line 170): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@202` (line 202): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@206` (line 206): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@208` (line 208): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@217` (line 217): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@262` (line 262): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@269` (line 269): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@278` (line 278): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@285` (line 285): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@311` (line 311): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@317` (line 317): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@354` (line 354): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@359` (line 359): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@365` (line 365): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@395` (line 395): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@429` (line 429): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@439` (line 439): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@460` (line 460): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@470` (line 470): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@498` (line 498): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@530` (line 530): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@548` (line 548): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@556` (line 556): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@570` (line 570): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@579` (line 579): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@591` (line 591): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@604` (line 604): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@627` (line 627): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@628` (line 628): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@632` (line 632): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@643` (line 643): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@653` (line 653): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@669` (line 669): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@677` (line 677): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@685` (line 685): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@693` (line 693): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@703` (line 703): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@711` (line 711): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@719` (line 719): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@727` (line 727): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@735` (line 735): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@743` (line 743): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@753` (line 753): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@767` (line 767): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@777` (line 777): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@785` (line 785): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@793` (line 793): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@801` (line 801): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@810` (line 810): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@819` (line 819): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@827` (line 827): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@835` (line 835): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@861` (line 861): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@872` (line 872): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@880` (line 880): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@891` (line 891): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@900` (line 900): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@911` (line 911): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@920` (line 920): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@929` (line 929): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@937` (line 937): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@948` (line 948): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@957` (line 957): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@967` (line 967): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.

### `packages/quality/tests/runner/runner.test.mjs`

- [ ] `IMPORT_TYPE_RECORDDATA_FROM_TYPES_G_REGEX` (line 48): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `recordingCmd` (line 72): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `recordedCmds` (line 92): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@97` (line 97): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@104` (line 104): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@118` (line 118): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@131` (line 131): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@138` (line 138): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@139` (line 139): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@147` (line 147): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@158` (line 158): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@161` (line 161): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@209` (line 209): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@233` (line 233): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@253` (line 253): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@336` (line 336): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@368` (line 368): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@385` (line 385): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@429` (line 429): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `cmd` (line 440): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@496` (line 496): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@506` (line 506): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@519` (line 519): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@557` (line 557): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@573` (line 573): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@579` (line 579): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@592` (line 592): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@606` (line 606): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@622` (line 622): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@624` (line 624): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@629` (line 629): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@635` (line 635): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@642` (line 642): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@650` (line 650): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@673` (line 673): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `recorded` (line 695): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@766` (line 766): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@767` (line 767): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@808` (line 808): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@809` (line 809): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@812` (line 812): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@814` (line 814): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@815` (line 815): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@816` (line 816): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@817` (line 817): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@820` (line 820): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@827` (line 827): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@857` (line 857): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@865` (line 865): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@866` (line 866): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@869` (line 869): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@873` (line 873): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@916` (line 916): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@918` (line 918): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@919` (line 919): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@922` (line 922): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@933` (line 933): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@952` (line 952): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@962` (line 962): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@987` (line 987): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@996` (line 996): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@998` (line 998): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1002` (line 1002): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1004` (line 1004): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1008` (line 1008): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1015` (line 1015): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1017` (line 1017): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1034` (line 1034): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1045` (line 1045): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1055` (line 1055): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1063` (line 1063): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1071` (line 1071): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1081` (line 1081): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1083` (line 1083): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1100` (line 1100): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1113` (line 1113): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1156` (line 1156): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1167` (line 1167): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1190` (line 1190): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1191` (line 1191): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1192` (line 1192): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1200` (line 1200): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1225` (line 1225): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1240` (line 1240): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1261` (line 1261): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1274` (line 1274): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1298` (line 1298): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1317` (line 1317): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1349` (line 1349): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1364` (line 1364): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1371` (line 1371): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1374` (line 1374): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `runQuality` (line 1424): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1438` (line 1438): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1494` (line 1494): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1499` (line 1499): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1506` (line 1506): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1507` (line 1507): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1526` (line 1526): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1526` (line 1526): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1529` (line 1529): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1572` (line 1572): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1597` (line 1597): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1637` (line 1637): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1651` (line 1651): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1659` (line 1659): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1695` (line 1695): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1704` (line 1704): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1715` (line 1715): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1739` (line 1739): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1771` (line 1771): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1772` (line 1772): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1790` (line 1790): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1844` (line 1844): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1871` (line 1871): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1895` (line 1895): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1902` (line 1902): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1916` (line 1916): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1945` (line 1945): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1970` (line 1970): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@1982` (line 1982): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@2002` (line 2002): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@2014` (line 2014): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@2019` (line 2019): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@2022` (line 2022): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@2040` (line 2040): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@2065` (line 2065): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@2088` (line 2088): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@2105` (line 2105): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@2119` (line 2119): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@2132` (line 2132): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@2143` (line 2143): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@2161` (line 2161): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@2186` (line 2186): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@2218` (line 2218): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@2243` (line 2243): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@2261` (line 2261): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@2297` (line 2297): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@2318` (line 2318): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@2347` (line 2347): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@2352` (line 2352): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@2355` (line 2355): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@2370` (line 2370): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@2380` (line 2380): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@2383` (line 2383): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@2394` (line 2394): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@2398` (line 2398): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@2423` (line 2423): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@2432` (line 2432): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@2488` (line 2488): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).
- [ ] `callback@2497` (line 2497): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/testing/tests/runner.test.mjs`](../packages/testing/tests/runner.test.mjs).

### `packages/quality/tests/runner/typecheck-discovery.test.mjs`

- [ ] `callback@8` (line 8): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@21` (line 21): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@25` (line 25): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@36` (line 36): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@43` (line 43): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.

### `packages/quality/tests/source-automation.test.mjs`

- [ ] `fixtureConfig` (line 31): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `verifySafeFixSourceOwnership` (line 42): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@153` (line 153): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@176` (line 176): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@186` (line 186): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@189` (line 189): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@210` (line 210): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@214` (line 214): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@235` (line 235): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@243` (line 243): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@245` (line 245): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@254` (line 254): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@258` (line 258): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@272` (line 272): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@285` (line 285): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@294` (line 294): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@306` (line 306): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@313` (line 313): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@326` (line 326): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@339` (line 339): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@348` (line 348): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@355` (line 355): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@368` (line 368): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.

### `packages/quality/tests/transforms/collapse.test.mjs`

- [ ] `callback@20` (line 20): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.

### `packages/quality/tests/transforms/inline-if.test.mjs`

- [ ] `callback@21` (line 21): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@57` (line 57): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `execute` (line 61): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `run` (line 63): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `stop` (line 64): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.

### `packages/quality/tests/transforms/naming.test.mjs`

- [ ] `callback@23` (line 23): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `identifiers` (line 42): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `visit` (line 49): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@61` (line 61): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@69` (line 69): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@84` (line 84): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@111` (line 111): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@122` (line 122): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@127` (line 127): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@132` (line 132): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `declaration` (line 147): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@147` (line 147): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@157` (line 157): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `visit` (line 178): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@184` (line 184): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@193` (line 193): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@198` (line 198): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@210` (line 210): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `visit` (line 214): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@221` (line 221): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@246` (line 246): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@253` (line 253): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@268` (line 268): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@279` (line 279): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@299` (line 299): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@316` (line 316): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@332` (line 332): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@340` (line 340): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@364` (line 364): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@369` (line 369): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@373` (line 373): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@399` (line 399): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@415` (line 415): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@421` (line 421): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@434` (line 434): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@441` (line 441): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@448` (line 448): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.

### `packages/quality/tests/transforms/object-forwarding.test.mjs`

- [ ] `callback@21` (line 21): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@44` (line 44): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@52` (line 52): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.

### `packages/quality/tests/transforms/single-use.test.mjs`

- [ ] `callback@27` (line 27): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@38` (line 38): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@67` (line 67): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@82` (line 82): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@101` (line 101): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@115` (line 115): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@130` (line 130): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@134` (line 134): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@160` (line 160): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@167` (line 167): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@182` (line 182): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@183` (line 183): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@187` (line 187): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@193` (line 193): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@194` (line 194): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@205` (line 205): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@239` (line 239): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@252` (line 252): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@263` (line 263): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@264` (line 264): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@271` (line 271): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@280` (line 280): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@287` (line 287): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@295` (line 295): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@302` (line 302): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@310` (line 310): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@314` (line 314): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@318` (line 318): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@349` (line 349): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@390` (line 390): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@409` (line 409): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@413` (line 413): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@419` (line 419): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@421` (line 421): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@429` (line 429): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@444` (line 444): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@454` (line 454): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@476` (line 476): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@480` (line 480): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@621` (line 621): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@648` (line 648): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@668` (line 668): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@669` (line 669): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@670` (line 670): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@687` (line 687): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@703` (line 703): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@715` (line 715): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@723` (line 723): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@734` (line 734): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@746` (line 746): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@755` (line 755): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@791` (line 791): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@792` (line 792): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@793` (line 793): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@800` (line 800): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@818` (line 818): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@831` (line 831): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@846` (line 846): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@848` (line 848): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@861` (line 861): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@864` (line 864): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@868` (line 868): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@872` (line 872): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@876` (line 876): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@884` (line 884): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@885` (line 885): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@895` (line 895): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@901` (line 901): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@907` (line 907): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@914` (line 914): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@920` (line 920): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@926` (line 926): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@932` (line 932): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@938` (line 938): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@942` (line 942): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@947` (line 947): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@953` (line 953): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@960` (line 960): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@966` (line 966): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@974` (line 974): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@980` (line 980): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@988` (line 988): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@992` (line 992): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1001` (line 1001): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1009` (line 1009): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1016` (line 1016): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1017` (line 1017): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1018` (line 1018): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1019` (line 1019): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1021` (line 1021): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1028` (line 1028): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1032` (line 1032): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1037` (line 1037): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1041` (line 1041): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1046` (line 1046): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1052` (line 1052): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1057` (line 1057): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1061` (line 1061): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1082` (line 1082): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1086` (line 1086): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1093` (line 1093): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1094` (line 1094): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1103` (line 1103): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1117` (line 1117): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1121` (line 1121): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1138` (line 1138): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1142` (line 1142): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1152` (line 1152): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1159` (line 1159): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1163` (line 1163): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1168` (line 1168): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1183` (line 1183): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1193` (line 1193): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1199` (line 1199): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1200` (line 1200): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1204` (line 1204): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1210` (line 1210): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1211` (line 1211): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1212` (line 1212): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1216` (line 1216): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1224` (line 1224): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1226` (line 1226): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1228` (line 1228): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1232` (line 1232): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1236` (line 1236): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1242` (line 1242): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1243` (line 1243): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@1246` (line 1246): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.

### `packages/refactoring/src/cli.ts`

- [ ] `callback@10` (line 10): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/refactoring/src/index.ts`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `packages/refactoring/src/lib/object-forwarding.ts`

- [ ] `isIgnoredCallee` (line 37): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/object-forwarding.test.mjs`](../packages/quality/tests/transforms/object-forwarding.test.mjs).
- [ ] `findingsForFile` (line 51): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/transforms/object-forwarding.test.mjs`](../packages/quality/tests/transforms/object-forwarding.test.mjs).
- [ ] `visit` (line 56): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/object-forwarding.test.mjs`](../packages/quality/tests/transforms/object-forwarding.test.mjs).
- [ ] `objectForwardingFindings` (line 107): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/transforms/object-forwarding.test.mjs`](../packages/quality/tests/transforms/object-forwarding.test.mjs).
- [ ] `callback@108` (line 108): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/object-forwarding.test.mjs`](../packages/quality/tests/transforms/object-forwarding.test.mjs).
- [ ] `fixObjectForwarding` (line 120): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/object-forwarding.test.mjs`](../packages/quality/tests/transforms/object-forwarding.test.mjs).
- [ ] `visit` (line 129): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/object-forwarding.test.mjs`](../packages/quality/tests/transforms/object-forwarding.test.mjs).
- [ ] `callback@157` (line 157): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/object-forwarding.test.mjs`](../packages/quality/tests/transforms/object-forwarding.test.mjs).

### `packages/refactoring/src/lib/single-use.ts`

- [ ] `reportProgress` (line 56): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `hasMeaningfulLeadingTSDoc` (line 70): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@71` (line 71): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `canonical` (line 92): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `isImportNode` (line 100): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@102` (line 102): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `singleUseIgnoreDirectives` (line 116): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@127` (line 127): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@131` (line 131): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@136` (line 136): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@141` (line 141): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `singleUseDirectiveFinding` (line 157): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `programFor` (line 176): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@178` (line 178): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@186` (line 186): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `deadCodeTypeProgram` (line 200): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `inSingleUseScope` (line 212): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@213` (line 213): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@214` (line 214): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `collect` (line 226): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@230` (line 230): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@232` (line 232): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `visitCandidates` (line 244): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@247` (line 247): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@287` (line 287): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@288` (line 288): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `visitRequires` (line 291): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@312` (line 312): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `visit` (line 326): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `typeReferences` (line 366): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@367` (line 367): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `astroConsumersFor` (line 381): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@382` (line 382): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@384` (line 384): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `inspect` (line 407): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `hasAstroConsumer` (line 433): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `isCfgdPublicContract` (line 446): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@449` (line 449): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `isModuleExport` (line 461): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@463` (line 463): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `isPackageEntryExport` (line 476): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@478` (line 478): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@493` (line 493): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@497` (line 497): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@515` (line 515): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@520` (line 520): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `isRequiredLifecycleVal` (line 538): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `hasImportedTypeAnnotation` (line 564): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@566` (line 566): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `inspect` (line 570): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `hasCallSensitiveTypeAnnotation` (line 589): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@605` (line 605): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `crossFileTypeSafe` (line 617): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `visit` (line 621): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `containsExplicitAny` (line 643): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `visit` (line 646): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `containsAwait` (line 662): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `visit` (line 666): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `isStaticLiteralExpr` (line 682): Test valid, malformed, empty, and boundary input; assert exact output or error. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@697` (line 697): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@699` (line 699): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `isPlaywrightQueryReceiver` (line 711): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@713` (line 713): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@717` (line 717): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `isStaticPlaywrightLocator` (line 732): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `visit` (line 742): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `isModuleCallArgument` (line 767): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@772` (line 772): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `isStaticModuleDataExpr` (line 785): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@788` (line 788): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@790` (line 790): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `isAdjacentModuleDefaultExport` (line 802): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `isExclusiveDefaultExport` (line 819): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@824` (line 824): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@825` (line 825): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `containsCommentTrivia` (line 838): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `isFirstConsumerEvaluation` (line 855): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `unwrapExpr` (line 954): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `initSafeToInline` (line 968): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@992` (line 992): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `inspect` (line 1018): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `inspectInit` (line 1031): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `crossFileVariableSafe` (line 1069): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `visit` (line 1075): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `isWriteReference` (line 1090): Test successful mutation, duplicate/conflict, validation, and failed-write behavior. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `isStateRestorationReference` (line 1107): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `isRuntimeRepeatedReference` (line 1131): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1159` (line 1159): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1186` (line 1186): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `isExportSpecifierReference` (line 1215): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `findingsFromAnalysis` (line 1231): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1245` (line 1245): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1308` (line 1308): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `singleUseFindings` (line 1347): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `referenceTgt` (line 1361): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `inlineGenericType` (line 1377): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1381` (line 1381): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1383` (line 1383): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `visit` (line 1391): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1396` (line 1396): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `reactCreateElementName` (line 1413): Test successful mutation, duplicate/conflict, validation, and failed-write behavior. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `deadCodeEditsIntroduceTypeErrors` (line 1427): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1440` (line 1440): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1441` (line 1441): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1459` (line 1459): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1460` (line 1460): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `diagnosticKey` (line 1469): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1492` (line 1492): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1492` (line 1492): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `fixSingleUseDeclarations` (line 1505): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1522` (line 1522): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1539` (line 1539): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1548` (line 1548): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1549` (line 1549): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1549` (line 1549): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1559` (line 1559): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1589` (line 1589): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1590` (line 1590): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1594` (line 1594): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1596` (line 1596): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1596` (line 1596): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1597` (line 1597): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1609` (line 1609): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1613` (line 1613): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1618` (line 1618): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1626` (line 1626): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1640` (line 1640): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1645` (line 1645): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1661` (line 1661): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1665` (line 1665): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1671` (line 1671): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1672` (line 1672): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1672` (line 1672): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1672` (line 1672): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1679` (line 1679): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1687` (line 1687): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1688` (line 1688): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1696` (line 1696): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1706` (line 1706): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1706` (line 1706): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1710` (line 1710): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1712` (line 1712): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1717` (line 1717): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1718` (line 1718): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `callback@1719` (line 1719): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).
- [ ] `fixSingleUseTypes` (line 1755): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/transforms/single-use.test.mjs`](../packages/quality/tests/transforms/single-use.test.mjs).

### `packages/refactoring/tests/public.test.mjs`

- [ ] `callback@18` (line 18): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@23` (line 23): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@40` (line 40): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@50` (line 50): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@84` (line 84): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@85` (line 85): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@86` (line 86): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@87` (line 87): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@104` (line 104): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@110` (line 110): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).

### `packages/reporting/src/index.ts`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `packages/reporting/src/lib/core.ts`

- [ ] `normalizeVisualStatus` (line 93): Test valid, malformed, empty, and boundary input; assert exact output or error. No direct test file is linked yet.
- [ ] `statusLabel` (line 102): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `diagnosticCount` (line 111): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `statusCounts` (line 120): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@121` (line 121): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `orderedFiles` (line 133): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@134` (line 134): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@134` (line 134): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@136` (line 136): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@137` (line 137): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@138` (line 138): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `resultsForFile` (line 149): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@149` (line 149): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/reporting/src/lib/index.ts`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `packages/reporting/src/lib/load-testing.ts`

- [ ] `isRec` (line 55): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `budgetOverride` (line 64): Test found, missing, unauthorized, and upstream-failure results. No direct test file is linked yet.
- [ ] `validateLoadBudgetOverride` (line 81): Test valid, malformed, empty, and boundary input; assert exact output or error. No direct test file is linked yet.
- [ ] `budgetMap` (line 94): Test found, missing, unauthorized, and upstream-failure results. No direct test file is linked yet.
- [ ] `callback@97` (line 97): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `completeBudget` (line 107): Test found, missing, unauthorized, and upstream-failure results. No direct test file is linked yet.
- [ ] `normalizeLoadTestingConfig` (line 121): Test valid, malformed, empty, and boundary input; assert exact output or error. No direct test file is linked yet.
- [ ] `mergeMaps` (line 136): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `readLoadTestingConfig` (line 160): Test found, missing, unauthorized, and upstream-failure results. No direct test file is linked yet.
- [ ] `loadTestId` (line 189): Test found, missing, unauthorized, and upstream-failure results. No direct test file is linked yet.
- [ ] `gradeLoad` (line 199): Test found, missing, unauthorized, and upstream-failure results. No direct test file is linked yet.
- [ ] `gradeLoadMeasurement` (line 215): Test found, missing, unauthorized, and upstream-failure results. No direct test file is linked yet.
- [ ] `loadGradeCounts` (line 233): Test found, missing, unauthorized, and upstream-failure results. No direct test file is linked yet.
- [ ] `timeLoadOperation` (line 250): Test found, missing, unauthorized, and upstream-failure results. No direct test file is linked yet.
- [ ] `callback@253` (line 253): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/reporting/src/lib/metadata.ts`

- [ ] `neutralizeApplicationMetadata` (line 25): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/reporting/src/lib/playwright.ts`

- [ ] `A_Z0_9_GI_REGEX` (line 39): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `page` (line 54): Render each state; check interactions, accessibility, loading, and error behavior. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `observe` (line 61): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@62` (line 62): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@66` (line 66): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@67` (line 67): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@100` (line 100): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `observe` (line 111): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@112` (line 112): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@116` (line 116): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@117` (line 117): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@120` (line 120): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@124` (line 124): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `setTestBudget` (line 132): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `measure` (line 135): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@140` (line 140): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `visuals` (line 182): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `capture` (line 186): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `stripAnsi` (line 249): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `parseDiagnostics` (line 258): Test valid, malformed, empty, and boundary input; assert exact output or error. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@263` (line 263): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `terminalText` (line 280): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `readAttachment` (line 289): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `diagnosticText` (line 303): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@304` (line 304): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `screenshotAttachment` (line 317): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@318` (line 318): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `persistScreenshotCapture` (line 328): Test successful mutation, duplicate/conflict, validation, and failed-write behavior. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `readScreenshotRun` (line 374): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@385` (line 385): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@386` (line 386): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@388` (line 388): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@392` (line 392): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `writeScreenshotRun` (line 409): Test successful mutation, duplicate/conflict, validation, and failed-write behavior. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `visualCaptureManifest` (line 424): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@425` (line 425): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@430` (line 430): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `loadAttachment` (line 448): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@449` (line 449): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@454` (line 454): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `addLoadMeasurements` (line 482): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@492` (line 492): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `testIdentity` (line 506): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@513` (line 513): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `screenshotTestGroup` (line 535): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `testTitleParts` (line 547): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@550` (line 550): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `redactEvidence` (line 561): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@563` (line 563): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `constructor` (line 596): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `onBegin` (line 619): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@630` (line 630): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@644` (line 644): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@654` (line 654): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@659` (line 659): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `onStdErr` (line 672): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `onStdOut` (line 691): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `onError` (line 708): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `onTestEnd` (line 720): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@734` (line 734): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@742` (line 742): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@746` (line 746): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@747` (line 747): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@768` (line 768): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `onEnd` (line 805): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@812` (line 812): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@837` (line 837): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@846` (line 846): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `unavailable` (line 864): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@885` (line 885): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@912` (line 912): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@917` (line 917): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@947` (line 947): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@951` (line 951): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@955` (line 955): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).
- [ ] `callback@968` (line 968): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/reports/playwright-reporter.test.mjs`](../packages/quality/tests/reports/playwright-reporter.test.mjs).

### `packages/reporting/src/lib/slideshow.ts`

- [ ] `officeColor` (line 116): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `hexColor` (line 124): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@127` (line 127): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `createDocumentBrand` (line 134): Test successful mutation, duplicate/conflict, validation, and failed-write behavior. No direct test file is linked yet.
- [ ] `reportColors` (line 159): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `addReportTitle` (line 176): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `reviewImg` (line 187): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `fitImg` (line 212): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `previewImg` (line 226): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@229` (line 229): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `viewportWidth` (line 240): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `resultLoadGrade` (line 248): Test found, missing, unauthorized, and upstream-failure results. No direct test file is linked yet.
- [ ] `slideCopy` (line 260): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@267` (line 267): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@269` (line 269): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `addResponsiveSlide` (line 286): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `readScreenshotCapturesFromDirectory` (line 345): Test found, missing, unauthorized, and upstream-failure results. No direct test file is linked yet.
- [ ] `callback@363` (line 363): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@363` (line 363): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@364` (line 364): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@369` (line 369): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@388` (line 388): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@393` (line 393): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `addLoadSummarySlide` (line 424): Test found, missing, unauthorized, and upstream-failure results. No direct test file is linked yet.
- [ ] `callback@425` (line 425): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@425` (line 425): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@426` (line 426): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@427` (line 427): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@443` (line 443): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `addLoadDetailSlides` (line 457): Test found, missing, unauthorized, and upstream-failure results. No direct test file is linked yet.
- [ ] `callback@458` (line 458): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@458` (line 458): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@465` (line 465): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `writeSlideshow` (line 495): Test successful mutation, duplicate/conflict, validation, and failed-write behavior. No direct test file is linked yet.
- [ ] `callback@496` (line 496): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@526` (line 526): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `writeScreenshotSlideshow` (line 554): Test successful mutation, duplicate/conflict, validation, and failed-write behavior. No direct test file is linked yet.
- [ ] `viewportWidth` (line 571): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@572` (line 572): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@586` (line 586): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `readScreenshotCapturesFromDirTree` (line 635): Test found, missing, unauthorized, and upstream-failure results. No direct test file is linked yet.
- [ ] `read` (line 637): Test found, missing, unauthorized, and upstream-failure results. No direct test file is linked yet.
- [ ] `callback@655` (line 655): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@662` (line 662): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@663` (line 663): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@664` (line 664): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@665` (line 665): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `writeScreenshotSlideshowFromDirectory` (line 684): Test successful mutation, duplicate/conflict, validation, and failed-write behavior. No direct test file is linked yet.
- [ ] `callback@685` (line 685): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `writeScreenshotSlideshowFromDirectories` (line 701): Test successful mutation, duplicate/conflict, validation, and failed-write behavior. No direct test file is linked yet.
- [ ] `callback@702` (line 702): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@704` (line 704): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@705` (line 705): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/reporting/src/lib/spreadsheet.ts`

- [ ] `styleHeader` (line 51): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `styleLoadGrade` (line 65): Test found, missing, unauthorized, and upstream-failure results. No direct test file is linked yet.
- [ ] `valuesForRow` (line 79): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@79` (line 79): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `resultLoadGrade` (line 87): Test found, missing, unauthorized, and upstream-failure results. No direct test file is linked yet.
- [ ] `writeSpreadsheet` (line 100): Test found, missing, unauthorized, and upstream-failure results. No direct test file is linked yet.
- [ ] `callback@101` (line 101): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@114` (line 114): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@115` (line 115): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@115` (line 115): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@118` (line 118): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@123` (line 123): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@129` (line 129): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@243` (line 243): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@244` (line 244): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@244` (line 244): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@246` (line 246): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `copyWorksheet` (line 275): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@281` (line 281): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@282` (line 282): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@287` (line 287): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `mergeSpreadsheets` (line 309): Test found, missing, unauthorized, and upstream-failure results. No direct test file is linked yet.
- [ ] `callback@329` (line 329): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@336` (line 336): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@358` (line 358): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/reporting/src/lib/viewports.ts`

- [ ] `A_Z0_9_GI_REGEX` (line 28): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `resolveVisualViewports` (line 67): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@76` (line 76): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@77` (line 77): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@78` (line 78): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@80` (line 80): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `visualProjectName` (line 92): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `projectViewportName` (line 103): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@104` (line 104): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@105` (line 105): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `baseVisualProjectName` (line 118): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `viewportSizeLabel` (line 131): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `withResponsivePlaywright` (line 173): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@181` (line 181): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@185` (line 185): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `isSetup` (line 195): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@197` (line 197): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@200` (line 200): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@203` (line 203): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@230` (line 230): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/reporting/tests/reporting.test.mjs`

- [ ] `P_PIC_G_REGEX` (line 24): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `result` (line 67): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@90` (line 90): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@119` (line 119): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@142` (line 142): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@142` (line 142): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@142` (line 142): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@143` (line 143): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@143` (line 143): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@147` (line 147): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@150` (line 150): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@150` (line 150): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@155` (line 155): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@155` (line 155): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@163` (line 163): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@168` (line 168): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@186` (line 186): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@191` (line 191): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@192` (line 192): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@193` (line 193): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@195` (line 195): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@198` (line 198): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@203` (line 203): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@207` (line 207): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@211` (line 211): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@215` (line 215): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@220` (line 220): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@227` (line 227): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `titlePath` (line 240): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `project` (line 241): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `run` (line 243): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `project` (line 245): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `allTests` (line 246): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@255` (line 255): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@256` (line 256): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@262` (line 262): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@266` (line 266): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `allTests` (line 279): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `project` (line 280): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@286` (line 286): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@287` (line 287): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@292` (line 292): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@293` (line 293): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@313` (line 313): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@370` (line 370): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@404` (line 404): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@408` (line 408): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@409` (line 409): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@428` (line 428): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `latestArtifacts` (line 439): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@441` (line 441): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@442` (line 442): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `makeTest` (line 446): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `titlePath` (line 450): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `project` (line 451): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `runProcess` (line 473): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@511` (line 511): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@527` (line 527): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@528` (line 528): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@549` (line 549): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@586` (line 586): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@587` (line 587): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@595` (line 595): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@598` (line 598): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@599` (line 599): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@606` (line 606): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@644` (line 644): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@691` (line 691): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@710` (line 710): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@719` (line 719): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `titlePath` (line 723): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `project` (line 724): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `allTests` (line 726): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@730` (line 730): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@758` (line 758): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@826` (line 826): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@836` (line 836): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@846` (line 846): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `titlePath` (line 903): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `project` (line 904): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@927` (line 927): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@936` (line 936): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@939` (line 939): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.
- [ ] `callback@941` (line 941): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. No direct test file is linked yet.

### `packages/security/src/cli.ts`

- [ ] `callback@10` (line 10): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/security/src/index.ts`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `packages/security/src/lib/security.ts`

- [ ] `securityFindings` (line 43): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/quality/tests/checks/security.test.mjs`](../packages/quality/tests/checks/security.test.mjs).
- [ ] `callback@47` (line 47): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/security.test.mjs`](../packages/quality/tests/checks/security.test.mjs).
- [ ] `callback@54` (line 54): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/security.test.mjs`](../packages/quality/tests/checks/security.test.mjs).
- [ ] `callback@60` (line 60): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/security.test.mjs`](../packages/quality/tests/checks/security.test.mjs).
- [ ] `callback@61` (line 61): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/security.test.mjs`](../packages/quality/tests/checks/security.test.mjs).
- [ ] `callback@67` (line 67): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/security.test.mjs`](../packages/quality/tests/checks/security.test.mjs).
- [ ] `callback@69` (line 69): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/security.test.mjs`](../packages/quality/tests/checks/security.test.mjs).
- [ ] `callback@70` (line 70): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/security.test.mjs`](../packages/quality/tests/checks/security.test.mjs).
- [ ] `callback@77` (line 77): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/security.test.mjs`](../packages/quality/tests/checks/security.test.mjs).
- [ ] `callback@82` (line 82): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/security.test.mjs`](../packages/quality/tests/checks/security.test.mjs).
- [ ] `environmentAccess` (line 97): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/security.test.mjs`](../packages/quality/tests/checks/security.test.mjs).
- [ ] `stringValue` (line 108): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/security.test.mjs`](../packages/quality/tests/checks/security.test.mjs).
- [ ] `visit` (line 109): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/security.test.mjs`](../packages/quality/tests/checks/security.test.mjs).

### `packages/security/tests/public.test.mjs`

- [ ] `callback@15` (line 15): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@18` (line 18): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@24` (line 24): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).

### `packages/testing/src/cli.mjs`

- [ ] `parseArgs` (line 22): Test valid, malformed, empty, and boundary input; assert exact output or error. No direct test file is linked yet.
- [ ] `callback@38` (line 38): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/testing/src/index.d.ts`

- [ ] `readTestPlan` (line 24): Test found, missing, unauthorized, and upstream-failure results. No direct test file is linked yet.
- [ ] `validateTestPlan` (line 33): Test valid, malformed, empty, and boundary input; assert exact output or error. No direct test file is linked yet.
- [ ] `runTestPlan` (line 41): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/testing/src/index.mjs`

- [ ] `isInside` (line 27): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `listTestFiles` (line 43): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `visit` (line 45): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `globRegex` (line 68): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `runLinearHistory` (line 93): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `git` (line 132): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `readTestPlan` (line 167): Test found, missing, unauthorized, and upstream-failure results. No direct test file is linked yet.
- [ ] `defaultManifestPath` (line 183): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `validateTestPlan` (line 198): Test valid, malformed, empty, and boundary input; assert exact output or error. No direct test file is linked yet.
- [ ] `callback@214` (line 214): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@222` (line 222): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@229` (line 229): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@236` (line 236): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `runTestPlan` (line 250): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@253` (line 253): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@254` (line 254): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@255` (line 255): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@276` (line 276): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/testing/tests/runner.test.mjs`

- [ ] `fixtureRoot` (line 28): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `git` (line 40): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `commit` (line 52): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `withGitHubEvent` (line 68): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `initGitFixture` (line 90): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@104` (line 104): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@112` (line 112): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@129` (line 129): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@134` (line 134): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@148` (line 148): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@161` (line 161): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@163` (line 163): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `mkdirTest` (line 176): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@180` (line 180): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@189` (line 189): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@207` (line 207): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@212` (line 212): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@219` (line 219): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).
- [ ] `callback@230` (line 230): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/quality/tests/runner/runner.test.mjs`](../packages/quality/tests/runner/runner.test.mjs).

### `packages/ui-quality/src/cli.ts`

- [ ] `callback@10` (line 10): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/ui-quality/src/index.ts`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. No direct test file is linked yet.

### `packages/ui-quality/src/lib/accessibility.ts`

- [ ] `scriptKind` (line 85): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `attrsOf` (line 97): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `childrenOf` (line 108): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `tagOf` (line 119): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `attrOf` (line 131): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@132` (line 132): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `staticAttr` (line 142): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `literalTitle` (line 166): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `meaningful` (line 185): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `hiddenAttrState` (line 196): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `hiddenState` (line 216): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `inputType` (line 232): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `combine` (line 244): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `contentState` (line 258): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@261` (line 261): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `childContentState` (line 272): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@283` (line 283): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `elementContentState` (line 295): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `ariaNameState` (line 324): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `idContentStates` (line 337): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `visit` (line 341): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `referencedContentState` (line 349): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@360` (line 360): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `associatedLabels` (line 379): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `visit` (line 382): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@395` (line 395): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `elementNameState` (line 411): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `decorativeIcons` (line 462): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `visit` (line 465): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@476` (line 476): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `inspectFile` (line 496): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `visit` (line 504): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `targetKind` (line 511): Test found, missing, unauthorized, and upstream-failure results. No direct test file is linked yet.
- [ ] `labelledByState` (line 530): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@535` (line 535): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@570` (line 570): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@573` (line 573): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `sourceFiles` (line 587): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@588` (line 588): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `sourceFor` (line 599): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `accessibilityFindings` (line 617): Test found, missing, unauthorized, and upstream-failure results. No direct test file is linked yet.
- [ ] `callback@618` (line 618): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `fixAccessibleNames` (line 632): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@638` (line 638): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@651` (line 651): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/ui-quality/src/lib/display-name.ts`

- [ ] `scriptKind` (line 45): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `isForwardRef` (line 59): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `assignedComponent` (line 73): Render each state; check interactions, accessibility, loading, and error behavior. No direct test file is linked yet.
- [ ] `isBindingScope` (line 93): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `declarationScope` (line 114): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `candidatesForAssignment` (line 135): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@140` (line 140): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `candidatesForFile` (line 154): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `collect` (line 160): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `inspectAssignments` (line 173): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `findingsForFile` (line 201): Test found, missing, unauthorized, and upstream-failure results. No direct test file is linked yet.
- [ ] `displayNameFindings` (line 230): Test found, missing, unauthorized, and upstream-failure results. No direct test file is linked yet.
- [ ] `callback@231` (line 231): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `fixDisplayNames` (line 245): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@276` (line 276): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@277` (line 277): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@281` (line 281): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `packages/ui-quality/src/lib/error-boundaries.ts`

- [ ] `exprName` (line 47): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).
- [ ] `unwrap` (line 61): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).
- [ ] `importedBoundaries` (line 75): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).
- [ ] `isBoundaryTag` (line 98): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).
- [ ] `isBoundaryReference` (line 111): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).
- [ ] `isBoundaryExpr` (line 126): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).
- [ ] `reactRootRenders` (line 140): Render each state; check interactions, accessibility, loading, and error behavior. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).
- [ ] `isFactory` (line 143): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).
- [ ] `visit` (line 144): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).
- [ ] `sourceInfos` (line 170): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).
- [ ] `callback@172` (line 172): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).
- [ ] `callback@173` (line 173): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).
- [ ] `errorBoundaryFindings` (line 188): Test found, missing, unauthorized, and upstream-failure results. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).
- [ ] `fixErrorBoundaries` (line 226): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).
- [ ] `callback@229` (line 229): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).
- [ ] `collectIdentifiers` (line 234): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).
- [ ] `uniqueName` (line 239): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).
- [ ] `callback@249` (line 249): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).
- [ ] `callback@257` (line 257): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).
- [ ] `callback@268` (line 268): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).
- [ ] `astroConfigFiles` (line 282): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).
- [ ] `visit` (line 284): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).
- [ ] `hasAstroBoundaryIntegration` (line 308): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).
- [ ] `astroIntegrationSpecifier` (line 324): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).
- [ ] `callback@341` (line 341): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).
- [ ] `callback@343` (line 343): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).
- [ ] `fixAstroBoundaryIntegrations` (line 372): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).
- [ ] `callback@380` (line 380): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).
- [ ] `callback@384` (line 384): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/error-boundaries/tests/error-boundaries.test.mjs`](../packages/error-boundaries/tests/error-boundaries.test.mjs).

### `packages/ui-quality/src/lib/ui-recommendations.ts`

- [ ] `staticAttrValue` (line 64): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/ui-recommendations.test.mjs`](../packages/quality/tests/checks/ui-recommendations.test.mjs).
- [ ] `jsxAttr` (line 82): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/ui-recommendations.test.mjs`](../packages/quality/tests/checks/ui-recommendations.test.mjs).
- [ ] `callback@83` (line 83): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/ui-recommendations.test.mjs`](../packages/quality/tests/checks/ui-recommendations.test.mjs).
- [ ] `textLinkVariant` (line 93): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/ui-recommendations.test.mjs`](../packages/quality/tests/checks/ui-recommendations.test.mjs).
- [ ] `staticClasses` (line 115): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/ui-recommendations.test.mjs`](../packages/quality/tests/checks/ui-recommendations.test.mjs).
- [ ] `uiComponentRecommendations` (line 133): Render each state; check interactions, accessibility, loading, and error behavior. Candidate coverage: [`packages/quality/tests/checks/ui-recommendations.test.mjs`](../packages/quality/tests/checks/ui-recommendations.test.mjs).
- [ ] `callback@137` (line 137): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/ui-recommendations.test.mjs`](../packages/quality/tests/checks/ui-recommendations.test.mjs).
- [ ] `isIgnoredFile` (line 142): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/ui-recommendations.test.mjs`](../packages/quality/tests/checks/ui-recommendations.test.mjs).
- [ ] `callback@146` (line 146): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/ui-recommendations.test.mjs`](../packages/quality/tests/checks/ui-recommendations.test.mjs).
- [ ] `callback@148` (line 148): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/ui-recommendations.test.mjs`](../packages/quality/tests/checks/ui-recommendations.test.mjs).
- [ ] `visit` (line 158): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/ui-recommendations.test.mjs`](../packages/quality/tests/checks/ui-recommendations.test.mjs).
- [ ] `callback@163` (line 163): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/ui-recommendations.test.mjs`](../packages/quality/tests/checks/ui-recommendations.test.mjs).
- [ ] `ruleMatches` (line 165): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/ui-recommendations.test.mjs`](../packages/quality/tests/checks/ui-recommendations.test.mjs).
- [ ] `isButtonLike` (line 172): Render each state; check interactions, accessibility, loading, and error behavior. Candidate coverage: [`packages/quality/tests/checks/ui-recommendations.test.mjs`](../packages/quality/tests/checks/ui-recommendations.test.mjs).
- [ ] `callback@175` (line 175): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/ui-recommendations.test.mjs`](../packages/quality/tests/checks/ui-recommendations.test.mjs).
- [ ] `callback@176` (line 176): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/ui-recommendations.test.mjs`](../packages/quality/tests/checks/ui-recommendations.test.mjs).
- [ ] `callback@177` (line 177): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/ui-recommendations.test.mjs`](../packages/quality/tests/checks/ui-recommendations.test.mjs).
- [ ] `callback@178` (line 178): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/ui-recommendations.test.mjs`](../packages/quality/tests/checks/ui-recommendations.test.mjs).
- [ ] `callback@205` (line 205): Test expected input/output, empty and boundary cases, and a relevant failure path. Candidate coverage: [`packages/quality/tests/checks/ui-recommendations.test.mjs`](../packages/quality/tests/checks/ui-recommendations.test.mjs).

### `packages/ui-quality/tests/public.test.mjs`

- [ ] `callback@20` (line 20): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@29` (line 29): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).
- [ ] `callback@38` (line 38): Run this test and verify its assertions cover the helper, failure path, and relevant fixture. Candidate coverage: [`packages/braces/tests/public.test.mjs`](../packages/braces/tests/public.test.mjs).

### `scripts/quality-runner.mjs`

- [ ] `callback@18` (line 18): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@45` (line 45): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `isBuildOrTest` (line 50): Run on clean input; verify deterministic output and a useful failure on invalid input. No direct test file is linked yet.
- [ ] `callback@53` (line 53): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.
- [ ] `callback@55` (line 55): Test expected input/output, empty and boundary cases, and a relevant failure path. No direct test file is linked yet.

### `scripts/quality.mjs`

- [ ] File behavior: execute or compile this source, including expected output and failure handling. Candidate coverage: [`packages/quality/tests/runner/quality.test.mjs`](../packages/quality/tests/runner/quality.test.mjs).

## Document inventory

- [ ] [`.agents/skills/all-repos/SKILL.md`](../.agents/skills/all-repos/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`.changeset/brief-browser-runs.md`](../.changeset/brief-browser-runs.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`.changeset/bright-matrix-runs.md`](../.changeset/bright-matrix-runs.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`.changeset/bright-workbooks-aggregate.md`](../.changeset/bright-workbooks-aggregate.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`.changeset/centralized-quality-config-root.md`](../.changeset/centralized-quality-config-root.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`.changeset/clean-eslint-adapters.md`](../.changeset/clean-eslint-adapters.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`.changeset/clean-plans-move.md`](../.changeset/clean-plans-move.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`.changeset/config-directory-quality.md`](../.changeset/config-directory-quality.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`.changeset/current-capture-inventory.md`](../.changeset/current-capture-inventory.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`.changeset/current-run-decks.md`](../.changeset/current-run-decks.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`.changeset/multiple-current-runs.md`](../.changeset/multiple-current-runs.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`.changeset/nested-screenshot-decks.md`](../.changeset/nested-screenshot-decks.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`.changeset/purple-pants-report.md`](../.changeset/purple-pants-report.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`.changeset/repository-run-selection.md`](../.changeset/repository-run-selection.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`.changeset/shared-testing.md`](../.changeset/shared-testing.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`.changeset/sharp-cats-typecheck.md`](../.changeset/sharp-cats-typecheck.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`.changeset/small-matrix-slides.md`](../.changeset/small-matrix-slides.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`.changeset/steady-quality-phases.md`](../.changeset/steady-quality-phases.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`.changeset/tidy-captures.md`](../.changeset/tidy-captures.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`.changeset/tidy-test-ownership.md`](../.changeset/tidy-test-ownership.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`CHANGELOG.md`](../CHANGELOG.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`README.md`](../README.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`apps/hygiene/README.md`](../apps/hygiene/README.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/index.md`](../docs/index.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/quality/skills/compact-files/SKILL.md`](../docs/agents/packages/quality/skills/compact-files/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/quality/skills/git/branches/jules/SKILL.md`](../docs/agents/packages/quality/skills/git/branches/jules/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/quality/skills/git/branches/prune-device/SKILL.md`](../docs/agents/packages/quality/skills/git/branches/prune-device/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/quality/skills/git/branches/prune/SKILL.md`](../docs/agents/packages/quality/skills/git/branches/prune/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/quality/skills/git/branches/review/SKILL.md`](../docs/agents/packages/quality/skills/git/branches/review/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/quality/skills/git/commit/SKILL.md`](../docs/agents/packages/quality/skills/git/commit/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/quality/skills/git/deploy/SKILL.md`](../docs/agents/packages/quality/skills/git/deploy/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/quality/skills/git/history/SKILL.md`](../docs/agents/packages/quality/skills/git/history/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/quality/skills/git/issues/audit/SKILL.md`](../docs/agents/packages/quality/skills/git/issues/audit/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/quality/skills/git/issues/complete/SKILL.md`](../docs/agents/packages/quality/skills/git/issues/complete/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/quality/skills/git/npm/SKILL.md`](../docs/agents/packages/quality/skills/git/npm/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/quality/skills/git/package-scripts/SKILL.md`](../docs/agents/packages/quality/skills/git/package-scripts/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/quality/skills/git/packages/SKILL.md`](../docs/agents/packages/quality/skills/git/packages/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/quality/skills/git/port/SKILL.md`](../docs/agents/packages/quality/skills/git/port/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/quality/skills/git/readme/README.template.md`](../docs/agents/packages/quality/skills/git/readme/README.template.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/quality/skills/git/readme/SKILL.md`](../docs/agents/packages/quality/skills/git/readme/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/quality/skills/hygiene/SKILL.md`](../docs/agents/packages/quality/skills/hygiene/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/quality/skills/hygiene/initialisation/SKILL.md`](../docs/agents/packages/quality/skills/hygiene/initialisation/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/quality/skills/hygiene/references/conventions.md`](../docs/agents/packages/quality/skills/hygiene/references/conventions.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/quality/skills/hygiene/references/ui-matrix.md`](../docs/agents/packages/quality/skills/hygiene/references/ui-matrix.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/quality/skills/package-update/SKILL.md`](../docs/agents/packages/quality/skills/package-update/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/quality/skills/quality/SKILL.md`](../docs/agents/packages/quality/skills/quality/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/quality/skills/repo-file-audit/SKILL.md`](../docs/agents/packages/quality/skills/repo-file-audit/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/quality/skills/standards/SKILL.md`](../docs/agents/packages/quality/skills/standards/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/quality/skills/standards/references/workflow-efficiency.md`](../docs/agents/packages/quality/skills/standards/references/workflow-efficiency.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/reporting/skills/review/daily/SKILL.md`](../docs/agents/packages/reporting/skills/review/daily/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/reporting/skills/review/standup/SKILL.md`](../docs/agents/packages/reporting/skills/review/standup/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/reporting/skills/review/weekly/SKILL.md`](../docs/agents/packages/reporting/skills/review/weekly/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/reporting/skills/test/SKILL.md`](../docs/agents/packages/reporting/skills/test/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/reporting/skills/test/cloud/SKILL.md`](../docs/agents/packages/reporting/skills/test/cloud/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/reporting/skills/test/fixing/SKILL.md`](../docs/agents/packages/reporting/skills/test/fixing/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/reporting/skills/test/fixing/references/cloud-workflow.md`](../docs/agents/packages/reporting/skills/test/fixing/references/cloud-workflow.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/reporting/skills/test/ordering/SKILL.md`](../docs/agents/packages/reporting/skills/test/ordering/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/reporting/skills/test/references/test-structure-and-responsive-evidence.md`](../docs/agents/packages/reporting/skills/test/references/test-structure-and-responsive-evidence.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/reporting/skills/test/represent/SKILL.md`](../docs/agents/packages/reporting/skills/test/represent/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/packages/reporting/skills/test/writing/SKILL.md`](../docs/agents/packages/reporting/skills/test/writing/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/skills/README.md`](../docs/agents/skills/README.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/skills/agents/SKILL.md`](../docs/agents/skills/agents/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/skills/documenting/align/SKILL.md`](../docs/agents/skills/documenting/align/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/skills/documenting/author/journal.md`](../docs/agents/skills/documenting/author/journal.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/skills/documenting/gem/SKILL.md`](../docs/agents/skills/documenting/gem/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/skills/documenting/gem/content/SKILL.md`](../docs/agents/skills/documenting/gem/content/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/skills/documenting/gem/metadata/SKILL.md`](../docs/agents/skills/documenting/gem/metadata/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/skills/documenting/gem/references/provider-modes.md`](../docs/agents/skills/documenting/gem/references/provider-modes.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/skills/documenting/gem/snapshots/README.md`](../docs/agents/skills/documenting/gem/snapshots/README.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/skills/documenting/gem/snapshots/b2b810394d61/instructions.md`](../docs/agents/skills/documenting/gem/snapshots/b2b810394d61/instructions.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/agents/skills/generation/authoring/SKILL.md`](../docs/agents/skills/generation/authoring/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/contributing/0-workspace/getting-started.mdx`](../docs/contributing/0-workspace/getting-started.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/contributing/1-quality/change-validation.mdx`](../docs/contributing/1-quality/change-validation.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/contributing/2-authoring/authoring.mdx`](../docs/contributing/2-authoring/authoring.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/contributing/3-releases/package-release.mdx`](../docs/contributing/3-releases/package-release.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/error-boundaries/0-concepts/boundary-model.mdx`](../docs/error-boundaries/0-concepts/boundary-model.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/error-boundaries/1-react/error-reporting.mdx`](../docs/error-boundaries/1-react/error-reporting.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/error-boundaries/1-react/react-boundaries.mdx`](../docs/error-boundaries/1-react/react-boundaries.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/error-boundaries/2-frameworks/hydration.mdx`](../docs/error-boundaries/2-frameworks/hydration.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/error-boundaries/2-frameworks/route-errors.mdx`](../docs/error-boundaries/2-frameworks/route-errors.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/error-boundaries/3-analytics/production-telemetry.mdx`](../docs/error-boundaries/3-analytics/production-telemetry.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/error-boundaries/3-analytics/sanity-error-analysis.mdx`](../docs/error-boundaries/3-analytics/sanity-error-analysis.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/error-boundaries/4-packages/package-api.mdx`](../docs/error-boundaries/4-packages/package-api.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/quality/0-getting-started/overview.mdx`](../docs/quality/0-getting-started/overview.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/quality/0-getting-started/setup.mdx`](../docs/quality/0-getting-started/setup.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/quality/1-packages/documentation.mdx`](../docs/quality/1-packages/documentation.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/quality/1-packages/formatting.mdx`](../docs/quality/1-packages/formatting.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/quality/1-packages/imports.mdx`](../docs/quality/1-packages/imports.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/quality/1-packages/language-checks.mdx`](../docs/quality/1-packages/language-checks.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/quality/1-packages/naming.mdx`](../docs/quality/1-packages/naming.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/quality/1-packages/package-map.mdx`](../docs/quality/1-packages/package-map.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/quality/1-packages/patterns.mdx`](../docs/quality/1-packages/patterns.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/quality/1-packages/quality-core.mdx`](../docs/quality/1-packages/quality-core.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/quality/1-packages/quality-reports.mdx`](../docs/quality/1-packages/quality-reports.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/quality/1-packages/quality.mdx`](../docs/quality/1-packages/quality.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/quality/1-packages/refactoring.mdx`](../docs/quality/1-packages/refactoring.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/quality/1-packages/security.mdx`](../docs/quality/1-packages/security.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/quality/1-packages/ui-quality.mdx`](../docs/quality/1-packages/ui-quality.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/quality/2-configuration/quality-json.mdx`](../docs/quality/2-configuration/quality-json.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/quality/3-checks/check-reference.mdx`](../docs/quality/3-checks/check-reference.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/quality/3-checks/refactoring-checks.mdx`](../docs/quality/3-checks/refactoring-checks.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/quality/3-checks/repository-patterns.mdx`](../docs/quality/3-checks/repository-patterns.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/quality/3-checks/source-checks.mdx`](../docs/quality/3-checks/source-checks.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/quality/3-checks/tooling-checks.mdx`](../docs/quality/3-checks/tooling-checks.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/quality/4-workflows/cli-and-ci.mdx`](../docs/quality/4-workflows/cli-and-ci.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/quality/5-operations/npm-publishing.mdx`](../docs/quality/5-operations/npm-publishing.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/quality/5-operations/troubleshooting.mdx`](../docs/quality/5-operations/troubleshooting.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/reporting/0-getting-started/overview.mdx`](../docs/reporting/0-getting-started/overview.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/reporting/1-packages/standards-reporting.mdx`](../docs/reporting/1-packages/standards-reporting.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/reporting/2-playwright/playwright-evidence.mdx`](../docs/reporting/2-playwright/playwright-evidence.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/reporting/3-load-testing/load-testing.mdx`](../docs/reporting/3-load-testing/load-testing.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/reporting/4-artifacts/artifacts.mdx`](../docs/reporting/4-artifacts/artifacts.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/testing/0-getting-started/test-plan.mdx`](../docs/testing/0-getting-started/test-plan.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/testing/1-ci/ci-integration.mdx`](../docs/testing/1-ci/ci-integration.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`docs/testing/2-coverage/browser-evidence.mdx`](../docs/testing/2-coverage/browser-evidence.mdx): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`packages/braces/FORK.md`](../packages/braces/FORK.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`packages/braces/README.md`](../packages/braces/README.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`packages/documentation/CHANGELOG.md`](../packages/documentation/CHANGELOG.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`packages/documentation/README.md`](../packages/documentation/README.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`packages/error-boundaries/README.md`](../packages/error-boundaries/README.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`packages/formatting/CHANGELOG.md`](../packages/formatting/CHANGELOG.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`packages/formatting/README.md`](../packages/formatting/README.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`packages/imports/CHANGELOG.md`](../packages/imports/CHANGELOG.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`packages/imports/README.md`](../packages/imports/README.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`packages/language-checks/CHANGELOG.md`](../packages/language-checks/CHANGELOG.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`packages/language-checks/README.md`](../packages/language-checks/README.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`packages/naming/CHANGELOG.md`](../packages/naming/CHANGELOG.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`packages/naming/README.md`](../packages/naming/README.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`packages/patterns/CHANGELOG.md`](../packages/patterns/CHANGELOG.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`packages/patterns/README.md`](../packages/patterns/README.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`packages/quality-core/CHANGELOG.md`](../packages/quality-core/CHANGELOG.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`packages/quality-core/README.md`](../packages/quality-core/README.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`packages/quality-reports/CHANGELOG.md`](../packages/quality-reports/CHANGELOG.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`packages/quality-reports/README.md`](../packages/quality-reports/README.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`packages/quality/.agents/skills/quality/SKILL.md`](../packages/quality/.agents/skills/quality/SKILL.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`packages/quality/.changeset/c-documentation-coverage.md`](../packages/quality/.changeset/c-documentation-coverage.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`packages/quality/CHANGELOG.md`](../packages/quality/CHANGELOG.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`packages/quality/README.md`](../packages/quality/README.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`packages/quality/tests/README.md`](../packages/quality/tests/README.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`packages/refactoring/CHANGELOG.md`](../packages/refactoring/CHANGELOG.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`packages/refactoring/README.md`](../packages/refactoring/README.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`packages/reporting/CHANGELOG.md`](../packages/reporting/CHANGELOG.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`packages/reporting/README.md`](../packages/reporting/README.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`packages/security/CHANGELOG.md`](../packages/security/CHANGELOG.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`packages/security/README.md`](../packages/security/README.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`packages/testing/README.md`](../packages/testing/README.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`packages/ui-quality/CHANGELOG.md`](../packages/ui-quality/CHANGELOG.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.
- [ ] [`packages/ui-quality/README.md`](../packages/ui-quality/README.md): Render, check links and examples, then review each factual claim and instruction against the current implementation.

## Configuration and other owned files

- [ ] `.changeset/config.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `.github/dependabot.yml`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `.github/workflows/portfolio-release.yml`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `.github/workflows/publish-packages.yml`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `.github/workflows/quality.yml`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `.github/workflows/release.yml`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `.gitignore`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `LICENSE`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `apps/hygiene/config/tsconfig.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `apps/hygiene/netlify.toml`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `apps/hygiene/package.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `apps/hygiene/public/_redirects`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `apps/hygiene/src/styles/global.css`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `config/.env.example`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `config/.prettierrc.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `config/husky/pre-commit`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `config/knip.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `config/netlify.toml`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `config/package.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `config/patches/@terra-symposium__docs@0.4.3.patch`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `config/pnpm-lock.yaml`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `config/pyproject.toml`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `config/quality.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `config/terra-tests.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `config/tsconfig.base.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `docs/agents/packages/quality/skills/git/branches/jules/agents/openai.yaml`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `docs/agents/packages/quality/skills/git/branches/prune-device/agents/openai.yaml`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `docs/agents/packages/quality/skills/git/branches/review/agents/openai.yaml`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `docs/agents/packages/quality/skills/git/deploy/agents/openai.yaml`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `docs/agents/packages/quality/skills/git/issues/audit/agents/openai.yaml`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `docs/agents/packages/quality/skills/git/issues/complete/agents/openai.yaml`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `docs/agents/packages/quality/skills/git/packages/agents/openai.yaml`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `docs/agents/packages/quality/skills/hygiene/agents/openai.yaml`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `docs/agents/packages/quality/skills/hygiene/initialisation/agents/openai.yaml`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `docs/agents/packages/quality/skills/package-update/agents/openai.yaml`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `docs/agents/packages/quality/skills/quality/agents/openai.yaml`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `docs/agents/packages/quality/skills/standards/agents/openai.yaml`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `docs/agents/packages/reporting/skills/review/daily/agents/openai.yaml`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `docs/agents/packages/reporting/skills/review/standup/agents/openai.yaml`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `docs/agents/packages/reporting/skills/review/weekly/agents/openai.yaml`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `docs/agents/packages/reporting/skills/review/weekly/examples/weekly-review-2026-08-24.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `docs/agents/packages/reporting/skills/test/agents/openai.yaml`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `docs/agents/packages/reporting/skills/test/cloud/agents/openai.yaml`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `docs/agents/skills/agents/agents/openai.yaml`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `docs/agents/skills/documenting/gem/agents/openai.yaml`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `docs/agents/skills/documenting/gem/snapshots/b2b810394d61/knowledge/manifest.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `docs/agents/skills/documenting/gem/snapshots/b2b810394d61/metadata.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `docs/error-boundaries/assets/sanity-error-analysis.png`: render or load this asset and inspect the visual or byte-level result.
- [ ] `docs/error-boundaries/assets/website-error-analysis-flow.svg`: render or load this asset and inspect the visual or byte-level result.
- [ ] `docs/src/generated/skills.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `package.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/braces/LICENSE`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/braces/package.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/documentation/config/tsconfig.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/documentation/package.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/error-boundaries/config/tsconfig.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/error-boundaries/package.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/formatting/config/tsconfig.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/formatting/package.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/imports/config/tsconfig.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/imports/package.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/language-checks/config/tsconfig.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/language-checks/package.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/naming/config/tsconfig.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/naming/package.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/patterns/config/tsconfig.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/patterns/package.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/quality-core/config/tsconfig.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/quality-core/package.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/quality-reports/config/tsconfig.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/quality-reports/package.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/quality/.agents/skills/quality/agents/openai.yaml`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/quality/config/tsconfig.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/quality/package.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/quality/quality-configs/checkstyle.xml`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/quality/quality-configs/pmd-rules.xml`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/quality/quality.schema.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/refactoring/config/tsconfig.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/refactoring/package.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/reporting/config/tsconfig.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/reporting/package.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/security/config/tsconfig.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/security/package.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/testing/action.yml`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/testing/package.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/ui-quality/config/tsconfig.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `packages/ui-quality/package.json`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `patches/@terra-symposium__docs@0.4.3.patch`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `pnpm-workspace.yaml`: validate syntax or schema, exercise its owning tool, and check references to this file.
- [ ] `uv.lock`: validate syntax or schema, exercise its owning tool, and check references to this file.

Inventory: 2605 function-like declarations, 148 documents, 90 other owned files, and 181 executable source files.
