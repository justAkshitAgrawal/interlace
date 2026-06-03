# PaletteKit — MVP Design Spec

**Date:** 2026-06-03
**Status:** Approved for planning
**Author:** Akshit Agrawal

> Name `PaletteKit` is a working placeholder for the component/brand. The broader product line (additional SaaS interaction packs) is explicitly out of scope for this MVP — but the architecture is deliberately shaped so adding component #2 is "add a folder," not "re-architect." See §3.1.

---

## 1. Summary

An open-source, copy-paste **command palette** React component that is genuinely best-in-class, plus a **showcase site** where visitors play with it live and step through every state. The site is the marketing — there is no separate landing page strategy.

This MVP is the sharp-wedge synthesis of two ideas:

- **The business (from "Motion for Real Products"):** ship a hard, high-value SaaS interaction as drop-in source, via the proven shadcn-style registry model. Command palette is the flagship; more packs come later.
- **The marketing (from "Interaction Studio"):** the showcase site demos the *real, running* component and lets users flip through states — the "interaction, not a screenshot" energy — applied to **our own** component, which sidesteps the IP and content-treadmill problems of the original idea.

One thing to build, not six. Free now; monetize with additional/premium packs once distribution is proven.

---

## 2. Goals & Non-Goals

### Goals
- Ship one command palette so good that "just use cmdk" is not a valid dismissal.
- Distribute it as copy-paste source the user owns (no runtime dependency on us).
- A showcase site whose homepage *is* the sales pitch: a live palette running on the page.
- A Playground + State Explorer that exposes the states normally too fleeting to inspect.
- Best-in-class accessibility and reduced-motion support as a core claim, not an extra.

### Non-Goals (explicitly out of v1)
- Theming / design-token system and multiple visual presets → **first paid pack**.
- The other three interactions (data table, filter builder, notification center) → later packs.
- Our own CLI → ride shadcn's existing CLI.
- The motion inspector (duration/easing/sequence readout) → later.
- Auth, accounts, payments, license delivery, bookmarks, collections, AI search, comparison view → later.
- List virtualization for very large command sets → later.

---

## 3. Architecture & Repo Shape

pnpm workspaces + Turborepo monorepo.

```
/packages
  /components     → all component sources (the products)
    /command-palette   → component #1 (the only one in this MVP)
  /registry       → shadcn-style registry build script (emits one JSON per component)
/apps
  /showcase       → Next.js App Router site (marketing + playground + docs)
```

### `/packages/components` — the deliverables
- A **container for one-or-more components**; the MVP fills exactly one subfolder, `command-palette/`. The plural naming is intentional (see §3.1) — naming the package after a single component would be the one expensive-to-undo mistake.
- React + Tailwind + Framer Motion (`motion`).
- Each component is authored as the **exact files a user receives**. No transform build step; what's in here is what gets copied.
- Each component follows the same two-layer shape: a headless logic/state hook + a styled Tailwind view, so users can edit styling without touching behavior. This shape is the reusable mold for every future component.

### `/packages/registry` — distribution artifact
- Build script walks `/packages/components/*` and emits **one static `registry.json` per component** in **shadcn registry format** (file paths, contents, dependency list). For the MVP it emits a single file, `command-palette.json`.
- Output is served as static files by the showcase site under `/r/`.

### `/apps/showcase` — the marketing
- Next.js App Router, deployed on Vercel.
- Imports `/packages/components` as a **workspace dependency** so the live demo always reflects the real current source.
- Hosts the registry JSON files at public URLs.

### Distribution flow
```
npx shadcn@latest add https://<site>/r/command-palette.json
  → source files land in the user's repo
  → user owns the code; no runtime dependency on us
```
We do not ship our own CLI in v1; we ride shadcn's.

### 3.1 Multi-component readiness (one now, many later)

The product thesis is a **line** of SaaS interaction packs (data table, filter builder, notification center, …). Command palette is pack #1 because it is the highest-wow, hardest-to-fake wedge. The MVP ships exactly one component, but the architecture must not paint us into a single-component corner. Three structural choices make component #2 a "add a folder," not a "re-architect":

1. **Plural registry by nature.** shadcn registries serve many components from one endpoint. The build script already walks `components/*` and emits one JSON per component; adding `/r/data-table.json` later is just another source folder.
2. **Generic package boundary.** The package is `/packages/components` with a per-component subfolder — not a package literally named after the palette. This is the only boundary that is expensive to rename after launch, so we get it right now.
3. **The headless-hook + styled-view pattern is the reusable mold.** Every future component repeats this shape, so the architecture itself is the template.

**Deliberately NOT built in v1** (premature abstraction until component #2 exists for real): a shared "kit" runtime abstraction, a unified cross-component theming/token layer, and multi-component navigation on the site. We build the second component for real first, *then* extract whatever is genuinely shared. (Note: the working name `PaletteKit` implies palette-only and is worth revisiting to a neutral brand before the second component ships — not a v1 blocker.)

---

## 4. The Command Palette Component

### File layout (authored = delivered)
```
/packages/components/command-palette
  use-command-palette.ts   → headless state machine (the hard part)
  command-palette.tsx      → styled view (Tailwind + Framer Motion)
  types.ts                 → Command, CommandGroup, PaletteState
  fuzzy.ts                 → tiny fuzzy matcher (no heavy dep)
  motion.ts                → motion constants (durations/easings), inspectable & tweakable
```

The **headless hook** owns all behavior: open/close, query, filtered+grouped results, active index, navigation stack (nesting), and the async lifecycle. The **view** only renders what the hook returns. This separation is also what makes the State Explorer cheap: the showcase can drive the hook directly into any state.

### v1 feature line (the "doesn't suck" bar)

| Capability | Concrete behavior |
|---|---|
| **Fuzzy search** | Subsequence match + ranking (exact > prefix > word-boundary > scattered). Highlights matched chars. Own implementation (~80 lines), zero dependency. |
| **Full keyboard nav** | ↑↓ move, ⌘K / Ctrl+K toggle, Enter run, Esc close-or-pop, ⌘← / Backspace-on-empty pops a nested page. Active item always scrolls into view. Roving selection via `aria-activedescendant`, not DOM focus. |
| **Grouped commands** | Sections with labels (e.g. "Actions", "Navigation", "Recent"). Empty groups auto-hide. |
| **Async results** | A group/source may be `async (query) => Command[]`. Hook manages loading + **race cancellation** (stale responses dropped). Drives the loading state. |
| **Nested pages** | Running a command can push a sub-palette (e.g. "Change status →" reveals status options). Breadcrumb + back. The thing cmdk makes you hand-roll. |

### States (real states of the hook; the spine of the demo)
- `default` — idle, all commands shown.
- `loading` — async source in flight.
- `results` — filtered matches present.
- `empty` — fresh open / no query yet (variant copy).
- `no-results` — query matches nothing.
- `error` — async source threw; retryable.

### Accessibility (non-negotiable, part of the core claim)
- `role="combobox"` / `listbox` / `option`; `aria-activedescendant` for active item.
- Focus trap while open; focus restored to the trigger on close.
- `prefers-reduced-motion` → animations collapse to instant.

### Motion (per "Motion for Real Products" principles — fast, functional)
- Overlay fade ~150ms; panel scale/translate ~180ms; list/nested transitions ~150ms.
- Springs only where they read as responsive, never bouncy.
- All durations/easings live in `motion.ts` so they are inspectable and editable.

---

## 5. The Showcase Site

Next.js App Router on Vercel. Four routes; the homepage carries ~90% of the weight.

### `/` — the hook
- Above the fold: one-liner positioning, a **giant live palette running on the page** (⌘K works), and a single "copy install command" button.
- Below: three short proof points — **async**, **nested**, **accessible** — each with a *live* mini-demo.
- The page itself is the argument. Doubles as the Product Hunt / X / Hacker News landing target; README mirrors it.

### `/playground` — Playground + State Explorer
- Live palette on one side; control panel on the other.
- **State selector**: `default / loading / results / empty / no-results / error`. Selecting one drives the headless hook into that state and **freezes** it, so visitors can inspect the loading shimmer, empty copy, error+retry — states that normally flash by in real products.
- Toggles: reduced-motion on/off, async-source on/off, nesting-demo on/off.

### `/docs` — copy the code
- Install command (`npx shadcn add <url>`), props/API table, source rendered with a copy button, and a short "how to customize" note (they own the files).
- Generated from the same package so docs can't drift from reality.

### `/r/command-palette.json` — registry endpoint
- Static file: the shadcn-format output of the registry build. The artifact the CLI fetches. Not a page.

### Not in the site (later)
Auth, accounts, payments, bookmarks, collections, AI search, comparison view, motion inspector.

---

## 6. Testing Strategy

Scaled to what actually matters.

- **Headless hook — thorough unit tests (Vitest).** The correctness core. Cover: fuzzy ranking order; keyboard nav including edge wraps and scroll-into-view; group filtering & auto-hide; async race cancellation (stale response dropped); nested push/pop + back; every one of the six states reachable.
- **Accessibility — automated + manual.** `axe-core` / `jest-axe` on the rendered palette; **zero violations is a gate**. Manual keyboard-only and screen-reader pass before launch. Reduced-motion verified via `matchMedia` mock.
- **Component view — light interaction tests (Testing Library).** Open via ⌘K, type, arrow to item, Enter fires handler, Esc closes + restores focus. Logic load is carried by the hook tests.
- **Showcase site — not unit tested.** It's a demo. One smoke check: it builds, and the registry JSON is valid/parseable.
- **Registry integrity — the one integration test that matters.** Fetch the emitted `registry.json`, run `shadcn add` against a throwaway temp app, assert files land and typecheck. If install is broken, nothing else counts.

---

## 7. Success Criteria (v1 "done")

1. `npx shadcn add <url>` installs into a fresh Next.js + Tailwind app and the palette works with **zero manual fixup**.
2. All six states reachable and inspectable in the Playground.
3. Zero axe violations; full keyboard operation; reduced-motion respected.
4. Async + nested demos work live on the homepage.
5. Homepage interactive fast; palette opens with no jank.

Star/user counts are launch outcomes, not build-completion gates, and are deliberately excluded here.

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| **"Just use cmdk."** | Nesting + async-with-race-handling + accessibility out of the box. The homepage must *show* nesting and async within 10 seconds, or we've failed to differentiate. |
| **shadcn registry format drift.** | The registry integrity test catches breakage early. Pin to the current format version and note it. |
| **Scope creep into theming.** | Hold the line — theming is the first **paid pack**, not v1. |
| **Audience that won't pay.** | Accepted for v1 (free, distribution-first). Monetization deferred by design; the day-one job is pull, not revenue. |
```
