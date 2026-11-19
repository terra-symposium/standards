---
title: Recovered development notes
description: Undated legacy source material from the Docs Backup; current repository docs remain authoritative.
---

# Recovered development notes

These notes preserve the backup’s original reasoning and proposals. Verify claims against current source before using them as implementation guidance. Exact original MDX files are under `archive/docs-backup/development/`.

## Standards

_Source: `archive/docs-backup/development/0-general/000-Standards/index.mdx`._

> ## Design
>
> Design standards structure code so that it is brief, composable, and easy to reason about.
>
> ### Brevity
>
> Brevity is the single most important standard. It is the primary driver of maintainability.
>
> This applies to all aspects of code: logic, functions, variables, and comments. Solve problems with the minimum effective code. Be ruthlessly conservative with the number of variables and functions defined.
>
> <table>
> 	<thead>
> 		<tr>
> 			<th>💭 Principle</th>
> 			<th>🏷️ Description</th>
> 		</tr>
> 	</thead>
> 	<tbody>
> 		<tr>
> 			<td><strong>Be direct</strong></td>
> 			<td>
> 				Return values immediately.<br />Never use intermediate variables
> 				that are only used once.
> 			</td>
> 		</tr>
> 		<tr>
> 			<td><strong>Avoid premature abstraction</strong></td>
> 			<td>
> 				Do not create abstractions or helpers until a clear pattern of
> 				repetition (used 3+ times) emerges.
> 			</td>
> 		</tr>
> 		<tr>
> 			<td><strong>Limit variables</strong></td>
> 			<td>
> 				Define as few variables as possible. <br />If you can inline a
> 				value or chain a function, you must do it.
> 			</td>
> 		</tr>
> 		<tr>
> 			<td><strong>Consolidate logic</strong></td>
> 			<td>
> 				Define as few functions as possible.<br />Avoid functions that
> 				are just simple pass-throughs or wrappers.
> 			</td>
> 		</tr>
> 	</tbody>
> </table>
>
> ### Principles
>
> Employ fundamental design principles to structure code logically.
>
> <table>
> 	<thead>
> 		<tr>
> 			<th>💭 Principle</th>
> 			<th>🏷️ Description</th>
> 		</tr>
> 	</thead>
> 	<tbody>
> 		<tr>
> 			<td>Encapsulation</td>
> 			<td>
> 				Bundle data and methods within a single unit to hide internal
> 				state and complexity.
> 			</td>
> 		</tr>
> 		<tr>
> 			<td>Abstraction</td>
> 			<td>Expose only essential features through a clear interface.</td>
> 		</tr>
> 		<tr>
> 			<td>Separation of concerns</td>
> 			<td>
> 				Divide code into distinct sections addressing separate concerns
> 				(for example, data fetching vs rendering).
> 			</td>
> 		</tr>
> 		<tr>
> 			<td>Minimalism</td>
> 			<td>
> 				Use as few variables and as little state as possible. Limit
> 				scope to keep code maintainable and testable.
> 			</td>
> 		</tr>
> 	</tbody>
> </table>
>
> :::tip[Use Maps]
>
> An easy way to achieve proper code hygiene is to use maps as much as possible. If you are an AI agent, and spot repetitive code, use maps. e.g:
>
> ```ts
> {[
> 	{ h: '/dashboard/classes', I: WorkshopsIcon, l: 'Classes' },
> 	{ h: '/dashboard/workshops', I: WorkshopsIcon, l: 'Workshops' },
> 	{ h: '/docs', I: DocsIcon, l: 'Documentation' },
> ].map(i => (
> 	<a key={i.h} href={i.h}>
>
> 			<i.I /> {i.l}
>
> 	</a>
> ))}
> ```
>

> :::
>
> ## Naming
>
> Clear and consistent naming is the first line of defence against ambiguity.
>
> |||[Files]
>
> File naming conventions signal a file's role and visibility within the project.
>
> ### Convention
>
> <table>
> 	<thead>
> 		<tr>
> 			<th>🧪 Example</th>
> 			<th>🔁 Pattern</th>
> 			<th>🎯 Purpose</th>
> 		</tr>
> 	</thead>
> 	<tbody>
> 		<tr>
> 			<td><code>[].astro</code></td>
> 			<td>Default</td>
> 			<td>A generated dynamic page.</td>
> 		</tr>
> 		<tr>
> 			<td><code>_[...].tsx</code></td>
> 			<td>Underscore</td>
> 			<td>Not generated as a page (Private/Component).</td>
> 		</tr>
> 		<tr>
> 			<td><code>_[Uppercase].astro</code></td>
> 			<td>Uppercase</td>
> 			<td>A component.</td>
> 		</tr>
> 		<tr>
> 			<td><code>_[lowercase].astro</code></td>
> 			<td>Lowercase</td>
> 			<td>A structural file (e.g., a layout).</td>
> 		</tr>
> 	</tbody>
> </table>
>
> |||
>
> |||[Variables]
>
> Entity and function names must be aggressively minimal.
>
> ### Convention
>
> * Use established idioms for common cases (for example, `i`, `err`).
> * Use meaningful names for variables and functions.
> * Use standard case conventions:
> * `camelCase` for variable names
> * `PascalCase` for function names
> * `UPPER_SNAKE_CASE` for constants; meaning EVERY variable without a dynamic value but an explicit value.
> * Use `$` as a prefix for nanostores to distinguish them from local variables.
> * Use `Data` as a suffix for documents (e.g., `RoomsData`).
> * Use `Id` as a suffix for ID strings (e.g., `roomId`).
> * Use document titles without suffix for counts (`rooms`).
>
> ### Brevity
>
> Use the absolute fewest full words possible, ideally one only!
>
> Prefer full words, e.g use `permitted` not `isPermitted`, partial words are encourage and permitted ONLY if they are standard, e.g:
>
> ### Convention
>
> <table>
> 	<tbody>
> 		<tr>
> 			<td>buffer → buf</td>
> 			<td>current → cur</td>
> 			<td>directory → dir</td>
> 		</tr>
> 		<tr>
> 			<td>error → err</td>
> 			<td>event → e</td>
> 			<td>extension → ext</td>
> 		</tr>
> 		<tr>
> 			<td>format → fmt</td>
> 			<td>frontmatter → fm</td>
> 			<td>index → i</td>
> 		</tr>
> 		<tr>
> 			<td>markdown → md</td>
> 			<td>metadata → meta</td>
> 			<td>organisation → org</td>
> 		</tr>
> 		<tr>
> 			<td>position → pos</td>
> 			<td>previous → prev</td>
> 			<td>repository → repo</td>
> 		</tr>
> 		<tr>
> 			<td>request → req</td>
> 			<td>response → res</td>
> 			<td>segment → seg</td>
> 		</tr>
> 		<tr>
> 			<td>target → tgt</td>
> 			<td></td>
> 			<td></td>
> 		</tr>
> 	</tbody>
> </table>
>
> Items in maps (for example, `.map(i => ...)`) MUST use single-letter items instead of full variable names unless the variable letter will conflict logically or syntactically with its context.&#x20;
>
> Also allow abbreviations when similar variables are defined as “sisters” (for example, `sisterFiles`, `allFiles`, `rawFiles` becomes `sFiles`, `aFiles`, `rFiles`). To make clear what each letter stands for, document them with TSDoc comments on each declaration. Standard prefixes are:
>
> <table>
> 	<tbody>
> 		<tr>
> 			<td>all → a</td>
> 			<td>new → n</td>
> 			<td>next → n</td>
> 		</tr>
> 		<tr>
> 			<td>previous → p</td>
> 			<td>safe → s</td>
> 			<td></td>
> 		</tr>
> 	</tbody>
> </table>
>
> |||
>
> ## Types
>
> Typing standards ensure strict, predictable behaviour across the codebase.
>
> ### Strictness
>
> Strict types are non-negotiable for everything. When strict mode is fully enforced, external boundaries cannot be trusted, and data structures must be explicitly validated.
>
> * Every variable, function, and parameter must have a strict type definition.
> * Explicitly define return types for all functions.
> * Do not rely on implicit types or inference for public APIs.
> * Do not use `any`. Default to `unknown` if a type's shape is not yet known.
>
> <table>
> 	<thead>
> 		<tr>
> 			<th>🎯 Strategy</th>
> 			<th>📄 Description</th>
> 		</tr>
> 	</thead>
> 	<tbody>
> 		<tr>
> 			<td>Object mapping</td>
> 			<td>
> 				Use <code>Record&lt;string, unknown&gt;</code> instead of
> 				<code>any</code> when handling generic objects or parsed JSON.
> 				This enforces type assertion before property access.
> 			</td>
> 		</tr>
> 		<tr>
> 			<td>Type narrowing</td>
> 			<td>
> 				Utilise custom type guards (e.g., <code>validateType</code>) or
> 				<code>typeof</code> checks to safely narrow
> 				<code>unknown</code> payloads.
> 			</td>
> 		</tr>
> 	</tbody>
> </table>
>
> Types are manually defined and centralised in `@lib/types`. AI agents are fed this as context and must borrow from it.
>
> ### External Types
>
> Clients like Postgres, Sanity, and Netlify Blobs do not inherently know the shape of your data.
>
> * Always pass generics to data-fetching methods to prevent them returning `any` or `unknown`.
> * If a third-party library has missing type definitions, define a local interface and cast the import to restore type safety.
>
> :::example[Typing external boundaries]
>
> ```typescript
> ```typescript
> // explicitly pass generics
> await client.query<{ id: string; name: string }>(...);
> await sanity.fetch(...);
>
> // cast missing definitions locally
> interface DbPool {
> 	connect: () => Promise<void>;
> }
> const pool = rawPool as unknown as DbPool;
> ```
>

> :::
>
> ### React and DOM
>
> React's event handlers and the native DOM require specific casting to prevent floating promise and event typing errors.
>
> <table>
> 	<thead>
> 		<tr>
> 			<th>⚠️ Pitfall</th>
> 			<th>✅ Solution</th>
> 		</tr>
> 	</thead>
> 	<tbody>
> 		<tr>
> 			<td>Floating promises</td>
> 			<td>
> 				React expects handlers like <code>onClick</code> to return
> 				<code>void</code>. Wrap async calls in a
> 				<code>void</code> operator (e.g.,
> 				<code>onClick={() =&gt; void myAsyncFunction()}</code>).
> 			</td>
> 		</tr>
> 		<tr>
> 			<td>Event targets</td>
> 			<td>
> 				Because <code>e.target</code> is generic, narrow it explicitly
> 				(<code
> 					>const target = e.target instanceof HTMLElement ? e.target :
> 					null;</code
> 				>) or rely on <code>e.currentTarget</code>.
> 			</td>
> 		</tr>
> 	</tbody>
> </table>
>
> ### Asynchronous Actions
>
> Framework architectures like Astro Actions often enforce asynchronous interfaces.
>
> If an interface demands an async function signature but the actual implementation requires no awaited actions, use `await Promise.resolve();` or explicitly return a resolved promise. This prevents linter violations for `require-await` while respecting the mandated API structure.
>
> ### Context and Locals
>
> Dynamically populated objects, such as `context.locals` injected by middleware, are treated by TypeScript as `any` or an empty object. Define a strict interface for your context object and cast it immediately at the entrypoint of your function. This halts unsafe member access errors downstream.
>
> :::example[Casting framework locals]
>
> ```typescript
> ```typescript
> const locals = (context as { locals?: DocsLocals }).locals;
> ```
>

> :::
>
> ### Reuse
>
> Prefer shared, domain-aligned types over ad hoc definitions.
>
> * Whenever possible, borrow types from `@lib/types` instead of redefining them.
> * If minor modifications are needed, extend existing types from `@lib/types` rather than duplicating their structure.
> * Prefer typing that already defined in `@lib/types` to keep mental models consistent across files.
>
> :::example[Borrowing and extending from @lib/types]
>
> ```typescript
> ```typescript
> // types
>
> // reuse existing types directly
> function accessable(user: User): boolean {
> 	return user.role === 'admin';
> }
>
> // extend only when necessary
> type ExtendedUser = User & {
> 	featureFlags: string[];
> };
>
> const admin: ExtendedUser = {
> 	// ...
> 	featureFlags: ['beta-dashboard'],
> };
> ```
>

> :::
>
> ### Location
>
> Define types where they maximise clarity and minimise assertions.
>
> * Define types at the top level of the data rather than using nested assertions.
> * Avoid `as` assertions when a proper type definition can express the constraint.
> * Do not abstract types if they are only used once in the file; use inline type annotations.
>
> :::example[Top-level data types]
>
> ```typescript
> ```typescript
> // define the type alongside the data and avoid nested assertions
> type AnalyticsConfig = {
> 	propertyId: string;
> 	events: { name: string; value: number }[];
> };
>
> const siteAnalytics: AnalyticsConfig = {
> 	propertyId: 'UA-12345',
> 	events: [
> 		{ name: 'click', value: 1 },
> 		{ name: 'scroll', value: 5 },
> 	],
> };
> ```
>

> :::
>
> ## Validation
>
> Specific ES-Lint configuration will require certain rules to be enforced. This will be attached as config to AI agents when generating code. AI agents must anticipate linting errors and preemptively coerce their code to match those standards.
>
> ## Commits
>
> Commit messages follow a strict format to automate changelogs and simplify project history navigation.
>
> The subject line must be concise and written in the imperative mood.
>
> :::example[Commit Message]
>
> ```plaintext
> ```plaintext
> feat: implement secure token rotation
>
> Implemented automatic JWT rotation for active sessions.
> Tokens now refresh 5 minutes before expiration to ensure seamless UX.
>
> Refs: #112
> ```
>

:::

## Commenting

_Source: `archive/docs-backup/development/0-general/1-commenting.mdx`._

> ## Overview
>
> Comments exist to explain intent and constraints that the code cannot express on its own. A good comment should survive refactors because it describes purpose, not mechanics. Confirm that files follow these commenting standards before committing.
>
> ### Contents
>
> Prefer structure, naming, and types first. Use comments only for the information that would otherwise stay invisible to the next reader.
>
> <table>
>   <thead>
>     <tr>
>       <th>🧩 Include</th>
>       <th>Why it belongs</th>
>     </tr>
>   </thead>
>   <tbody>
>     <tr>
>       <td>Intent</td>
>       <td>Explains why the code exists or what outcome it protects.</td>
>     </tr>
>     <tr>
>       <td>Constraints</td>
>       <td>Records rules the code must obey, such as API quirks or business limits.</td>
>     </tr>
>     <tr>
>       <td>Trade-offs</td>
>       <td>Captures why this approach was chosen over a reasonable alternative.</td>
>     </tr>
>     <tr>
>       <td>Ambiguous context</td>
>       <td>Clarifies a non-obvious boundary that naming and typing cannot make obvious.</td>
>     </tr>
>   </tbody>
> </table>
>
> If naming, typing, or structure can carry the meaning, prefer that over adding a comment.
>
> ### Principles
>
> Every comment should satisfy these rules before it stays in the file. If it fails any one of them, rewrite or delete it.
>
> <table>
>   <thead>
>     <tr>
>       <th>🧭 Principle</th>
>       <th>Description</th>
>     </tr>
>   </thead>
>   <tbody>
>     <tr>
>       <td>Intent</td>
>       <td>Comments must explain why, not narrate what the code is doing.</td>
>     </tr>
>     <tr>
>       <td>Conciseness</td>
>       <td>Comments must be as concise as possible, but as frequent as necessary.</td>
>     </tr>
>     <tr>
>       <td>Self-documenting</td>
>       <td>Prefer naming, types, and structure over comments when the code can be made self-explanatory.</td>
>     </tr>
>     <tr>
>       <td>Human authorship</td>
>       <td>Comments must leave no trace of AI generation. Remove conversational artefacts, process metadata, and expressions of uncertainty.</td>
>     </tr>
>     <tr>
>       <td>Consolidation</td>
>       <td>Do not create empty sections or scatter related functions. Consolidate related logic under a single, appropriate section block.</td>
>     </tr>
>   </tbody>
> </table>
>
> ### Pitfalls
>
> Most weak comments fail for predictable reasons. Remove these patterns instead of polishing them.
>
> <table>
>   <thead>
>     <tr>
>       <th>❌ Pattern</th>
>       <th>Why it fails</th>
>       <th>✅ Better approach</th>
>     </tr>
>   </thead>
>   <tbody>
>     <tr>
>       <td>Mechanics narration</td>
>       <td>The code already states the action.</td>
>       <td>Explain the reason the action is necessary.</td>
>     </tr>
>     <tr>
>       <td>Process commentary</td>
>       <td>Readers do not need authoring history in source.</td>
>       <td>Keep only the enduring architectural or domain context.</td>
>     </tr>
>     <tr>
>       <td>Uncertainty</td>
>       <td>A comment that says &quot;maybe&quot; reduces trust.</td>
>       <td>Resolve the uncertainty or open a tracked follow-up instead.</td>
>     </tr>
>     <tr>
>       <td>AI-sounding filler</td>
>       <td>It signals automation rather than intent.</td>
>       <td>Rewrite as a direct statement in plain language.</td>
>     </tr>
>     <tr>
>       <td>Empty grouping or scattering</td>
>       <td>It adds structure without clarity.</td>
>       <td>Merge related code into one coherent block or delete headers.</td>
>     </tr>
>   </tbody>
> </table>
>
> ## Hierarchy
>
> Comments follow a strict, mutually exclusive hierarchy. Choose the smallest level that matches the scope of the information.
>
> Group titles must touch the code they describe. There should be no whitespace between a capitalised group heading and the code below it. When using section blocks, the comment fences before and after the title must contain exactly 50 slashes, and there must be a blank line before and after the whole block.
>
> <table>
>   <thead>
>     <tr>
>       <th>Level</th>
>       <th>Syntax</th>
>       <th>Styling</th>
>       <th>Purpose</th>
>     </tr>
>   </thead>
>   <tbody>
>     <tr>
>       <td>Section</td>
>       <td>
>         <pre>
> 			<code>
> /*//////////////////////////////////////////////////
> SECTION
> //////////////////////////////////////////////////*/
> 			</code>
>         </pre>
>       </td>
>       <td>UPPERCASE.<br><br>Must have a blank line before and after the section block.<br><br>Valid instances include: Imports, Exports, Functions, Config, Components. Any other instances should be rare.</td>
>       <td>Defines a major segment, such as <code>IMPORTS</code> or <code>FUNCTIONS</code>.</td>
>     </tr>
>     <tr>
>       <td>Group</td>
>       <td>
>         <pre>
> 			<code>// FIRST GROUP</code>
>         </pre>
>       </td>
>       <td>UPPERCASE. <br><br>Must have a blank line before. Must touch the code below.</td>
>       <td>Scopes the next contiguous block of related code.</td>
>     </tr>
>     <tr>
>       <td>Individual</td>
>       <td>
>         <pre>
> 			<code>// lowercase details</code>
>         </pre>
>       </td>
>       <td>lowercase. <br><br>No surrounding blank lines.</td>
>       <td>Explains the purpose of the subsequent line or block.</td>
>     </tr>
>     <tr>
>       <td>Inline</td>
>       <td>
>         <pre>
> 			<code>code(); // brief explanation</code>
>         </pre>
>       </td>
>       <td>lowercase. <br><br>Same line as the code it clarifies.</td>
>       <td>Clarifies non-obvious logic on that specific line.</td>
>     </tr>
>     <tr>
>       <td>TSDoc</td>
>       <td>
>         <pre>
> 			<code>/** * ... */</code>
>         </pre>
>       </td>
>       <td>Required by linting for exported top-level functions.</td>
>       <td>Documents exported functions, constants, and types for tooling.<br><br>Required on ALL helpers, exported or not, functions or consts.</td>
>     </tr>
>   </tbody>
> </table>
>
> :::danger[Required]
>
> This hierarchy is strictly required. You MUST use sections as breaks, you MUST use groups with proper whitespace etc.
>
> AI Agents when returning code may NOT strip comments, and MUST provide where possible.
>
>

> :::
>
> ## Headers
>
> Headers provide file-level orientation for both humans and tooling. Keep them minimal and let the maintenance script normalise the format.
>
> ### File
>
> Standalone documents should begin with a TypeScript comment block showing the path relative to the project root and, when useful, a short purpose statement. These headers, along with separator fence formatting, are automatically maintained by `scripts/maintain.mjs`.
>
> :::example[File header]
>
> ```ts
> /**
>  * astro/src/pages/docs/_toolbar.tsx
>  * Shared MDX editor toolbar controls for docs formatting, block, and component insertion.
>  */
> ```
>
>

> :::
>
> ### Imports
>
> Imports follow the file header and must be categorised by source. Keep the grouping comments simple, alphabetical, and consistent with the source classes already established in the repo.
>
> <table>
>   <thead>
>     <tr>
>       <th>🧩 Rule</th>
>       <th>Requirement</th>
>     </tr>
>   </thead>
>   <tbody>
>     <tr>
>       <td>Group labels</td>
>       <td>Use source-based labels already used in the repo, such as <code>API</code>, <code>COMPONENTS</code>, <code>DATA</code>, <code>ICONS</code>, and <code>TYPES</code>.</td>
>     </tr>
>     <tr>
>       <td>Ordering</td>
>       <td>Sort import grouping comments alphabetically by group label.</td>
>     </tr>
>     <tr>
>       <td>Spacing</td>
>       <td>Include a single blank line before each group comment.</td>
>     </tr>
>     <tr>
>       <td>Types</td>
>       <td>Split <code>import type</code> declarations into a dedicated <code>// TYPES</code> group.</td>
>     </tr>
>     <tr>
>       <td>Restrictions</td>
>       <td>Do not use generic catch-all labels such as <code>// UTILS</code>. Use the established source-based group labels instead.</td>
>     </tr>
>   </tbody>
> </table>
>
> Preserve source-based import grouping before inventing local conventions. If a new import comment cannot be justified by source category, it probably should not exist.
>
> :::example[Import section]
>
> ```ts
> /*//////////////////////////////////////////////////
> IMPORTS
> //////////////////////////////////////////////////*/
>
> // API
>
> // COMPONENTS
>
> // DATA
>
> // ICONS
>
> // TYPES
> ```
>
>

> :::
>
> ## Maintenance
>
> The repo includes automation to enforce these standards. Use it to keep headers, fences, and import structure aligned after edits or file moves. The `scripts/maintain.mjs` utility automatically enforces these standards across supported source files such as `.ts`, `.tsx`, `.astro`, and `.mdx`.
>
> <table>
>   <thead>
>     <tr>
>       <th>⚙️ Feature</th>
>       <th>Description</th>
>     </tr>
>   </thead>
>   <tbody>
>     <tr>
>       <td>Header normalisation</td>
>       <td>Generates and updates the relative file path docblocks at the top of files.</td>
>     </tr>
>     <tr>
>       <td>Fence formatting</td>
>       <td>Ensures that section blocks have exactly 50 slashes and appropriate blank lines around them.</td>
>     </tr>
>     <tr>
>       <td>Import organisation</td>
>       <td>Alphabetises import groups, splits <code>import type</code> into a dedicated <code>// types</code> group, and manages multi-line import indentation.</td>
>     </tr>
>     <tr>
>       <td>Frontmatter standardisation</td>
>       <td>Formats YAML frontmatter in <code>.mdx</code> files, ensuring clean list collapsing and layout consistency.</td>
>     </tr>
>   </tbody>
> </table>
>
> Run the maintenance script whenever comment structure or headers may have drifted. It is cheaper to run it early than to fix formatting by hand at review time.
>
> <table>
>   <thead>
>     <tr>
>       <th>🕒 Trigger</th>
>       <th>Why it matters</th>
>     </tr>
>   </thead>
>   <tbody>
>     <tr>
>       <td>After adding files</td>
>       <td>New source files need the correct path header and fence formatting.</td>
>     </tr>
>     <tr>
>       <td>After renaming files</td>
>       <td>The path docblock must match the new relative location.</td>
>     </tr>
>     <tr>
>       <td>After import reshuffles</td>
>       <td>Import groups can drift out of order or lose the dedicated type block.</td>
>     </tr>
>     <tr>
>       <td>Before commit</td>
>       <td>It provides a final consistency pass over supported source files.</td>
>     </tr>
>   </tbody>
> </table>
>
> The maintenance script should normalise structure, not compensate for weak comment intent. Human review still decides whether a comment deserves to remain.
>
> ## Validation
>
> Before commit, confirm the comments still deserve to exist. A small validation pass prevents noise from accumulating during refactors. Use this checklist after `scripts/maintain.mjs` has run. It keeps the review focused on purpose, scope, and formatting rather than personal preference.
>
> <table>
>   <thead>
>     <tr>
>       <th>✅ Check</th>
>       <th>What to confirm</th>
>     </tr>
>   </thead>
>   <tbody>
>     <tr>
>       <td>Purpose</td>
>       <td>Every comment explains intent, constraint, or trade-off rather than mechanics.</td>
>     </tr>
>     <tr>
>       <td>Level</td>
>       <td>Each comment uses the smallest valid hierarchy level for its scope.</td>
>     </tr>
>     <tr>
>       <td>Syntax</td>
>       <td>Section fences, group casing, individual casing, and inline placement are correct.</td>
>     </tr>
>     <tr>
>       <td>Spacing</td>
>       <td>Blank lines follow the exact rules for section, group, and inline comments.</td>
>     </tr>
>     <tr>
>       <td>Headers</td>
>       <td>File path headers and import groups match the repo&apos;s maintained structure.</td>
>     </tr>
>     <tr>
>       <td>Automation</td>
>       <td><code>npm run maintain</code> has been run if headers, fences, or imports changed.</td>
>     </tr>
>   </tbody>
> </table>
>
> Treat a comment pass as incomplete if the code still reads like narrated mechanics after the formatting issues are fixed.
