---
name: align
description: Iterate Gemini generated content comparing to production Docs references, to improve the generation's adherence to strict guidelines via local-only headless Chrome checks.
---

# Canvas Docs Generation Iteration

Use only to improve the Canvas source adapter for Terra Docs generation. For general authoring, follow [`author`](../author/SKILL.md); for saved Gem changes, follow [`gem`](../gem/SKILL.md). The goal is production-like structure, information density, and block choice, not merely parseable output.

## Safety and inputs

- Read production examples and target facts through Terra Docs MCP.
- Never call `docs.leaf.generate`, `docs.leaf.write`, or another Sanity mutation. Save artifacts locally, such as in Downloads.
- Use Playwright Chrome for the explicitly requested Gem edit and generation. Do not use Dia automation or hijack the user's Dia session.
- Reuse the authenticated Gemini browser profile. Normal iteration is non-headed; headed mode is for explicit sign-in or visual inspection. Stop on authentication failure instead of opening another session.
- Never expose credentials, cookies, storage state, or environment values. Do not commit unless explicitly asked.

Before a prompt change, provide the Gem with:

1. Representative production leaf Markdown showing both content and canonical forms: headings, links, tables, callouts, nodes, code, tabs, and accordions.
2. The prompt version being tested.
3. `sanity/schemas/docs.tsx`, parser/renderer sources, relevant actions, and the Playwright Canvas scraper.

Production examples teach form, never source facts.

## Iteration steps

1. Save the prior Gem configuration locally: ID, description, knowledge filenames, and exact instructions.
2. Add an immutable numbered record to [`author/journal.md`](../author/journal.md) with date, exact prompt, Gem ID, mode, context files, and validation.
3. Update Gem context through isolated Playwright Chrome; reload and verify saved instructions and file labels. Uploads may persist even when the save button is disabled.
4. Keep the local Playwright driver prompt synchronized with the Gem output contract.
5. Generate non-headed from a local Canvas fixture or saved scrape. Never patch Sanity or reuse Dia.
6. Inspect the raw response before normalization. Require exactly one outer `markdown` fence, no outside text, an H2 as the first body line, no inner triple-backtick fences, canonical `<Code>` syntax, HTML tables for repeated data, and only schema-supported blocks. Confirm source facts are retained without invention.
7. Run the shared `HealWorkflow` and `_coverage.ts` validator described in [`author`](../author/SKILL.md). Preserve raw/audit output; the initial attempt plus three retries is the maximum. Pass exact failures and requested corrections into the next attempt. Exhaustion is failure, not partial success.
8. Revise only to address a recorded failure. Repeat until structure, block distribution, and attachment coverage meet the contract.

## Prompt design

Put the output contract before style guidance. Require:

- one fenced Markdown artifact and no wrapper, labels, prose, or JSON outside it;
- native HTML tables for schedules, comparisons, requirements, inventories, staff, assessments, and repeated fields;
- canonical `<Code language="...">{` ... `}</Code>` with no nested fence;
- permitted Docs blocks only; no invented components;
- concise headings and one idea per bullet, with natural prose and lines under 140 characters where practical;
- inline `<code>` for technical tokens and `$...$` for symbolic relationships;
- tables for repeated/comparison data, concise asides for salient constraints, `<Nodes>` for real sequences, accordions for secondary detail, and numbered lists only for ordered procedures;
- a silent structural self-check and a complete corrected artifact when the driver reports an error.

Keep style guidance generic; do not turn one source example into a universal rule. Test the output contract, not whether the model explains its repair.

## Test documentation

Generation fixtures and drivers need TSDoc stating their agent-iteration purpose, local-only boundary, and structural contract. Follow the [Hygiene skill's source readability guidance](../../../../../packages/quality/.agents/skills/hygiene/SKILL.md).
