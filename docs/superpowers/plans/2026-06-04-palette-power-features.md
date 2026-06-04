# Command Palette Power Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four optional, backward-compatible features to the command palette — recents/frequency ranking, shortcut hints, a pluggable `rank` override, and list virtualization — plus showcase integration.

**Architecture:** Extend the existing headless hook + view. The built-in `rankCommands` gains an optional `recents` parameter for sub-tier recency boosting; the hook resolves `rank ?? rankCommands` and threads `recents` through; `select()` fires a new `onSelectCommand` callback. The view renders `command.shortcut` as `<kbd>`s and switches its list to a `@tanstack/react-virtual` virtualizer past a row threshold. All new props are optional — the existing 58 tests are the backward-compat gate and must stay green.

**Tech Stack:** TypeScript, React 19, framer-motion, `@tanstack/react-virtual` (new dep), Vitest, @testing-library/react, jest-axe.

---

## File Structure

```
packages/components/src/command-palette/
  types.ts                      → MODIFY: add Command.shortcut, RankFn type
  fuzzy.ts                      → MODIFY: rankCommands gains optional recents param + boost
  use-command-palette.ts        → MODIFY: recents/onSelectCommand/rank options; thread through
  command-palette.tsx           → MODIFY: shortcut <kbd> render; virtualized list; pass new props
  command-list.tsx              → CREATE: extracted list renderer (plain + virtualized paths)
  __tests__/fuzzy.test.ts             → MODIFY: recents boost tests
  __tests__/use-command-palette.test.tsx → MODIFY: onSelectCommand, rank, recents threading tests
  __tests__/command-palette.test.tsx  → MODIFY: shortcut render + virtualization + axe tests

packages/registry/
  build-registry.ts             → MODIFY: add @tanstack/react-virtual to command-palette deps
  __tests__/build-registry.test.ts        → MODIFY: assert new dependency
  __tests__/registry-integrity.test.ts    → MODIFY: assert new dependency

apps/showcase/src/
  lib/demo-commands.ts          → MODIFY: add shortcut fields to a few commands
  app/page.tsx                  → MODIFY: wire recents state via onSelectCommand; add virtualization demo section
  app/docs/page.tsx             → MODIFY: add a "bring your own matcher" rank snippet + recents/shortcut prop rows
  components/scale-demo.tsx     → CREATE: virtualization demo (5,000 generated commands)
```

---

## Conventions (read once)

- `pnpm` only. Single test file: `pnpm vitest run <path>` from repo root `/Users/akshitagrawal/Documents/Dev/personal/paletteKit`.
- Full suite: `pnpm test`. Component typecheck: `pnpm --filter @palettekit/components lint`. Showcase build: `pnpm --filter @palettekit/showcase build`.
- Branch: `feat/palettekit-mvp` (continue on it). Commit author handled by the environment.
- TDD for the hook/fuzzy logic; render/axe tests for the view.
- **Backward-compat is sacred:** the existing tests must never be edited to accommodate a new feature. New behavior only activates when new props/params are passed.
- The current full count is **58 tests** (component 50: fuzzy 10 + hook 33 + view 7; registry 8). Counts below are deltas from there.

---

## Task 1: Types — `Command.shortcut` + `RankFn`

**Files:**
- Modify: `packages/components/src/command-palette/types.ts`

- [ ] **Step 1: Add `shortcut` to `Command`** — insert after the `keywords` field (currently lines 11-12):

```ts
  /** Extra terms that should match fuzzy search but aren't shown. */
  keywords?: string[];
  /** Shortcut hint shown right-aligned on the row. Display-only; not bound to keys. */
  shortcut?: string[];
```

- [ ] **Step 2: Add the `RankFn` type** — append at the end of `types.ts`:

```ts
/** Filters + orders commands and reports match indices. The single ranking surface. */
export type RankFn = (
  commands: Command[],
  query: string,
  recents?: string[],
) => RankedCommand[];
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @palettekit/components lint`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add packages/components/src/command-palette/types.ts
git commit -m "feat: Command.shortcut field + RankFn type"
```

---

## Task 2: Recents boost in `rankCommands` (TDD)

**Files:**
- Modify: `packages/components/src/command-palette/__tests__/fuzzy.test.ts`
- Modify: `packages/components/src/command-palette/fuzzy.ts`

- [ ] **Step 1: Add failing tests** — append a new `describe` block to `fuzzy.test.ts`:

```ts
describe("rankCommands: recents boost", () => {
  const cmds: Command[] = [
    { id: "settings", label: "Settings" },
    { id: "search", label: "Search" },
  ];

  it("floats a recent command above an equal-ish-scoring peer", () => {
    // "se" is a prefix of both; without recents "search" wins (shorter target).
    const base = rankCommands(cmds, "se");
    expect(base[0]!.command.id).toBe("search");
    // Mark "settings" as recent → it should now sort first.
    const boosted = rankCommands(cmds, "se", ["settings"]);
    expect(boosted[0]!.command.id).toBe("settings");
  });

  it("does not let a recent scattered match beat a fresh exact match", () => {
    const items: Command[] = [
      { id: "go", label: "Go" }, // exact match for "go"
      { id: "dialog", label: "Open dialog" }, // scattered g..o for "go"
    ];
    const ranked = rankCommands(items, "go", ["dialog"]);
    expect(ranked[0]!.command.id).toBe("go"); // recency cannot jump the tier
  });

  it("orders recents first on an empty query, rest keep original order", () => {
    const items: Command[] = [
      { id: "a", label: "Alpha" },
      { id: "b", label: "Bravo" },
      { id: "c", label: "Charlie" },
    ];
    const ranked = rankCommands(items, "", ["c", "a"]);
    expect(ranked.map((r) => r.command.id)).toEqual(["c", "a", "b"]);
    expect(ranked[0]!.matchedIndices).toEqual([]);
  });

  it("is identical to no-recents when recents is undefined or empty", () => {
    const a = rankCommands(cmds, "se");
    const b = rankCommands(cmds, "se", []);
    const c = rankCommands(cmds, "se", undefined);
    expect(b.map((r) => r.command.id)).toEqual(a.map((r) => r.command.id));
    expect(c.map((r) => r.command.id)).toEqual(a.map((r) => r.command.id));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run packages/components/src/command-palette/__tests__/fuzzy.test.ts`
Expected: FAIL — `rankCommands` takes only 2 args / recents not honored.

- [ ] **Step 3: Implement the boost** — replace the `rankCommands` function (currently lines 59-89) with:

```ts
/** Max recency boost. Strictly less than the gap between adjacent score tiers
 *  (e.g. SCORE_WORD_BOUNDARY 250 → SCORE_SCATTERED 100 gap is 150), so recency
 *  nudges ties/near-ties but never lifts a match into a higher tier. */
const RECENCY_WEIGHT = 40;

/** Boost for a command id given the recents list (most-recent first). 0 if absent. */
function recencyBoost(id: string, recents?: string[]): number {
  if (!recents || recents.length === 0) return 0;
  const idx = recents.indexOf(id);
  if (idx < 0) return 0;
  return RECENCY_WEIGHT * (1 - idx / recents.length);
}

/**
 * Filters + ranks commands against a query. Empty query returns all commands
 * in their original order with no highlight indices — except recent commands
 * (if `recents` is given) sort to the front in recents order. For a non-empty
 * query, recency adds a sub-tier boost to each match's score.
 */
export function rankCommands(
  commands: Command[],
  query: string,
  recents?: string[],
): RankedCommand[] {
  if (query === "") {
    const base = commands.map((command) => ({ command, matchedIndices: [] }));
    if (!recents || recents.length === 0) return base;
    // Stable partition: recents first (in recents order), then the rest in
    // original order.
    const inRecents = (id: string) => recents.indexOf(id);
    return [...base].sort((a, b) => {
      const ra = inRecents(a.command.id);
      const rb = inRecents(b.command.id);
      if (ra === -1 && rb === -1) return 0; // both non-recent → keep original
      if (ra === -1) return 1; // a not recent → after b
      if (rb === -1) return -1; // b not recent → after a
      return ra - rb; // both recent → recents order
    });
  }

  const scored: { command: Command; result: FuzzyResult }[] = [];
  for (const command of commands) {
    // Best score across label + keywords; indices only kept for the label.
    const labelRes = fuzzyScore(query, command.label);
    let best = labelRes;
    let bestIndices = labelRes?.indices ?? [];
    for (const kw of command.keywords ?? []) {
      const kwRes = fuzzyScore(query, kw);
      if (kwRes && (!best || kwRes.score > best.score)) {
        best = kwRes;
        bestIndices = labelRes?.indices ?? []; // never highlight keyword chars in the label
      }
    }
    if (best) {
      const boosted = best.score + recencyBoost(command.id, recents);
      scored.push({ command, result: { score: boosted, indices: bestIndices } });
    }
  }

  scored.sort((a, b) => b.result.score - a.result.score);
  return scored.map(({ command, result }) => ({
    command,
    matchedIndices: result.indices,
  }));
}
```

Note: `Array.prototype.sort` on arrays from `.map` is stable in modern JS (V8/Node ≥11), so equal-key elements keep their original order — relied on for the empty-query partition and the "rest keep original order" test.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run packages/components/src/command-palette/__tests__/fuzzy.test.ts`
Expected: all passed (10 prior + 4 new = 14).

- [ ] **Step 5: Commit**

```bash
git add packages/components/src/command-palette/fuzzy.ts packages/components/src/command-palette/__tests__/fuzzy.test.ts
git commit -m "feat: recency boost in rankCommands (sub-tier, opt-in via recents)"
```

---

## Task 3: Hook — `recents`, `rank`, `onSelectCommand` (TDD)

**Files:**
- Modify: `packages/components/src/command-palette/use-command-palette.ts`
- Modify: `packages/components/src/command-palette/__tests__/use-command-palette.test.tsx`

- [ ] **Step 1: Add failing tests** — append a new `describe` block to `use-command-palette.test.tsx` (the shared `commands`/`groups` consts and `key()` helper already exist at the top of the file):

```ts
describe("useCommandPalette: recents / rank / onSelectCommand", () => {
  it("threads recents into ranking so a recent item leads on empty query", () => {
    const { result } = renderHook(() =>
      useCommandPalette({ commands, groups, recents: ["settings"] }),
    );
    act(() => result.current.setOpen(true));
    // "settings" is in the "nav" group; within its group it should be first.
    const navGroup = result.current.groups.find((g) => g.id === "nav")!;
    expect(navGroup.items[0]!.command.id).toBe("settings");
  });

  it("uses a custom rank override instead of the built-in matcher", () => {
    const calls: { query: string }[] = [];
    const rank = (cmds: typeof commands, query: string) => {
      calls.push({ query });
      // Reverse order, ignore query — proves OUR matcher didn't run.
      return [...cmds].reverse().map((command) => ({ command, matchedIndices: [] }));
    };
    const { result } = renderHook(() =>
      useCommandPalette({ commands, groups, rank }),
    );
    act(() => result.current.setOpen(true));
    act(() => result.current.setQuery("zzz")); // built-in would yield 0 matches
    // Custom rank returns all commands regardless → not no-results.
    expect(calls.length).toBeGreaterThan(0);
    const ids = result.current.groups.flatMap((g) => g.items.map((i) => i.command.id));
    expect(ids.length).toBe(commands.length);
  });

  it("fires onSelectCommand for a top-level selection with (id, command)", () => {
    const onSelectCommand = vi.fn();
    const onSelect = vi.fn();
    const cmds: Command[] = [{ id: "go", label: "Go", onSelect }];
    const { result } = renderHook(() =>
      useCommandPalette({ commands: cmds, onSelectCommand }),
    );
    act(() => result.current.setOpen(true));
    act(() => result.current.select("go"));
    expect(onSelectCommand).toHaveBeenCalledWith("go", cmds[0]);
    expect(onSelect).toHaveBeenCalledOnce(); // both fire
  });

  it("fires onSelectCommand when selecting a command that pushes a nested page", () => {
    const onSelectCommand = vi.fn();
    const cmds: Command[] = [
      { id: "status", label: "Change status", children: [{ id: "todo", label: "Todo" }] },
    ];
    const { result } = renderHook(() =>
      useCommandPalette({ commands: cmds, onSelectCommand }),
    );
    act(() => result.current.setOpen(true));
    act(() => result.current.select("status"));
    expect(onSelectCommand).toHaveBeenCalledWith("status", cmds[0]);
    expect(result.current.pages).toHaveLength(2); // page still pushed
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run packages/components/src/command-palette/__tests__/use-command-palette.test.tsx`
Expected: FAIL — options not recognized / onSelectCommand undefined.

- [ ] **Step 3: Extend the options interface** — in `use-command-palette.ts`, replace the `UseCommandPaletteOptions` interface (currently lines 18-23) with:

```ts
export interface UseCommandPaletteOptions {
  commands: Command[];
  groups?: CommandGroup[];
  /** Notified whenever the hook changes its open state (e.g. Escape at root). */
  onOpenChange?: (open: boolean) => void;
  /** Opens the palette pre-filtered with this query. */
  defaultQuery?: string;
  /** Ordered ids, most-recent-first. Boosts these in the built-in ranking. */
  recents?: string[];
  /** Fired for every command selection (top-level, nested, async, page-push). */
  onSelectCommand?: (id: string, command: Command) => void;
  /** Override the ranking function. Defaults to the built-in rankCommands. */
  rank?: RankFn;
}
```

- [ ] **Step 4: Import `RankFn`** — update the type import block at the top of `use-command-palette.ts` to include `RankFn`:

```ts
import type {
  ChildResolver,
  Command,
  CommandGroup,
  Page,
  PaletteStatus,
  RankedCommand,
  RankFn,
  RenderGroup,
} from "./types";
```

- [ ] **Step 5: Destructure the new options** — replace the destructuring line (currently line 38) with:

```ts
  const { commands, groups = [], onOpenChange, defaultQuery, recents, onSelectCommand, rank } = options;
```

- [ ] **Step 6: Thread recents + rank into grouping** — replace the `renderGroups` useMemo (currently lines 133-135) with:

```ts
  const renderGroups = useMemo<RenderGroup[]>(
    () => buildGroups(currentPage.commands, groups, query, recents, rank),
    [currentPage.commands, groups, query, recents, rank],
  );
```

- [ ] **Step 7: Fire onSelectCommand in `select`** — the `select` callback currently begins (around line 160):

```ts
  const select = useCallback(
    (id: string) => {
      const cmd = flat.find((i) => i.command.id === id)?.command;
      if (!cmd) return;
      if (typeof cmd.children === "function") {
```

Replace those opening lines with (adds the callback fire right after resolving `cmd`, before any branch):

```ts
  const select = useCallback(
    (id: string) => {
      const cmd = flat.find((i) => i.command.id === id)?.command;
      if (!cmd) return;
      onSelectCommand?.(id, cmd);
      if (typeof cmd.children === "function") {
```

Then add `onSelectCommand` to `select`'s dependency array. The array currently is `[flat, runResolver, pushStaticPage]`; change it to `[flat, runResolver, pushStaticPage, onSelectCommand]`.

- [ ] **Step 8: Update `buildGroups`** — replace the `buildGroups` function (currently lines 242-269) with:

```ts
function buildGroups(
  commands: Command[],
  groupDefs: CommandGroup[],
  query: string,
  recents: string[] | undefined,
  rank: RankFn | undefined,
): RenderGroup[] {
  const ranker = rank ?? rankCommands;
  const ranked = ranker(commands, query, recents);
  const byGroup = new Map<string, RenderGroup>();
  const order: string[] = [];
  const ensure = (id: string, label: string | null) => {
    if (!byGroup.has(id)) {
      byGroup.set(id, { id, label, items: [] });
      order.push(id);
    }
    return byGroup.get(id)!;
  };

  for (const g of groupDefs) ensure(g.id, g.label);

  for (const item of ranked) {
    const gid = item.command.group ?? "__ungrouped";
    const label =
      groupDefs.find((g) => g.id === gid)?.label ??
      (gid === "__ungrouped" ? null : gid);
    ensure(gid, label).items.push(item);
  }

  return order.map((id) => byGroup.get(id)!).filter((g) => g.items.length > 0);
}
```

- [ ] **Step 9: Expose options on the return (so the view can pass them)** — no return-shape change is needed; the view passes options INTO the hook. Skip. (This step exists to confirm no return change.)

- [ ] **Step 10: Run to verify it passes**

Run: `pnpm vitest run packages/components/src/command-palette/__tests__/use-command-palette.test.tsx`
Expected: all passed (33 prior + 4 new = 37).

- [ ] **Step 11: Full component suite + lint**

Run: `pnpm vitest run packages/components/src/command-palette && pnpm --filter @palettekit/components lint`
Expected: all pass (fuzzy 14 + hook 37 + view 7 = 58 component-package tests); tsc exits 0.

- [ ] **Step 12: Commit**

```bash
git add packages/components/src/command-palette/use-command-palette.ts packages/components/src/command-palette/__tests__/use-command-palette.test.tsx
git commit -m "feat: hook recents/rank/onSelectCommand options"
```

---

## Task 4: View — shortcut hints + pass new props (TDD)

**Files:**
- Modify: `packages/components/src/command-palette/command-palette.tsx`
- Modify: `packages/components/src/command-palette/__tests__/command-palette.test.tsx`

- [ ] **Step 1: Add failing tests** — append to `command-palette.test.tsx` (the file already imports `render`, `screen`, `CommandPalette`, types; reuse them). Add a new `describe`:

```tsx
describe("CommandPalette: shortcut hints", () => {
  it("renders shortcut tokens as kbd elements when present", () => {
    function H() {
      const [open, setOpen] = useState(true);
      const cmds: Command[] = [
        { id: "new", label: "New File", shortcut: ["⌘", "N"] },
      ];
      return (
        <CommandPalette commands={cmds} open={open} onOpenChange={setOpen} disableShortcut />
      );
    }
    render(<H />);
    const option = screen.getByRole("option");
    const kbds = option.querySelectorAll("kbd");
    expect(kbds.length).toBe(2);
    expect(kbds[0]!.textContent).toBe("⌘");
    expect(kbds[1]!.textContent).toBe("N");
  });

  it("renders no kbd when a command has no shortcut", () => {
    function H() {
      const [open, setOpen] = useState(true);
      const cmds: Command[] = [{ id: "new", label: "New File" }];
      return (
        <CommandPalette commands={cmds} open={open} onOpenChange={setOpen} disableShortcut />
      );
    }
    render(<H />);
    expect(screen.getByRole("option").querySelector("kbd")).toBeNull();
  });
});
```

(Ensure `useState` is imported in the test file; it already is from the existing Harness. If not, add `import { useState } from "react";`.)

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run packages/components/src/command-palette/__tests__/command-palette.test.tsx`
Expected: FAIL — no kbd rendered for shortcuts.

- [ ] **Step 3: Add the new props to `CommandPaletteProps`** — replace the interface (currently lines 9-19) with:

```tsx
export interface CommandPaletteProps {
  commands: Command[];
  groups?: CommandGroup[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeholder?: string;
  /** Disable the built-in ⌘K / Ctrl+K global shortcut (e.g. in demos). */
  disableShortcut?: boolean;
  /** Opens the palette pre-filtered with this query. */
  defaultQuery?: string;
  /** Ordered ids, most-recent-first. Boosts these in ranking. */
  recents?: string[];
  /** Fired for every command selection. */
  onSelectCommand?: (id: string, command: Command) => void;
  /** Override the ranking function. Defaults to the built-in matcher. */
  rank?: RankFn;
}
```

- [ ] **Step 4: Import `RankFn`** — update the type import (currently line 5):

```tsx
import type { Command, CommandGroup, RankFn } from "./types";
```

- [ ] **Step 5: Accept + forward the new props** — replace the function signature + hook call (currently lines 21-30) with:

```tsx
export function CommandPalette({
  commands,
  groups,
  open,
  onOpenChange,
  placeholder = "Type a command or search…",
  disableShortcut = false,
  defaultQuery,
  recents,
  onSelectCommand,
  rank,
}: CommandPaletteProps) {
  const palette = useCommandPalette({
    commands,
    groups,
    onOpenChange,
    defaultQuery,
    recents,
    onSelectCommand,
    rank,
  });
```

- [ ] **Step 6: Render the shortcut** — in the option `<li>` (currently around lines 185-190), the content is:

```tsx
                            {item.command.icon}
                            <Highlight
                              text={item.command.label}
                              indices={item.matchedIndices}
                            />
```

Replace with (wrap label so the shortcut can sit at the far right):

```tsx
                            {item.command.icon}
                            <Highlight
                              text={item.command.label}
                              indices={item.matchedIndices}
                            />
                            {item.command.shortcut && (
                              <span className="ml-auto flex items-center gap-1">
                                {item.command.shortcut.map((token, i) => (
                                  <kbd
                                    key={i}
                                    className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                                  >
                                    {token}
                                  </kbd>
                                ))}
                              </span>
                            )}
```

- [ ] **Step 7: Run to verify it passes**

Run: `pnpm vitest run packages/components/src/command-palette/__tests__/command-palette.test.tsx`
Expected: all passed (7 prior + 2 new = 9).

- [ ] **Step 8: Typecheck**

Run: `pnpm --filter @palettekit/components lint`
Expected: exits 0.

- [ ] **Step 9: Commit**

```bash
git add packages/components/src/command-palette/command-palette.tsx packages/components/src/command-palette/__tests__/command-palette.test.tsx
git commit -m "feat: render command shortcut hints; forward recents/rank/onSelectCommand props"
```

---

## Task 5: Virtualization — extract list + window large sets (TDD)

**Files:**
- Create: `packages/components/src/command-palette/command-list.tsx`
- Modify: `packages/components/src/command-palette/command-palette.tsx`
- Modify: `packages/components/src/command-palette/__tests__/command-palette.test.tsx`
- Add dependency: `@tanstack/react-virtual` to `@palettekit/components`

- [ ] **Step 1: Install the dependency**

Run: `pnpm --filter @palettekit/components add @tanstack/react-virtual`
Expected: adds `@tanstack/react-virtual` to `packages/components/package.json` dependencies; install completes.

- [ ] **Step 2: Add failing tests** — append a new `describe` to `command-palette.test.tsx`:

```tsx
describe("CommandPalette: virtualization", () => {
  function makeCommands(n: number): Command[] {
    return Array.from({ length: n }, (_, i) => ({
      id: `cmd-${i}`,
      label: `Command number ${i}`,
    }));
  }

  it("renders every row for a small list (below threshold)", () => {
    function H() {
      const [open, setOpen] = useState(true);
      return (
        <CommandPalette commands={makeCommands(20)} open={open} onOpenChange={setOpen} disableShortcut />
      );
    }
    render(<H />);
    expect(screen.getAllByRole("option").length).toBe(20);
  });

  it("renders only a window of rows for a large list (above threshold)", () => {
    function H() {
      const [open, setOpen] = useState(true);
      return (
        <CommandPalette commands={makeCommands(2000)} open={open} onOpenChange={setOpen} disableShortcut />
      );
    }
    render(<H />);
    const rendered = screen.getAllByRole("option").length;
    expect(rendered).toBeGreaterThan(0);
    expect(rendered).toBeLessThan(2000); // windowed, not all in DOM
  });

  it("has no axe violations with a virtualized list", async () => {
    function H() {
      const [open, setOpen] = useState(true);
      return (
        <CommandPalette commands={makeCommands(2000)} open={open} onOpenChange={setOpen} disableShortcut />
      );
    }
    const { container } = render(<H />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

(The file already imports `axe` from jest-axe in the existing a11y test. Confirm the import exists; if not, add `import { axe } from "jest-axe";`.)

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm vitest run packages/components/src/command-palette/__tests__/command-palette.test.tsx`
Expected: FAIL on the large-list test — currently all 2000 options render (no windowing yet).

- [ ] **Step 4: Create `command-list.tsx`** — extracts the list body with a plain path and a virtualized path. It flattens groups+headers into one row stream so headers virtualize naturally.

```tsx
"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { RenderGroup } from "./types";

/** Above this many flat rows (headers + items), switch to virtualization. */
const VIRTUALIZE_THRESHOLD = 100;
/** Fixed row height (px) used by the virtualizer estimate; matches py-2 rows. */
const ROW_HEIGHT = 36;

export interface CommandListProps {
  listId: string;
  groups: RenderGroup[];
  activeId: string | null;
  onActivate: (id: string) => void;
  onSelect: (id: string) => void;
}

type Row =
  | { kind: "header"; key: string; label: string }
  | {
      kind: "item";
      key: string;
      id: string;
      label: string;
      icon: React.ReactNode;
      shortcut?: string[];
      matchedIndices: number[];
    };

function flattenRows(groups: RenderGroup[]): Row[] {
  const rows: Row[] = [];
  for (const group of groups) {
    if (group.label) {
      rows.push({ kind: "header", key: `h-${group.id}`, label: group.label });
    }
    for (const item of group.items) {
      rows.push({
        kind: "item",
        key: item.command.id,
        id: item.command.id,
        label: item.command.label,
        icon: item.command.icon,
        shortcut: item.command.shortcut,
        matchedIndices: item.matchedIndices,
      });
    }
  }
  return rows;
}

export function CommandList({
  listId,
  groups,
  activeId,
  onActivate,
  onSelect,
}: CommandListProps) {
  const rows = flattenRows(groups);
  const virtualize = rows.length > VIRTUALIZE_THRESHOLD;

  if (!virtualize) {
    return (
      <ul id={listId} role="listbox" className="max-h-80 overflow-y-auto p-2">
        {rows.map((row) =>
          row.kind === "header" ? (
            <li key={row.key} role="presentation" className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
              {row.label}
            </li>
          ) : (
            <Item
              key={row.key}
              listId={listId}
              row={row}
              active={row.id === activeId}
              onActivate={onActivate}
              onSelect={onSelect}
            />
          ),
        )}
      </ul>
    );
  }

  return (
    <VirtualList
      listId={listId}
      rows={rows}
      activeId={activeId}
      onActivate={onActivate}
      onSelect={onSelect}
    />
  );
}

function VirtualList({
  listId,
  rows,
  activeId,
  onActivate,
  onSelect,
}: {
  listId: string;
  rows: Row[];
  activeId: string | null;
  onActivate: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const parentRef = useRef<HTMLUListElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  // Keep the active item scrolled into view.
  const activeIndex = rows.findIndex((r) => r.kind === "item" && r.id === activeId);
  if (activeIndex >= 0) virtualizer.scrollToIndex(activeIndex);

  return (
    <ul
      ref={parentRef}
      id={listId}
      role="listbox"
      className="max-h-80 overflow-y-auto p-2"
    >
      <li
        role="presentation"
        style={{ height: virtualizer.getTotalSize(), position: "relative", listStyle: "none" }}
      >
        {virtualizer.getVirtualItems().map((vi) => {
          const row = rows[vi.index]!;
          const style: React.CSSProperties = {
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            transform: `translateY(${vi.start}px)`,
          };
          return row.kind === "header" ? (
            <div
              key={row.key}
              style={style}
              className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400"
            >
              {row.label}
            </div>
          ) : (
            <Item
              key={row.key}
              listId={listId}
              row={row}
              active={row.id === activeId}
              onActivate={onActivate}
              onSelect={onSelect}
              style={style}
            />
          );
        })}
      </li>
    </ul>
  );
}

function Item({
  listId,
  row,
  active,
  onActivate,
  onSelect,
  style,
}: {
  listId: string;
  row: Extract<Row, { kind: "item" }>;
  active: boolean;
  onActivate: (id: string) => void;
  onSelect: (id: string) => void;
  style?: React.CSSProperties;
}) {
  return (
    <li
      id={`${listId}-${row.id}`}
      role="option"
      aria-selected={active}
      style={style}
      onMouseEnter={() => onActivate(row.id)}
      onClick={() => onSelect(row.id)}
      className={[
        "flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm",
        active ? "bg-zinc-100 dark:bg-zinc-800" : "text-zinc-700 dark:text-zinc-300",
      ].join(" ")}
    >
      {row.icon}
      <Highlight text={row.label} indices={row.matchedIndices} />
      {row.shortcut && (
        <span className="ml-auto flex items-center gap-1">
          {row.shortcut.map((token, i) => (
            <kbd
              key={i}
              className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
            >
              {token}
            </kbd>
          ))}
        </span>
      )}
    </li>
  );
}

function Highlight({ text, indices }: { text: string; indices: number[] }) {
  if (indices.length === 0) return <span>{text}</span>;
  const set = new Set(indices);
  return (
    <span>
      {text.split("").map((ch, i) =>
        set.has(i) ? (
          <mark key={i} className="bg-transparent font-semibold text-zinc-900 dark:text-white">
            {ch}
          </mark>
        ) : (
          <span key={i}>{ch}</span>
        ),
      )}
    </span>
  );
}
```

- [ ] **Step 5: Use `CommandList` in the view** — in `command-palette.tsx`, replace the entire `<ul id={listId} ...> ... </ul>` block that renders the `default`/`results` groups (currently lines 124-197, the `<ul role="listbox">` through its closing `</ul>`) with a status-branched body. Replace from the opening `<ul` (line 124) through its matching `</ul>` (line 197) with:

```tsx
            {palette.status === "loading" && (
              <ul id={listId} role="listbox" className="max-h-80 overflow-y-auto p-2">
                <li className="px-3 py-6 text-center text-sm text-zinc-400">Loading…</li>
              </ul>
            )}
            {palette.status === "error" && (
              <ul id={listId} role="listbox" className="max-h-80 overflow-y-auto p-2">
                <li className="flex flex-col items-center gap-3 px-3 py-8 text-center">
                  <span className="text-sm text-red-500 dark:text-red-400">
                    {palette.error?.message ?? "Something went wrong."}
                  </span>
                  <button
                    type="button"
                    onClick={() => palette.retry()}
                    className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Retry
                  </button>
                </li>
              </ul>
            )}
            {palette.status === "no-results" && (
              <ul id={listId} role="listbox" className="max-h-80 overflow-y-auto p-2">
                <li className="px-3 py-6 text-center text-sm text-zinc-400">
                  No results for “{palette.query}”.
                </li>
              </ul>
            )}
            {palette.status === "empty" && (
              <ul id={listId} role="listbox" className="max-h-80 overflow-y-auto p-2">
                <li className="px-3 py-6 text-center text-sm text-zinc-400">
                  Nothing here yet.
                </li>
              </ul>
            )}
            {(palette.status === "default" || palette.status === "results") && (
              <CommandList
                listId={listId}
                groups={palette.groups}
                activeId={palette.activeId}
                onActivate={palette.setActiveId}
                onSelect={palette.select}
              />
            )}
```

- [ ] **Step 6: Import `CommandList` and delete the now-unused local `Highlight`** — at the top of `command-palette.tsx` add:

```tsx
import { CommandList } from "./command-list";
```

Then DELETE the local `Highlight` function at the bottom of `command-palette.tsx` (currently lines 205-224) — it now lives in `command-list.tsx`. The view no longer references `Highlight` directly (the inline option rendering moved into `CommandList`).

- [ ] **Step 7: Run to verify view tests pass**

Run: `pnpm vitest run packages/components/src/command-palette/__tests__/command-palette.test.tsx`
Expected: all passed (9 prior + 3 new = 12). The small-list test confirms the plain path; the large-list test confirms windowing; axe clean.

Note on the jsdom environment: `@tanstack/react-virtual` measures the scroll element, which jsdom reports as 0px height. With `overscan: 8` and `estimateSize: 36`, the virtualizer still renders an initial window of rows (count derived from overscan + estimated viewport), so `getAllByRole("option")` returns a non-zero count well below 2000 — satisfying the test. If the virtualizer renders 0 rows in jsdom (possible if it computes a 0-height viewport with no overscan rows), set `initialRect={{ width: 320, height: 320 }}` on the `useVirtualizer` options to give it a deterministic viewport. Apply that only if the large-list test shows 0 rendered rows; report the adjustment.

- [ ] **Step 8: Full component suite + lint**

Run: `pnpm vitest run packages/components/src/command-palette && pnpm --filter @palettekit/components lint`
Expected: fuzzy 14 + hook 37 + view 12 = 63 component-package tests pass; tsc exits 0.

- [ ] **Step 9: Commit**

```bash
git add packages/components/src/command-palette/command-list.tsx packages/components/src/command-palette/command-palette.tsx packages/components/src/command-palette/__tests__/command-palette.test.tsx packages/components/package.json
git commit -m "feat: virtualize large command lists via @tanstack/react-virtual"
```

---

## Task 6: Registry — declare the new dependency (TDD)

**Files:**
- Modify: `packages/registry/build-registry.ts`
- Modify: `packages/registry/__tests__/build-registry.test.ts`
- Modify: `packages/registry/__tests__/registry-integrity.test.ts`

- [ ] **Step 1: Add failing test** — in `build-registry.test.ts`, the existing test "declares framer-motion as a dependency" asserts `dependencies`. Add an assertion in that same `it` block (or a new one) — append this `it` inside the `describe`:

```ts
  it("declares @tanstack/react-virtual as a dependency", () => {
    expect(item.dependencies).toContain("@tanstack/react-virtual");
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run packages/registry/__tests__/build-registry.test.ts`
Expected: FAIL — dependency not present.

- [ ] **Step 3: Update the DEPENDENCIES map** — in `build-registry.ts`, replace the map (currently lines 21-23):

```ts
const DEPENDENCIES: Record<string, string[]> = {
  "command-palette": ["framer-motion", "@tanstack/react-virtual"],
};
```

- [ ] **Step 4: Add the integrity assertion** — in `registry-integrity.test.ts`, find the test that checks the installable contract (it parses the emitted JSON). Append a new `it` inside that describe:

```ts
  it("declares the runtime dependencies a consumer must install", () => {
    const item = JSON.parse(readFileSync(OUT, "utf8"));
    expect(item.dependencies).toContain("framer-motion");
    expect(item.dependencies).toContain("@tanstack/react-virtual");
  });
```

- [ ] **Step 5: Run both registry tests**

Run: `pnpm vitest run packages/registry`
Expected: all passed (the integrity test's `beforeAll` regenerates the JSON first, so the new dep is present).

- [ ] **Step 6: Commit**

```bash
git add packages/registry/build-registry.ts packages/registry/__tests__/build-registry.test.ts packages/registry/__tests__/registry-integrity.test.ts
git commit -m "feat: declare @tanstack/react-virtual in the command-palette registry deps"
```

---

## Task 7: Showcase — shortcuts + recents wiring

**Files:**
- Modify: `apps/showcase/src/lib/demo-commands.ts`
- Modify: `apps/showcase/src/app/page.tsx`

- [ ] **Step 1: Add shortcut fields to demo commands** — in `demo-commands.ts`, update three commands to include `shortcut` (leave the rest unchanged):

```ts
  { id: "new-issue", label: "Create new issue", group: "actions", keywords: ["add", "task"], shortcut: ["⌘", "N"] },
```

and

```ts
  { id: "go-inbox", label: "Go to Inbox", group: "navigation", shortcut: ["G", "I"] },
  { id: "go-settings", label: "Go to Settings", group: "navigation", shortcut: ["G", "S"] },
```

- [ ] **Step 2: Wire recents on the homepage palette** — in `apps/showcase/src/app/page.tsx`, the `Home` component currently has `const [open, setOpen] = useState(false);`. Add recents state and pass it to the homepage `<CommandPalette>`:

Replace:
```tsx
export default function Home() {
  const [open, setOpen] = useState(false);
```
with:
```tsx
export default function Home() {
  const [open, setOpen] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
```

And replace the homepage palette element (currently):
```tsx
      <CommandPalette
        commands={demoCommands}
        groups={demoGroups}
        open={open}
        onOpenChange={setOpen}
      />
```
with:
```tsx
      <CommandPalette
        commands={demoCommands}
        groups={demoGroups}
        open={open}
        onOpenChange={setOpen}
        recents={recents}
        onSelectCommand={(id) =>
          setRecents((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, 5))
        }
      />
```

- [ ] **Step 3: Build to verify**

Run: `pnpm --filter @palettekit/showcase build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/showcase/src/lib/demo-commands.ts apps/showcase/src/app/page.tsx
git commit -m "feat: showcase shortcuts on demo commands + recents wiring on homepage"
```

---

## Task 8: Showcase — virtualization demo + docs

**Files:**
- Create: `apps/showcase/src/components/scale-demo.tsx`
- Modify: `apps/showcase/src/app/page.tsx`
- Modify: `apps/showcase/src/app/docs/page.tsx`

- [ ] **Step 1: Create `scale-demo.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import { CommandPalette } from "@palettekit/components/command-palette";
import type { Command } from "@palettekit/components/command-palette";

/*
 * Loads the real palette with 5,000 commands to show virtualization: only the
 * visible window renders, so search and scroll stay instant at any list size.
 */

const VERBS = ["Open", "Close", "Create", "Delete", "Rename", "Move", "Archive", "Pin"];
const NOUNS = ["issue", "project", "document", "branch", "comment", "label", "milestone", "view"];

function generate(n: number): Command[] {
  return Array.from({ length: n }, (_, i) => {
    const verb = VERBS[i % VERBS.length]!;
    const noun = NOUNS[Math.floor(i / VERBS.length) % NOUNS.length]!;
    return { id: `cmd-${i}`, label: `${verb} ${noun} #${i}` };
  });
}

export function ScaleDemo() {
  const commands = useMemo(() => generate(5000), []);
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-2xl border border-line bg-surface/60 p-4 sm:p-6">
      <p className="mb-3 font-mono text-xs text-muted">
        {commands.length.toLocaleString()} commands loaded · only the visible window renders
      </p>
      <div className="palette-frame relative min-h-[440px] transform-gpu overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/60">
        <CommandPalette
          commands={commands}
          open={open}
          onOpenChange={setOpen}
          disableShortcut
          placeholder="Search 5,000 commands…"
        />
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="absolute inset-0 grid place-items-center text-sm text-muted hover:text-ink"
          >
            Re-open palette
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add the scale section to the homepage** — in `page.tsx`, import the demo near the other component imports:

```tsx
import { ScaleDemo } from "@/components/scale-demo";
```

Then add a new `<section>` after the motion section and before the closing install section (insert right before the `{/* Closing install. */}` comment):

```tsx
      {/* Scale — virtualization. */}
      <section className="mx-auto max-w-6xl px-5 pt-24 sm:px-8">
        <SectionLabel
          kicker="Virtualized · 5,000 commands"
          title="Stays instant no matter how long the list gets"
          body="Only the visible rows render. Big command sets scroll and filter without breaking a sweat."
        />
        <div className="mt-7">
          <ScaleDemo />
        </div>
      </section>
```

- [ ] **Step 3: Add the pluggable-rank snippet + new prop rows to docs** — in `docs/page.tsx`, the `PROPS` array lists `CommandPaletteProps`. Add these rows to the array:

```ts
  { name: "recents", type: "string[]?", desc: "Recently-used command ids (most-recent first); boosts them in ranking." },
  { name: "onSelectCommand", type: "(id, command) => void", desc: "Fires on every selection — use it to record usage for recents." },
  { name: "rank", type: "RankFn?", desc: "Bring your own matcher. Defaults to the built-in fuzzy ranker." },
  { name: "shortcut (per command)", type: "string[]?", desc: "Display-only shortcut hint shown on the row, e.g. [\"⌘\",\"N\"]." },
```

Then add a "Bring your own matcher" subsection after the Customizing section (before the closing `</main>`):

```tsx
      <h2 className="mt-16 text-2xl font-semibold tracking-tight">Bring your own matcher</h2>
      <p className="mt-3 text-zinc-500">
        The built-in fuzzy ranker is the default. Pass <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm dark:bg-zinc-800">rank</code> to
        swap in your own — fuzzysort, command-score, or a server-side ranker:
      </p>
      <pre className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs dark:border-zinc-800 dark:bg-zinc-900">
{`<CommandPalette
  commands={commands}
  rank={(cmds, query) =>
    myMatcher(cmds, query).map((command) => ({
      command,
      matchedIndices: [],
    }))
  }
/>`}
      </pre>
```

- [ ] **Step 4: Build**

Run: `pnpm --filter @palettekit/showcase build`
Expected: build succeeds; `/` and `/docs` render.

- [ ] **Step 5: Commit**

```bash
git add apps/showcase/src/components/scale-demo.tsx apps/showcase/src/app/page.tsx apps/showcase/src/app/docs/page.tsx
git commit -m "feat: showcase virtualization demo + rank/recents/shortcut docs"
```

---

## Task 9: Full green sweep

**Files:** none (verification)

- [ ] **Step 1: Run the entire suite**

Run: `pnpm test`
Expected: all pass. Expected total = 58 prior + 4 (fuzzy) + 4 (hook) + 2 (shortcuts) + 3 (virtualization) + 2 (registry) = **73 tests**, all green.

- [ ] **Step 2: Full build**

Run: `pnpm build`
Expected: components typecheck, registry regenerates (now with `@tanstack/react-virtual` in the JSON), showcase builds with the new sections.

- [ ] **Step 3: Confirm backward compatibility**

Run: `pnpm vitest run packages/components/src/command-palette/__tests__/command-palette.test.tsx`
Verify the ORIGINAL 7 view tests (render grouped, filter, click, Enter, Escape, roles, axe) still pass unchanged — proof the new optional props didn't alter default behavior.

- [ ] **Step 4: Verify the registry JSON carries the new dep**

Run: `cat apps/showcase/public/r/command-palette.json | grep -A3 dependencies`
Expected: `dependencies` array contains both `framer-motion` and `@tanstack/react-virtual`, and a 6th file (`command-list.tsx`) now ships (the registry walks the folder, so `command-list.tsx` is included automatically).

- [ ] **Step 5: Commit any regenerated artifacts** (the registry JSON is gitignored, so likely nothing to commit; this is a safety check)

```bash
git status --short
# if only the gitignored JSON changed, nothing to commit
```

---

## Self-Review Notes (for the executor)

- **Spec coverage:** §3 API → Tasks 1,3,4; §4.1 recents boost → Task 2; §4.2 onSelectCommand → Task 3; §4.3 shortcuts → Tasks 1,4; §4.4 pluggable rank → Tasks 1,3 (+ recents-only-in-built-in honored: custom rank bypasses `rankCommands` in `buildGroups`); §4.5 virtualization → Task 5; §5 showcase → Tasks 7,8; §6 testing → tests in Tasks 2-6; registry dep → Task 6.
- **New registry file:** extracting `command-list.tsx` means the registry now ships 6 files instead of 5. The registry build walks the folder, so it's automatic — but the OLD registry shape test (`build-registry.test.ts`) asserts an EXACT 5-file list. **Task 6 must also update that exact-list assertion to include `command-list.tsx`.** Added note: in Task 6 Step 1, also update the existing "includes all five source files" test to expect six files including `command-palette/command-list.tsx`, and the integrity test's required-files list likewise. (This is a real consequence of the Task 5 extraction — do not skip it.)
- **Type consistency:** `RankFn` defined in Task 1, imported in Tasks 3 (hook) and 4 (view). `recents?: string[]`, `onSelectCommand?: (id, command) => void`, `rank?: RankFn` identical across hook options and view props. `rankCommands` signature `(commands, query, recents?)` consistent in Tasks 2 and 3.
- **Backward-compat gate:** no existing test is edited except the registry file-count assertions (Task 6), which change because a real new file ships — that's a legitimate, required update, not a weakening.
- **jsdom virtualization caveat:** flagged inline in Task 5 Step 7 with the `initialRect` fallback.
```
