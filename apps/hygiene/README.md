# Hygiene

Hygiene helps maintainers review test and Quality reports in one dashboard.

## Get started

Use the Netlify CLI to run the dashboard and Functions together. Connect a dedicated Neon database and configure the GitHub App and server variables before opening the local site. See [operations](OPERATIONS.md) for callback URLs, permissions, and the local emulator setup.

## Usage

The dashboard tracks `main` and `development` by default. GitHub Actions reports are distinct from **Local analysis** imported from a checkout. The score combines test and Quality rates only when both reports exist; unavailable data stays unavailable.

For a local checkout, the importers are `history:import` and `reports:import`. The [operations guide](OPERATIONS.md) gives copyable commands and describes branch and remote checks.

## Configuration

Keep database, GitHub App, OAuth, webhook, and report credentials in the linked environment or a local ignored `.env` file. The [environment example](../../config/.env.example) lists required variables. Repository queries recheck the user's current GitHub admin permission; stored report and session tokens are hashed.

## Validation

| Command                | Checks                        |
| ---------------------- | ----------------------------- |
| `pnpm run quality:all` | Full configured Quality scope |
| `pnpm run test`        | Unit or project tests         |
| `pnpm run build`       | Build output                  |

Quality can apply safe fixes; review the diff before committing. No separate browser or Playwright test command is defined here.

Run the dashboard test and build scripts from this package or via the workspace filter.

## Contributing

The UI-only `dev` script starts Astro without Netlify Functions. Use the local emulator to check OAuth, report ingestion, and API routes. See [operations](OPERATIONS.md) for deployment and imports.

Open changes through the repository pull-request workflow; see the [root README](../../README.md).
