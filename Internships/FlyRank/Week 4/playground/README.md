# Accessible Components Playground

A standalone React + TypeScript project with three components built **from scratch** — no
component libraries — against the [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/):

- **Modal Dialog** — [Dialog (Modal) pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- **Tabs** — [Tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)
- **Disclosure / Accordion** — [Disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) / [Accordion pattern](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/)

This project is completely separate from any other project — it has its own
`package.json`, its own dependency tree, and no shared code.

See [`NOTES.md`](./NOTES.md) for a detailed, evidence-based comparison against shadcn/ui's
Dialog and Tabs components.

## Requirements

- Node.js 20+
- npm

## Running it

```bash
npm install
npm run dev       # starts Vite on http://localhost:5173
```

Open the printed URL in a browser. The demo page (`src/pages/Playground.tsx`) shows all three
components with working examples and links to the relevant APG pattern for each.

```bash
npm run build     # type-checks (tsc -b) and builds a production bundle to dist/
npm run preview   # serves the production build locally
```

## Testing it

Three ways to verify the components, from fastest/most automated to most manual:

### 1. Automated tests (unit + accessibility)

```bash
npm run test        # runs the full Vitest suite once
npm run test:watch  # re-runs on file changes
```

This runs 24 tests across the three components (Vitest + React Testing Library +
`@testing-library/user-event`), covering:

- Correct ARIA roles/attributes (`dialog`, `tab`/`tablist`/`tabpanel`, `aria-expanded`, etc.)
- Keyboard behavior (Tab-trapping, Escape, Arrow/Home/End navigation, Space/Enter activation)
- Focus management (initial focus on open, focus restored to the trigger on close)
- An [axe-core](https://github.com/dequelabs/axe-core) accessibility scan of each component's
  rendered output, asserting zero violations

### 2. Static checks

```bash
npm run typecheck   # tsc -b --noEmit, strict mode, no `any`
npm run lint        # ESLint: typescript-eslint, react-hooks, and jsx-a11y rules
```

Both should report zero errors. A few `jsx-a11y` rules are suppressed with inline
`eslint-disable` comments where they produce false positives for legitimate composite-widget
patterns (e.g. a `tablist` container that is intentionally not itself focusable) — each has an
explanatory comment directly above it.

### 3. Manual keyboard/screen-reader pass

For a full manual audit, with a screen reader running (VoiceOver, NVDA, or JAWS):

- **Modal**: open it, confirm focus lands in the first field, confirm Tab/Shift+Tab never
  leaves the dialog, press Escape and confirm focus returns to the button that opened it, and
  confirm you can't click or Tab into anything behind the overlay.
- **Tabs**: click a tab, then focus the tablist and use Left/Right/Home/End; confirm the panel
  below updates to match whichever tab is focused (automatic activation).
- **Disclosure/Accordion**: Tab to a header, press Space or Enter to expand/collapse it, and
  use Up/Down/Home/End to move between headers without losing track of which is focused.

## Project structure

```
src/
  components/
    Modal/
      Modal.tsx            # role="dialog", focus trap, Escape, focus restore, inert background
      Modal.module.css
      __tests__/
    Tabs/
      Tabs.tsx              # context provider (selection state, controlled/uncontrolled)
      TabList.tsx            # role="tablist", arrow/Home/End key handling
      Tab.tsx                 # role="tab", roving tabindex, activation modes
      TabPanel.tsx           # role="tabpanel"
      TabsContext.ts
      __tests__/
    Disclosure/
      Disclosure.tsx         # single show/hide widget (aria-expanded/aria-controls)
      Accordion.tsx          # composes multiple Disclosures, arrow-key header nav
      __tests__/
  hooks/
    useFocusTrap.ts          # Tab/Shift+Tab cycling within a container
    useScrollLock.ts         # locks body scroll while active
  utils/
    focusableElements.ts     # shared "what counts as focusable" query
  pages/
    Playground.tsx           # example page demonstrating all three components
  test/
    setup.ts                 # Vitest + Testing Library + jest-dom setup
    axeHelpers.ts             # small helper for asserting zero axe violations
```

## Design notes

- **No `any`** anywhere in component props — everything is explicitly typed.
- **Controlled and uncontrolled modes**: `Tabs` and `Disclosure` both support being driven by
  external state (`selectedId`/`isOpen` + change handlers) or managing their own state
  internally, so they fit into different app architectures without a rewrite.
- **Portal + `inert`** for the Modal: it renders via `createPortal` into `document.body` and
  marks every other `<body>` child `inert` (plus `aria-hidden="true"` as a defense-in-depth
  fallback) while open, which both blocks pointer interaction and hides the background from
  assistive technology using a single, standards-based mechanism.
- **Roving tabindex** for `Tabs`: only the selected tab has `tabIndex={0}`; the rest are `-1`,
  so a single `Tab` keypress moves focus in or out of the whole tablist, while `Left`/`Right`
  move between the tabs inside it — matching the APG's composite-widget guidance.
