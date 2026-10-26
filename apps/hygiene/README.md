# Standards repository hygiene

Separate Astro/React dashboard for admins of repositories that install the Terra Hygiene GitHub App. The site stores normalized test, quality, and commit counts in Neon. It discards uploaded report contents after parsing and never stores source files or build logs.

## Provision

1. Connect a dedicated Neon database to this Netlify site or set `DATABASE_URL`. The app also reads `NETLIFY_DATABASE_URL` from Netlify's Neon integration. The build applies the idempotent SQL migrations before compiling.
2. Create a GitHub App with callback URL `https://<site>/api/callback`, webhook URL `https://<site>/api/webhook`, and read-only repository permissions. Subscribe to Installation and Installation repositories events. Enable user authorization and set the webhook secret.
3. Create a Netlify site for this repository with the repository root as its base directory and `apps/hygiene` as its package directory. Set the variables in the repository-root `.env.example` for the production Functions context.
4. Install the GitHub App on selected repositories. Signed-in users see a repository only when GitHub confirms their current admin permission.

## Collect reports

The connected repository workflow generates JUnit XML and a Terra Quality JSON report when GitHub Actions starts. Pull request runs are excluded. If Actions are unavailable, use the local importer below; it runs the same test and quality commands on a clean snapshot of a tracked branch and saves normalized counts to Neon. Local runs are marked as **Local analysis** in the dashboard, so they are distinguishable from GitHub Actions data.

The `main` and `development` branches are tracked by default. Full history can be imported locally at any time, and reports can be refreshed by rerunning the local importer. No scheduled function, Netlify deployment, or GitHub Actions usage is needed for local imports.

The consumer workflow invokes `@terra-symposium/standards-quality` for the versioned `terra-quality.json` and local Git history report. The history command supports explicit branch and base values:

```sh
pnpm exec terra-quality history --branch main --report-json terra-history.json
pnpm exec terra-quality history --branch main --base-sha <previous-head> --report-json terra-history.json
```

Reports use schema version 1. The history report includes commit author dates, source and test line additions/deletions, and source-line totals using the dashboard exclusions. The test rate excludes skipped cases. The quality rate uses enabled checks with no findings. The 0–100 score equally weights those component rates and stays unavailable when either report is missing.

## Authorization and storage

The dashboard checks the signed-in GitHub user's current admin permission for every repository query. Report tokens are stored as hashes, scoped to one repository, and compared in constant time. Sessions are opaque tokens stored by hash; GitHub OAuth tokens are encrypted at rest. Report payloads are validated before normalized values are persisted.

## Local development

Use the Netlify CLI's local emulator to run the dashboard and its Functions together. In this linked project the CLI can load database and GitHub credentials from the production environment; no deployment is needed. Override `APP_ORIGIN` to `http://127.0.0.1:8888`, and add `http://127.0.0.1/api/callback` as an additional callback URL in the GitHub App settings. Loopback HTTP cookies are allowed only for `127.0.0.1`; hosted origins continue to require secure cookies. If you run without the linked site's environment, copy the repository-root `.env.example` to `apps/hygiene/.env` and fill in those values locally.

Run database migrations once with `pnpm --filter @terra-symposium/hygiene-dashboard db:migrate`. The migration runner reads `process.env` and does not load `.env` files, so expose one of its supported database URL variables in your shell before running it; Netlify Dev loading `apps/hygiene/.env` does not apply to this command. Then from `apps/hygiene` start the local server with `APP_ORIGIN=http://127.0.0.1:8888 pnpm exec netlify dev --context production --command 'pnpm exec astro dev --host 127.0.0.1 --port 4321' --functions netlify/functions --port 8888 --target-port 4321`. Netlify Dev proxies the Astro dev server and exposes the Functions at the same `/api/*` paths used by the hosted app. Open `http://127.0.0.1:8888`. This does not deploy the site.

To populate local commit history without deploying, import a full local checkout for each tracked branch:

```sh
pnpm --filter @terra-symposium/hygiene-dashboard history:import -- --repository Terra-Symposium/terra-symposium-website --checkout /path/to/terra-symposium-website --branch main
pnpm --filter @terra-symposium/hygiene-dashboard history:import -- --repository Terra-Symposium/terra-symposium-website --checkout /path/to/terra-symposium-website --branch development
```

The history importer loads local `.env.local`, validates that the checkout's GitHub remote matches the repository, and writes normalized commit counts directly to Neon. It prefers `origin/<branch>` when that remote-tracking ref exists, so run `git fetch origin` first to include the latest GitHub history.

For the Terra Symposium website, import test and quality metrics from a clean checkout with:

```sh
pnpm --filter @terra-symposium/hygiene-dashboard reports:import -- --repository Terra-Symposium/terra-symposium-website --checkout /path/to/terra-symposium-website --branch development
```

Use `--branch main` for the main branch. The importer runs the repository's JUnit suite and `@terra-symposium/standards-quality@0.5.0`, then discards the raw files. Its current test command is specific to the Terra Symposium website; another repository needs its JUnit test command configured before local test metrics can be imported. If a branch has no `quality.json`, the importer uses `origin/development:quality.json` and records that policy branch beside the local report.

For UI-only work, `pnpm --filter @terra-symposium/hygiene-dashboard dev` starts Astro without Netlify Functions. Run `pnpm --filter @terra-symposium/hygiene-dashboard test` for parser, authorization, score, and report policy tests.
