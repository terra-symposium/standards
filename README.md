# Terra Shared

Shared foundations for Terra Symposium repositories.

## Packages

- `@terra-symposium/quality` — configurable AST checks, naming rules, maintenance orchestration, and repository quality CLI.
- `@terra-symposium/error-boundaries` — framework-neutral React error-boundary lifecycle and adapters.

Both packages are published publicly to the npm registry. Consumers can install them without a registry token; publishing from CI uses the repository `NPM_TOKEN` secret.

Repository-specific paths, framework entrypoints, visual fallback components, security manifests, and deployment checks stay in the consuming repository.

## Development

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

Releases use Changesets. Add a changeset for package API changes, then let the release workflow version and publish the affected packages.
