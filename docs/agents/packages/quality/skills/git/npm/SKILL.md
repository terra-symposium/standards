---
name: npm
description: Handle npm package reads, installs, publishing, and access with one persistent read/write credential instead of repeated per-operation sign-in prompts.
---

# npm access and publishing

Use this skill for npm registry authentication, package installs, package access, and publishing.

## Authentication

1. Check the active identity once with `npm whoami --registry=https://registry.npmjs.org/`. Never print or request a token value.
2. Inspect existing npm token metadata before creating or replacing any token. Check only token name, expiry, 2FA bypass, package/scope permissions, and revocation status; never display the `token` or `key` fields from `npm token list --json`.
3. The current shared publishing credential is named **Publish**. It was created **2026-10-22 09:57:24 UTC** and expires **2027-01-20 09:57:24 UTC**. Its metadata has `bypass_2fa: true`, package write permission, and `@terra-symposium` organization write permission. Reuse this credential while it remains valid; check its metadata again after expiry or if a publishing operation says authentication is invalid. Do not create a replacement based only on an `EOTP` response.
4. If `npm whoami` reports that the session is signed out, complete one `npm login --auth-type=web --registry=https://registry.npmjs.org` flow, then check `npm whoami` again.
5. Reuse the established npm read/write token for registry operations. Do not ask the user to authorize each install, publish, or other individual operation when that credential already works.
6. If signed in but the established credential lacks write access, configure one persistent granular access token in the npm account with read and write access to the required Terra packages. Store it in the user's normal credential store or user-level npm configuration; never put it in a repository, task prompt, terminal transcript, or generated artifact.
7. A 2FA bypass is selected when a granular token is created; it cannot be added to an existing token. npm currently requires granular tokens to be created on the website, and account-token creation requires an interactive 2FA challenge. If a replacement is genuinely needed, complete that challenge once, select bypass and the required package write access, save the new credential locally, and reuse it for subsequent publishing. Do not trigger a fresh browser or security-key challenge for each package operation.
8. `npm whoami` confirms the account identity, not package write permissions. Check the package's actual access or use the intended operation's normal response to distinguish missing package rights from an expired login. Do not create duplicate tokens when the established token works.

## Publish verification

- A publish can still return `EOTP` while the **Publish** token reports `bypass_2fa: true`. For this account, that response opens npm's browser WebAuth/security-key flow; complete the challenge rather than minting another token.
- For non-interactive npm CLI operations, capture the structured `npm publish --json` error fields `error.authUrl` and `error.doneUrl` internally. Do not print, log, or commit these URLs: the auth URL contains a short-lived challenge ID. Human-readable non-TTY output and npm debug logs may replace it with `***`, which leads to npm's “Route not found” page if opened literally.
- Open `error.authUrl` in the browser the user requested and hand off any passkey/security-key step. After approval, the `doneUrl` returns a short-lived publishing code; keep it in memory and pass it to the single publish retry through `npm_config_otp`, never as a logged argument or saved credential.
- npm may offer “Do not challenge npm publish/trust operations from this IP for the next 5 minutes.” This reduces publish prompts temporarily. Ask for action-time confirmation before selecting it; do not infer permission from approval of a token's separate 2FA-bypass setting.

## GitHub Actions trusted publishing

Prefer one trusted publisher for a package when releases run from one repository. A trusted publisher is scoped to a package, GitHub repository, and workflow file; it is not an organization-wide credential that can publish every package. Reuse the existing publisher for its configured workflow instead of creating another publisher or token for each release.

For a GitHub Actions publisher, verify all of the following against the package and workflow before troubleshooting:

- npm package settings name the exact GitHub owner, repository, and workflow filename (including case).
- Copy the owner and repository from GitHub's canonical repository identity (for example, `gh api repos/OWNER/REPO --jq .full_name`). GitHub URLs may display a mixed-case alias even though the canonical name is lowercase; npm compares these fields case-sensitively.
- The release job grants `id-token: write`, uses a supported Node/npm toolchain, and runs `npm publish` against `https://registry.npmjs.org/` without an npm token.
- The workflow's package name and version match the package being released, and the package is already present in the npm registry.

An OIDC token-exchange `E404` can mean npm did not find a matching trusted publisher, even if the package exists. Check the exact repository/workflow identity and npm's publisher-validation status. Do not create another publisher or add a long-lived publish token to Actions to work around an unexplained mismatch. Keep the failed run URL, package/version, publisher fields, and response summary for diagnosis; never include a challenge URL or credential.

If npm reports that the package is missing, verify the registry package metadata and initial package-claim/ownership state before treating it as a publisher configuration error. A publisher shown as pending validation is not proof that a release can exchange an OIDC token. Record the exact observed status and error, and do not describe a likely cause as confirmed until a publish succeeds.

Use the existing granular **Publish** credential as a temporary/manual fallback only when the release is authorized and the trusted publisher is demonstrably unavailable. Follow the WebAuth handoff above. After the package is published, restore releases to the trusted publisher rather than adding or retaining per-workflow secrets.

### Staged release approval

`npm stage publish` creates a release that is not yet installable. `npm stage list <package>` shows pending versions; inspect the listed stage and its contents before approving it with `npm stage approve <stage-id>`. Approval is a separate publish operation and requires the maintainer's 2FA. Do not treat a successful staging command as a completed release; verify the approved version with `npm view <package> versions --json` and on the public package page.

If `npm publish` reports `E409` because a version was previously staged, do not retry the same version or publish a different version to work around it. First find the stage in `npm stage list` and npm's Staged Packages page. If the CLI reports a staged version that neither surface displays, preserve the exact package/version, command response, and timestamp; refresh the registry and package page before retrying, since registry visibility may lag. If the mismatch persists, resolve the state with npm support. Keep consumers pinned to the last publicly available version until `npm view <package> versions --json` and the package page show the new version as published.

## Registry operations

- Use `https://registry.npmjs.org/` explicitly when checking or publishing Terra packages.
- Before publishing, verify the package name, version, packed file list, and target registry. Never overwrite a published version; increment the package version when a release is needed.
- Keep credentials out of command arguments and output. Do not run commands that reveal npm auth configuration or token values.
- If a credential is missing or invalid after the one sign-in flow, configure the persistent read/write token once. Do not substitute repeated one-off approvals or ask the user to paste a secret into chat.
