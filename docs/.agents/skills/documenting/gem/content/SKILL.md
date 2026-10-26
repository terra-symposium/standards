---
name: gem-content
description: Prepare and audit the Terra Document Gem's saved instructions and persistent knowledge attachments.
---

# Document Gem Content

Use for changes to the saved instruction text or persistent Gem knowledge. Coordinate with the [Gem maintenance skill](../SKILL.md); this skill does not authorize Docs leaf writes.

## Prepare the content update

1. Read `scripts/generation/_gemini.ts`, the latest authoring journal entry, `sanity/schemas/docs.tsx`, and the renderer/parser references relevant to the intended guidance.
2. Treat `geminiPrompt()` as the current local generation prompt only. Capture the exact live Gem instruction separately before replacing it.
3. Inventory all existing Gem knowledge labels. Keep, replace, or remove each item deliberately. Conversation attachments are not persistent Gem knowledge.
4. For every local knowledge source, record its repository path and SHA-256 in the pre-update snapshot. Do not include credentials, browser state, or unrelated course-source attachments.
5. Keep the new instruction and files in a reviewable staging folder under the shared `gem` skill's `snapshots/<gem-id>/` before interacting with Gemini.

## Apply and verify

Use the already authenticated in-app Gemini tab when requested. Keep the model on Pro or Thinking when the user has specified either. Update only the approved instruction and knowledge content. Reload the Gem, compare its exact instruction and full attachment-label list with the prepared local snapshot, and save a post-update snapshot. Do not claim success from a save toast alone.

If the in-app browser is unavailable or read-only, stop before the external change. Preserve the local draft and report the exact missing verification step.
