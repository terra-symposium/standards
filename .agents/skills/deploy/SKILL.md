---
name: deploy
description: Deploy Terra changes and verify remote behavior.
metadata:
  related-files: []
---

# Deploy

Use for Netlify deployment, runtime verification, or a decision about deployment. Deploy capacity is scarce: complete and batch the fix, spend one deployment, and prove the target commit is live.

## 1. Decide and identify the target

In the target repository, read `README.md`, `.agents/index.md` where present, and the actual deployment configs. Website keeps them in `config/netlify.toml`, `astro/netlify.toml`, and `sanity/netlify.toml`. Record branch, status, remotes, commit, and Netlify site. Inspect `git remote -v` and the live Netlify project; never infer deployment source from a remote name or a stale site ID below.

Do not deploy when local/focused proof answers a source-only request, the fix is incomplete, unrelated dirty work is mixed in, an existing public development runtime answers the question, the target is unknown, or the proposed command is `netlify deploy --prod` for a development check.

Deploy when publication is requested, remote behavior is required, or a protected function/environment/build/deployment change cannot be proved locally.

## 2. Know the release path

The organization repo is source of truth. The private `kaimacann` repo is the Netlify mirror:

```text
Terra-Symposium/terra-symposium-website
  automation/<agent>/<area>-<change> -> reviewed development -> reviewed main
                                             |
                                             v
kaimacann/terra-symposium-website
  release/<short-sha> -> PR -> main -> Netlify production
```

Both production sites use mirror `main`:

- Frontend: `https://terrasymposium.com` (`ed1e456d-9cd0-48f4-bdb1-0d145adb1750`)
- Backend: `https://admin.terrasymposium.com` (`75f6f17c-3419-4fc1-a3e4-f56fdd8aa457`)

The production sites use Netlify Git continuous deployment from the private mirror. A reviewed merge of the organization release into mirror `main` lets Netlify build and publish both sites. A push to the organization repo alone does not deploy. Do not deploy the production sites from a GitHub Actions workflow or the Netlify CLI; that would duplicate the mirror-triggered builds. Never push directly to mirror `main`, use auto/merge queue, or run routine `netlify deploy --prod`.

Use short branches: organization work `automation/<agent>/<area>-<change>`, integration `development` then `main`, mirror release `release/<short-sha>`. Mirror currently has only `main`; other refs may be organization/local refs.

Before updating the mirror, verify the reviewed release commit is on organization `main`, the worktree is clean of unintended/hook changes, and both sites still use mirror `main`. Compare the release diff against mirror `main`, then check whether pushing a release branch or opening its PR triggers preview builds. Account for those builds before spending deploy capacity. Confirm the temporary mirror branch points to the reviewed commit and the PR targets `main`.

## 3. Prepare and release

Work from a clean organization checkout. Replace `RELEASE_REF` with reviewed organization `main` or a reviewed ref already promoted there:

```sh
git fetch origin
git fetch mirror main
RELEASE_REF=origin/main
RELEASE_BRANCH="release/$(git rev-parse --short "$RELEASE_REF")"
git push mirror "$RELEASE_REF:refs/heads/$RELEASE_BRANCH"
gh pr create \
  --repo kaimacann/terra-symposium-website \
  --base main \
  --head "$RELEASE_BRANCH" \
  --title "deploy: release $(git rev-parse --short "$RELEASE_REF")" \
  --body "Manual production release from the reviewed Terra organization commit."
```

Inspect the mirror PR, then merge manually after review:

```sh
gh pr merge <MIRROR_PR_NUMBER> \
  --repo kaimacann/terra-symposium-website \
  --merge \
  --delete-branch=false
```

Never use `--auto`, `--admin`, push directly to mirror `main`, or directly deploy production. Wait for both Netlify Git builds, then remove the temporary release branch. Do not publish the private mirror or change its GitHub plan.

For a development-only request, keep the change on the organization `development` branch. First locate the actual development site and its Git branch/context in authenticated Netlify project settings; `config/netlify.toml` describes build behavior but does not identify a development site. If a development site is linked to that branch, make one reviewed change on `development` and let its Git deployment run. If a preview is the only available target, inspect whether a PR or branch push triggers a build and account for its cost before creating it. Do not use the production mirror or `--prod` for a development check. Record the target site, context, URL, and intended development commit before triggering a build; verify the Netlify record's `commit_ref` matches it before testing the URL. If no trusted development target exists, report that as a deployment blocker instead of substituting a production or arbitrary draft deployment.

### Mirror access and remote setup

Developers need explicit push collaborator access to the private mirror; org team membership does not transfer. Admins align collaborators with Terra Developers and remove access when people leave. Push access permits release branches/PRs, not direct-main releases. An administrator grants access with:

```sh
gh api -X PUT \
  repos/kaimacann/terra-symposium-website/collaborators/<github-login> \
  -f permission=push
```

Use `mirror` as the remote alias:

```sh
git remote rename netlify-source mirror  # if the old alias exists
git remote add mirror https://github.com/kaimacann/terra-symposium-website.git  # otherwise
```

## 4. Validate without leaking secrets

The Website `dev` script loads development configuration through Infisical. Check its current script and access requirements before running it:

```sh
npx --yes pnpm@10.30.3 run dev
```

Never use `netlify dev`, copied Netlify variables, `.env` files, shared DB credentials, provider tokens, or local secret files. Restart the launcher when server modules/runtime config may be stale; HMR does not prove server-runtime changes.

Use the narrowest proof in order:

1. Reproduce and trace the owner: client, Astro action, protected function, provider, or browser UI.
2. Batch changes and run focused checks. Preserve dirty files; inspect staged/committed files because quality hooks may stage maintenance output.
3. When remote behavior matters, use the exact local public-runtime path against development. For UI, verify route, interaction, visible result, and console/server errors in an authenticated browser.
4. Deploy once and repeat the same acceptance path on the intended URL.

A local pass or HTTP 200 is not deployment evidence. Use authenticated Netlify status/deploy records and match commit, branch, site, context, state, and URL. Run `npx netlify status` first. Inspect only identity, IDs, statuses, commit, URL, build output, and variable names—not secret values. On missing auth, stop and request sign-in.

Before release, cache `git status --short`, `git diff --check`, the final commit, and focused validation. Commit the complete batch on the organization branch and push it first. Create one mirror release branch/PR from the exact commit, manually merge once, and avoid duplicate pushes, preview/manual deploys, or retries while Netlify builds. Record the **mirror merge commit** after the PR merges and confirm the reviewed organization commit is in its history. Wait for both intended sites to report `ready` with `commit_ref` matching the mirror merge commit; then perform the runtime check once. Inspect `git show --name-only HEAD` and status after hooks.

## 5. Verify and handle failures

Wait for a build already in progress; do not deploy again to outrun it. If absent from Netlify, check mirror/site linkage. If the build fails before app code, inspect install/config/toolchain first. If ready but behavior is old, compare commit, branch, site, context, and cache. Trace protected operations through request shape, session handoff, and provider runtime. If browser auth or the server is unavailable, report the blocker rather than claiming runtime proof.

Report deployment complete only with the exact organization commit, mirror PR and merge commit, matching `ready` Netlify record, both production sites/URLs, requested acceptance result, focused checks, known gaps, and preserved unrelated work. Production intent must be explicit; development checks belong on development and must not use `--prod`.
