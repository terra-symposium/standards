---
name: terra-responsive
description: Design, debug, and verify responsive Terra UI layouts with headed-browser screenshots, measured viewport criteria, and explicit preview/control geometry. Use for responsive regressions, card grids, breakpoint changes, overflow bugs, and screenshot-driven layout work.
---

# Terra Responsive UI

This extends the shared `ui` skill with Terra Symposium's preview, fields, and measured-breakpoint contracts. Use it for responsive layout work and screenshot-led review; source inspection alone is insufficient to verify geometry.

## Workflow

1. Inspect the owning layout boundary: page grid, item shell, internal composition, media, or nested composite. Read current route and responsive rules before editing.
2. Choose tracks from measured usable item width, not breakpoint names. Move placement rules with the track-count breakpoint. Apply `min-w-0`/`min-h-0` at shrinkable grid and flex boundaries.
3. Keep header, preview, and fields as explicit regions. Bound media inside its assigned box; a full-row preview must span the full internal grid, with fields below it.
4. Keep responsibilities distinct: group data owns placement/gaps; composition owns preview and fields; reusable media fits its assigned box. Put composition-specific values in typed configuration, not scattered instance classes.
5. Preserve semantic shell contracts. An unstyled variant has no background, border, shadow, radius, or inherited shell padding. Verify computed styles and screenshots.
6. Treat each nested activity, chart, dashboard, and control rail as its own responsive layout. Keep repeated previews equal in size when that is the contract.
7. Preserve data-driven fallbacks: empty optional overrides use canonical specimen data. Expose controls for actual generator inputs and rendering switches.
8. Open the real route in a headed browser. Record CSS viewport dimensions, wait for hydration/media, and inspect screenshots plus browser measurements.
9. Test each active breakpoint immediately below, at, and above its transition. Include `sm` through `2xl` where present. Check adjacent widths after changing a breakpoint rule.
10. Measure scroll width, expected tracks/items, usable item/preview sizes, required controls, aligned spans/edges, readable content, height caps, shell styles, and a representative interaction.
11. Capture labelled before/after viewport screenshots. For substantial reviews, create readable overlapping slices; an audit deck is supporting evidence, not a substitute for geometry checks.
12. Run the narrowest relevant quality check and `git diff --check`.

## Reject these fixes

- Higher fixed rows or clipping used to conceal intrinsic overflow.
- Too many tracks that truncate labels, values, or controls.
- Preview/field width mismatches, auto-placement around a full-row preview, or detached control rails.
- Truncation, collisions, excessive wrapping, or empty lookup results treated as acceptable.
- A layout that passes only one convenient viewport.

## Handoff

Report the route, actual viewport matrix, measurements, screenshot evidence, console/runtime gaps, and source checks. If headed-browser evidence is unavailable, state the exact gap and do not claim responsive completion.
