---
name: sanity-query-migration
description: Migrate Terra Symposium Sanity GROQ queries in astro/src/lib/queries from defineQuery/plain-string strings onto the schema-aware groqd builder. Use when continuing groqd migration work, generating sanity.types.ts with Sanity CLI typegen, or rewriting a query with `@lib/groq-builder`'s `q`/`runQuery`.
---

# Sanity Query Migration

Migrate existing accessors in `astro/src/lib/queries` to the schema-aware groqd builder. Work is tracked in `GROQD_MIGRATION_INVENTORY.md`.

## Workflow

1. Read the migration inventory. Choose `ready` before `candidate`; leave `defer` items unless requested.
2. Rewrite with `q`, `runQuery`, and `PUBLISHED_ONLY` from `@lib/groq-builder`.
   - Bind parameters first: `q.parameters<{ slug: string }>().star...`.
   - Use `.filterBy(...)` for typed equality, inequality, numeric, and reference expressions.
   - Use `.filterRaw(...)` only for unsupported shapes such as `in`, `defined()`, `count()`, concatenation, or `dateTime()`.
   - Reuse `PUBLISHED_ONLY` for draft exclusion. Add a shared raw expression after its third use.
   - Let groqd infer the return type; remove obsolete `*_QUERY_RESULT` imports and manual annotations.
3. Regenerate Sanity types after removing `defineQuery`; typegen must remove orphaned result mappings:

   ```sh
   npx --yes pnpm@10.30.3 --dir sanity exec sanity schema extract --force
   npx --yes pnpm@10.30.3 --dir sanity exec sanity typegen generate
   ```

4. Mark the inventory item `done` and update its scan date when materially changed.
5. Validate the changed queries and call sites:

   ```sh
   npx --yes pnpm@10.30.3 run maintain
   git diff --check
   npx --yes pnpm@10.30.3 exec eslint --no-cache <changed-query-files> <changed-call-sites>
   npx --yes pnpm@10.30.3 exec tsc -p astro/tsconfig.json --noEmit --pretty false 2>&1 | rg "astro/src/lib/queries|astro/src/lib/sanity\.types\.ts|<changed-call-site>"
   ```

## Defer rules

Leave a query on `defineQuery` or a plain string when the builder cannot express it without disproportionate redesign. Known limits include:

- Oversized result types caused by Portable Text fields or broad spreads on large documents.
- Root objects combining independent named subqueries.
- Parameterized `_type` filters.
- Deeply stacked `select()` and dereference chains.

Use the inventory's evidenced exception. For `defineQuery`, retain generated `*_QUERY_RESULT` types. For a plain template string, add a `TODO(queries)` reason and a manual `Promise<T>` annotation. Do not force a query through the builder to avoid an escape hatch.

Never augment `GroqBuilder` with `GroqBuilder.implement(...)` and `declare module 'groqd'`; this conflicts with groqd's internal augmentation and can break unrelated chain methods. Extend `@lib/groq-builder` with a plain exported constant or function instead.

If TypeScript still fails, report filtered diagnostics and distinguish existing call-site failures from new query errors.
