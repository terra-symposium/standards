---
name: generation-content-authoring
description: Run the OpenAI Topic/Arc/Problem generation pipeline from the terminal and verify the results in Studio and the dashboard. Use when generating new content, re-running a generation spec, or checking what a generation run wrote.
---

# Content Authoring

Generation runs as Playwright specs in the `root-generation` project (`scripts/generation/`). The specs call the domain classes in `scripts/generation/content.ts` (`Topic`, `Arc`, `Problem`) with an `OpenAI` provider, and write straight to the Sanity dataset in `SANITY_DATASET`. Nothing cleans up after a run.

## Pick the spec

| To generate                                                   | Spec                          | Inputs (hard-coded in the spec)                                                       |
| ------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------- |
| A topic                                                       | `openai.case.spec.ts`         | title `Test Topic via OpenAI v2`                                                      |
| A topic, then its first suggested arc and that arc's problems | `test_topic_generate.spec.ts` | title `AI and Employment`                                                             |
| An arc and its problems under an existing topic               | `test_arc_generate.spec.ts`   | arc `Water Restriction Enforcement`, topic `Rq6AMl6hTL4jQESFJXL9dA` (Climate Justice) |

To generate different content, change the title or topic ref in the spec. Don't commit those edits. The topic ref must already exist in the target dataset. Problems are produced through `Arc.generate`. There is no standalone OpenAI problem spec that does real work (see Gotchas).

## Environment

| Var                                                | Source         | Notes                                                                                                              |
| -------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------ |
| `SANITY_PROJECT`, `SANITY_DATASET`, `SANITY_TOKEN` | `with-secrets` | `SANITY_TOKEN` can write. Confirm the dataset first (step 2).                                                      |
| `NETLIFY_DATABASE_URL`, `BETTER_AUTH_SECRET`       | `with-secrets` | Required by the `playwright` runtime profile and at import time. Generation doesn't use them otherwise.            |
| `OPENAI_API_KEY`                                   | **your shell** | Not in `netlify/config/runtime-manifest.json`, so `with-secrets` can't supply it. It passes through when exported. |

The model is fixed in `_openai.ts` (`gpt-4o-mini`, `gpt-image-1` for topic covers). No env var overrides it.

## Steps

1. Check Infisical access: `npx --yes pnpm@10.30.3 run env:doctor`.
2. Confirm which dataset you'll write to. It must print `development`:
   ```sh
   node scripts/setup/with-secrets.mjs development -- node -e "console.log(process.env.SANITY_DATASET)"
   ```
3. Start Astro on :4321. The Playwright global setup (`tests/scripts/test/support/server.ts`) refuses to run without it, even though generation never calls it:
   ```sh
   node scripts/setup/with-secrets.mjs development -- npx --yes pnpm@10.30.3 run dev
   ```
4. Optional: start Studio on :3333 with `npx --yes pnpm@10.30.3 run sanity`. The happy path is API-only. Studio is needed only when a document fails validation and gets the draft-repair fallback, or when an existing topic or arc is matched and re-published.
5. Run one spec. Always name the file, never the bare project:
   ```sh
   export OPENAI_API_KEY=sk-...
   node scripts/setup/with-secrets.mjs development -- \
     npx --yes pnpm@10.30.3 exec playwright test --project=root-generation scripts/generation/test_arc_generate.spec.ts
   ```
   Expect a few minutes per arc. The specs set 300–900 s timeouts.

## What gets written

- **Topic:** reused when one matches by id, title (case-insensitive) or base slug. Otherwise the AI writes the title and description and a cover image is generated. A topic that passes validation (title, slug, image, description of 80–100 characters) is published with a Sanity-generated `_id`. Otherwise it's saved as `drafts.<uuid>` and handed to Studio finalize.
- **Arc:** same match-or-create rule. Problems are generated **only if the arc ends up published**.
- **Problems:** title-only stubs are created published first, then filled. A problem that fails validation becomes a draft, and its published title-only stub stays alongside it. The run finishes by writing `arc.graph.arc`.
- Re-running reuses matched topics, arcs and problem stubs rather than duplicating them.

## Verify

1. Read the run log for the created ids. The `Topic`, `Arc` and `Problem` log lines name each document.
2. Studio: `http://localhost:3333/content/structure/__edit__<id>%2Ctype%3D<type>`. Drafts are visible only here.
3. Dashboard (signed in, `http://localhost:4321`). Published documents only:
   - `/dashboard/create` lists the arc.
   - `/dashboard/create/<arcId>` shows the arc with its problems, taken from `graph.arc`.
   - `/dashboard/classes/<topicId>` and `/dashboard/schedule` show the topic with its arcs.
   - `/dashboard/problem/<ref>` takes a **room id**, not a problem id. Open problems through the arc instead.

## Gotchas

- `--project=root-generation` without a file filter also runs `generation.spec.ts`. That brings in the Maintenance driver (patches `definition` documents), the Preset driver for every state, and the Leaf driver (starts `mcp.ts`, which imports the missing `_coverage`/`_heal` modules).
- The `OpenAI Driver` tests in `generation.spec.ts` catch their errors and only warn, so they **pass even when generation fails**. Don't use them as evidence.
- The Gemini describes in `generation.spec.ts` (`Topic Driver`, `Arc Driver`, `Problem Driver`) drive the gemini.google.com UI. `root-generation` has no `storageState`, and Gemini topics can't produce a cover image, so treat that path as unsupported.
- `generation.spec.ts`'s `setupWorker` errors mention `tests/_config.json`. The real file is `scripts/generation/_config.json`.

## Checklist

1. `env:doctor` passes and the dataset prints `development`.
2. Astro is up on :4321 and `OPENAI_API_KEY` is exported.
3. Exactly one spec file named on the command line.
4. Created ids checked in Studio. Published arcs and topics checked on the dashboard.
5. Anything left as a draft is either finalized in Studio or deleted.

## Related

- `docs/implementation-plans/ai-generation-schema-conformance.md`: schema conformance status and the reference live run.
- The shared `gem` skill's `references/provider-modes.md`: OpenAI vs Gemini provider behaviour.
- `scripts/generation/content.ts`: `Topic`, `Arc`, `Problem`.
