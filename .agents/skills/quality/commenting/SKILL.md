---
name: commenting
description: Improve source readability by grouping code with meaningful comments, decomposing monolithic modules, and completing accurate TSDoc/JSDoc. Use when reorganizing code or repairing sparse, duplicated, or misleading comments.
---

# Commenting

Use comments to expose structure, intent, boundaries, and contracts that are difficult to recover from syntax alone. Comments must remain accurate after ordinary refactors; do not narrate obvious statements or add noise merely to increase comment density.

## Workflow

1. Work in the user-supplied Terra checkout and treat its `.agents` directory as authoritative; ignore stale sibling checkouts. Inspect the repository's quality configuration and representative neighboring files before editing. If the Terra Docs MCP is available, search for the commenting practice leaf under `Development`, read it, and treat it as the project-specific source of truth.
2. Map the file before changing it: imports, configuration/constants/types, helpers, public components/functions, side effects, and tests. Identify repeated section fences, orphaned labels, duplicated imports, and functions that contain multiple unrelated responsibilities.
3. Reorganize code into coherent sections without changing behavior. Keep declarations close to the code they explain, preserve dependency order, and update imports/exports and tests when a split or merge changes module boundaries.
4. Add or repair comments only where they clarify why, contract, lifecycle, data flow, security boundary, or phase. Re-read each comment against the implementation after the edit.
5. Run the repository's formatter/maintenance and narrow tests. Re-run maintenance or its dry/idempotence check when available; inspect the diff manually rather than accepting an automated rewrite blindly.

## Parallel domain review

When the work spans several major domains, create one subagent for each domain before editing. Typical domains are UI/pages/components, forecasting and commercial logic, conversation and CRM, guidance and SalesFeed, integrations/auth/platform, and tests. Give every agent a disjoint file scope and an explicit contract: inspect each function individually, hand-write implementation-specific summaries, preserve and complete existing `@param`/`@return` tags, add phase comments only at real boundaries, and avoid runtime changes unless the task explicitly includes them. Do not assign overlapping write scopes or ask agents to perform repository-wide substitutions.

The main agent owns integration and immediate build blockers. Review every agent diff against its implementation, reconcile cross-domain naming and section order, and run focused validation after each batch. If the task is small, use judgment to reduce the number of agents; for a repository-wide commenting pass, use all applicable major domains so the work can proceed concurrently.

## Source organization

Prefer the repository's canonical full-width section fences. In Terra projects these are normally `IMPORTS`, `CONFIG`, `HELPERS`, and `COMPONENTS`; use only sections that contain code and keep exactly one blank line around a fence. Group imports under concise uppercase labels such as `// API`, `// COMPONENTS`, `// DATA`, and `// TYPES`. Within a long function or test, use uppercase line labels for meaningful phases such as `// VALIDATION`, `// MUTATION`, `// PERSISTENCE`, or `// ASSERTION`.

When merging files, collate each section rather than concatenating file A below file B. Deduplicate imports, constants, helpers, exports, and section headings. Resolve same-name collisions and self-imports deliberately. A merged file should read as one designed module, not as an archaeological record of its source files.

### Type-definition files

Treat `types.ts` and `types.tsx` as designed type registries, not append-only inventories. After imports, use only meaningful domain sections. Every exported type, interface, enum, and type-bearing constant must appear under exactly one specific group inside exactly one section; do not leave declarations between groups, repeat group headings, or create catch-all groups that mix unrelated domains. A section is a broad domain and a group is one coherent subdomain.

For type registries, sort sections alphabetically, groups alphabetically within each section, and top-level declarations alphabetically within each group by declaration name. Keep each group contiguous. Use exactly one blank line around section and group markers, no blank lines between declarations in one group, and no blank line between a TSDoc block and its declaration. Remove empty sections, duplicate markers, orphaned comments, and stale source-order headings.

Reuse the repository's canonical shadcn colour/variant matrix across primitives. Do not recreate overlapping primitive-specific unions for controls, menu items, surfaces, cards, or individual components, and do not add pass-through aliases such as `CardVariant = SurfaceVariant`. Reference canonical types directly; retain a derived type only when it adds a genuinely different contract or required structural composition.

Do not use dynamic import type expressions in a type registry, including `typeof import('...')`, `import('...').Type`, or schemas derived through `typeof import('...')`; they can break editor syntax highlighting. Put static imports in the import section, use namespace imports when a module-qualified type or value-derived type is needed, and use direct local references for declarations in the same file. Check the finished file for zero dynamic import expressions and valid comment delimiters.

## Decompose monoliths

Treat a monolith as a readability and responsibility problem, not merely a line-count problem. Split when a block has a distinct domain responsibility, lifecycle, data shape, side-effect boundary, or testable contract. Give extracted units names that describe their role and keep their public surface small. Use comments to mark the boundaries between the remaining phases; do not use comments to excuse a function that should be split.

For a large component or test, make the flow discoverable in order: inputs/configuration, derived state, event or mutation handlers, rendering/assertion phases, then deferred helpers. Keep helpers above declarations only when registration-time evaluation needs them. Move runtime-only helpers below the final test/component section when the repository convention requires it.

## TSDoc and JSDoc

Document public functions, exported components, exported types/interfaces/enums, non-obvious helpers, and test structures according to the repository's lint rules. A useful summary states the responsibility and intended outcome. For a type, explain the data it models, where it is used, or the invariant it preserves; read the implementation and call sites before writing the comment. Add `@param` only when the parameter's role, constraints, or source is not obvious; describe the value rather than repeating its name. Add `@returns`/`@return` when the result contract matters. Include errors, side effects, lifecycle assumptions, authorization boundaries, or data-flow relationships when they affect callers.

For a function with multiple inputs, describe each meaningful input and keep tags in signature order. Remove stale tags and correct renamed parameters. Do not invent details that are absent from the code or domain evidence. A blank generated tag is preferable to a false description only as an intermediate maintenance state; complete it when you understand the contract.

For tests, document a suite when its responsibility is not clear from its name and group comment. Add individual test TSDoc only when the scenario or expected invariant is not clear from the group and test title. Explain the behavior and expected contract, not Playwright or fixture mechanics. For a long test, add phase comments such as setup, user action, persistence, and final assertion. Add a short `input -> transformation -> observable assertion` line when it makes the tested edges clearer.

## Test-suite comments

Test suites need both an executable hierarchy and comments at the right scope. A fence documents the file section; `describe` documents a runner-visible behavior boundary; a group comment groups adjacent cases that do not need a separate runner boundary; a phase comment explains a substantial flow inside one test. Do not substitute one level for another or leave a long suite as an undifferentiated run of test declarations.

- Use one full-width `TESTS` section fence for the test region of a file. It is a file-level section, not a suite or group heading.
- Under the fence, make the top-level `describe`/`test.describe` express the file's test responsibility. Use nested `describe`/`test.describe` for a distinct behavior, state boundary, or setup context that readers may need to run or understand separately. Use the shared `describeGroup` wrapper for independently selectable Node groups; it must remain a normal Node test suite so `--test-name-pattern` can filter it.
- Use a concise uppercase group comment such as `// CUSTOMER SEARCH` or `// KEYBOARD ACCESSIBILITY` only for a contiguous block of related tests that does not warrant another runner-visible suite. Put it directly above the first test or the setup hook it scopes. Do not repeat a suite title as a comment or section fence.
- Put setup hooks at the narrowest suite that owns their prerequisites. A hook that changes shared state belongs in a serial suite only when tests genuinely depend on execution order; prefer independent tests and isolated fixtures over serial execution.
- Use data-driven cases when inputs vary but the contract and assertions stay the same. Give each case a descriptive test title and keep materially different outcomes as separate named tests or nested suites.
- Keep tests in the same group adjacent: no blank lines between their declarations. Put one blank line before the next group comment. Do not add blank lines between a group comment and its first declaration.
- Group by behavior or contract (for example, `// AUTHENTICATED STATE`, `// HEADER CONTAINMENT`, `// KEYBOARD ACCESSIBILITY`), not by test count, implementation file, or historical milestone. Prefer nested `describe`/`test.describe` when the grouping is also a meaningful runner/filter boundary; otherwise use a line comment.
- Add a short TSDoc directly above a suite when its responsibility is not clear from the suite name. Add individual test TSDoc only when the scenario or expected invariant is not clear from its group and test title; never paraphrase the title.
- For a long test, add uppercase phase comments only where execution crosses a meaningful boundary: `// PREPARE EVIDENCE`, `// PERFORM USER ACTION`, `// VERIFY PERSISTENCE`, or `// ASSERT THE CONTRACT`. Keep code in each phase together with no blank lines inside the phase. Do not label every assertion or narrate obvious fixture setup.

```ts
/*//////////////////////////////////////////////////
TESTS
//////////////////////////////////////////////////*/

test.describe('authenticated dashboard header', () => {
	// Shared authentication is scoped here because every contract in this suite needs it.
	// AUTHENTICATED STATE
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('navigation')).toBeVisible();
	});

	// HEADER CONTAINMENT
	test('keeps navigation inside the visible header', async ({ page }) => {
		// MEASURE RENDERED STATE
		const bounds = await page.locator('header').evaluate(element => {
			const rect = element.getBoundingClientRect();
			return { left: rect.left, right: rect.right, viewport: window.innerWidth };
		});
		// ASSERT THE CONTRACT
		expect(bounds.left).toBeGreaterThanOrEqual(0);
		expect(bounds.right).toBeLessThanOrEqual(bounds.viewport);
	});
	test('keeps every primary tab visible', async ({ page }) => {
		await expect(page.getByRole('tab')).toHaveCount(5);
	});

	// KEYBOARD ACCESSIBILITY
	test('exposes a visible focus state on header controls', async ({ page }) => {
		await page.getByRole('link', { name: 'Salesphere home' }).focus();
		await expect(page.getByRole('link', { name: 'Salesphere home' })).toBeFocused();
	});
});
```

For Node tests, the group name is also the focused-run selector. Keep group titles stable and descriptive; nested suites remain filterable by their title without a custom filtering implementation inside the tests.

```ts
import { it } from 'node:test';
import { describeGroup } from '../shared/test-groups';

describeGroup('customer identity resolution', () => {
	describe('ambiguous people', () => {
		// CONFIRMATION BOUNDARIES
		it('asks for clarification when two contacts share a first name', () => {
			// ASSERT THE CONTRACT
			assert.equal(resolvePerson('Sam').kind, 'ambiguous');
		});
	});
});
```

Run a Node group by passing its literal title to the suite runner, or use Playwright's native `--grep` against a `test.describe` title. Do not implement a second test-selection DSL in suite code. Use `describe.each` only where the selected runner provides it; otherwise register data-driven cases with a loop and include the case label in each test title.

## Quality bar

- Prefer one accurate comment over several paraphrases.
- Explain why, invariants, boundaries, and consequences; omit comments that merely translate `if`, `map`, or a component name.
- Keep comments adjacent to the code they govern and move them when the code moves.
- Preserve comments that are prompt context, generated-source markers, legal notices, or product documentation unless their owning workflow says otherwise.
- Protect literal strings, templates, JSX text, regexes, and generated content from structural comment tooling.
- Check for duplicate fences, empty adjacent sections, orphaned labels, stale parameter names, misleading return descriptions, and comments that contradict tests.
- Reject filler wording such as “Input overrides used by the surrounding operation” or “Result produced by this function.” Each parameter description must explain its semantic role, source, constraints, or effect, and each return description must explain the value's contract, edge behavior, or downstream use.
- Do not mass-generate documentation from names or signatures. Never emit formulaic comments such as `Describes the X type`, `Shared type for X`, `Allowed values for X`, `Props accepted by X`, or `Result produced by this function`; these are not documentation. A documentation-only pass still requires function-by-function or type-by-type review and a final search for generic, blank, duplicated, orphaned, or stale tags.

See [Terra conventions](references/terra-conventions.md) for the repository-derived rules and quality-tool behavior used to shape this skill.
