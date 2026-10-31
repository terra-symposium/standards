---
name: environment-hardening
description: Audit repo builds, Netlify deployment health, and GitHub security findings, then remediate actionable warnings and verify the result.
---

# Environment Hardening

Use for end-to-end build, deployment, and GitHub security health reviews. Read-only inspection is the default; deployment, dependency updates, and vulnerability dismissals require authorization.

## Baseline

1. Read repository guidance, manifests, package scripts, deployment config, and CI workflows.
2. Record branch, status, runtime/package-manager versions, remotes, workspaces, and deployment targets. Preserve unrelated work.
3. Check dependencies using the frozen-lockfile procedure. Do not create developer `.env` files.
4. Run defined setup/security checks before remediation. Distinguish pre-existing failures from regressions.

## Verify builds and deployment

- Build every deployable workspace with the same scripts/configuration used by CI or Netlify. Capture exit status and warnings.
- Run required type generation or schema validation. Do not weaken checks or replace them with stubs.
- Authenticate to Netlify and confirm site identity before reading deploy state. Inspect the matching branch/commit, build command, versions, context, output, warnings, and runtime errors.
- A local green build is not remote deployment evidence. Do not copy Netlify secrets locally; use public config, mocks, or approved remote endpoints.
- If a failure is pre-application, repair install/config/toolchain first. If it reaches app build, reproduce the same workspace and command before editing code.

## Review GitHub findings

1. Confirm `gh auth status` and repository identity without exposing tokens. Retrieve Dependabot, code-scanning, secret-scanning, and workflow findings only with suitable access.
2. For each, record rule/package, severity, dependency path, vulnerable range, fixed version, repo impact, and smallest safe fix.
3. Distinguish production dependencies from development and transitive dependencies; avoid blanket upgrades.
4. For exposed secrets, revoke or rotate through the owning provider first, then remove exposure and verify the replacement path. Never repeat the value.
5. Trace code-scanning data flow and add a regression check when practical. Document evidence for accepted false positives; do not suppress findings merely for a green run.

## Repair and close

For each actionable issue, identify its owner, make the smallest complete fix, run the narrowest proof, then rerun the affected workspace or provider check. Inspect lockfile/package changes and avoid unrelated refactors or dependency churn. Record external blockers and required sign-in.

Do not end an authorized remediation after producing a diagnosis or findings list. Apply safe fixes in the owning worktree, rerun the same checks, and iterate until they pass with no actionable findings. If credentials, permissions, upstream patches, or a live provider prevent completion, report that precise blocker and leave the remediation explicitly incomplete.

Report build, setup, quality, type/schema, security, and deployment evidence as applicable, plus unresolved gaps. Do not call the environment deployment-ready while required evidence is missing.
