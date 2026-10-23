# UI matrix process

Use these numbered steps before compacting UI call sites. The shared matrix is a TypeScript component contract whose variants contain static Tailwind class recipes.

## 1. Inventory the current UI

### 1.1 Read definitions and consumers together

Inspect public types, variant definitions, component implementations, docs, and callers. Search for native controls, `variant` and `size` props, repeated class names, and the component that receives each class. Record colors, treatments, sizes, aliases, states, and local geometry. Never infer equivalence from a class name alone.

### 1.2 Salesphere example

In the current Salesphere repo, `app/components/SubmitButton.tsx` accepts `className`, defaults it to `salesphere-primary-action`, and renders a native button with pending behavior. `app/components/WinTodayAskDrawer.tsx` has a native submit button with `salesphere-button-signal min-h-11 px-5 py-2.5 text-sm`; prediction pages use an anchor with `salesphere-secondary-action`. Salesphere has no shared typed Button matrix, and its `package.json` does not include `class-variance-authority`.

The two primary-looking action implementations differ in contrast and interaction details. Read their consumers and current component behavior before consolidating them. Use `docs/design/SALESPHERE_VISUAL_LANGUAGE_V1.md` to map the shared colors: accent is the primary action role, navy is structural framing, and surface, canvas, text, muted text, border, shell controls, and labeled status colors retain their meanings. Treat the existing secondary action as evidence for its role; do not turn structural navy into a generic secondary color.

## 2. Define one shared type vocabulary

All repos use the same public axes and names. Map each color to that repo's approved visual language. Use one type when two families allow the same choices; keep separate types only when their supported choices differ.

Terra's `astro/src/lib/types.tsx` supplies these axes and family variants:

```ts
type UiColor = 'primary' | 'secondary' | 'gray' | 'destructive';
type UiType = 'default' | 'outline' | 'ghost' | 'tonal' | 'saturated' | 'link' | 'underline';
type UiSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

type ActionVariant = UiColor | `${UiColor}-${Exclude<UiType, 'default' | 'saturated'>}`;
type ControlVariant = UiColor | `${UiColor}-${Extract<UiType, 'outline' | 'ghost' | 'tonal'>}`;
type SurfaceVariant = UiColor | `${UiColor}-${Exclude<UiType, 'default' | 'link' | 'underline'>}`;
```

`ActionVariant` allows default, outline, ghost, tonal, link, and underline. `ControlVariant` allows default, outline, ghost, and tonal; reuse this same type for toggles and fields when their public choices match. `SurfaceVariant` adds saturated and excludes link treatments. In each family, a bare color means its default treatment.

Use all four shared colors and all five `UiSize` keys in each applicable family. Family grids define every supported color/treatment pair and exclude invalid combinations. Buttons may keep action-only `icon` sizes. Keep success, warning, error, and info as semantic states, not colors. Aliases map to canonical variants at component boundaries.

## 3. Implement shared Tailwind variants in component code

### 3.1 Define the grids once

Keep each family's variant grid in the shared UI TypeScript module. Give every supported color/treatment cell a static Tailwind class recipe and type the grid so missing or unsupported cells are caught. Do not construct Tailwind class fragments dynamically.

Terra's `astro/src/components/ui/variants.ts` uses `satisfies Record<UiColor, Record<...>>` for complete grids and exports functions such as `ACTION_VARIANTS`, `TOGGLE_VARIANTS`, `FORM_CONTROL_VARIANTS`, and `SURFACE_VARIANTS`. The shared family type may be reused even where two families need separate recipes for different interaction behavior.

### 3.2 Make components consume the shared variants

In Terra's `astro/src/components/ui/button.tsx`, both `Button` and `ButtonLink` use:

```tsx
className={cn(ACTION_VARIANTS({ variant, size, className }))}
```

`Input`, `Select`, and `Textarea` consume the form-control family. `Card` combines the surface family with card-owned geometry. Follow the same ownership: `Button`, `ButtonLink`, and `SubmitButton` share action variants; fields and toggles reuse `ControlVariant`; each component keeps its own behavior and geometry.

### 3.3 Salesphere target

Build the missing shared action component and variant function before migrating callers. Keep `SubmitButton`'s `useFormStatus` and pending label, but delegate the rendered control to `Button`:

```tsx
<Button type='submit' variant={variant} size={size} disabled={pending || disabled}>
	{pending ? <SalespherePendingLabel>{pendingText}</SalespherePendingLabel> : children}
</Button>
```

The matrix belongs in shared component code and uses Tailwind class recipes. Terra's `cva` pattern is an implementation example; do not add that dependency to Salesphere just for this work.

## 4. Migrate callers to variants

### 4.1 Replace native controls and presentation classes

Callers choose a shared component, its canonical `variant`, and `size` inline at the use site. The variant is the combination of the supported color and treatment axes (for example, `variant='primary-outline'`); this is the actual component API, not a call-site object of class strings. Do not pass color, border, background, text, typography, or control dimensions through `className` when a named component variant or size owns that choice. Keep only layout or genuine one-off geometry that the component does not own, after checking the receiving component.

Salesphere's current `WinTodayAskDrawer.tsx` call:

```tsx
<button type='submit' className='salesphere-button-signal min-h-11 px-5 py-2.5 text-sm sm:col-span-2'>
	Add to today and reprioritise
</button>
```

After the shared API exists, migrate it to:

```tsx
<Button type='submit' variant='primary' size='lg' className='sm:col-span-2'>
	Add to today and reprioritise
</Button>
```

`lg` is a candidate to confirm against the new size map. The button owns its presentation; the caller retains only grid placement. Migrate prediction action links to `ButtonLink` with the closest valid secondary variant.

### 4.2 Remove duplicate and approximate classes

Search the receiving component before retaining each class. If the component already supplies it, delete the caller duplicate. Otherwise, choose the closest valid semantic variant and remove the low-level presentation classes it replaces, even if the result is not pixel-identical. Do not preserve a long class list by moving it into a local `styles`/`variants` object or conditional map at the call site; if that choice recurs, add a typed canonical variant to the owning component family and consume that variant inline. Preserve meaningful layout, slot, and accessibility behavior.

### 4.3 Prefer semantic data maps for repeated content

When several rows, links, cards, or options have the same structure, define their labels, values, routes, and semantic variant keys as data and render the shared structure with `.map()`. Keep genuinely different content explicit. The map should select component props such as `variant` or `size`, not carry utility-class recipes that duplicate the matrix.

## 5. Audit the matrix, then compact the rest

Before the compact sweep, search every assigned area for native interactive controls, private class-name variant maps, legacy class names, repeated JSX, and caller presentation classes. Confirm that sibling components use the same family variants and that types, grids, defaults, aliases, states, component props, and docs agree. Update matrix docs with readable grouping and whitespace, and run checks only when requested. Then compact all remaining UI and non-UI files and repeat the repo-wide search.

For Salesphere, include consumers of `salesphere-button-signal`, `salesphere-primary-action`, `salesphere-secondary-action`, and `salesphere-input`, plus native `button`, `a`, `input`, `select`, and `textarea` call sites. Keep the pending and route behavior in their wrapper components while replacing caller-level control presentation with shared variants.
