# groqd Builder Migration Inventory

Last scanned: 2026-08-15. Scope: every query in `astro/src/lib/queries.ts` (both `defineQuery` and plain-string queries), evaluated for how hard it would be to rewrite using the schema-aware `groqd` builder (`@lib/groq-builder`) instead of a raw GROQ string.

Re-scan only when a listed query's shape changes, or when a new query file is added.

## Status key

- `done`: already migrated to `groqd` (`q`/`runQuery`/`PUBLISHED_ONLY` from `@lib/groq-builder`).
- `ready`: maps onto groqd's _typed_ surface directly — `filterByType`, `filterBy`'s equality/ comparison/reference grammar, flat `project()`, `order()`, `slice()`. No `filterRaw` needed.
- `candidate`: mostly typed, but needs one or more `filterRaw` escapes for shapes groqd's typed `filterBy` doesn't model (`in`, `defined()`, `count(...) > 0`, string concatenation like `"drafts." + $id`, `dateTime()`), or uses a scalar/array-mapped terminal projection (`.field()` reaching a bare value, not an object) that needs confirming against the installed groqd version. Net win, moderate effort.
- `defer`: not a good migration target right now. Reasons vary — see notes column — but generally: a root-level multi-key object query (`{ "a": ..., "b": ... }`, no single top-level array/filter), a dynamic/parameterized `_type`, deep `select()`/dereference chains stacked together, or a query whose result type is oversized regardless of query-building tool (see below).
- `n/a`: not a migration target — dead code or otherwise out of scope.

## Why oversized-type queries stay `defer`

A query already written as a plain string with a `TODO(queries)` comment in source — instead of `defineQuery` — because its generated result type is oversized (portable text `main`/`content`/ `versions`, full `...` spreads on large gameplay documents, etc.) stays `defer` here too. The type size comes from the **schema field's shape**, not from how the query is written — `.project({ main: true })` in groqd produces the same huge portable-text union as `defineQuery`'s `{main}` does. groqd doesn't rescue these; they should keep using a narrow handwritten/domain return type regardless of query-building tool.

## Verified groqd capabilities (checked against `groqd@1.7.1`'s `.d.ts` files, not assumed)

Confirmed to exist and be typed: `filterByType` (multi-type), `filterBy`/`filterRaw`, `project` (flat fields, aliases via naked string, `'...'` full spread, nested subqueries), `order`, `slice` (incl. inclusive ranges), `deref()`, `count()`, `coalesce()`, `select()`/`selectByType()`, `fragment()`/`fragmentForType()`, `.as<T>()`/`.asType<T>()` escape hatches, `q.value()`. **Not** found: a way to build a root-level object combining several independent named sub-queries (e.g. `{ "templates": ..., "topics": ... }` with no shared top-level filter) — every root command found (`star`, `count`, `coalesce`, `fragment`, `value`, `parameters`) returns a single chain, not an arbitrary multi-key root object. That shape stays `defer`.

Learned migrating the first batch of `ready` items (2026-08-15): `filterBy('_id == $id')` only type-checks once `TResult` has been narrowed by `filterByType` first. On the bare `q.star` root (before any type filter — `TResult` is the full union of every schema document type), `_id` equality isn't offered by `filterBy`'s typed grammar even though every document type has an `_id` field; use `filterRaw('_id == $id')` for any query that filters by `_id` without a preceding `filterByType`. Also: `filterBy`/`project`'s type-checking against the real schema caught two latent bugs that `defineQuery` had silently let through (typegen doesn't validate field names against the schema the way groqd's project map does) — see `asset.ts` and `template.ts` rows below.

## Inventory

### article.ts

| Query                         | Status    | Notes                                                                                                          |
| ----------------------------- | --------- | -------------------------------------------------------------------------------------------------------------- |
| `PUBLISHED_ARTICLES_QUERY`    | candidate | `defined()`/`dateTime()` comparisons need `filterRaw`; projection aliases (`"description":tagline`) are typed. |
| `ARTICLE_OG_CANDIDATES_QUERY` | done      | Migrated — one `filterBy(...)` call with 4 args (OR logic) across `slug.current`/`_id`.                        |
| `PLANNER_ARTICLES_QUERY`      | done      | Migrated — `filterByType` + `order()` + flat `project()`.                                                      |
| `ARTICLE_SEO_SAMPLE_QUERY`    | candidate | `defined()` raw; inclusive `[0...1]` slice — verify `.slice(0, 1, true)`.                                      |

### arc.ts

| Query                            | Status    | Notes                                                                                                                                        |
| -------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `ARC_DOCUMENT_GRAPH_BY_ID_QUERY` | done      | Migrated — single equality + `slice(0)` + `{graph: true}`.                                                                                   |
| `ARC_PROBLEMS_BY_ID_QUERY`       | defer     | `graph.arc.nodes[type == "content"].problem->{...}` — array-filter-then-deref inside a nested path, plus the choice/options spread fragment. |
| `ARC_PROCEED_ROWS_BY_IDS_QUERY`  | defer     | `_id in $arcIds` (raw, fine) but same nested node-filter-then-deref as above.                                                                |
| `ARC_QUALITY_BY_ID_QUERY`        | candidate | Terminal scalar projection (`.quality`, no object) — verify `.field('quality')` support.                                                     |
| `STIMULUS_ARCS_DATA_QUERY`       | defer     | Already a plain-string TODO(queries) in source (oversized); `select()`-heavy conditional deref.                                              |

### asset.ts

| Query | Status | Notes |
| --- | --- | --- |
| `ASSET_DOCUMENT_BY_URL_QUERY` | done | Migrated — multi-type `filterByType` + equality + flat projection. |
| `AUDIO_ASSET_BY_ID_QUERY` | done | Migrated. Caught a latent bug: projected `alt`, which isn't a real field on `sanity.fileAsset` (the real field is `altText`) — `defineQuery` silently let this through, always returning `undefined`; groqd's typed `project()` rejected it. Fixed by aliasing `alt: 'altText'`, a real behavior change (see PR notes). |
| `REFERENCE_COUNT_BY_ID_QUERY` | candidate | Root `q.count(...)` exists; verify `references($id)` as the counted expression. |
| `REFERENCED_ASSETS_BY_TYPE_QUERY` | defer | Nested `count(*[_type == $targetType && ...])` with a **dynamic** `_type` param. |
| `REFERENCED_ASSETS_BY_ALLOWED_TYPES_QUERY` | defer | Same, dynamic `_type in [$allowed]`. |

### character.ts

| Query                   | Status | Notes                                                                                                                  |
| ----------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------- |
| `CHARACTER_BY_ID_QUERY` | n/a    | Dead code — `getCharacterById` isn't exported and has no callers. Not a migration target; flag separately for removal. |

### curriculum.ts

| Query                         | Status | Notes                                                                          |
| ----------------------------- | ------ | ------------------------------------------------------------------------------ |
| `AUTHORING_CURRICULUMS_QUERY` | done   | Migrated — `filterByType` + `filterRaw(PUBLISHED_ONLY)` + `project` + `order`. |

### definition.ts

| Query                             | Status    | Notes                                                                                                                                         |
| --------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `DEFINITIONS_QUERY`               | candidate | `filterRaw(PUBLISHED_ONLY)` + `order`; projection uses `'...': true` full spread + one alias — confirm resulting type stays reasonably sized. |
| `DEFINITIONS_BY_IDS_QUERY`        | candidate | `_id in $ids` raw; rest is aliased flat projection, typed.                                                                                    |
| `THEORIST_DEFINITION_BY_ID_QUERY` | done      | Migrated — two chained `filterBy` calls (AND) + flat `project()`.                                                                             |
| `DEFINITION_SEO_SAMPLE_QUERY`     | done      | Migrated — `filterByType` + `.slice(0, 1, true)` for the inclusive `[0...1]` range + flat `project()`.                                        |

### document.ts

| Query | Status | Notes |
| --- | --- | --- |
| `DOCUMENT_TYPE_BY_ID_QUERY` | candidate | No `_type` filter (queries any document); terminal scalar `.field('_type')` — verify. |
| `DOCUMENT_IDS_BY_IDS_QUERY` | candidate | `_id in $ids` raw; scalar array projection `._id`. |
| `DOCS_DELETE_DOCUMENT_IDS_BY_ID_QUERY` | candidate | `_type in [...]` typed; `_id == $id \|\| _id == "drafts." + $id` needs raw (string concat, not `PUBLISHED_ONLY`'s shape). |
| `DOCS_DOCUMENT_IDS_REFERENCING_QUERY` | candidate | `references($id)` typed reference expression; verify scalar `._id` projection. |
| `TEMPLATE_TOPIC_RESOURCE_ROWS_QUERY` | done | Migrated — multi-type `filterByType` + flat `project()` + `order`. |
| `DOCS_DOCUMENT_REF_ID_QUERY` | candidate | Same drafts-concat raw filter as above; scalar `._id`. |
| `DOCS_PERMISSION_DOCUMENT_BY_ID_QUERY` | defer | Nested parent-reference subqueries + `coalesce` of two of them — real effort even with `coalesce`/`count` available. |
| `DOCS_WARRANTS_GLOBAL_QUERY` / `DOCS_WARRANTS_SCOPED_QUERY` | defer | Already a plain-string TODO(queries) in source (oversized portable-text `coalesce(main, content)`). |
| `AUTHORING_DOCS_BY_TYPE_QUERY` | defer | Already a plain-string TODO(queries) in source; dynamic `_type` param, `{...}` spread. |
| `AUTHORING_LIST_DOCUMENTS_QUERY` | defer | Already a plain-string TODO(queries) in source; dynamic `_type in $types`. |
| `DOCS_DOCUMENT_HIERARCHY_QUERY` | defer | Already a plain-string TODO(queries) in source; root multi-key object (`{ "exact": ..., "logical": ... }`). |
| `DOCS_DOCUMENT_BY_ID_QUERY` | defer | Already a plain-string TODO(queries) in source; oversized (`main`/`content`/`versions`). |
| `DOCS_DOCUMENT_EXACT_BY_ID_QUERY` | defer | Already a plain-string TODO(queries) in source; full document read. |
| `SANITY_DOCUMENT_BY_ID_QUERY` | done | Migrated — reclassified `ready` → needed `filterRaw`: no `filterByType` precedes it (queries any document), and bare-root `_id` equality isn't in `filterBy`'s typed grammar (see capabilities note above). Uses `.as<DocsDocument \| null>()` to keep the existing narrow handwritten return type instead of the full schema-type union. |
| `DOCS_SCORED_DOCUMENT_BY_ID_QUERY` | candidate | Uses `score()` — groqd has a typed `score` command, but combined with mixed raw/typed filters and multi-key `order(_score desc, _updatedAt desc)`; verify before starting. |
| `LEAF_VERSION_DOCUMENT_BY_ID_QUERY` | defer | Already a plain-string TODO(queries) in source; oversized version/content fields. |
| `DOCS_ATTACHMENT_DOCUMENTS_BY_IDS_QUERY` | defer | Already a plain-string TODO(queries) in source; nested deref + `@->` self-reference aliasing, not verified in groqd. |
| `DOCS_ATTACHMENT_DOCUMENTS_BY_DRAFT_IDS_QUERY` | defer | Already a plain-string TODO(queries) in source for caller-coupling reasons (not type size) — leave as-is regardless of tool. |

### group.ts

| Query                                   | Status    | Notes                                                                                                       |
| --------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------- |
| `GROUPS_BY_INPUT_SOURCE_LEAF_IDS_QUERY` | candidate | `count(inputSources[leaf._ref in $ids]) > 0` — one `filterRaw` for the whole condition; projection is flat. |

### leaf.ts

| Query                                       | Status    | Notes                                                                                                                             |
| ------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `LEAF_IDS_QUERY`                            | candidate | Type filter + scalar array `._id` — verify terminal scalar projection.                                                            |
| `LEAF_ID_ROWS_QUERY`                        | done      | Migrated — `filterByType` + `{ _id: true }`.                                                                                      |
| `LEAF_IDS_BY_TARGETS_QUERY`                 | defer     | Large OR of `in`/reference-count/self-reference-count clauses — same complexity class as the docs hierarchy queries.              |
| `leafVersionDocumentsByIdQuery(versionMax)` | defer     | Already a plain-string-style TODO(queries) in source; runtime-templated slice count, drafts-concat filter, broad version payload. |

### partner.ts

| Query                   | Status | Notes                                             |
| ----------------------- | ------ | ------------------------------------------------- |
| `PARTNER_BY_SLUG_QUERY` | done   | Migrated — matches `survey.ts`'s pattern exactly. |

### problem.ts

| Query | Status | Notes |
| --- | --- | --- |
| `AUTHORING_PROBLEMS_BY_IDS_QUERY` | defer | `_id in $ids \|\| _id in $draftIds` is fine raw, but `{...}` spreads the full problem document — problem docs are consistently oversized elsewhere in this file. |
| `PROBLEM_STIMULUS_PROMPT_QUERY` | defer | Three-way `coalesce` of differently-shaped nested array/key filters + `asset->` deref — high effort despite each primitive existing. |
| `PROBLEM_PROMPT_ASSET_REF_QUERY` | defer | Same complexity, plus indexing into a computed array and a trailing scalar chain. |
| `PROBLEMS_WITH_AUDIO_PROMPTS_QUERY` | defer | Nested `count(tabs[].prompt[].children[...]) > 0` plus nested array projections with `deref`. |
| `PROBLEM_CARD_QUERY` | defer | Already a plain-string TODO(queries) in source; oversized, shares `PROBLEM_CHOICE_PROJECTION` fragment, chained `arc->viewpoint->` deref. |
| `PROBLEM_BUNDLE_QUERY` | defer | Already a plain-string TODO(queries) in source; root multi-key object, oversized. |

### question.ts

| Query | Status | Notes |
| --- | --- | --- |
| `QUESTION_BY_ID_QUERY` | candidate | `"opts": options[].value` is an array-mapped field projection — verify it fits groqd's `Field` path grammar; may need `filterRaw`/subquery instead. |
| `UNUSED_QUESTION_QUERY` | candidate | `count(*[references(^._id)]) == 0` — root `count()` + `filterRaw`, same `options[].value` caveat. |
| `STRUCTURE_QUESTION_BY_ID_QUERY` | candidate | `filterRaw(PUBLISHED_ONLY)` reusable here; same `options[].value` caveat (projected as `"opts": options`, actually simpler — plain field, not mapped — recheck: likely `ready` for the projection part). |
| `UNUSED_STRUCTURE_QUESTION_QUERY` | candidate | Same `count(references) == 0` pattern as `UNUSED_QUESTION_QUERY`. |

### room.ts

| Query | Status | Notes |
| --- | --- | --- |
| `ROOM_BY_ID_QUERY` | done | Migrated — `filterByType` + equality + `slice(0)`, no projection. |
| `ROOM_BY_REFERENCE_QUERY` | candidate | `filterRaw(PUBLISHED_ONLY)` + equality + flat projection. |
| `ROOM_ANSWER_META_QUERY` | defer | Multi-branch `coalesce` of nested array key-filters + `count(inputs[...])`. |
| `ROOM_ID_BY_ID_QUERY` | candidate | Terminal scalar `._id`. |
| `ROOM_IDS_BY_WORKSHOP_QUERY` | candidate | Equality typed; terminal scalar array `._id`. |
| `ROOM_PROCEED_BY_ID_QUERY` | defer | Nested `select()` + `workshop->` deref + coalesce, stacked together. |
| `ROOM_RESET_BY_ID_QUERY` | defer | `coalesce` + deref + negative array index (`history[-1]`) — slice's negative-index support unverified, plus stacked complexity. |
| `ROOM_STUDENT_ID_BY_IDENTITY_QUERY` | candidate | `filterRaw(PUBLISHED_ONLY)` + `$identity in students[].student` (raw, array-mapped `in`); scalar `._id`. |
| `ROOM_STUDENT_NAMES_BY_ID_QUERY` | candidate | Array-mapped scalar projection `.students[].student`. |
| `ROOM_TITLES_BY_WORKSHOP_QUERY` | candidate | `filterRaw(PUBLISHED_ONLY)` + `title != null && title != ''` raw; scalar array `.title`. |
| `ROOM_TITLES_BY_DOCUMENT_QUERY` | candidate | Same, plus an OR across two id-ish fields. |
| `ROOM_VIEWPOINT_COLLECTIONS_BY_WORKSHOP_QUERY` | candidate | `filterRaw(PUBLISHED_ONLY)` + equality + `{ viewpoints: true }`. |
| `ROOM_VIEWPOINTS_BY_DOCUMENT_QUERY` | candidate | `filterRaw(PUBLISHED_ONLY)` + equality; scalar `.viewpoints`. |
| `STIMULUS_ROOM_DATA_QUERY` | defer | Already a plain-string TODO(queries) in source; oversized (`...` spread + nested deref/history cards). |
| `STIMULUS_ROOMS_DATA_QUERY` | defer | Type size is fine under `defineQuery` (~90 lines), but `select()` with two full-object branches is high modeling effort in groqd specifically. |

### section.ts

| Query | Status | Notes |
| --- | --- | --- |
| `SECTION_IDS_REFERENCING_QUERY` | candidate | `references($gIds)` — typed `references()` expression usually expects a scoped path (`references(^._id)`); passing a bare param array needs verifying or `filterRaw`. |
| `SECTION_GROUPS_FOR_STAFF_WARRANTS_QUERY` | candidate | `coalesce(groups[]->{...}, [])` — `coalesce`/`deref` both exist but composing them here is real effort. |

### survey.ts

| Query                  | Status | Notes                                                             |
| ---------------------- | ------ | ----------------------------------------------------------------- |
| `SURVEY_BY_SLUG_QUERY` | done   | Migrated first, the reference pattern for the rest of this table. |

### template.ts

| Query | Status | Notes |
| --- | --- | --- |
| `TEMPLATES_BY_CURRICULUM_TITLE_QUERY` | candidate | `references(*[_type == "curriculum" && title == $curriculum]._id)` — one `filterRaw` for the whole expression (not decomposable into typed pieces, but still just one escape). |
| `AUTHORING_TEMPLATES_QUERY` | done | Migrated. Caught a latent bug: projected `description`, which isn't a real field on `template` (unlike `topic`/`viewpoint`, `template` has no `description` in the schema) — `defineQuery` silently let this through, always returning `undefined`; groqd's typed `project()` rejected it. Fixed by removing the field (no equivalent to alias to; the row never carried a description). |
| `AUTHORING_TEMPLATE_DOCUMENTS_QUERY` | defer | `{...}` full spread on template documents (arcs/topics) — likely oversized like the other gameplay-doc spreads; verify size before committing either way. |

### topic.ts

| Query                    | Status | Notes                                                                                                                                       |
| ------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `TOPICS_QUERY`           | defer  | Nested subquery projection (`"arcs": *[_type == "arc" && references(^._id)]{...}`) combined with `...` spread and `viewpoint->{...}` deref. |
| `AUTHORING_TOPICS_QUERY` | done   | Migrated — `filterByType` + flat `project()`.                                                                                               |

### viewpoint.ts

| Query | Status | Notes |
| --- | --- | --- |
| `AUTHORING_VIEWPOINTS_QUERY` | done | Migrated — `filterByType` + `filterRaw(PUBLISHED_ONLY)` + `project` + `order`. |
| `VIEWPOINT_UPDATE_DOCUMENT_QUERY` | defer | No `_type` filter (any document); `workshop->` deref; fields (`mode`, `viewpoints`) belong to `workshop`, not `viewpoint` — awkward fit for a schema-typed builder rooted at one document type. |

### workshop.ts

| Query | Status | Notes |
| --- | --- | --- |
| `AUTONOMOUS_WORKSHOP_ID_BY_TITLE_QUERY` | candidate | `_id in $ownedIds` raw; rest typed equality; scalar `._id`. |
| `DASHBOARD_ARC_COLLECTIONS_QUERY` | defer | Root multi-key object (`{ "templates": ..., "topics": ... }`) — no groqd equivalent found. |
| `DASHBOARD_WORKSHOP_BY_ID_QUERY` | defer | Already a plain-string TODO(queries) in source; oversized, `select()` + heavy deref. |
| `WORKSHOP_ACCESS_CONTENT_QUERY` | candidate | No `_type` filter (any document); flat projection `{_id, demo, ownership}`. |
| `WORKSHOP_BY_ID_QUERY` | done | Migrated — `filterByType` + equality + `slice(0)`, no projection. |
| `WORKSHOP_ENTER_QUERY` | defer | Root multi-key object with 6 independent branches. |
| `WORKSHOP_ID_BY_TITLE_QUERY` | candidate | Terminal scalar `._id`. |
| `WORKSHOP_PRESETS_BY_TEMPLATE_QUERY` | defer | Already a plain-string TODO(queries) in source; oversized preset projection. |
| `WORKSHOP_TITLE_CONFLICT_QUERY` | candidate | `!=` and `==` both typed; terminal scalar `.title`. |
| `WORKSHOP_CALENDAR_ROWS_QUERY` | candidate | `defined(start)` raw; array-mapped scalar `content[].duration`. |
| `LEGACY_BUNKER_ID_BY_WORKSHOP_ID_QUERY` | defer | Already a plain-string TODO(queries) in source; `_type == "bunkers"` predates the schema — no schema type exists to `filterByType` against at all. |
| `STIMULUS_WORKSHOP_DATA_QUERY` | defer | Already a plain-string TODO(queries) in source; oversized array-deref `content[]->`. |

## Recommended next picks

Every `ready` query is now `done` (2026-08-15 pass). Remaining work is all `candidate` — needs one or more `filterRaw` escapes but is still a net win. Cheapest next batch, needing only `PUBLISHED_ONLY` + typed equality (same shape as the already-migrated queries):

- `room.ts`: `ROOM_BY_REFERENCE_QUERY`, `ROOM_STUDENT_ID_BY_IDENTITY_QUERY`, `ROOM_TITLES_BY_WORKSHOP_QUERY`, `ROOM_TITLES_BY_DOCUMENT_QUERY`, `ROOM_VIEWPOINT_COLLECTIONS_BY_WORKSHOP_QUERY`, `ROOM_VIEWPOINTS_BY_DOCUMENT_QUERY`
- `definition.ts`: `DEFINITIONS_QUERY`, `DEFINITIONS_BY_IDS_QUERY`

After that, the `_id in $ids`-only rows (`document.ts`'s `DOCUMENT_IDS_BY_IDS_QUERY`, `workshop.ts`'s `AUTONOMOUS_WORKSHOP_ID_BY_TITLE_QUERY`) and the terminal-scalar-projection rows (`ARC_QUALITY_BY_ID_QUERY`, `ROOM_ID_BY_ID_QUERY`, `WORKSHOP_ID_BY_TITLE_QUERY`, `WORKSHOP_TITLE_CONFLICT_QUERY`) are next — same `.as<T>()` escape hatch used for `SANITY_DOCUMENT_BY_ID_QUERY` above should work for the scalar ones.

Do not pick `defer` items in routine passes; they need either a groqd capability this inventory couldn't confirm (root multi-key objects) or genuine query-by-query redesign effort disproportionate to the win.

When picking up `candidate` rows, budget time to double-check every field name against the real schema type (`astro/src/lib/sanity.types.ts`), not just the shape of the filter/projection — this batch caught two fields (`asset.ts`'s `alt`, `template.ts`'s `description`) that don't actually exist on their schema types and were silently returning `undefined` under `defineQuery`.
