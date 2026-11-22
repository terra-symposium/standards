# Quality in Cloud

Use this skill only when the user requests Cloud execution or coordination. For the repository check and repair workflow, use the [Quality skill](../SKILL.md). Keep each Cloud task limited to one repository and preserve its current work.

Before dispatch or resume, use Codex app task controls to confirm the repository, environment, branch, and task. Fetch the connected Codex usage allowance before each Cloud run; `ordinaryUsageAllowed` permits dispatch. Record the usage API account ID for audit. Report authentication, usage, and environment access failures separately. Never simulate Cloud execution in a local checkout.

Send the worker the repository and requested branch, plus a link to the canonical Quality skill. Monitor the exact `pnpm run quality:all` result, complete log, and repair passes. Follow the user's commit and push instructions; do not infer them from this skill. Treat remaining findings as unfinished work, and report genuine environment or access blockers with their evidence.
