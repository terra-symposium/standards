# Terra braces fork

This workspace package is based on the MIT-licensed `braces@3.0.3` release. It adds a maximum nesting depth of 100 for curly-brace and parenthesis patterns to prevent stack exhaustion from deeply nested input (GHSA-vfj7-8cjw-p6xm / CVE-2026-93687).

The package keeps the `braces` API and runtime dependency unchanged. The `3.0.4+terra.1` version identifies this locally maintained fix and satisfies existing `^3.0.3` dependency ranges. Replace this fork with a fixed upstream release when one is available.
