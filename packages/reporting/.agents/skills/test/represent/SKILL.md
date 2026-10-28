---
name: test-represent
description: Run Terra evaluations and produce auditable Excel and PowerPoint test evidence with complete viewport and diagnostic review.
---

# Test Representation

Use when a run must produce, inspect, or hand off workbook and PowerPoint evidence. Representation documents test evidence; it does not replace assertions or repairs.

## Run and preserve

1. Follow [`test/ordering`](../ordering/SKILL.md) for command, target, projects, workers, and viewport matrix.
2. Run from the repo root and wait for Playwright and the reporter to finish. Never overwrite prior runs or copy screenshots between runs.
3. Preserve the timestamped output:

```text
test-results/visual/<timestamp>/report.xlsx
test-results/visual/<timestamp>/report.pptx
test-results/visual/<timestamp>/images/
```

4. Record ref, target URL, command, projects, viewport names/dimensions, test count, retries, skips, and exact artifact paths.

## Inspect evidence

**Workbook:** verify expected summary/project sheets; one complete row per executed test; matching requested and executed inventory; visible skips, retries, interruptions, timeouts, and setup failures; reviewed browser and terminal errors even on passed tests; valid image/link paths; and no secrets, tokens, cookies, or personal data. Use spreadsheet tooling when native inspection is needed. A successful write is not proof of completeness.

**PowerPoint:** inspect every slide at readable size, including passed tests and every selected breakpoint. Record slide/test, viewport, dimensions, evidence, severity, affected contract, and whether each observation is confirmed, diagnostic, or needs source verification. Review clipping, overflow, wrapping, alignment, contrast, focus, density, hierarchy, navigation, modals, loading/empty/error states, and breakpoint changes. Open original images when a slide is too small.

## Handoff

Cross-check slides, workbook rows, Playwright output, attachments, and browser/terminal diagnostics. Missing artifacts, screenshots, unexplained rows/slides, or reporter exceptions are infrastructure findings. Keep one record per actionable screenshot; group root causes only after listing every affected test and viewport.

Report commands/refs/projects/workers/viewports; executed, passed, failed, skipped, retried, timed-out, and blocked counts; artifact paths; diagnostics on passed/failed tests; visual findings; cleanup/integrity; and unresolved blockers. Never call a partial inventory complete.
