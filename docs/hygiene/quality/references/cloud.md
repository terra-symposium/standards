# Quality in Cloud

Use this skill only when the user requests Cloud execution or coordination. For the repository check and repair workflow, use the [Quality skill](../SKILL.md). Keep each Cloud task limited to one repository and preserve its current work.

Before dispatch or resume, use Codex app task controls to confirm the repository, environment, branch, and task. Fetch the connected Codex usage allowance before each Cloud run; `ordinaryUsageAllowed` permits dispatch. Record the usage API account ID for audit. Report authentication, usage, and environment access failures separately. Never simulate Cloud execution in a local checkout.

Match the Cloud checkout to the requested repository by its remote and contents. Send one repository and its requested branch to each worker, with a link to this canonical Quality skill. Use `gpt-6-luna` for the Cloud task. Do not put credentials in task prompts or ask a worker to change network/security settings or approve dependency build scripts.

Monitor the exact `pnpm run quality:all` result and every repair pass. Preserve the full output, command, exit code, and elapsed time. For a write-capable fixing task, follow the synchronization and fresh-worktree requirements in the [Quality skill](../SKILL.md), and compare the pre-run snapshot with the final diff. Follow the user's commit and push instructions; do not infer them from this skill. Treat remaining findings as unfinished work, and report genuine environment or access blockers with their evidence.

For multi-repository coordination, keep one result per repository and report its environment, checkout, branch/base, exact command and duration, Quality result, commit/push status, blockers, and full log. Use `PASS` only after the exact command exits zero and the remote result is verified when a push was requested.
