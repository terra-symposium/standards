---
name: readme-standardisation
description: Create, audit, or standardise repository README files with a reusable structure while preserving every useful fact, command, constraint, and reference from the source documentation.
---

# README standardisation

Use when asked to create, review, or standardise a repository README. The companion [`README.template.md`](README.template.md) is the literal structure for every README. Keep every standard heading, in the exact order below, even when a section is not relevant. Write `Not applicable.` under an empty section. Do not add or remove H2 headings; use H3 or lower for subsections.

## Goals

- Make a reader understand what the repository is, whether it is relevant, and how to get a useful result.
- Put information in a predictable order across repositories.
- Preserve all unique, current information from existing README files, including details that do not fit the common sections.
- Keep instructions accurate, executable, and safe. Do not invent features, commands, prerequisites, URLs, credentials, supported environments, or guarantees.
- Keep every complete bullet item at or below 100 characters, including its marker. Turn longer material into prose or tables, or divide it without losing meaning.

## Workflow

1. **Establish scope.** Confirm the repository root, read applicable `AGENTS.md` files, and inspect the current README files, package manifests, scripts, configuration, deployment files, and directly referenced documentation. For a cross-repository request, identify every repository and README in scope, including nested packages, tests, examples, and operational folders.
2. **Inventory information before editing.** Capture each source README's claims, setup and run commands, environment variables (names and meanings only), architecture, ownership boundaries, test commands, deployment steps, data handling, limitations, accessibility or privacy behavior, credits, licenses, references, and any specialized tables or examples. Check whether duplicate READMEs contain distinct information before consolidating them.
3. **Verify current instructions.** Compare commands and configuration names with the repository. Mark environment-specific values clearly. Never copy secret values, credentials, tokens, or private browser state. Preserve public URLs and IDs only when they are intentional documentation and safe to publish.
4. **Map content to the template.** Use the standard order below. Put package-, application-, data-, test-, operations-, or policy-specific details in the matching optional section or a clearly named subsection. Keep detailed guides in their owning documents and link to them from the README when appropriate; do not silently discard their unique content.
5. **Write for the intended reader.** Put the shortest path to install, run, or use the project early. Use headings that describe the content, concise prose, copyable commands, and tables only for genuine comparisons or mappings. Explain command working directories and prerequisites. Use relative links for files in the repository.
6. **Review completeness and accuracy.** Recheck every inventoried fact against the final README or a working link. Remove stale, duplicated, empty, and placeholder sections only after confirming their information is preserved elsewhere. Check links, heading hierarchy, fenced-code languages, and command consistency. Follow the user's requested verification scope; do not run tests unless asked.
7. **Report the result.** Name the README files created or changed, describe any consolidation or retained specialized sections, and state what was checked. Call out unresolved or unverifiable instructions instead of presenting them as confirmed.

## Required H2 headings

Every README must contain exactly these H2 headings, once each and in this order:

- `## What it does`
- `## Prerequisites`
- `## Get started`
- `## Usage`
- `## Configuration and security`
- `## Development and structure`
- `## Validation`
- `## Deployment and operations`
- `## Data, privacy, and limitations`
- `## References`
- `## Contributing`
- `## Credits and license`

Keep the H1 title, badges, and short summary before the standard H2s. Put specialist content under the closest matching H2 and retain its precise detail in H3/H4 subsections, such as API or CLI contracts, schema domains, test matrices, migration safety checks, benchmark methodology/results, icon or design systems, accessibility, privacy, content layouts, and asset provenance. Retain useful examples and tables.

## Placement rules

- A repository-root README introduces the repository and directs readers to subprojects. A nested README documents its local package, test area, asset, or procedure.
- Keep each instruction at its natural level: shared prerequisites at the root; package-specific commands and API details beside the package; test contracts beside the test suite; deployment runbooks in operations documentation.
- A local README may repeat a short command when that makes the folder independently usable, but keep canonical details in one place and link to them.
- For monorepos, use a concise contents table with purpose and path. Do not turn the root README into an exhaustive catalog of every internal file.
- Environment variable tables must describe names, purpose, required/optional status, and safe source. Do not include values for secrets. Use `.env.example` only for non-secret placeholders and follow repository policy.
- Distinguish local/demo behavior from production behavior. State when an account, external service, network connection, or manual operator action is required.
- Dates, versions, benchmark numbers, deployment identifiers, and status claims can go stale. Include a source or date where needed, or explain how to obtain the current value.
- Link to detailed policy, API, migration, test, and contribution documents rather than copying long material that will drift independently.
- Keep each bullet item at or below 100 characters. Count the marker and text; prose and tables can carry longer details.

## Completeness check

Before finishing, verify that the new structure accounts for all unique source material:

- identity, purpose, audience, features, badges, and project status;
- repository/package inventory, source ownership, and architecture;
- prerequisites, installation, local execution, usage examples, and interface controls;
- configuration, environment setup, authentication, permissions, and secret handling;
- tests, commands, ordering, ownership, coverage, quality checks, and build steps;
- deployment targets, release procedure, runtime behavior, backups, migrations, and maintenance;
- data sources, provenance, limitations, demo behavior, privacy, and sharing;
- design/icon systems, generated artifacts, file formats, and asset credits;
- references, support, contribution, authorship, and licensing.

If an item does not apply, omit it. If it applies but cannot be verified, preserve it with an explicit note or report it as unresolved rather than removing or guessing.
