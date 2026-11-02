# Gemini and OpenAI provider modes

This reference explains the boundary used by the generation code. It is not a provider tutorial; it records which repository path owns each operation.

| Concern | Gemini Document Gem | OpenAI API |
| --- | --- | --- |
| Saved configuration | Gemini web-app Gem instruction and knowledge attachments | No saved Gem in this repository |
| Repository entry point | `scripts/generation/_gemini.ts` → `Gemini` browser driver and `geminiPrompt()` | `scripts/generation/_openai.ts` → `OpenAI.chat()` |
| Authentication | Playwright storage state for `gemini.google.com` | `OPENAI_API_KEY` |
| Browser | Required for Gem maintenance and Gemini chat; use isolated Chrome | Not used for text generation |
| Model selection | `Gemini.mode()` selects the configured Fast/Pro/Thinking UI mode | `model` is sent in the `/v1/chat/completions` request |
| Knowledge files | Uploaded through Gemini's hidden `input[type="file"]` and verified after reload | Current `_openai.ts` does not upload `files`; put source in prompt/context or implement that intentionally |
| External mutation | Updating the Gem changes Gemini account state and must be explicit | A chat completion is a request, not a saved instruction mutation |
| Local verification | `scripts/export/canvas.mts` saves raw/normalized output under OS Downloads | Call `OpenAI.chat()` and validate its returned text with the same document contract |

## Headed versus non-headed Gemini

“Headed” means a visible Chrome process. It is useful only when a person must complete SSO, passkeys, MFA, or inspect a live editor. The shared `authenticate()` helper supports that flow with `headed: true, interactive: true`, saves a reusable Playwright storage state, verifies the requested services, and closes the temporary browser.

Once the state is valid, `tests/scripts/generation/playwright.gem.config.ts` deliberately runs Gem updates non-headed in an isolated Chrome context. This prevents the updater from hijacking an already-open browser or Dia session. A failed non-headed run should report that authentication is required; it should not silently fall back to a user-visible browser.

## Why the Gem still matters when generation is model-agnostic

`createAIProvider()` lets the generation pipeline select Gemini or OpenAI for a request. That abstraction concerns how a response is generated; it does not remove the Gemini Gem as a reusable instruction and knowledge configuration. When Gemini is the selected provider, the Gem is the persistent place where the document agent's instructions and reference knowledge are maintained. When OpenAI is selected, the equivalent instructions must be supplied by the API caller; there is no Gemini Gem to update through the OpenAI API.
