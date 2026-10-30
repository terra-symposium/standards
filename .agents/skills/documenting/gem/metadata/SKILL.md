---
name: gem-metadata
description: Capture and maintain Terra Document Gem identity and editable metadata with a local audit snapshot.
---

# Document Gem Metadata

Use for the Gemini Gem's name, description, citation setting, and identity. Coordinate with the [Gem maintenance skill](../SKILL.md); metadata changes do not authorize Docs leaf writes.

## Capture before editing

1. In the authenticated in-app Gemini UI, verify the intended Gem by its ID and current name. Never infer the target from `_config.json` alone.
2. Capture the exact Gem ID, name, description, citation setting, and observation date in the shared `gem` skill's `snapshots/<gem-id>/metadata.json`.
3. Keep current model selection separate from Gem metadata; record it only as conversation-generation context.
4. Preserve the exact instruction and knowledge list in sibling snapshot files, coordinated with `gem-content`.

## Apply and verify

Change only metadata the user requested. Reload the Gem and verify the ID, name, description, citation setting, instruction, and knowledge labels. Save a post-update snapshot and compare it with the pre-update snapshot. If the in-app browser is unavailable or read-only, do not claim the metadata changed.
