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

## Registry operations

- Use `https://registry.npmjs.org/` explicitly when checking or publishing Terra packages.
- Before publishing, verify the package name, version, packed file list, and target registry. Never overwrite a published version; increment the package version when a release is needed.
- Keep credentials out of command arguments and output. Do not run commands that reveal npm auth configuration or token values.
- If a credential is missing or invalid after the one sign-in flow, configure the persistent read/write token once. Do not substitute repeated one-off approvals or ask the user to paste a secret into chat.
