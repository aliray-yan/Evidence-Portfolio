# NOTES.md — Comparing this playground with shadcn/ui

## How this comparison was done

`ui.shadcn.com` isn't reachable from this sandbox's network allowlist, so the `shadcn` CLI's
`init`/`add` commands couldn't run directly here. Instead:

1. I fetched shadcn/ui's **current, live source** directly from its GitHub repo
   (`shadcn-ui/ui`, `apps/v4/registry/new-york-v4/ui/tabs.tsx`, verbatim) and confirmed the
   current `Dialog` implementation's structure (`DialogContent`/`DialogOverlay`, the
   `showCloseButton` prop, the `radix-ui` unified import) via the project's own GitHub
   discussions, where maintainers quoted the file directly.
2. I rebuilt both components in a separate throwaway project (`shadcn-reference/`, **not**
   part of this playground) with the real `radix-ui` package installed, wired them up, and
   **exercised them with Playwright** — reading actual DOM output, computed styles, and
   keyboard-traversal order — rather than relying on memory or docs alone. Every claim below
   is backed by something I directly observed running the real code, not assumption.

This playground's own components (`src/components/Modal`, `src/components/Tabs`,
`src/components/Disclosure`) were built first, from scratch, before any of this.

## Where shadcn/ui (via Radix) does more than my implementation

### 1. Scroll lock compensates for scrollbar width; mine doesn't

Observed on the real Radix `Dialog`: opening it sets `overflow: hidden` **and**
`pointer-events: none` on `<body>`, with `pointer-events: auto` set back explicitly on the
dialog content itself. Radix's underlying `react-remove-scroll` dependency also measures the
scrollbar's width and pads `<body>` with an equivalent `padding-right`, so when the scrollbar
disappears the page content doesn't visibly shift sideways.

My `useScrollLock` hook only sets `body.style.overflow = 'hidden'`. On any desktop browser
with a visible (non-overlay) scrollbar, opening my Modal will shift the page content a few
pixels to the right as the scrollbar vanishes — a small but noticeable layout jump that
Radix's approach avoids.

**Fix if I were to harden mine:** measure
`window.innerWidth - document.documentElement.clientWidth` before locking, and add that as
`padding-right` alongside `overflow: hidden`, restoring both on cleanup.

### 2. `aria-describedby`/`aria-labelledby` are wired automatically; mine requires a manual prop

Rendering shadcn's `<DialogTitle>` and `<DialogDescription>` as children of `<DialogContent>`
is enough — Radix's internal context generates matching ids and wires
`aria-labelledby`/`aria-describedby` onto the dialog automatically. I confirmed this by
inspecting the live DOM: `aria-describedby="radix-_r_2_"` pointed straight at the rendered
`<DialogDescription>` paragraph with no extra code from the consumer.

My `Modal` only auto-wires `aria-labelledby` (from the required `title` prop). Associating a
description requires the consumer to remember a separate `describedById` prop *and* make sure
it matches an id they've placed on some element inside `children`. Forgetting this is a common,
easy-to-miss real-world accessibility bug (a dialog with real explanatory body text but no
`aria-describedby`), and shadcn's composition-based API structurally prevents it.

### 3. Inactive tab panels stay mounted (and keep their state); mine unmounts them

I confirmed via the DOM that Radix's `Tabs` renders **both** `TabsContent` elements
simultaneously at all times — the inactive one just gets a native `hidden` attribute
(`display: none`) — rather than removing it from the tree.

My `TabPanel` returns `null` for every panel except the selected one, i.e. it fully unmounts
inactive panels. That's simpler, but it means any state living inside a panel — scroll
position, an uncontrolled input's typed text, a mounted third-party widget — is destroyed the
moment the user switches away, and reset from scratch if they switch back. Radix (and shadcn)
avoid that by keeping content alive under the hood.

### 4. More configurable focus escape hatches

Radix's `Dialog.Content` exposes `onOpenAutoFocus` and `onCloseAutoFocus` callbacks that let a
consumer fully override *where* focus goes and *when* (including preventing the default
behavior entirely), plus a `modal` prop to opt out of modal behavior altogether. My `Modal`
only offers a single `initialFocusRef` prop for the open case, and unconditionally restores
focus to the trigger on close — it covers the common case well but is less flexible for
unusual requirements (e.g. moving focus somewhere other than the trigger on close).

## Where a fair comparison cuts the other way

Live-testing the real Radix `Dialog.Content` output, its rendered `role="dialog"` element did
**not** include an `aria-modal="true"` attribute at all in the version I tested. My `Modal`
explicitly sets `aria-modal="true"`, which is arguably more complete/spec-faithful on that one
attribute specifically. This is a small, narrow point (Radix's focus trap and `aria-hidden`
handling still make the dialog behave as modal to assistive tech either way), but it's worth
including for an honest, non-one-sided comparison rather than assuming a UI library is strictly
better across the board.

## Architectural differences that are stylistic, not accessibility gaps

- shadcn/ui components are styled with Tailwind utility classes, `class-variance-authority`
  variants, and `data-slot`/`data-state`/`data-orientation` attributes as CSS hooks. This
  playground uses CSS Modules instead, per this project's "no component library" constraint.
  Neither approach is more or less accessible; it's a build-tooling choice.
- shadcn/ui ships as source you copy into your repo and re-export from `@/components/ui/*`,
  same as this playground's approach of owning the component source directly (rather than
  importing a black-box package) — that part of the philosophy is actually the same.

## Summary

Building the Modal, Tabs, and Disclosure from scratch against the WAI-ARIA APG surfaced how
much of "getting accessibility right" is in details easy to skip under time pressure: scrollbar
compensation, wiring up every `aria-*` relationship automatically instead of by convention, and
preserving component state across visibility toggles. Radix's primitives — and by extension
shadcn/ui, which is a thin styling layer over them — have had years of edge cases reported and
fixed by a wide community. That's the main advantage they have over a from-scratch
implementation, more than any single pattern being fundamentally different.
