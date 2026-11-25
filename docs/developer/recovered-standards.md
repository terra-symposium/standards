---
title: Historical development guidance
description: Historical standards and commenting guidance consolidated for current contributors.
---

# Historical development guidance

This guide consolidates earlier standards and commenting guidance for reference. Verify technical recommendations against current repository conventions before applying them.

## Standards

_Source: historical Standards development guidance._

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
> | 💭 Principle                        | 🏷️ Description                                                                                                 |
> | ----------------------------------- | -------------------------------------------------------------------------------------------------------------- |
> | > **Be direct** >                   | > Return values immediately. > ; > Never use intermediate variables that are only used once. >                 |
> | > **Avoid premature abstraction** > | Do not create abstractions or helpers until a clear pattern of repetition (used 3+ times) emerges.             |
> | > **Limit variables** >             | > Define as few variables as possible. ; > If you can inline a value or chain a function, you must do it. >    |
> | > **Consolidate logic** >           | > Define as few functions as possible. > ; > Avoid functions that are just simple pass-throughs or wrappers. > |
>
> ### Principles
>
> Employ fundamental design principles to structure code logically.
>
> | 💭 Principle           | 🏷️ Description                                                                                             |
> | ---------------------- | ---------------------------------------------------------------------------------------------------------- |
> | Encapsulation          | Bundle data and methods within a single unit to hide internal state and complexity.                        |
> | Abstraction            | Expose only essential features through a clear interface.                                                  |
> | Separation of concerns | Divide code into distinct sections addressing separate concerns (for example, data fetching vs rendering). |
> | Minimalism             | Use as few variables and as little state as possible. Limit scope to keep code maintainable and testable.  |
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
> | 🧪 Example               | 🔁 Pattern | 🎯 Purpose                                   |
> | ------------------------ | ---------- | -------------------------------------------- |
> | > `[].astro` >           | Default    | A generated dynamic page.                    |
> | > `_[...].tsx` >         | Underscore | Not generated as a page (Private/Component). |
> | > `_[Uppercase].astro` > | Uppercase  | A component.                                 |
> | > `_[lowercase].astro` > | Lowercase  | A structural file (e.g., a layout).          |
>
> |||
>
> |||[Variables]
>
> Entity and function names must be aggressively minimal.
>
> ### Convention
>
> - Use established idioms for common cases (for example, `i`, `err`).
> - Use meaningful names for variables and functions.
> - Use standard case conventions:
> - `camelCase` for variable names
> - `PascalCase` for function names
> - `UPPER_SNAKE_CASE` for constants; meaning EVERY variable without a dynamic value but an explicit value.
> - Use `$` as a prefix for nanostores to distinguish them from local variables.
> - Use `Data` as a suffix for documents (e.g., `RoomsData`).
> - Use `Id` as a suffix for ID strings (e.g., `roomId`).
> - Use document titles without suffix for counts (`rooms`).
>
> ### Brevity
>
> Use the absolute fewest full words possible, ideally one only!
>
> Prefer full words, e.g use `permitted` not `isPermitted`, partial words are encourage and permitted ONLY if they are standard, e.g:
>
> ### Convention
>
> | 🧠 Term      | ✂️ Abbreviation |
> | ------------ | --------------- |
> | buffer       | buf             |
> | current      | cur             |
> | directory    | dir             |
> | error        | err             |
> | event        | e               |
> | extension    | ext             |
> | format       | fmt             |
> | frontmatter  | fm              |
> | index        | i               |
> | markdown     | md              |
> | metadata     | meta            |
> | organisation | org             |
> | position     | pos             |
> | previous     | prev            |
> | repository   | repo            |
> | request      | req             |
> | response     | res             |
> | segment      | seg             |
> | target       | tgt             |
>
> Items in maps (for example, `.map(i => ...)`) MUST use single-letter items instead of full variable names unless the variable letter will conflict logically or syntactically with its context.&#x20;
>
> Also allow abbreviations when similar variables are defined as “sisters” (for example, `sisterFiles`, `allFiles`, `rawFiles` becomes `sFiles`, `aFiles`, `rFiles`). To make clear what each letter stands for, document them with TSDoc comments on each declaration. Standard prefixes are:
>
> | 🧠 Term  | ✂️ Abbreviation |
> | -------- | --------------- |
> | all      | a               |
> | new      | n               |
> | next     | n               |
> | previous | p               |
> | safe     | s               |
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
> - Every variable, function, and parameter must have a strict type definition.
> - Explicitly define return types for all functions.
> - Do not rely on implicit types or inference for public APIs.
> - Do not use `any`. Default to `unknown` if a type's shape is not yet known.
>
> | 🎯 Strategy    | 📄 Description                                                                                                                                          |
> | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | Object mapping | > Use `Record<string, unknown>` instead of > `any` when handling generic objects or parsed JSON. This enforces type assertion before property access. > |
> | Type narrowing | > Utilise custom type guards (e.g., `validateType`) or > `typeof` checks to safely narrow > `unknown` payloads. >                                       |
>
> Types are manually defined and centralised in `@lib/types`. AI agents are fed this as context and must borrow from it.
>
> ### External Types
>
> Clients like Postgres, Sanity, and Netlify Blobs do not inherently know the shape of your data.
>
> - Always pass generics to data-fetching methods to prevent them returning `any` or `unknown`.
> - If a third-party library has missing type definitions, define a local interface and cast the import to restore type safety.
>
> :::example[Typing external boundaries]
>
> ````typescript
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
> ````

> :::
>
> ### React and DOM
>
> React's event handlers and the native DOM require specific casting to prevent floating promise and event typing errors.
>
> | ⚠️ Pitfall        | ✅ Solution                                                                                                                                             |
> | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | Floating promises | React expects handlers like `onClick` to return `void`. Wrap async calls in a `void` operator (e.g., `onClick={() => void myAsyncFunction()}`).         |
> | Event targets     | Because `e.target` is generic, narrow it explicitly (`const target = e.target instanceof HTMLElement ? e.target : null;`) or rely on `e.currentTarget`. |
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
> ````typescript
> ```typescript
> const locals = (context as { locals?: DocsLocals }).locals;
> ````

> :::
>
> ### Reuse
>
> Prefer shared, domain-aligned types over ad hoc definitions.
>
> - Whenever possible, borrow types from `@lib/types` instead of redefining them.
> - If minor modifications are needed, extend existing types from `@lib/types` rather than duplicating their structure.
> - Prefer typing that already defined in `@lib/types` to keep mental models consistent across files.
>
> :::example[Borrowing and extending from @lib/types]
>
> ````typescript
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
> ````

> :::
>
> ### Location
>
> Define types where they maximise clarity and minimise assertions.
>
> - Define types at the top level of the data rather than using nested assertions.
> - Avoid `as` assertions when a proper type definition can express the constraint.
> - Do not abstract types if they are only used once in the file; use inline type annotations.
>
> :::example[Top-level data types]
>
> ````typescript
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
> ````

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
> ````plaintext
> ```plaintext
> feat: implement secure token rotation
>
> Implemented automatic JWT rotation for active sessions.
> Tokens now refresh 5 minutes before expiration to ensure seamless UX.
>
> Refs: #112
> ````

> :::

## Commenting

_Source: historical commenting guidance._

> ## Overview
>
> Comments exist to explain intent and constraints that the code cannot express on its own. A good comment should survive refactors because it describes purpose, not mechanics. Confirm that files follow these commenting standards before committing.
>
> ### Contents
>
> Prefer structure, naming, and types first. Use comments only for the information that would otherwise stay invisible to the next reader.
>
> | 🧩 Include        | Why it belongs                                                               |
> | ----------------- | ---------------------------------------------------------------------------- |
> | Intent            | Explains why the code exists or what outcome it protects.                    |
> | Constraints       | Records rules the code must obey, such as API quirks or business limits.     |
> | Trade-offs        | Captures why this approach was chosen over a reasonable alternative.         |
> | Ambiguous context | Clarifies a non-obvious boundary that naming and typing cannot make obvious. |
>
> If naming, typing, or structure can carry the meaning, prefer that over adding a comment.
>
> ### Principles
>
> Every comment should satisfy these rules before it stays in the file. If it fails any one of them, rewrite or delete it.
>
> | 🧭 Principle     | Description                                                                                                                       |
> | ---------------- | --------------------------------------------------------------------------------------------------------------------------------- |
> | Intent           | Comments must explain why, not narrate what the code is doing.                                                                    |
> | Conciseness      | Comments must be as concise as possible, but as frequent as necessary.                                                            |
> | Self-documenting | Prefer naming, types, and structure over comments when the code can be made self-explanatory.                                     |
> | Human authorship | Comments must leave no trace of AI generation. Remove conversational artefacts, process metadata, and expressions of uncertainty. |
> | Consolidation    | Do not create empty sections or scatter related functions. Consolidate related logic under a single, appropriate section block.   |
>
> ### Pitfalls
>
> Most weak comments fail for predictable reasons. Remove these patterns instead of polishing them.
>
> | ❌ Pattern                   | Why it fails                                     | ✅ Better approach                                            |
> | ---------------------------- | ------------------------------------------------ | ------------------------------------------------------------- |
> | Mechanics narration          | The code already states the action.              | Explain the reason the action is necessary.                   |
> | Process commentary           | Readers do not need authoring history in source. | Keep only the enduring architectural or domain context.       |
> | Uncertainty                  | A comment that says "maybe" reduces trust.       | Resolve the uncertainty or open a tracked follow-up instead.  |
> | AI-sounding filler           | It signals automation rather than intent.        | Rewrite as a direct statement in plain language.              |
> | Empty grouping or scattering | It adds structure without clarity.               | Merge related code into one coherent block or delete headers. |
>
> ## Hierarchy
>
> Comments follow a strict, mutually exclusive hierarchy. Choose the smallest level that matches the scope of the information.
>
> Group titles must touch the code they describe. There should be no whitespace between a capitalised group heading and the code below it. When using section blocks, the comment fences before and after the title must contain exactly 50 slashes, and there must be a blank line before and after the whole block.
>
> **Section**
>
> ```ts
> /*//////////////////////////////////////////////////
> SECTION
> //////////////////////////////////////////////////*/
> ```
>
> Styling: uppercase, with a blank line before and after the section block. Use it for major segments such as imports, exports, functions, config, or components.
>
> **Group**
>
> ```ts
> // FIRST GROUP
> ```
>
> Styling: uppercase, with a blank line before and no gap before the code below. It scopes the next contiguous block of related code.
>
> **Individual**
>
> ```ts
> // lowercase details
> ```
>
> Styling: lowercase, with no surrounding blank lines. It explains the purpose of the following line or block.
>
> **Inline**
>
> ```ts
> code(); // brief explanation
> ```
>
> Styling: lowercase and on the same line as the code. It clarifies non-obvious logic on that line.
>
> **TSDoc**
>
> ```ts
> /** * ... */
> ```
>
> Required by linting for exported top-level functions. It documents exported functions, constants, and types for tooling, and is required on helpers too.
>
> | 🧠 Term | ✂️ Abbreviation |
> | ------- | --------------- |
>
> :::danger[Required]
>
> This hierarchy is strictly required. You MUST use sections as breaks, you MUST use groups with proper whitespace etc.
>
> AI Agents when returning code may NOT strip comments, and MUST provide where possible.

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

> :::
>
> ### Imports
>
> Imports follow the file header and must be categorised by source. Keep the grouping comments simple, alphabetical, and consistent with the source classes already established in the repo.
>
> | 🧩 Rule      | Requirement                                                                                                        |
> | ------------ | ------------------------------------------------------------------------------------------------------------------ |
> | Group labels | > Use source-based labels already used in the repo, such as `API`, `COMPONENTS`, `DATA`, `ICONS`, and `TYPES`. >   |
> | Ordering     | Sort import grouping comments alphabetically by group label.                                                       |
> | Spacing      | Include a single blank line before each group comment.                                                             |
> | Types        | > Split `import type` declarations into a dedicated `// TYPES` group. >                                            |
> | Restrictions | > Do not use generic catch-all labels such as `// UTILS`. Use the established source-based group labels instead. > |
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

> :::
>
> ## Maintenance
>
> The repo includes automation to enforce these standards. Use it to keep headers, fences, and import structure aligned after edits or file moves. The `scripts/maintain.mjs` utility automatically enforces these standards across supported source files such as `.ts`, `.tsx`, `.astro`, and `.mdx`.
>
> | ⚙️ Feature                  | Description                                                                                                                        |
> | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
> | Header normalisation        | Generates and updates the relative file path docblocks at the top of files.                                                        |
> | Fence formatting            | Ensures that section blocks have exactly 50 slashes and appropriate blank lines around them.                                       |
> | Import organisation         | > Alphabetises import groups, splits `import type` into a dedicated `// types` group, and manages multi-line import indentation. > |
> | Frontmatter standardisation | > Formats YAML frontmatter in `.mdx` files, ensuring clean list collapsing and layout consistency. >                               |
>
> Run the maintenance script whenever comment structure or headers may have drifted. It is cheaper to run it early than to fix formatting by hand at review time.
>
> | 🕒 Trigger              | Why it matters                                                         |
> | ----------------------- | ---------------------------------------------------------------------- |
> | After adding files      | New source files need the correct path header and fence formatting.    |
> | After renaming files    | The path docblock must match the new relative location.                |
> | After import reshuffles | Import groups can drift out of order or lose the dedicated type block. |
> | Before commit           | It provides a final consistency pass over supported source files.      |
>
> The maintenance script should normalise structure, not compensate for weak comment intent. Human review still decides whether a comment deserves to remain.
>
> ## Validation
>
> Before commit, confirm the comments still deserve to exist. A small validation pass prevents noise from accumulating during refactors. Use this checklist after `scripts/maintain.mjs` has run. It keeps the review focused on purpose, scope, and formatting rather than personal preference.
>
> | ✅ Check   | What to confirm                                                                    |
> | ---------- | ---------------------------------------------------------------------------------- |
> | Purpose    | Every comment explains intent, constraint, or trade-off rather than mechanics.     |
> | Level      | Each comment uses the smallest valid hierarchy level for its scope.                |
> | Syntax     | Section fences, group casing, individual casing, and inline placement are correct. |
> | Spacing    | Blank lines follow the exact rules for section, group, and inline comments.        |
> | Headers    | File path headers and import groups match the repo's maintained structure.         |
> | Automation | > `npm run maintain` has been run if headers, fences, or imports changed. >        |
>
> Treat a comment pass as incomplete if the code still reads like narrated mechanics after the formatting issues are fixed.
