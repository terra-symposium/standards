---
name: hygiene
description: Audit repository environment, build, and security health; improve source clarity and documentation; and compact files without changing behavior.
---

# Hygiene

Use for repository hygiene across environment and security health, source readability, and behavior-preserving compaction. Apply the sections that match the requested scope and keep each change within the repository's ownership and validation rules.

## Repository and environment health

Use for end-to-end build, deployment, and GitHub security health reviews. Read-only inspection is the default; deployment, dependency updates, and vulnerability dismissals require authorization.

### Baseline

1. Read repository guidance, manifests, package scripts, deployment config, and CI workflows.
2. Record branch, status, runtime/package-manager versions, remotes, workspaces, and deployment targets. Preserve unrelated work.
3. Check dependencies using the frozen-lockfile procedure. Do not create developer `.env` files.
4. Run defined setup/security checks before remediation. Distinguish pre-existing failures from regressions.

### Verify builds and deployment

- Build every deployable workspace with the same scripts/configuration used by CI or Netlify. Capture exit status and warnings.
- Run required type generation or schema validation. Do not weaken checks or replace them with stubs.
- Authenticate to Netlify and confirm site identity before reading deploy state. Inspect the matching branch/commit, build command, versions, context, output, warnings, and runtime errors.
- A local green build is not remote deployment evidence. Do not copy Netlify secrets locally; use public config, mocks, or approved remote endpoints.
- If a failure is pre-application, repair install/config/toolchain first. If it reaches app build, reproduce the same workspace and command before editing code.

### Review GitHub findings

1. Confirm `gh auth status` and repository identity without exposing tokens. Retrieve Dependabot, code-scanning, secret-scanning, and workflow findings only with suitable access.
2. For each, record rule/package, severity, dependency path, vulnerable range, fixed version, repo impact, and smallest safe fix.
3. Distinguish production dependencies from development and transitive dependencies; avoid blanket upgrades.
4. For exposed secrets, revoke or rotate through the owning provider first, then remove exposure and verify the replacement path. Never repeat the value.
5. Trace code-scanning data flow and add a regression check when practical. Document evidence for accepted false positives; do not suppress findings merely for a green run.

### Repair and close

For each actionable issue, identify its owner, make the smallest complete fix, run the narrowest proof, then rerun the affected workspace or provider check. Inspect lockfile/package changes and avoid unrelated refactors or dependency churn. Record external blockers and required sign-in.

Do not end an authorized remediation after producing a diagnosis or findings list. Apply safe fixes in the owning worktree, rerun the same checks, and iterate until they pass with no actionable findings. If credentials, permissions, upstream patches, or a live provider prevent completion, report that precise blocker and leave the remediation explicitly incomplete.

Report build, setup, quality, type/schema, security, and deployment evidence as applicable, plus unresolved gaps. Do not call the environment deployment-ready while required evidence is missing.

## Source readability, comments, and documentation

Use comments to expose structure, intent, boundaries, and contracts that are difficult to recover from syntax alone. Comments must remain accurate after ordinary refactors; do not narrate obvious statements or add noise merely to increase comment density.

### Workflow

1. Work in the user-supplied Terra checkout and treat its `.agents` directory as authoritative; ignore stale sibling checkouts. Inspect the repository's quality configuration and representative neighboring files before editing. If the Terra Docs MCP is available, search for the commenting practice leaf under `Development`, read it, and treat it as the project-specific source of truth.
2. Map the file before changing it: imports, configuration/constants/types, helpers, public components/functions, side effects, and tests. Identify repeated section fences, orphaned labels, duplicated imports, and functions that contain multiple unrelated responsibilities.
3. Reorganize code into coherent sections without changing behavior. Keep declarations close to the code they explain, preserve dependency order, and update imports/exports and tests when a split or merge changes module boundaries.
4. Add or repair comments only where they clarify why, contract, lifecycle, data flow, security boundary, or phase. Re-read each comment against the implementation after the edit.
5. Run the repository's formatter/maintenance and narrow tests. Re-run maintenance or its dry/idempotence check when available; inspect the diff manually rather than accepting an automated rewrite blindly.

### Parallel domain review

When the work spans several major domains, create one subagent for each domain before editing. Typical domains are UI/pages/components, forecasting and commercial logic, conversation and CRM, guidance and SalesFeed, integrations/auth/platform, and tests. Give every agent a disjoint file scope and an explicit contract: inspect each function individually, hand-write implementation-specific summaries, preserve and complete existing `@param`/`@return` tags, add phase comments only at real boundaries, and avoid runtime changes unless the task explicitly includes them. Do not assign overlapping write scopes or ask agents to perform repository-wide substitutions.

The main agent owns integration and immediate build blockers. Review every agent diff against its implementation, reconcile cross-domain naming and section order, and run focused validation after each batch. If the task is small, use judgment to reduce the number of agents; for a repository-wide commenting pass, use all applicable major domains so the work can proceed concurrently.

### Source organization

Prefer the repository's canonical full-width section fences. In Terra projects these are normally `IMPORTS`, `CONFIG`, `HELPERS`, and `COMPONENTS`; use only sections that contain code and keep exactly one blank line around a fence. Group imports under concise uppercase labels such as `// API`, `// COMPONENTS`, `// DATA`, and `// TYPES`. Within a long function or test, use uppercase line labels for meaningful phases such as `// VALIDATION`, `// MUTATION`, `// PERSISTENCE`, or `// ASSERTION`.

When merging files, collate each section rather than concatenating file A below file B. Deduplicate imports, constants, helpers, exports, and section headings. Resolve same-name collisions and self-imports deliberately. A merged file should read as one designed module, not as an archaeological record of its source files.

#### Type-definition files

Treat `types.ts` and `types.tsx` as designed type registries, not append-only inventories. After imports, use only meaningful domain sections. Every exported type, interface, enum, and type-bearing constant must appear under exactly one specific group inside exactly one section; do not leave declarations between groups, repeat group headings, or create catch-all groups that mix unrelated domains. A section is a broad domain and a group is one coherent subdomain.

For type registries, sort sections alphabetically, groups alphabetically within each section, and top-level declarations alphabetically within each group by declaration name. Keep each group contiguous. Use exactly one blank line around section and group markers, no blank lines between declarations in one group, and no blank line between a TSDoc block and its declaration. Remove empty sections, duplicate markers, orphaned comments, and stale source-order headings.

Reuse the repository's canonical shadcn colour/variant matrix across primitives. Do not recreate overlapping primitive-specific unions for controls, menu items, surfaces, cards, or individual components, and do not add pass-through aliases such as `CardVariant = SurfaceVariant`. Reference canonical types directly; retain a derived type only when it adds a genuinely different contract or required structural composition.

Do not use dynamic import type expressions in a type registry, including `typeof import('...')`, `import('...').Type`, or schemas derived through `typeof import('...')`; they can break editor syntax highlighting. Put static imports in the import section, use namespace imports when a module-qualified type or value-derived type is needed, and use direct local references for declarations in the same file. Check the finished file for zero dynamic import expressions and valid comment delimiters.

### Decompose monoliths

Treat a monolith as a readability and responsibility problem, not merely a line-count problem. Split when a block has a distinct domain responsibility, lifecycle, data shape, side-effect boundary, or testable contract. Give extracted units names that describe their role and keep their public surface small. Use comments to mark the boundaries between the remaining phases; do not use comments to excuse a function that should be split.

For a large component or test, make the flow discoverable in order: inputs/configuration, derived state, event or mutation handlers, rendering/assertion phases, then deferred helpers. Keep helpers above declarations only when registration-time evaluation needs them. Move runtime-only helpers below the final test/component section when the repository convention requires it.

### TSDoc and JSDoc

Document public functions, exported components, exported types/interfaces/enums, non-obvious helpers, and test structures according to the repository's lint rules. A useful summary states the responsibility and intended outcome. For a type, explain the data it models, where it is used, or the invariant it preserves; read the implementation and call sites before writing the comment. Add `@param` only when the parameter's role, constraints, or source is not obvious; describe the value rather than repeating its name. Add `@returns`/`@return` when the result contract matters. Include errors, side effects, lifecycle assumptions, authorization boundaries, or data-flow relationships when they affect callers.

For a function with multiple inputs, describe each meaningful input and keep tags in signature order. Remove stale tags and correct renamed parameters. Do not invent details that are absent from the code or domain evidence. A blank generated tag is preferable to a false description only as an intermediate maintenance state; complete it when you understand the contract.

For tests, document a suite when its responsibility is not clear from its name and group comment. Add individual test TSDoc only when the scenario or expected invariant is not clear from the group and test title. Explain the behavior and expected contract, not Playwright or fixture mechanics. For a long test, add phase comments such as setup, user action, persistence, and final assertion. Add a short `input -> transformation -> observable assertion` line when it makes the tested edges clearer.

### Test-suite comments

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

### Quality bar

- Prefer one accurate comment over several paraphrases.
- Explain why, invariants, boundaries, and consequences; omit comments that merely translate `if`, `map`, or a component name.
- Keep comments adjacent to the code they govern and move them when the code moves.
- Preserve comments that are prompt context, generated-source markers, legal notices, or product documentation unless their owning workflow says otherwise.
- Protect literal strings, templates, JSX text, regexes, and generated content from structural comment tooling.
- Check for duplicate fences, empty adjacent sections, orphaned labels, stale parameter names, misleading return descriptions, and comments that contradict tests.
- Reject filler wording such as “Input overrides used by the surrounding operation” or “Result produced by this function.” Each parameter description must explain its semantic role, source, constraints, or effect, and each return description must explain the value's contract, edge behavior, or downstream use.
- Do not mass-generate documentation from names or signatures. Never emit formulaic comments such as `Describes the X type`, `Shared type for X`, `Allowed values for X`, `Props accepted by X`, or `Result produced by this function`; these are not documentation. A documentation-only pass still requires function-by-function or type-by-type review and a final search for generic, blank, duplicated, orphaned, or stale tags.

See [Terra conventions](references/conventions.md) for the repository-derived rules and quality-tool behavior used to shape this skill.

## Behavior-preserving compaction

Compact every file in the requested scope until further reduction would hide intent or change behavior. For UI repositories, standardize shared component variants before compacting call sites.

### 1. Prepare the repository

#### 1.1 Establish scope

Read repository instructions, confirm branch and worktree state, inventory the full target, and identify existing changes. Preserve unrelated work. If the user names a peer repository or an existing implementation as a reference, inspect its matching components and documentation before editing; transfer the convention that fits while preserving the target repository's own APIs and architecture.

#### 1.2 Complete the UI contract first

If the repository has UI controls, follow [the UI matrix process](references/ui-matrix.md) before compacting their callers. At call sites, use the repository's shared accessible component for an interactive control whenever one exists; do not restyle a native control beside an equivalent shared component. Add or extend the shared component when needed, and keep semantic native elements such as `section`, `article`, and headings in page structure. Native controls may remain inside shared component implementations when needed for semantics or accessibility.

### 2. Run the compact sweep

#### 2.1 Use quality scans to find component migrations

In a repository that installs the standards quality package, run `terra-quality ui-recommendations` (for example, `pnpm exec terra-quality ui-recommendations`) before compacting UI call sites. The inventory scans Astro, JSX, and TSX for native controls, button-like anchors, and styled text links that may have shared component equivalents; it can include a suggested variant. Review each match against its semantics, behavior, and the component matrix; the scan is a guide, not a bulk fixer. Migrate applicable call sites to the shared component and its canonical variant, then rerun the scan to find remaining candidates. An empty result confirms that this configured inventory is clear; it does not justify replacing semantic native elements or controls without a matching component.

#### 2.2 Parallelize by area

For a whole-repository run, divide independent areas among subagents. The parent sets and owns the shared matrix. Agents may inventory disjoint areas in parallel; once the contract is fixed, they migrate and compact only their assigned paths. Never assign shared files or the same call sites to multiple agents.

#### 2.3 Compact every file

Search callers and receiving components together. Start from the existing component API and variant contract. Express repeated color and treatment choices with the component's canonical `variant` value at the call site (for example, `variant='primary-outline'`), and use its size or other named props for presentation. Do not replace long class lists with a caller-side object or map of utility strings; define a real typed variant in the owning component family and compose its static recipe there. Delete caller classes already supplied by the component. Approximate low-level presentation with the closest valid variant and remove the classes that variant replaces. Keep caller classes only for layout or genuine one-off geometry the component API does not own.

Preserve behavior, semantics, accessibility, types, evaluation order, side effects, component identity, and meaningful comments. For repeated homogeneous content, store semantic data in an array or map and render it with `.map()` rather than duplicating JSX. Keep data semantic; do not turn it into a private class-name matrix that bypasses shared variants. Prefer maps or helpers only when they reduce repetition without hiding differences. Keep documentation easy to scan: group related guidance under headings, separate headings and paragraphs with blank lines, and use whitespace between distinct examples or table sections instead of dense prose blocks.

### 3. Integrate and finish

The parent reviews every diff, checks that every requested area and file was covered, and repeats the repository-wide search after integration. Respect each workspace's own component, icon, and formatting conventions instead of assuming packages share an implementation. Continue until no meaningful compaction remains. When commits are requested, commit each completed area on the requested development branch. Do not add or run tests unless the user asks for testing or verification.

When compaction is part of a quality or maintenance remediation, complete the requested fix rather than returning only an inventory. Run the configured quality check after the full edit batch and continue fixing actionable findings until it is green. If an external blocker or behavior constraint prevents a safe fix, leave that item explicit and mark the work incomplete; do not report an unresolved finding as complete.
