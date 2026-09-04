# Terra quality conventions

The quality package owns deterministic source maintenance, naming, formatting, import checks, and repository quality orchestration. Maintenance must be idempotent: a second run over its own output must produce no changes.

## Comment hierarchy

Three comment levels structure source files:

1. A **section** is a full-width three-line fence such as `IMPORTS`, `CONFIG`, `HELPERS`, or `COMPONENTS`. Exactly one blank line precedes a section when code or another section comes before it. No blank line follows its closing fence.
2. A **group** is an uppercase line comment inside a section, such as `// API`, `// COMPONENTS`, `// DATA`, or `// TYPES`. Exactly one blank line precedes a group unless it immediately follows a section fence. Its first statement or import follows on the next line with no blank line.
3. A **line label** is an uppercase line comment inside executable code, such as `// MUTATION` or `// VALIDATION`. Exactly one blank line precedes it and the associated statement follows on the next line with no blank line.

Empty adjacent sections are invalid. When one section is immediately followed by another, maintenance removes the empty earlier section. Existing managed `CONFIG` and `HELPERS` fences are replaced rather than duplicated when top-level declarations are regrouped.

Maintenance removes trailing horizontal whitespace, collapses repeated layout-only blank lines, inserts the blank lines required above, and removes blank lines forbidden after fences, groups, and line labels. String, template, regular-expression, and JSX text content is never treated as layout.

## Source grouping

Imports are sorted into `API`, `COMPONENTS`, `DATA`, and `TYPES` groups. Top-level types, interfaces, enums, and `const` declarations belong to `CONFIG`; top-level functions belong to `HELPERS`. Other declarations retain source order after those managed sections.

Undocumented top-level functions receive blank TSDoc tags for every parameter and for the return value. Existing authored documentation is preserved.

## Identifier renaming

Whole-word replacements apply to matching identifier tokens in any position and preserve camel, Pascal, snake, kebab, and constant case. Examples include `image` to `img`, `ErrorBoundary` to `ErrBoundary`, and `articleError` to `articleErr`.

Prefix-only replacements apply only to the first identifier token. `active`, `next`, `clean`, and `safe` become `a`, `n`, `c`, and `s` respectively, so `activeCard` becomes `aCard` while `isActive` remains `isActive`. Renames are skipped when the proposed identifier conflicts with another declaration, and callback aliases are allocated within their own callback scope.
