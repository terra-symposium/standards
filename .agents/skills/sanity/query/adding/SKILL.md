---
name: sanity-add-query
description: Add a new Sanity GROQ query accessor to astro/src/lib/queries using the schema-aware groqd builder (@lib/groq-builder). Use when adding a new query, a new query function to an existing query file, or a new query file for a document type that doesn't have one yet.
---

# Sanity Add Query

All Sanity reads belong in `astro/src/lib/queries`. Call sites must use an accessor, never inline `client.fetch(...)`.

## Add the accessor

1. Check for an existing accessor and schema under `sanity/schemas/`. Extend the existing document-type file when possible.
2. Use `q` and `runQuery` from `@lib/groq-builder`, not `defineQuery` or a raw string by default.
3. Follow the local header/section convention. Add the new file to `queries/index.ts` when needed.
4. Wire the call site to the accessor; do not duplicate query logic there.
5. Regenerate schema types only if the query introduces a document type or field missing from `astro/src/lib/sanity.types.ts`.

```ts
// API
import { PUBLISHED_ONLY, q, runQuery } from '@lib/groq-builder';

// TYPES
import type { ClientLike } from '@lib/sanity.server';

const PARTNER_BY_SLUG_QUERY = q.parameters<{ slug: string }>().star.filterByType('partner').filterBy('slug.current == $slug').slice(0);

/** Fetches a partner document by slug. */
export function getPartnerBySlug(client: ClientLike, slug: string) {
	return runQuery(PARTNER_BY_SLUG_QUERY, { parameters: { slug }, client });
}
```

## Query conventions

- Constants are private `SCREAMING_SNAKE_CASE` names ending `_QUERY`.
- Export accessors named `get<Thing>By<Field>` for one result and `get<Plural>` or `getAuthoring<Plural>` for lists.
- Take `client: ClientLike` first and add concise TSDoc directly above the accessor.
- Let groqd infer builder-backed results. Annotate results only for `defineQuery` or plain-string exceptions.
- Use `.filterBy(...)` for typed expressions; `.filterRaw(...)` for unsupported syntax. Reuse `PUBLISHED_ONLY` for draft exclusion.
- If a raw expression pattern reaches three uses, add one shared constant to `@lib/groq-builder`.
- Never add chainable `GroqBuilder.implement(...)` module augmentations; use a plain exported helper instead.

## Builder reference

| Need                                    | Builder                                                         |
| --------------------------------------- | --------------------------------------------------------------- |
| Parameters, all documents               | `q.parameters<T>().star`                                        |
| Type and field filters                  | `.filterByType(...)`, `.filterBy(...)`                          |
| Raw expression or published-only filter | `.filterRaw(...)`, `PUBLISHED_ONLY`                             |
| Projection and sort                     | `.project(...)`, `.order(...)`                                  |
| One item or inclusive range             | `.slice(0)`, `.slice(0, 1, true)`                               |
| Dereference, count, coalesce, select    | `.deref()`, `.count()`, `.coalesce()`, `.select()`              |
| Reusable shapes and escape hatches      | `.fragment()`, `.fragmentForType()`, `.as<T>()`, `.asType<T>()` |

For genuine builder limits, follow the exception policy in [`migration`](../migration/SKILL.md) and its inventory.

## Validation

Run only the generation commands needed for missing schema types, then:

```sh
npx --yes pnpm@10.30.3 run maintain
npx --yes pnpm@10.30.3 exec eslint --no-cache <new-or-changed-files>
npx --yes pnpm@10.30.3 exec tsc -p astro/tsconfig.json --noEmit --pretty false 2>&1 | rg "astro/src/lib/queries|<changed-call-site>"
```
