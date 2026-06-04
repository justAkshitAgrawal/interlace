# Command Palette Power Features — Design Spec

**Date:** 2026-06-04
**Status:** Approved for planning
**Author:** Akshit Agrawal
**Builds on:** `2026-06-03-palettekit-mvp-design.md` (the shipped command palette)

---

## 1. Summary

Four additive, optional features for the existing PaletteKit command palette. Every one is backward-compatible — the current 58 tests and existing consumers are unaffected when the new props are omitted.

1. **Recents / frequency ranking (#1)** — consumer-owned usage history (`recents` prop) boosts recently-used commands in ranking. Plus an `onSelectCommand` callback so consumers can record usage.
2. **Shortcut hints (#2)** — an optional `shortcut` field per command, rendered right-aligned on the row. Display-only (we do not bind the keys).
3. **Pluggable rank (#3)** — an optional `rank` prop that overrides the built-in fuzzy matcher; defaults to the built-in `rankCommands`, so omitting it changes nothing.
4. **Virtualization (#4)** — the list windows large command sets via `@tanstack/react-virtual`, auto-enabled past a threshold; small lists render exactly as today.

These answer the honest competitive gaps: recents + shortcut hints are real perceived-quality wins; pluggable rank defuses "your matcher is weaker than cmdk's"; virtualization removes the large-list ceiling.

---

## 2. Goals & Non-Goals

### Goals
- Four optional features, zero breaking changes, existing tests stay green.
- Keep the component self-contained for registry copy (one new declared dependency: `@tanstack/react-virtual`).
- Make the features visible on the showcase where it's cheap and honest to do so.

### Non-Goals
- Built-in localStorage persistence of recents (consumer owns storage — keeps the component pure/SSR-safe).
- Global shortcut key-binding (consumer's app owns global keys; we only display hints).
- A separate filter+sort split (single `rank` function is the override surface).
- A synthetic "Recent" group (recents boost within existing groups instead — see §4.1).
- Theming (still the future paid pack).

---

## 3. API Surface

### types.ts additions

```ts
export interface Command {
  // ...existing fields unchanged
  /** Shortcut hint shown right-aligned on the row. Display-only; not bound. */
  shortcut?: string[]; // e.g. ["⌘", "N"]
}

/** Filters + orders commands and reports match indices. The single ranking surface. */
export type RankFn = (
  commands: Command[],
  query: string,
  recents?: string[],
) => RankedCommand[];
```

`RankedCommand` (existing: `{ command, matchedIndices }`) is unchanged.

### Hook options (`UseCommandPaletteOptions`) — all optional, additive

```ts
recents?: string[];                                   // ordered ids, most-recent-first
onSelectCommand?: (id: string, command: Command) => void;
rank?: RankFn;                                        // defaults to built-in rankCommands
```

### View props (`CommandPaletteProps`) — all optional, additive

```ts
recents?: string[];
onSelectCommand?: (id: string, command: Command) => void;
rank?: RankFn;
// shortcut is per-command (types.ts); virtualization is automatic — no prop.
```

**Backward compatibility:** omitting all of the above yields exactly today's behavior. This is a hard requirement, asserted by the existing test suite remaining green.

---

## 4. Behavior

### 4.1 Recents boost (#1)

The built-in ranker gains an optional `recents` parameter:

```ts
export function rankCommands(
  commands: Command[],
  query: string,
  recents?: string[],
): RankedCommand[]
```

- **Recency weight:** build a map from `recents` where most-recent (index 0) gets the largest boost, decaying with index: `boost = RECENCY_WEIGHT * (1 - index / recents.length)`. `RECENCY_WEIGHT` is a constant tuned so the boost nudges ties and near-ties but **cannot leap a whole match tier** — a recent scattered match must not outrank a fresh exact/prefix match. Concretely, `RECENCY_WEIGHT` is smaller than the gap between adjacent scoring tiers (exact/prefix/word-boundary/scattered from the existing `fuzzy.ts`).
- **Non-empty query:** add `boost` to each matched command's score before sorting. Recency tie-breaks; it does not dominate.
- **Empty query:** today returns all commands in original order. With recents, recent commands sort to the front (in `recents` order) ahead of non-recent commands; non-recent keep their original relative order. `matchedIndices` stays `[]` for empty query.
- **Grouping interaction:** the boost is applied to scores BEFORE bucketing into groups (the grouping happens in the hook's `buildGroups`, which consumes ranked output). Net effect: recents rise within their own group; declared group order is unchanged. No synthetic "Recent" group.
- **No recents (undefined/empty):** ranking is byte-identical to today (regression-tested).

### 4.2 onSelectCommand (#1)

In the hook's `select(id)`, after resolving the command, fire `onSelectCommand?.(id, command)` for **every** selection:
- a top-level command,
- a command that pushes a static nested page (e.g. "Change status…" — this IS a real selection worth tracking),
- a command selected within a nested page,
- a command that triggers an async child resolver.

It fires **in addition to** (not instead of) the command's own `onSelect`. Order: call `onSelectCommand` first, then perform the command's effect (push page / run onSelect / run resolver), so tracking happens regardless of what the command does next.

### 4.3 Shortcut hints (#2)

- `Command.shortcut?: string[]`. When present, render right-aligned in the row; each token wrapped in a `<kbd>` styled consistently with the existing ⌘K kbd treatment.
- Purely visual: no global listener, no key parsing, no interaction with the palette's own keydown handling.
- Absent → nothing renders, no layout shift.

### 4.4 Pluggable rank (#3)

- Hook resolves the ranker as `const ranker = rank ?? rankCommands;` and calls `ranker(commands, query, recents)`.
- A custom `rank` is the single source of filtering + ordering + match indices. Its output is grouped/flattened/navigated identically to built-in output.
- **Recents + custom rank:** `recents` is passed through to a custom `rank`, but a custom ranker MAY ignore it. The recents boost is a property of the BUILT-IN ranker only — passing your own `rank` means you own ordering entirely (no surprise post-processing). Documented explicitly.

### 4.5 Virtualization (#4)

- Uses `@tanstack/react-virtual` (declared as a component dependency).
- Auto-enabled when the flat visible-item count exceeds `VIRTUALIZE_THRESHOLD = 100`. At/below the threshold, render exactly as today (plain mapping — existing view tests untouched).
- **Groups in a virtual list:** flatten group headers + items into a single ordered virtual-index stream so headers scroll naturally as virtual rows (header rows and option rows share one virtualizer).
- **Keyboard nav:** when virtualized, scroll-into-view for the active item routes through the virtualizer's `scrollToIndex(activeFlatIndex)` instead of the current `scrollIntoView`. Active-item tracking (the hook's `activeId`/index) is unchanged; only the scroll mechanism differs.
- Below threshold, keyboard scroll uses the existing `scrollIntoView` path.

---

## 5. Showcase Integration

Make the invisible visible, cheaply and honestly:

- **Shortcut hints:** add `shortcut` to a few entries in `demo-commands.ts` (e.g. "Create new issue" → `["⌘","N"]`). Appears immediately in the homepage palette + state inspector. Data-only, no new component.
- **Recents:** the homepage palette gets a small in-memory controlled `recents` state wired through `onSelectCommand` (resets on reload — no persistence layer). Selecting commands visibly reorders the idle palette on next open. Optional one-line caption.
- **Pluggable rank:** docs-only. A `/docs` snippet showing `rank={...}` with a note: "bring your own matcher (fuzzysort, command-score); ours is the default." Developer-API selling point, not a homepage demo.
- **Virtualization:** a modest dedicated homepage demo — a palette loaded with ~5,000 generated commands scrolling smoothly. Kept small (not a full inspector); "fast at scale" is exactly the invisible thing the site exists to surface.

---

## 6. Testing

All new tests are additive; the existing 58 must stay green.

- **Ranking (`fuzzy.test.ts`):**
  - recent command floats above an equal-score peer;
  - boost cannot leap a tier (fresh exact/prefix > recent scattered);
  - empty-query recents ordering (recents first, in order; rest keep original order);
  - `recents` undefined/empty → output identical to today (regression).
- **Hook (`use-command-palette.test.tsx`):**
  - `onSelectCommand` fires with `(id, command)` for top-level, nested-child, async-resolved, and page-pushing selections;
  - `onSelectCommand` fires alongside the command's own `onSelect`;
  - custom `rank` override is used when provided and bypasses the built-in matcher;
  - `recents` is threaded into the active ranker.
- **View (`command-palette.test.tsx`):**
  - shortcut `<kbd>`s render when `shortcut` present; nothing renders when absent;
  - below threshold: all rows in DOM (existing behavior preserved);
  - above threshold: only a window of rows in the DOM (assert rendered count << total);
  - keyboard nav reaches items in a virtualized list (assert `scrollToIndex` invoked / active item updates);
  - axe: zero violations with shortcuts + virtualization present.
- **Registry (`build-registry.test.ts` / `registry-integrity.test.ts`):**
  - `@tanstack/react-virtual` appears in the component's declared `dependencies`.

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Recents boost feels unpredictable ("why is this first?") | Boost is sub-tier (can't jump match categories); only nudges ties/near-ties. Tuned + tested against tier-jump. |
| New runtime dependency cuts against "zero-dep, you own it" | Accepted, explicit decision. Only `@tanstack/react-virtual`; declared in registry deps; mentioned in docs. It's the proven library and commonly already present. |
| Virtualization + grouping is the fiddliest part | Headers flattened into the single virtual-index stream; covered by a dedicated view test (windowed render + keyboard reach). |
| Breaking existing behavior | Every feature optional; the existing 58 tests are the backward-compat gate and must stay green. |
| Custom `rank` + recents double-applying | Recents boost lives ONLY in the built-in ranker; custom `rank` owns ordering. Documented + tested. |

---

## 8. Out of Scope (future)

- localStorage/`useRecents` helper hook (consumer owns storage for now).
- Global shortcut key-binding.
- Filter+sort split API.
- Theming / token system (paid pack).
