# Standards Hygiene App

Netlify dashboard for browsing repository hygiene reports and test or quality metrics imported from local checkouts. It uses GitHub OAuth, Netlify Functions, and Neon; it is separate from the root Standards documentation site.

## Getting started

### Commands

From `standards/main/`, run `pnpm install`, then `pnpm --dir apps/hygiene dev` to preview the Astro frontend. The package's `dev` script does not start Netlify Functions; OAuth, report ingestion, and database views require the configured Netlify app. Run `pnpm --dir apps/hygiene test` and `pnpm --dir apps/hygiene build` for local checks.

## Security and Limitations

GitHub OAuth, webhook verification, encrypted sessions, and report data require server-side configuration. Store values in Netlify; never expose them in browser code or commit them.

| Variable | Purpose |
| --- | --- |
| `APP_ORIGIN` | Canonical app origin used to validate requests and cookies. |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth app credentials. |
| `GITHUB_WEBHOOK_SECRET` | Validates incoming GitHub webhook signatures. |
| `SESSION_SECRET` | Encrypts session data; must be at least 32 characters. |
| `DATABASE_URL` or `NETLIFY_DATABASE_URL` | Connects the server to Neon. |
| `DATABASE_URL_UNPOOLED` or `NETLIFY_DATABASE_URL_UNPOOLED` | Optional migration connection. |

## Structure

`src/` contains dashboard pages and reports; `netlify/functions/` implements OAuth, webhooks, and report APIs. `migrations/` defines Neon tables; `test/` covers server behavior.

## References

See the [app scripts](package.json), [Netlify functions](netlify/functions/), [database migrations](migrations/), and [tests](test/).

## Contributing

Keep the migration and server code in sync when schemas change. Add or update a focused test in [test/](test/) for each changed function behavior.

## Credits and license

The app has no local license file, and the Standards root has no license; ask maintainers before reuse.
