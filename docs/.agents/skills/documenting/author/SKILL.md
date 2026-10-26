---
name: author
description: Author, review, preserve, restore, and visually restructure general Terra Symposium Docs leaves with the terra_docs MCP. Use for Terra, executive, development, and university documentation from verified source material or existing Docs leaves.
---

# Terra Docs Leaf Authoring

Use `terra_docs` MCP to read and write the exact requested leaf. This skill covers general Terra and university content; use the separate Canvas scraping skill to collect Canvas sources. A leaf write replaces the full source, so preserve relevant current facts before changing it.

For direct authoring, use the read-before-write workflow below.

## 1. Choose the source path

### Generated leaf

Use `docs.leaf.generate` to read/process the target; do not read the target or its attachments first. Follow the generation, validation, and healing contract in this skill. Never bypass a failed attachment gate with `docs.leaf.write`.

### Direct authoring

1. Extract and verify the final UUID from the Docs URL.
2. Call `docs.leaf.read`; record title, description, source, attachments, and revision identity.
3. Read every attachment or linked source with `docs.attachment.read` or an appropriate read-only capability. If inaccessible, extend `sanity/actions/` through MCP rather than silently omitting it. Use the Canvas scraper only for Canvas.
4. Read `sanity/schemas/docs.tsx` and the Documentation leaf in Executive > Management for canonical syntax, style, and tone.
5. Inventory facts from the current leaf and sources. Include every non-duplicated existing fact plus relevant source facts.

## 2. Use canonical sources and syntax

The following repository references own generation and rendering behavior. Read the latest numbered [prompt journal](./journal.md) record before changing prompts; older entries are historical evidence.

- [Gem maintenance](../gem/SKILL.md) owns Gem changes and provider selection.
- The website checkout's `scripts/generation/_gemini.ts` builds the local `geminiPrompt()` composer prompt; it is not proof of the saved Gem instruction.
- The local harness in the website checkout is `scripts/export/canvas.mts`. Gem metadata/instruction updates are documented in the [Gem skill](../gem/SKILL.md); the currently configured Gem updater target is missing.
- The website checkout's `sanity/schemas/docs.tsx` schema and `astro/src/pages/docs/_blocks.tsx` renderer define valid blocks and constraints.

Use only canonical Docs blocks: native `<table>`, `<Code>`, `:::kind[title]` callouts, `|||[title]` tabs, `===[title]` accordions, `<Nodes>`, `<DocsMath>`/dollar delimiters, and `<Embed>`. Do not create a parallel renderer or invented component.

## 3. Author for scanning

Write for moderately experienced readers in a helpful mentor voice. Explain intent, constraints, and relationships; avoid chronological narration. Use plain language, relaxed tone, and minimal prose.

- Start with a concise overview and the most important action/deadline.
- Use clear H2/H3 hierarchy and a short introduction under each heading.
- Keep one concise idea per bullet. Split compound actions and qualifications into sub-bullets or separate paragraphs.
- Keep ordinary lines and bullets under 140 characters; break at natural boundaries.
- Use numbered lists only for sequences. Use tables for repeated/multidimensional facts, callouts for bounded important guidance, tabs for mutually exclusive references, accordions for secondary/long detail, and `<Nodes>` for genuine sequences or branches.
- Keep the primary path focused. Put optional, low-salience, or lengthy collections in titled accordions.
- For university notes, keep concepts atomic and retrieval-oriented, connect related ideas, preserve explicit lists, and end substantial notes with practical implications.
- For Terra organizational, executive, and development leaves, prioritize decisions, ownership, rationale, and next steps.
- Escape schema-sensitive characters in prose as required by `docs.tsx` (for example, `&#58;` for literal colons). Keep raw HTML inside canonical Code blocks when needed.

## 4. Canvas source rules

For Canvas collection, first use the [Canvas scraping skill](../canvas-scraping/SKILL.md). Synthesize downloaded source contents; a module title, filename, or link is metadata, not a replacement for document/slide/PDF/transcript/page content. Never turn source material into a resource index.

- Organize around concepts, relationships, mechanisms, examples, and application. Merge continued concepts when multiple source groups route to one leaf.
- Keep week labels, source names, and “subject resources” out of the main path unless needed for an actionable link.
- Use the Canvas registry's stable `inputSources` URL for routing. Renamed leaves remain mapped; multiple URLs may route to one leaf.
- Generate once per unique leaf, attaching/refreshing every source first.
- If an imported document is HTML Canvas preview content, re-download the authenticated `/download` response and do not author from the preview.

Complete Canvas collection, including module attachments and separate recording transcripts,
with the [Canvas scraping skill](../canvas-scraping/SKILL.md) before authoring.

## 5. Generation contract

Generation is agentic: the model interprets material, selects structure, and responds to corrective feedback. Execution stays programmatic through MCP actions, Playwright fixtures, typed drivers, and tests—not imitated clicks or hand-edited payloads.

### Retry and authentication

- Use shared `HealWorkflow` from `scripts/generation/_heal.ts` with explicit `maxRetries: 3` (initial attempt plus three retries).
- Return exact syntax, schema, extraction, or response-shape failures to the next prompt; log each retry and preserve raw responses.
- Never coerce an invalid response into success. After exhaustion, preserve diagnostics and fail without a write.
- Reuse the one authenticated Gemini browser profile/session. Normal generation is non-headed. Headed mode is for explicit sign-in or visual inspection. On reuse failure, stop with an authentication error; do not launch another context/window/session.

### Attachment completeness gate

After parsing and before any Sanity mutation, expose a source manifest and run `scripts/generation/_coverage.ts`. A response is not successful merely because it is non-empty or parses.

Record as typed quality evidence: readable source characters; total/usable attachments; generated characters; Docs block count; deterministic findings; semantic audit status; covered/missing attachment IDs; missing topics; and retries.

- Enforce generated content of at least `max(800, 8% of readable source characters)`; reject empty/suspiciously short output.
- Require at least three meaningful Docs blocks for a substantial corpus.
- Use tolerant anchors from headings, URLs, filenames, distinctive terms, and code identifiers. Name attachments with no detectable representation.
- Run Gemini's strict JSON coverage audit after deterministic validation. Account for every usable attachment and return corrective instructions on failure.
- Send exact deterministic/semantic failure and requested correction into the next healing attempt. Preserve raw responses and audit results. After the fourth total failed attempt, stop without writing.
- Keep audit metadata out of stored Markdown/MDX. Use the same validator/retry behavior in MCP generation, local Fast-mode harness, and Playwright batch driver.
- Successful MCP generation returns quality evidence. Post-write verification checks the evidence and re-reads the stored leaf, not merely `content.length > 0`.

Direct `docs.leaf.write` remains available for intentionally small pages without attachments; never use it to bypass a failed generation gate.

### Prompt revision records

The Gem instruction and composer prompt intentionally share one source. When changing it, create the next numbered journal entry with the exact prompt, context files, Gem ID, mode, and validation. Keep transport/extraction fixes in separate entries from prompt revisions. Use the Gem skill for actual external configuration updates.

## 6. Write and verify

For direct authoring or an accepted generated result:

1. Write with `docs.leaf.write`, retaining the existing title and description unless requested otherwise.
2. Read the leaf again and compare it against the fact inventory. No relevant prior facts may be lost.
3. Confirm requested sources are represented and blocks use canonical syntax.
4. If the wrong leaf was edited, restore its saved title, description, and source before changing the intended leaf; re-read both leaves to verify.

## MCP fallback

MCP must expose attachment contents, not only metadata. For local server validation, run with Astro aliases:

```sh
npx tsx --tsconfig astro/tsconfig.json mcp.ts
```

The repo's `mcp.ts` is the canonical Docs tool implementation. It exposes
`docs.leaf.read`, `docs.attachment.read`, `docs.leaf.generate`, and `docs.leaf.write`, and shares
the Sanity serializers, Gemini authentication, coverage audit, and healing workflow. It is
production-write guarded. `pnpm run docs:mcp` starts this repository-owned integration through
Infisical's `deploy` environment, so an external Terra Docs MCP connection is not required.
Check `pnpm run env:doctor` for the configured secret context and complete repository-scoped
Infisical sign-in in an interactive terminal if prompted. Keep tokens in Infisical and never put
them in skill files, CLI arguments, browser storage, or logs. Do not build a parallel
direct-Sanity writer: that would fork the validation contract.

For visual review only, `pnpm run dev:production-data` starts the development app against the
public production dataset without a Sanity token. This preview is read-only and cannot author
or update Docs. Use `docs:mcp` for every production write; do not inject a production token into
the local preview. If the Docs are not publicly readable, stop and report that access blocker.

Exercise the operation over JSON-RPC. Format changed repo files only, run focused checks, and finish with `git diff --check`.
