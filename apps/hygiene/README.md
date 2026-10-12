# Terra Shared repository hygiene

Separate Astro/React site for administrators of repositories that install the Terra Hygiene GitHub App. The site stores normalized test, quality, and commit counts in a dedicated Neon database. It does not retain artifact contents, source files, or logs.

## Provision

1. Connect a dedicated Neon database to this Netlify site or set its connection string as `DATABASE_URL`. The app also reads `NETLIFY_DATABASE_URL` from Netlify's Neon integration. The Netlify build runs the idempotent schema migration before compiling; for a local migration, run `pnpm --filter @terra-symposium/hygiene-dashboard db:migrate` with either variable in the environment.
2. Create a GitHub App with a callback URL of `https://<site>/api/callback`, webhook URL `https://<site>/api/webhook`, and **read-only** repository permissions for Metadata, Actions, and Contents. Subscribe to Installation, Installation repositories, and Workflow run events. Enable user authorization and generate a private key and client secret.
3. Create a separate Netlify site from this repository with the repository root as its base directory and `apps/hygiene` as its package directory. Its build command, publish directory, and functions directory are in `netlify.toml`. Set every variable in `.env.example` for the production context. `GITHUB_APP_PRIVATE_KEY` accepts a PEM value or `base64:<base64-encoded PEM>` for multiline secrets. If the plan supports environment scopes, make credentials available to Functions. `INTERNAL_JOB_SECRET` should be a unique random value.
4. Install the GitHub App on selected repositories. Only their GitHub administrators will see them after sign-in.

## Data flow

The webhook records installations and queues completed workflow runs for ingestion. GitHub Actions uploads JUnit XML, a versioned Terra Quality JSON report, and a versioned local Git history report in the `terra-hygiene` artifact. Reports are read from the artifact ZIP in memory; only normalized test, quality, and per-commit counts are stored. Upload and report generation run after test failures. Pull request runs are ignored.

The consumer workflow generates push deltas from a full Git checkout, runs a weekly full snapshot for `main` and `development`, and accepts `workflow_dispatch` for initial imports and additional branches. GitHub only exposes scheduled and manual workflow runs when the file is on the repository's default branch. For Terra's development-first flow, promote the reviewed workflow from `development` to `main` before using those runs. Add an extra branch in the dashboard, then run the **Type Check** workflow for that branch to import its full history. Later pushes on tracked branches upload deltas. Snapshots replace prior rows for that branch, so weekly reconciliation also corrects force-pushes and earlier report gaps. The report counts tracked source and test files with the dashboard's generated, vendor, build, dependency, documentation, and configuration exclusions. The collector discards downloaded reports after ingestion.

The CLI requires `@terra-symposium/quality` with the history report command:

```sh
pnpm exec terra-quality history --report-json terra-history.json
```

Set `GITHUB_REPOSITORY` and `GITHUB_REF_NAME` when running outside GitHub Actions. Push event metadata selects delta mode only when the event's `before` commit is an ancestor of the checked-out head; other runs produce a full snapshot.

Branches default to `main` and `development`; an administrator can add another branch in the dashboard.

The API checks the signed-in GitHub user's current `admin` permission through their GitHub App user token for each repository query. GitHub requires a user token for this permission endpoint. Sessions are opaque tokens stored by hash; GitHub tokens are encrypted at rest and refreshed when needed. The browser never receives an App token or database credential.

## Local development

Run `pnpm --filter @terra-symposium/hygiene-dashboard dev` for the static UI. To exercise Functions locally, use `netlify dev` with the example environment values filled in. Run `pnpm --filter @terra-symposium/hygiene-dashboard test` for parser and policy tests.
