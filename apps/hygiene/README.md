# Terra Shared repository hygiene

Separate Astro/React dashboard for admins of repositories that install the Terra Hygiene GitHub App. The site stores normalized test, quality, and commit counts in Neon. It discards uploaded report contents after parsing and never stores source files or build logs.

## Provision

1. Connect a dedicated Neon database to this Netlify site or set `DATABASE_URL`. The app also reads `NETLIFY_DATABASE_URL` from Netlify's Neon integration. The build applies the idempotent SQL migrations before compiling.
2. Create a GitHub App with callback URL `https://<site>/api/callback`, webhook URL `https://<site>/api/webhook`, and read-only repository permissions. Subscribe to Installation and Installation repositories events. Enable user authorization and set the webhook secret.
3. Create a Netlify site for this repository with the repository root as its base directory and `apps/hygiene` as its package directory. Set the variables in `.env.example` for the production Functions context.
4. Install the GitHub App on selected repositories. Signed-in users see a repository only when GitHub confirms their current admin permission.

## Collect reports without GitHub Actions

Collection runs in the connected repository's Netlify build plugin. It uses ordinary branch builds for push deltas and one weekly Netlify Scheduled Function to trigger full-history reconciliation builds. There is no GitHub Actions run or frequent polling. The local plugin runs at the end of the deploy even when the build failed, excludes pull request deploys, runs the selected JUnit test command and Terra Quality report, and reads commit history from Netlify's local Git checkout.

To connect another repository, install the GitHub App on it, then open **Netlify setup** in its dashboard card. Copy `plugins/netlify-plugin-terra-hygiene` and `netlify/functions/hygiene-reconcile.mjs` from the Terra Symposium website repository into the consumer repository and add the local plugin entry to its root `netlify.toml`. Issue a report token and store it as `TERRA_HYGIENE_REPORT_TOKEN` in the Build environment. Enable branch deploys and trigger an initial build for every tracked branch. Then create a Netlify Build Hook for each branch and set `TERRA_HYGIENE_WEEKLY_BUILD_HOOKS` to their JSON array in the Functions environment. The dashboard shows the token once; issuing a replacement rotates it. Set `TERRA_HYGIENE_URL` to this dashboard URL if using a non-production dashboard.

Enable Netlify branch deploys for each tracked branch. `main` and `development` are tracked by default. The first build on a branch sends a full snapshot. Later builds send commits after the last imported head. A weekly scheduled function runs Mondays at 03:00 UTC and triggers each configured branch Build Hook; the resulting builds send a full snapshot to reconcile force-pushes and missed reports. Pull request deploys are ignored.

The plugin invokes `@terra-symposium/quality` for the versioned `terra-quality.json` and local Git history report. Publish the package version declared by the plugin before enabling collection on a consumer repository. The history command supports explicit branch and base values:

```sh
pnpm exec terra-quality history --branch main --report-json terra-history.json
pnpm exec terra-quality history --branch main --base-sha <previous-head> --report-json terra-history.json
```

Reports use schema version 1. The history report includes commit author dates, source and test line additions/deletions, and source-line totals using the dashboard exclusions. The test rate excludes skipped cases. The quality rate uses enabled checks with no findings. The 0–100 score equally weights those component rates and stays unavailable when either report is missing.

## Authorization and storage

The dashboard checks the signed-in GitHub user's current admin permission for every repository query. Netlify build tokens are stored as hashes, scoped to one repository, and compared in constant time. Sessions are opaque tokens stored by hash; GitHub OAuth tokens are encrypted at rest. Report payloads are validated before normalized values are persisted.

## Local development

Use the Netlify CLI's local emulator to run the dashboard and its Functions together. In this linked project the CLI can load database and GitHub credentials from the production environment; no deployment is needed. Override `APP_ORIGIN` to `http://127.0.0.1:8888`, and add `http://127.0.0.1/api/callback` as an additional callback URL in the GitHub App settings. Loopback HTTP cookies are allowed only for `127.0.0.1`; hosted origins continue to require secure cookies. If you run without the linked site's environment, copy `.env.example` to `.env` and fill in those values locally.

Run database migrations once with `pnpm --filter @terra-symposium/hygiene-dashboard db:migrate`, then from `apps/hygiene` start the local server with `APP_ORIGIN=http://127.0.0.1:8888 pnpm exec netlify dev --context production --command 'pnpm exec astro dev --host 127.0.0.1 --port 4321' --functions netlify/functions --port 8888 --target-port 4321`. Netlify Dev proxies the Astro dev server and exposes the Functions at the same `/api/*` paths used by the hosted app. Open `http://127.0.0.1:8888`. This does not deploy the site.

For UI-only work, `pnpm --filter @terra-symposium/hygiene-dashboard dev` starts Astro without Netlify Functions. Run `pnpm --filter @terra-symposium/hygiene-dashboard test` for parser, authorization, score, and report policy tests.
