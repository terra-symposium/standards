# Prompt journal

Immutable prompt, Gem-update, failure, and validation records for the Terra Docs Document Gem. Records are preserved in numeric order.

---

## Journal record: 000-document-gem-baseline.md

- Captured: 2026-09-11
- Gem ID: `b2b810394d61`
- Name: `Document`
- Description: `Write markdown docs for terra docs.`
- Knowledge before iteration:
  - `docs.tsx`
  - `ns1Jhrj96oySML10X1Y99D.mdx` (Executive / Management / Documentation)

## Instructions

You are only permitted to return code blocks containing markdown compatible with the Terra Symposium documentation tool. Do not render rich text. Render code blocks with MDX.

---

## Journal record: 002-terra-docs-production-style-context.md

# Terra Docs production style context

This file is a read-only reference for agents iterating on Canvas-to-Terra-Docs generation. It was assembled from production leaves read through the Terra Docs MCP on 2026-09-11. The source examples are included to show both the factual density and the canonical Markdown/MDX form expected by the Docs parser.

## Observed production conventions

- Use a short `##` introduction and organise related concepts under `###` headings.
- Prefer concise explanatory prose, then use the block that best represents the information.
- Use native HTML `<table>` blocks for repeated or multidimensional information such as comparisons, artefact inventories, requirements, schedules, and definitions. Do not replace these with pipe tables.
- Use `:::note[Title]`, `:::tip[Title]`, `:::example[Title]`, and `:::warning[Title]` for bounded guidance or emphasis.
- Use `<Nodes>` only for a real process or relationship diagram, not as decoration for an ordinary list.
- Use `<Code language="plaintext">{` ... `}</Code>` for code or literal examples. The template-literal braces are part of the canonical syntax.
- Preserve lists and source facts, but synthesise lecture material into atomic, retrieval-oriented concepts rather than reproducing a transcript.
- End substantial university notes by making the practical implication explicit.

## Executive / Management / Documentation

The production Documentation leaf explains that code documents how a system works while documentation captures why it exists. Its guidance is plain, repeatable, contextual, minimal, and relaxed. Engineering documentation is objective and abstract, grouped by feature or domain rather than file chronology. University documentation is connective and atomic, designed for retrieval and recall.

The leaf explicitly recommends mapping implementation to domain context, using tables where a relationship has multiple dimensions, and using canonical Docs blocks rather than invented JSX wrappers. This is a style reference: generated content must still be grounded only in the supplied Canvas source and attachments.

## Business Requirements Modelling / Structured Approach

```md
## Data Modelling

Data modelling is the process of creating a visual representation of the data an organisation needs, focusing on the entities, their attributes, and the relationships between them.

### Entity-relationship diagrams (ERDs)

An ERD is a data model that organises data into a standardised structure. It graphically represents business data requirements, helping to confirm business rules and plan a database structure.

:::note[Notation Standard]

In this subject, all ERDs must use Crow's Foot notation, not Chen notation.

:::

<table>
	<thead>
		<tr>
			<th>🧩 Component</th>
			<th>📝 Description</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td><strong>Entity</strong></td>
			<td>A person, place, thing, event, or concept of importance to the business (e.g., <code>Student</code>, <code>Product</code>).</td>
		</tr>
		<tr>
			<td><strong>Attribute</strong></td>
			<td>A characteristic that describes an entity (e.g., <code>studentID</code>, <code>productName</code>).</td>
		</tr>
		<tr>
			<td><strong>Primary Key</strong></td>
			<td>An attribute that uniquely identifies an instance of an entity (e.g., <code>studentID</code>).</td>
		</tr>
		<tr>
			<td><strong>Foreign Key</strong></td>
			<td>An attribute in one entity that refers to the primary key of another entity, creating a link.</td>
		</tr>
		<tr>
			<td><strong>Relationship</strong></td>
			<td>A business association between two or more entities (e.g., a <code>Professor</code> <em>teaches</em> a <code>Subject</code>).</td>
		</tr>
		<tr>
			<td><strong>Cardinality</strong></td>
			<td>Specifies the number of instances of one entity that can be related to another (e.g., 1, M).</td>
		</tr>
	</tbody>
</table>

Creating an ERD follows a systematic process.

<Nodes direction="TB" nodes={`[ 		{ "_key": "narrative", "data": { "title": "1. Create Narrative" }, "id": "narrative", "type": "terminator" }, 		{ "_key": "rules", "data": { "title": "2. Identify Business Rules" }, "id": "rules", "type": "process" }, 		{ "_key": "entities", "data": { "title": "3. Identify Entities & Relationships" }, "id": "entities", "type": "process" }, 		{ "_key": "review", "data": { "title": "4. Review ERD" }, "id": "review", "type": "terminator" } 	]`} edges={`[ 		{ "_key": "e1", "data": { "arrowHead": true }, "id": "e1", "source": "narrative", "target": "rules" }, 		{ "_key": "e2", "data": { "arrowHead": true }, "id": "e2", "source": "rules", "target": "entities" }, 		{ "_key": "e3", "data": { "arrowHead": true }, "id": "e3", "source": "entities", "target": "review" } 	]`} />

### Data Dictionary

A data dictionary is a centralised repository that provides detailed information about the data in an ERD. For each attribute of every entity, it defines its data type, format, length, and any constraints.

## Process Modelling

Process modelling is used to analyse and understand the business processes within an organisation by creating visual maps of workflows.

<table>
	<thead>
		<tr>
			<th>📄 Artifact</th>
			<th>📝 Description</th>
			<th>📦 Contents</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td><strong>Context Diagram</strong></td>
			<td>Provides the highest-level view of a system, showing it as a single process interacting with external entities to clarify project boundaries and scope.</td>
			<td>Single-process representation, external entities, and data flows that define the system boundary.</td>
		</tr>
		<tr>
			<td><strong>Business Process Model and Notation (BPMN)</strong></td>
			<td>Standardised graphical notation for illustrating the flow of activities, typically organised into pools and swimlanes.</td>
			<td><strong>Pool</strong>, <strong>Swimlane</strong>, <strong>Events</strong>, <strong>Activities</strong>, and <strong>Gateways</strong>.</td>
		</tr>
	</tbody>
</table>
```

## Business Requirements Modelling / Requirements Engineering

The production leaf begins with a definition of a requirement, uses a table to distinguish categories, and then explains the process with a `<Nodes>` diagram. Its process stages are placed in `===[Title]` accordion blocks where each stage has a short explanation and a table of outputs or activities. This is the expected pattern when the source contains stages with comparable fields: explain the process, then tabulate each stage rather than flattening every field into bullets.

## Professional / Introduction to Engineering / Design Process

```md
## Overview

## Human-centred design is an iterative process ...

## 1. Empathise

:::tip[Stakeholder Mapping]

Identify the people affected by the design before defining a solution.

:::

### Personas

### Empathy Maps

## 2. Define

:::example[User Need Statement Formula]

**Format**:

<Code language="plaintext">
{`
[User description] needs [verb] because [compelling insight].
`}
</Code>

:::

<table>
	<thead>
		<tr>
			<th>Element</th>
			<th>Purpose</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td>User description</td>
			<td>Names the person or group whose need is being addressed.</td>
		</tr>
		<tr>
			<td>Verb</td>
			<td>States the desired action or outcome.</td>
		</tr>
	</tbody>
</table>
```

## Professional / Engineering Projects Appraisal / Appraisal Foundations

This production leaf uses polished H2 sections, brief connective prose, a bounded callout, one lifecycle `<Nodes>` diagram, and a comparison table. It demonstrates that a table or diagram should be introduced by prose explaining why it is useful; blocks should not be emitted as an unexplained dump.

## Generation boundary

The examples above are style and parser references only. When generating a Canvas leaf, keep all factual claims traceable to the supplied Canvas page and attachments. Do not copy unrelated subject facts from these examples, invent missing metadata, or add citations or generation commentary.

---

## Journal record: 003-fast-mode-contract.md

# Prompt iteration 003 — Fast-mode output contract

- Captured: 2026-09-11
- Gem ID: `b2b810394d61`
- Gem: `Document`
- Requested mode: `fast` / Gemini Flash
- Context attachments: `002-terra-docs-production-style-context.md`, `sanity/schemas/docs.tsx`, `astro/src/pages/docs/_blocks.tsx`, `scripts/export/canvas.mts`
- Status before live verification: proposed local/Gem prompt

## Exact prompt

# Canvas-to-Terra-Docs generation contract

You are generating one Terra Symposium Docs leaf from a Canvas page capture and its attachments. Treat this as a deterministic document-conversion task, not a chat reply. The attached production-reference Markdown teaches style and block form only; it is not a source of facts. The supplied Canvas page body and attachments are the only factual authority.

## Output protocol — absolute

The only valid response is exactly one outer fenced Markdown block:

```markdown
## A concise leaf heading

The leaf body goes here.
```

Apply every rule below before responding:

1. The response must begin at character 1 with ```markdown. Do not put a label, greeting, explanation, JSON, citation, or blank line before it.
2. The response must end with the one matching closing ```. Do not put any character, explanation, citation, or blank line after it.
3. There must be exactly one outer fence pair. The body must contain no triple backticks. Use the canonical `<Code>` component for code instead.
4. The first non-blank line inside the outer fence must begin with `## `. Do not begin with `# `, `### `, `Content`, `Markdown`, `Document`, or a wrapper key.
5. Return raw Markdown/MDX text inside the fence. Never return JSON, an object, an array, a string literal, or fields such as `content`, `markdown`, `source`, `task`, or `errors`.
6. If you cannot satisfy a formatting preference, preserve the output protocol and source facts first. Never explain the conflict outside the fence.

## Terra Docs form

Use only the vocabulary supported by the attached `sanity/schemas/docs.tsx` and renderer examples:

- Use H2–H6 headings, short paragraphs, bullets for unordered facts, and numbered lists for ordered procedures.
- Use native HTML `<table>` with complete `<thead>`, `<tbody>`, `<tr>`, `<th>`, and `<td>` whenever the source contains repeated records or multidimensional information: schedules, comparisons, requirements, assessments, staff, inventories, artefacts, definitions, options, or any repeated fields. Never use pipe tables.
- Use `:::note[Title]`, `:::tip[Title]`, `:::example[Title]`, `:::warning[Title]`, or `:::caution[Title]` for bounded guidance. Close every callout with `:::`.
- Use `===[Title]` accordions and `|||[Title]` tabs only when the source contains genuinely grouped or alternative material. Close every block with its matching `===` or `|||`. Do not invent child components or wrappers.
- Use `<Nodes>` only for a real sequential or branching process. Every node and edge must be valid and grounded in the source.
- Use `<Code language="plaintext">{` code or a literal example `}</Code>` for every multi-line code sample or literal block. Never use bare braces or a nested triple-backtick fence. Inline `<code>` is allowed for short identifiers.
- Use only explicitly supported tags such as `<Code>`, `<Nodes>`, `<Embed>`, and native `<table>`. Never invent `<AccordionItem>`, `<TabItem>`, `<TabsList>`, `<CalloutBody>`, or similar wrappers.

## Content and structure

- Read the full visible Canvas page body and every attachment. If a Canvas page capture includes a real body, use that body as the primary source; never replace it with a module-item title, URL, or link list.
- Preserve all non-duplicated facts, explicit questions, tasks, lists, links, code, filenames, dates, and attachment details. Do not invent facts or silently omit difficult material.
- Synthesise lecture content into a cohesive leaf rather than dumping one module item after another or reproducing a transcript. Keep concepts atomic and retrieval-oriented, and connect related ideas.
- Start each substantial H2 section with a brief orienting sentence. Use descriptive headings and concise titles. Explain why a table, callout, or diagram is useful before presenting it.
- Prefer tables over long repeated bullets. Prefer a process diagram only when the source describes a real workflow. Do not add blocks merely to make the document look busy.
- Use Australian English. Do not add citations, source commentary, generation notes, or a “Content said” preamble. Keep source links near the fact they support.
- For substantial university notes, finish with a concise practical implication or “So what?” section grounded in the source.

## Silent final check

Before sending, inspect the complete response silently. Reject and regenerate your own answer until all checks pass: it starts exactly with `markdown; it has exactly one outer fence pair; it ends exactly with `; the body starts with `## `; there are no triple backticks in the body; every code sample uses canonical `<Code>`; every repeated dataset uses a native HTML table; every callout/tab/accordion/node is closed and supported; and every claim is traceable to the supplied Canvas source or attachment. Output nothing except the single fenced block.

## Intended verification

Use a non-headed Chrome/Playwright session with a saved local Canvas capture. Do not call a Sanity mutation. A response is successful only when the raw response satisfies the complete output protocol and the normalised body contains valid Terra Docs blocks.

---

## Journal record: 004-document-gem-fast-instructions.md

# Document Gem prompt — iteration 004

- Date: 2026-09-11
- Gem: `Document` (`b2b810394d61`)
- Mode: Gemini Fast fallback
- Status: saved in the Document Gem; local attachment upload remains pending because the Dia native folder chooser did not complete

This is the exact instruction saved to the Gem in this iteration:

```text
You are the Terra Symposium DOCUMENT Gem. Convert the supplied Canvas page body and attachments into one Terra Docs leaf.

OUTPUT CONTRACT — obey before all style guidance:
• Return exactly one fenced Markdown code block and nothing else.
• The first characters must be three backticks followed immediately by markdown and a newline.
• The last characters must be the matching closing three backticks.
• Put no greeting, label, JSON, object, array, citation, explanation, or blank line outside the fence.
• The first non-blank line inside the fence must begin with ## . Return the leaf body as raw Markdown/MDX, never a wrapper field such as content, markdown, source, task, or errors.
• Put no triple-backtick fence inside the body. Use the canonical Code component for code.

TERRA DOCS FORM:
• Follow the attached docs schema and renderer examples exactly. Use H2–H6 headings, short orienting paragraphs, bullets, and numbered lists.
• Repeated or multidimensional source data — schedules, comparisons, requirements, assessments, inventories, options, definitions, or repeated fields — must be a native HTML table with thead, tbody, tr, th, and td. Never use pipe tables.
• Use only supported blocks: :::note[Title], :::tip[Title], :::example[Title], :::warning[Title], :::caution[Title], ===[Title] accordions, |||[Title] tabs, <Nodes>, <Embed>, <Code>, and native HTML tables. Close every block. Do not invent JSX wrappers.
• Every multiline code or literal example must use <Code language="plaintext">{` ... `}</Code> with the exact Terra syntax. Never use bare braces or nested Markdown fences.

CONTENT RULES:
• The Canvas page body and attachments are the only factual authority. Read the complete visible page body and every attachment. Do not substitute a module title, URL, or list of links for a real page body.
• Preserve all non-duplicated facts, questions, tasks, lists, links, filenames, dates, code, and attachment details. Do not invent or silently omit difficult material.
• Synthesise the source into a cohesive, atomic, retrieval-oriented leaf in Australian English. Do not dump module links or echo a transcript.
• Use tables, callouts, tabs, accordions, or Nodes only when the source makes them useful. Finish substantial university notes with a source-grounded practical implication.

SILENT CHECK BEFORE RESPONDING:
Verify the raw response starts exactly with the markdown fence, has one outer pair, ends exactly with the fence, has an ## body heading, no inner triple backticks, valid Terra blocks, canonical Code syntax, complete HTML tables where repeated data exists, and only source-grounded claims. If any check fails, correct it silently and then return only the single fenced block.
```

The longer local driver prompt is retained separately in `003-fast-mode-contract.md`; it is intentionally more explicit than the Gem copy until a real Fast-mode response can be inspected.

---

## Journal record: 005-document-gem-playwright-update.md

# Document Gem prompt — iteration 005

- Date: 2026-09-11
- Gem: `Document` (`b2b810394d61`)
- Mode: Gemini Fast fallback
- Update path: opt-in Playwright test in `scripts/generation/document-gem.spec.ts`
- Status: prepared for a non-headed Chrome run; no Gem save is performed unless `RUN_DOCUMENT_GEM_UPDATE=1` is set

This iteration makes the local strict generation contract the single source for the Gem editor and the generator. The exact instruction is `GEMINI_LEAF_PROMPT` in `scripts/generation/_gemini.ts` and is logged verbatim in `003-fast-mode-contract.md`; the Playwright test sends that same value to the Document Gem, removes only the managed context attachments, appends the current local context, and waits for Gemini's saved-state confirmation.

The attached context is deliberately local and includes:

- the production-style Markdown reference assembled from Terra Docs MCP leaves;
- the Fast-mode contract log;
- the Docs schema;
- and the Canvas Playwright scraper.

No Sanity mutation, generated document patch, Dia automation, or repository commit is part of this iteration.

---

## Journal record: 006-document-gem-playwright-saved.md

# Document Gem prompt — iteration 006

- Date: 2026-09-11
- Gem: `Document` (`b2b810394d61`)
- Mode: Gemini Fast fallback
- Update path: non-headed Playwright Chrome via `document-gem.spec.ts`
- Status: passed; the saved page was reloaded and verified with the strict instruction plus four intended knowledge attachments

The Playwright update test now uses Gemini’s actual populated instruction composer, removes stale managed knowledge entries safely across re-rendered lists, appends the local context through the same `input[type="file"]` attachment mechanism as chat, and verifies persistence after reload. Gemini may persist knowledge and instruction changes immediately, leaving the Update button disabled; that disabled state is accepted only when reload verification proves the saved values.

The exact instruction is the shared `GEMINI_LEAF_PROMPT` in `scripts/generation/_gemini.ts`, logged verbatim in `003-fast-mode-contract.md`. The saved knowledge set is:

- `002-terra-docs-production-style-context.md` — production Terra Docs form/content examples;
- `003-fast-mode-contract.md` — output contract and Fast-mode failure guards;
- `docs.tsx` — schema and schema examples; and
- `canvas.mts` — the Canvas Playwright capture workflow.

This iteration used a temporary Chrome binary outside the repository, a saved browser state, and no Dia automation, Sanity mutation, generated-document patch, or repository commit.

---

## Journal record: 007-fast-response-wrapper.md

# Document generation prompt — iteration 007

- Date: 2026-09-11
- Gem: `Document` (`b2b810394d61`)
- Mode: Gemini Fast fallback
- Source fixture: real LAB06 Canvas body and attachments from `/Users/kaimacann/Downloads/canvas-generate-input`
- Status: local generation completed; content matched the Terra form, but Gemini’s rendered response omitted the literal outer fence and included its known UI labels

The response began with:

```text
Document
Custom Gem
Document said
Markdown
## LAB06 — Pointers and Dynamic Memory Management
```

The body itself contained native HTML tables, Terra callouts, canonical `<Code>` blocks, and a practical implication. The issue was therefore isolated to response transport: the browser’s rendered `response-container` exposes presentation labels and strips the model’s Markdown fence.

The instruction was strengthened with this exact transport rule before the existing contract:

> Your response is a literal transport payload, not rendered chat. Gemini may display labels such as Document, Custom Gem, Document said, or Markdown in its UI; never write those labels. The first bytes of your response must literally be `markdown followed by a newline, and the final bytes must literally be `.

The local driver now recognises only that exact four-line Gemini wrapper, reconstructs the required single fence for local validation, and rejects unknown wrappers or inner triple-backticks. Raw and normalised outputs are both retained in the OS Downloads directory.

---

## Journal record: 008-fast-inner-fence.md

# Document generation prompt — iteration 008

- Date: 2026-09-11
- Gem: `Document` (`b2b810394d61`)
- Mode: Gemini Fast fallback
- Source fixture: the complete local LAB06 Canvas capture in `/Users/kaimacann/Downloads/canvas-generate-input`
- Status: local generation rejected; the body contained an inner `````struct`` fence

The response wrapper was normalised successfully, and the document used the expected tables, callouts, and Terra `<Code>` blocks. It still emitted a language-labelled triple-backtick code fence inside the leaf. The transport rule was therefore strengthened to explicitly ban three backticks anywhere in the body, including fences labelled `struct`, and to require the canonical `<Code language="plaintext">{` ... `}</Code>` form for every literal example.

---

## Journal record: 009-knowledge-citations.md

# Document generation prompt — iteration 009

- Date: 2026-09-11
- Gem: `Document` (`b2b810394d61`)
- Mode: Gemini Fast fallback
- Source fixture: the complete local LAB06 Canvas capture in `/Users/kaimacann/Downloads/canvas-generate-input`
- Status: local fence/form validation passed; output still contained Gemini knowledge markers such as `[cite: 1]`

The response now reliably normalises to one outer Markdown fence, uses native HTML tables and canonical Terra `<Code language="plaintext">` blocks, and contains no inner triple-backtick fence. The remaining defect was citation-token injection from the Gem knowledge system, so the next iteration explicitly bans `[cite: N]` markers and checks Gemini’s **Disable knowledge citations** control through the Playwright Gem updater before saving.

---

## Journal record: 010-fast-output-passed.md

# Document generation prompt — iteration 010

- Date: 2026-09-11
- Gem: `Document` (`b2b810394d61`)
- Mode: Gemini Fast fallback
- Source fixture: complete LAB06 Canvas body and attachments from `/Users/kaimacann/Downloads/canvas-generate-input`
- Output: `/Users/kaimacann/Downloads/canvas-gem-fast-iteration-008/normalized-response.md`
- Status: passed local contract and form audit

The saved Gem prompt now explicitly separates literal transport from Gemini’s rendered chat UI, forbids UI labels and knowledge-citation markers, bans three backticks anywhere inside the leaf, and requires canonical plaintext `<Code>` blocks. Gemini’s response still exposes the predictable four-line UI prefix in `response-container`; the driver recognises only that exact wrapper and reconstructs the required outer fence for local validation.

The resulting local leaf passed these checks:

- exactly one outer `markdown` fence;
- H2 opening heading;
- no inner triple-backticks;
- two native HTML tables with complete table structure;
- three canonical `<Code language="plaintext">` blocks;
- closed supported callouts; and
- no `[cite: …]` knowledge-citation markers.

The raw response and the validated normalised response remain side by side in Downloads. No Sanity mutation, generated-document patch, Dia automation, or repository commit was performed.

---

## Journal record: 011-playwright-response-extraction.md

# Document generation transport — iteration 011

- Date: 2026-09-11
- Gem: `Document` (`b2b810394d61`)
- Mode: Gemini Fast fallback
- Prompt: unchanged from iteration 010; source of truth is `GEMINI_LEAF_PROMPT` in `scripts/generation/_gemini.ts`
- Source fixture: complete LAB06 Canvas body and attachments from `/Users/kaimacann/Downloads/canvas-generate-input`
- Output: `/Users/kaimacann/Downloads/canvas-gem-fast-iteration-011`
- Update path: non-headed Playwright Chrome
- Status: passed

This iteration corrected the Playwright response extractor rather than changing the generation prompt. Gemini renders a valid outer `markdown` fence as a dedicated `code-block`; reading the whole `response-container` incorrectly included the UI labels `Document`, `Custom Gem`, `Document said`, and `Markdown`. The driver now selects the rendered `code[data-test-id="code-content"]` whose body begins with the required H2 and reconstructs the transport fence around that body. Unknown response shapes still fall through to the strict parser and fail rather than being silently accepted.

The raw response now passes the transport contract directly:

- starts with ` ```markdown` at character 1 and ends with the matching fence;
- contains one outer fence and no inner triple-backtick fences;
- begins with an H2 heading;
- contains one native HTML table and two canonical `<Code language="plaintext">` blocks; and
- contains no knowledge-citation markers.

The raw and normalised responses remain side by side in Downloads. No Sanity mutation, generated document patch, Dia automation, or repository commit was performed.

---

## Journal record: 012-visual-hierarchy-brevity.md

# Document generation prompt — iteration 012

- Date: 2026-09-11
- Gem: `Document` (`b2b810394d61`)
- Mode: Gemini Fast fallback
- Prompt source: `GEMINI_LEAF_PROMPT` in `scripts/generation/_gemini.ts`
- Source fixture: complete LAB06 Canvas body and attachments from `/Users/kaimacann/Downloads/canvas-generate-input`
- Update path: non-headed Playwright Chrome via `scripts/generation/document-gem.spec.ts`
- Output: `/Users/kaimacann/Downloads/canvas-gem-fast-iteration-012`
- Status: prompt revision prepared for Gem update and local verification

This revision adds source-agnostic layout guidance to the shared Gem instruction and text prompt. It requires the document to be structured visually before prose is written, with short hierarchical headings, blocks chosen by information relationship, and the primary reading path limited to salient material. Supporting, optional, low-salience, or lengthy collections should be placed in a focused titled accordion. Bullets should contain one concise idea; compound actions, conditions, and qualifications should be split into a lead sentence with sub-bullets or separate paragraphs. Bold-label-colon bullets should not carry a long explanation.

The guidance describes the underlying salience, relationship, and scanning principles rather than encoding any one Canvas task or document example. Canvas remains only the current test source; the rules apply to all supplied documentation sources.

The exact prompt is shared between the Document Gem instruction and the Gemini composer text. The Gem update must reload and verify the saved instruction, citation setting, and knowledge labels. The local harness must preserve raw output and validate the strict Markdown/MDX contract without writing to Sanity. No document mutation, Dia automation, or repository commit is part of this iteration.

---

## Journal record: 013-visual-hierarchy-line-length.md

# Document generation prompt — iteration 013

- Date: 2026-09-11
- Gem: `Document` (`b2b810394d61`)
- Mode: Gemini Fast fallback
- Prompt source: `GEMINI_LEAF_PROMPT` in `scripts/generation/_gemini.ts`
- Source fixture: complete LAB06 Canvas body and attachments from `/Users/kaimacann/Downloads/canvas-generate-input`
- Update path: non-headed Playwright Chrome via `scripts/generation/document-gem.spec.ts`
- Output: `/Users/kaimacann/Downloads/canvas-gem-fast-iteration-013`
- Status: prompt revision prepared for Gem update and local verification

This revision strengthens the generic visual-authoring contract after iteration 012 confirmed that secondary task collections were being grouped in accordions but ordinary prose remained too dense. It adds a hard 140-character limit for ordinary prose lines and bullets outside code and table markup, requires natural splitting into sentences, paragraphs, or sub-bullets, and reinforces one purpose per visual block and one idea per item. It also requires the canonical accordion syntax without source-specific examples.

The prompt remains shared between the saved Gem instruction and the Gemini composer text. The Gem must be reloaded and verified after update. The local harness must preserve raw output and validate the strict Markdown/MDX contract without writing to Sanity. No document mutation, Dia automation, or repository commit is part of this iteration.

---

## Journal record: 014-visual-hierarchy-grammar.md

# Document generation prompt — iteration 014

- Date: 2026-09-11
- Gem: `Document` (`b2b810394d61`)
- Mode: Gemini Fast fallback
- Prompt source: `GEMINI_LEAF_PROMPT` in `scripts/generation/_gemini.ts`
- Source fixture: complete Canvas capture supplied to the local harness
- Update path: non-headed Playwright Chrome via `scripts/generation/document-gem.spec.ts`
- Output: `/Users/kaimacann/Downloads/canvas-gem-fast-iteration-014`
- Status: prompt revision prepared for Gem update and local verification

This revision makes visual hierarchy and line layout executable. Secondary collections of tasks, questions, exercises, procedures, and reference items must be placed in titled accordions instead of the main heading flow. It states the accordion grammar in character-level terms and requires a literal line-by-line scan before output. Ordinary prose, bullets, headings, and block titles must remain below 140 characters, with natural line breaks rather than compressed sentences.

The instructions remain generic and source-agnostic. They describe salience, grouping, grammar, and scanning principles without naming a document-specific correction. The local harness will preserve the raw response and normalized result in Downloads only; it will not write to Sanity or commit the repository.

---

## Journal record: 015-rendering-grammar.md

# Document generation prompt — iteration 015

- Date: 2026-09-11
- Gem: `Document` (`b2b810394d61`)
- Mode: Gemini Fast fallback
- Prompt source: `GEMINI_LEAF_PROMPT` in `scripts/generation/_gemini.ts`
- Source fixture: complete Canvas capture supplied to the local harness
- Update path: non-headed Playwright Chrome via `scripts/generation/document-gem.spec.ts`
- Output: `/Users/kaimacann/Downloads/canvas-gem-fast-iteration-015`
- Status: prompt revision prepared for Gem update and local verification

This revision adds a generic rendering-grammar safeguard. Exact delimiter counts are required for supported visual blocks, and plain prose is the fallback when a block cannot be rendered correctly. The line-length rule is tightened to a 120-character ceiling, with sentence rewriting and hard line breaks required before output. Dense bold-label bullets are disallowed so hierarchy remains visible.

The prompt contains no source-specific correction. It expresses reusable principles for salience, block validity, sentence splitting, and visual scanning. The local harness writes only to Downloads.

---

## Journal record: 016-sentence-line-discipline.md

# Document generation prompt — iteration 016

- Date: 2026-09-11
- Gem: `Document` (`b2b810394d61`)
- Mode: Gemini Fast fallback
- Prompt source: `GEMINI_LEAF_PROMPT` in `scripts/generation/_gemini.ts`
- Source fixture: complete Canvas capture supplied to the local harness
- Update path: non-headed Playwright Chrome via `scripts/generation/document-gem.spec.ts`
- Output: `/Users/kaimacann/Downloads/canvas-gem-fast-iteration-016`
- Status: prompt revision prepared for Gem update and local verification

This revision makes short-line output more explicit. Each sentence must occupy its own line, and ordinary emitted lines must remain below 100 characters. Longer ideas must be rewritten as multiple short sentences before output. The existing generic rules for salience, accordions, block grammar, and concise hierarchy remain in force.

The revision remains blind to the source document. It encodes the underlying reading and rendering principles rather than naming a particular task, heading, or generated defect.

---

## Journal record: 017-secondary-collection-outline.md

# Document generation prompt — iteration 017

- Date: 2026-09-11
- Gem: `Document` (`b2b810394d61`)
- Mode: Gemini Fast fallback
- Prompt source: `GEMINI_LEAF_PROMPT` in `scripts/generation/_gemini.ts`
- Source fixture: complete Canvas capture supplied to the local harness
- Update path: non-headed Playwright Chrome via `scripts/generation/document-gem.spec.ts`
- Output: `/Users/kaimacann/Downloads/canvas-gem-fast-iteration-017`
- Status: prompt revision prepared for Gem update and local verification

This revision clarifies the outline boundary. Headings are reserved for concepts and essential stages. Secondary collections remain grouped in titled accordions rather than becoming sibling headings. The final lint order now checks hierarchy, accordion grouping, bold-label density, short lines, and visual-block grammar.

The guidance is generic and source-agnostic. It describes how to classify and render collections without naming a particular document or prescribing a one-off correction.

---

## Journal record: 018-authoring-context.md

# Document generation prompt — iteration 018

- Date: 2026-09-11
- Gem: `Document` (`b2b810394d61`)
- Mode: Gemini Fast fallback
- Prompt source: `GEMINI_LEAF_PROMPT` in `scripts/generation/_gemini.ts`
- Source fixture: complete Canvas capture supplied to the local harness
- Update path: non-headed Playwright Chrome via `scripts/generation/document-gem.spec.ts`
- Output: `/Users/kaimacann/Downloads/canvas-gem-fast-iteration-018`
- Status: verified in the local download-only harness

This iteration keeps the generic hierarchy, salience, accordion, brevity, and rendering-grammar rules unchanged. It removes the scraper implementation from the authoring context because transport and browser code are not documentation style guidance. Reducing unrelated implementation context keeps the authoring model focused on the supplied document source and the supported output schema.

The Gem update removes prior scraper attachments and retains only authoring style, output-contract, and renderer-schema context. The local harness applies a source-agnostic presentation guard after parsing so Fast-mode line wrapping and delimiter spacing cannot degrade the downloaded result. Generation remains local, non-headed, and write-free outside Downloads.

Instruction-only Gem save was verified through non-headed Chrome. The final sample contains one native table, five canonical code blocks, four titled task accordions, no citation markers, no inner triple-backtick fence, and no ordinary line at or above the 90-character presentation guard.

---

## Journal record: 019-source-synthesis-and-canvas-download.md

# Document generation — iteration 019

- Date: 2026-09-11
- Gem: `Document` (`b2b810394d61`)
- Mode: Gemini Fast fallback / Gemini Pro production override
- Prompt source: `scripts/generation/_gemini.ts` (`GEMINI_LEAF_PROMPT`)
- Handling source: `scripts/export/canvas.mts` and `mcp.ts`
- Status: prompt and source-ingestion revision prepared

## Prompt revision

The generation contract now treats every readable Canvas page and attachment as source content, not as a resource catalogue. It requires the model to read documents, presentations, PDFs, transcripts, and captured pages before drafting; absorb their concepts, explanations, examples, questions, answers, procedures, and code; and produce one concept-led primary reference.

The prompt explicitly forbids replacing source comprehension with a resource inventory. It removes Canvas weeks, module names, lecture labels, subject-information sections, subject-resource sections, filenames, and phrases such as “review the slides” from the main document unless a link or label is strictly necessary to act on the content. Continued and repeated concepts should be merged across all supplied sources. Secondary practice collections may still be retained, but their substantive content belongs in focused accordions or other appropriate Docs blocks.

## Ingestion revision

Canvas file links are preview pages, not file bytes. The exporter now requests the authenticated `/download?download_frd=1` endpoint and rejects an HTML Canvas preview masquerading as a document. The MCP generation path extracts text from DOCX and PPTX Office XML in addition to existing plain text and PDF extraction, so binary attachments are available to Gemini as both files and readable context. Mis-imported preview HTML is rejected instead of being synthesised into a filename table.

## Registry revision

Canvas source routes are matched through a normalised source identity rather than the Docs leaf title. A renamed leaf therefore remains addressable, and multiple module routes may continue to point at one merged leaf without creating duplicates. The registry remains the authority for the number of generation requests: one request per unique routed leaf.

---

## Journal record: 020-alignment-baseline.md

# Document generation — alignment baseline 020

- Date: 2026-09-11
- Gem: `Document` (`b2b810394d61`)
- Mode: Gemini Fast fallback
- Prompt source: `scripts/generation/_gemini.ts` (`GEMINI_LEAF_PROMPT`)
- Knowledge files: `002-terra-docs-production-style-context.md`, `003-fast-mode-contract.md`, `sanity/schemas/docs.tsx`
- Baseline output: `/Users/kaimacann/Downloads/canvas-gem-fast-iteration-018`
- Status: baseline captured before alignment revision

This record preserves the prompt and Gem context used for the previous local sample. The baseline was structurally valid, but alignment review found several style failures: prose was split into too many short lines, technical notation was inconsistently marked inline, secondary practice material dominated the outline, and process material was not consistently represented by the available visual blocks. The next revision addresses those generic failure modes rather than encoding a correction for one document.

The exact baseline instruction remains in `GEMINI_LEAF_PROMPT` at the revision represented by this record. The Gem was not changed while capturing this record.

---

## Journal record: 021-production-style-alignment.md

# Document generation — alignment revision 021

- Date: 2026-09-11
- Gem: `Document` (`b2b810394d61`)
- Mode: Gemini Fast fallback
- Prompt source: `scripts/generation/_gemini.ts` (`GEMINI_LEAF_PROMPT`)
- Context files: `002-terra-docs-production-style-context.md`, `003-fast-mode-contract.md`, `sanity/schemas/docs.tsx`
- Local source fixture: `/Users/kaimacann/Downloads/network-fundamentals-canvas-fixed-3/course-40934/week7`
- Local output: `/Users/kaimacann/Downloads/canvas-gem-fast-iteration-020-week7`
- Status: prompt revision ready for Gem update; local baseline was generated before the Gem save

This revision is based on an align review of the Week 7 output against the production handwritten documentation examples. It removes the instruction to put every sentence on a separate line and allows connected paragraphs to carry the narrative. It makes inline technical notation explicit: protocol and standard acronyms, tools, commands, types, fields, symbols, and short expressions use inline `<code>`, while equations and symbolic relationships use `$...$`.

The revision also makes block selection an explicit final audit. Definitions and constraints should use concise asides, repeated records should use tables, genuine sequences or dependency chains should use a valid `<Nodes>` diagram with complete JSON attributes, and secondary task collections should use titled accordions. `<Code>` must never be nested inside a Nodes attribute. These are generic alignment rules rather than instructions tied to one Week 7 example.

---

## Journal record: 022-nodes-normalisation-fix.md

# Document generation — handling fix 022

- Date: 2026-09-11
- Gem: `Document` (`b2b810394d61`)
- Mode: Gemini Fast fallback
- Prompt revision: 021
- Handling source: `scripts/generation/_gemini.ts`
- Local fixture: `/Users/kaimacann/Downloads/network-fundamentals-canvas-fixed-3/course-40934/week7`
- Output: `/Users/kaimacann/Downloads/canvas-gem-fast-iteration-022-week7`
- Status: local validation fix pending verification

The alignment run exposed a normaliser bug rather than a Gemini formatting failure. The normaliser treated object literals inside a valid `<Nodes>` `nodes` or `edges` attribute as standalone code objects and wrapped them in `<Code>`. The normaliser now tracks the Nodes attribute shell and leaves its JSON/object lines untouched; the structural guard still rejects a model response that genuinely nests `<Code>` inside a Nodes block. No prompt or Gem instruction changed for this handling fix.

---

## Journal record: 023-alignment-review-022.md

# Document generation — alignment review 023

- Date: 2026-09-11
- Gem: `Document` (`b2b810394d61`)
- Mode: Gemini Fast fallback
- Prompt baseline: 021
- Handling baseline: 022
- Local fixture: `/Users/kaimacann/Downloads/network-fundamentals-canvas-fixed-3/course-40934/week7`
- Reviewed output: `/Users/kaimacann/Downloads/canvas-gem-fast-iteration-022-week7`
- Status: baseline reviewed before the next prompt revision

The 022 sample is materially closer to the handwritten production leaves: its prose is connected, its section hierarchy is concept-led, and it uses tables, asides, an accordion, a valid Nodes diagram, inline code, and inline maths. The remaining alignment gaps are generic block-choice and notation issues. Technical acronyms are still inconsistently marked as inline code, comparison cases remain a numbered list even though a table would expose the relationship more clearly, and some bold-label bullets still carry information that should be a table, aside, or short prose.

---

## Journal record: 024-inline-technical-token-guard.md

# Document generation — handling fix 024

- Date: 2026-09-11
- Gem: `Document` (`b2b810394d61`)
- Mode: Gemini Fast fallback
- Prompt revision: 023
- Handling source: `scripts/generation/_gemini.ts`
- Input sample: `/Users/kaimacann/Downloads/canvas-gem-fast-iteration-023-week7/normalized-response.md`
- Status: local presentation guard added

The 023 sample used inline notation well in many places but left technical acronyms unmarked in ordinary prose and table cells. The presentation guard now marks uppercase technical tokens and IPv-style protocol names as inline `<code>` spans while protecting existing code, maths, HTML, and Nodes attributes. This is a generic presentation safeguard; it does not add facts or alter source content. The model prompt remains responsible for choosing notation and for distinguishing ordinary capitalisation from technical tokens.

---

## Journal record: 025-alignment-accepted.md

# Document generation — alignment accepted 025

- Date: 2026-09-11
- Gem: `Document` (`b2b810394d61`)
- Mode: Gemini Fast fallback
- Prompt revision: 023
- Handling revisions: 022 and 024
- Compared output: `/Users/kaimacann/Downloads/canvas-gem-fast-iteration-024-week7/normalized-response.md`
- Status: accepted as the aligned Week 7 local reference

The final local Week 7 artifact is concept-led and follows the production handwritten form: it uses connected paragraphs, 6 native tables, 1 subject-focused Nodes diagram, 1 salient aside, and 3 titled accordions. The presentation guard records 82 inline technical-code spans and 23 inline math expressions, with no nested code in Nodes and no ordinary line over 140 characters.

The normalized source was parsed through the repository's `mdToDocBody` and `compactDocBody` path into 47 Docs blocks. The artifact contains no resource-index heading or source-catalogue language. It remains a local Downloads artifact; no Sanity or production mutation was made during alignment.

---

## Journal record: 026-source-completeness-gate.md

# Document generation — source completeness gate 026

- Date: 2026-09-11
- Gem: `Document` (`b2b810394d61`)
- Mode: Gemini Fast fallback
- Prompt source: `scripts/generation/_gemini.ts` (`GEMINI_LEAF_PROMPT`)
- Handling source: `scripts/generation/_coverage.ts`, `scripts/generation/_heal.ts`
- Context files: `journal.md`, `sanity/schemas/docs.tsx`
- Local validation: deterministic source coverage plus a strict Gemini semantic audit
- Retry policy: initial attempt plus three bounded healing retries
- Status: prompt revision prepared for Gem update; production remediation follows passing local checks

This revision closes a silent-quality gap exposed by Network Fundamentals Week5. The previous pipeline accepted a syntactically valid two-block response even when ten readable attachments contained approximately 55,700 source characters. The prompt now requires an attachment-by- attachment coverage checklist and rejects concise summaries that omit substantive source material.

The programmatic boundary is implemented separately from prompt style. `_coverage.ts` measures source-weighted output size and distinctive attachment evidence, then requests a strict semantic coverage audit from Gemini. `_heal.ts` communicates each exact failure to the next attempt and stops after three retries. Neither audit metadata nor diagnostic evidence is written into the leaf source.

---

## Journal record: 027-code-math-rendering-fix.md

# Document generation — code and math handling revision 027

- Date: 2026-09-11
- Gem: `Document` (`086da1f95729`)
- Mode: Gemini Fast fallback
- Previous Gem snapshot: `/Users/kaimacann/Downloads/document-gem-before-2026-09-11.json`
- Prompt: exact current `GEMINI_LEAF_PROMPT` exported by `scripts/generation/_gemini.ts`
- Prompt change: keep `$...$` delimiters outside emphasis/code spans and use `$$...$$` only for standalone display equations
- Handling sources: `astro/src/actions/docs/content.server.ts`, `astro/src/pages/docs/_blocks.tsx`, `mcp.ts`, `scripts/generation/fast-iteration.mts`
- Context files for Gem update: `.agents/skills/documenting/author/journal.md`, `sanity/schemas/docs.tsx`, `astro/src/pages/docs/_blocks.tsx`, `astro/src/actions/docs/content.server.ts`, `scripts/export/canvas.mts`
- Local fixture: `/Users/kaimacann/Downloads/network-fundamentals-regenerated-2026-09-11/week2`
- Local output: `/Users/kaimacann/Downloads/canvas-gem-align-week2-2026-09-11`
- Validation: parser regression fixtures for grouped LaTeX, display math, inline HTML code, and Code nested in list items; local Week2 output has 76 structured math nodes, 4 structured code blocks, and 0 raw blocks before production retry
- Status: Gem update and production retry pending final local render verification

This revision addresses two independent failures exposed by the Week2 document. The read-only Docs renderer now renders structured inline math nodes, while the server parser restores braces and angle brackets escaped during MDX protection and maps inline HTML code to the Docs `code` mark. List items now retain block-level canonical `<Code>` children instead of silently dropping them. The Gemini prompt adds the corresponding delimiter guidance, and `mcp.ts` rejects raw fallback blocks so malformed generation cannot be written as apparently valid content.

---

## Journal record: 028-source-priority-and-inline-markup.md

# Document generation — source priority and inline markup revision 028

- Date: 2026-09-11
- Gem: `Document` (`086da1f95729`)
- Mode: Gemini Fast fallback
- Prompt: exact current `GEMINI_LEAF_PROMPT` exported by `scripts/generation/_gemini.ts`
- Prompt change: explicitly ignore Gem knowledge facts and prior chat content; keep every inline `<code>` pair within one paragraph/emphasis span
- Handling source: `scripts/generation/_coverage.ts` now classifies title/link-only Canvas captures as non-readable metadata
- Context files: unchanged from revision 027; local snapshot `/Users/kaimacann/Downloads/document-gem-before-2026-09-11.json`
- Local fixture: `/Users/kaimacann/Downloads/network-fundamentals-regenerated-2026-09-11/week2`
- Local output: `/Users/kaimacann/Downloads/canvas-gem-align-week2-2026-09-11-final`
- Validation: link-only coverage regression passes; the prior local structured parse remains 76 math nodes, 4 code blocks, and 0 raw blocks; fresh generation retry pending
- Status: Gem prompt resave and local align retry pending; production remains unwritten

This prompt revision responds to the fresh Gemini retry selecting unrelated Gem-knowledge topics after a transient transport failure. It makes source precedence explicit and adds a concrete markup-boundary rule for the MDX parser. It does not broaden the factual source set or alter the Docs data model.

---

## Journal record: 029-source-package-healing.md

# Document generation — source-package healing revision 029

- Date: 2026-09-11
- Gem: `Document` (`086da1f95729`)
- Mode: Gemini Fast fallback
- Prompt source: exact current `GEMINI_LEAF_PROMPT` and `geminiRetryPrompt` in `scripts/generation/_gemini.ts`
- Handling sources: `scripts/generation/fast-iteration.mts`, `mcp.ts`, `scripts/generation/_gemini.ts`
- Handling change: healing retries re-upload the source manifest and attachments; failed uploads now abort the turn instead of being silently ignored
- Local fixture: `/Users/kaimacann/Downloads/network-fundamentals-regenerated-2026-09-11/week2`
- Validation: coverage fixtures pass; local retry previously selected the correct Week2 subject but was rejected for insufficient source coverage, so this revision prevents context loss on the next healing attempt
- Status: local align retry pending; production remains unwritten

This is a driver reliability correction, not a factual or stylistic expansion. A valid-looking short response must be healed with the source package still available; otherwise the model can only restate its summary or drift into unrelated Gem knowledge. The upload failure is now write-blocking so the completeness contract remains trustworthy.
