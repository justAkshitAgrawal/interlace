# PaletteKit MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a best-in-class, copy-paste command palette React component (shadcn-style registry) plus a Next.js showcase site that demos it live and lets visitors step through every state.

**Architecture:** pnpm + Turborepo monorepo. A `components/command-palette` package authored as the exact files users receive, split into a headless state hook (all logic) and a styled view (Tailwind + Framer Motion). A `registry` build script walks `components/*` and emits one shadcn-format JSON per component, served statically by the showcase site under `/r/`. The showcase imports the component as a workspace dep so the live demo always reflects real source.

**Tech Stack:** TypeScript, React 19, Next.js (App Router), Tailwind CSS, Framer Motion (`motion`), pnpm 9, Turborepo, Vitest, @testing-library/react, jest-axe, shadcn registry format.

---

## File Structure

```
paletteKit/
  package.json                         → root workspace scripts
  pnpm-workspace.yaml                  → workspace globs
  turbo.json                           → pipeline (build/test/lint)
  tsconfig.base.json                   → shared TS config
  vitest.config.ts                     → root test config (jsdom)
  vitest.setup.ts                      → jest-dom + jest-axe matchers + matchMedia mock

  packages/
    components/
      package.json                     → name @palettekit/components, exports
      tsconfig.json
      src/
        command-palette/
          types.ts                     → Command, CommandGroup, PaletteStatus, Page
          fuzzy.ts                     → fuzzyScore + rankCommands (pure)
          motion.ts                    → DURATION/EASING constants
          use-command-palette.ts       → headless hook (the hard part)
          command-palette.tsx          → styled view
          index.ts                     → barrel exports
        command-palette/__tests__/
          fuzzy.test.ts
          use-command-palette.test.tsx
          command-palette.test.tsx     → render + a11y + interaction

    registry/
      package.json                     → name @palettekit/registry
      build-registry.ts                → walks components/*, emits JSON
      __tests__/
        build-registry.test.ts         → emitted JSON shape
        registry-integrity.test.ts     → install into temp app + typecheck

  apps/
    showcase/
      package.json
      next.config.ts
      tailwind.config.ts
      postcss.config.mjs
      tsconfig.json
      public/r/command-palette.json    → emitted by registry build (gitignored, built)
      src/
        app/
          layout.tsx
          globals.css
          page.tsx                     → "/" homepage (live palette + proof points)
          playground/page.tsx          → State Explorer
          docs/page.tsx                → install + API + source
        lib/
          demo-commands.ts             → shared sample command sets for demos
        components/
          install-command.tsx          → copy-the-install-line button
          state-explorer.tsx           → control panel driving the hook
```

---

## Conventions (read once before starting)

- **Package manager:** `pnpm` only. Never `npm install`/`yarn`.
- **Run a single test file:** `pnpm vitest run <path>` from repo root.
- **Commit cadence:** every task ends with a commit. Use conventional-commit prefixes (`feat:`, `test:`, `chore:`).
- **Commit author:** commits are made by the executing agent; no special co-author line required for this internal project unless the user asks.
- **TDD:** for `fuzzy.ts` and `use-command-palette.ts`, write the failing test first. The view and showcase are verified with lighter render/smoke tests.
- **Status semantics (locked, non-overlapping):**
  - `default` — open, query empty, commands available → show all grouped.
  - `results` — query non-empty, ≥1 match.
  - `no-results` — query non-empty, 0 matches.
  - `loading` — an async source is currently resolving.
  - `error` — the most recent async source rejected (retryable).
  - `empty` — the current page has zero available commands even with an empty query.

---

## Phase 0 — Monorepo scaffold

### Task 0.1: Root workspace files

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `.npmrc`

- [ ] **Step 1: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "packages/*"
  - "apps/*"
```

- [ ] **Step 2: Create `.npmrc`** (avoids peer-dep friction with React 19)

```
auto-install-peers=true
strict-peer-dependencies=false
```

- [ ] **Step 3: Create root `package.json`**

```json
{
  "name": "palettekit",
  "private": true,
  "packageManager": "pnpm@9.12.3",
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "registry": "turbo run registry"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0",
    "@vitejs/plugin-react": "^4.3.0",
    "jsdom": "^25.0.0",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.0",
    "@testing-library/jest-dom": "^6.6.0",
    "jest-axe": "^9.0.0",
    "@types/jest-axe": "^3.5.9",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0"
  }
}
```

- [ ] **Step 4: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "resolveJsonModule": true
  }
}
```

- [ ] **Step 5: Create `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "test": { "dependsOn": ["^build"] },
    "lint": {},
    "registry": { "outputs": ["**/public/r/**"] }
  }
}
```

- [ ] **Step 6: Install and verify**

Run: `pnpm install`
Expected: completes, creates `pnpm-lock.yaml`, no fatal errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold pnpm + turborepo workspace"
```

---

### Task 0.2: Root test harness (Vitest + jsdom + axe)

**Files:**
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["packages/**/*.test.{ts,tsx}"],
  },
});
```

- [ ] **Step 2: Create `vitest.setup.ts`** (matchers + matchMedia mock for reduced-motion tests)

```ts
import "@testing-library/jest-dom/vitest";
import { expect, vi } from "vitest";
import { toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

// jsdom has no matchMedia; default to "no reduced motion".
// Individual tests override window.matchMedia to test reduced-motion behavior.
vi.stubGlobal(
  "matchMedia",
  vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
);

// jsdom does not implement scrollIntoView; the hook/view call it.
Element.prototype.scrollIntoView = vi.fn();
```

- [ ] **Step 3: Add a throwaway smoke test to confirm the harness runs**

Create `packages/components/src/command-palette/__tests__/harness.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("harness", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Run it**

Run: `pnpm vitest run packages/components/src/command-palette/__tests__/harness.test.ts`
Expected: 1 passed.

- [ ] **Step 5: Delete the smoke test, then commit**

```bash
rm packages/components/src/command-palette/__tests__/harness.test.ts
git add -A
git commit -m "chore: add vitest jsdom + axe test harness"
```

---

### Task 0.3: Components package shell

**Files:**
- Create: `packages/components/package.json`
- Create: `packages/components/tsconfig.json`
- Create: `packages/components/src/command-palette/index.ts`

- [ ] **Step 1: Create `packages/components/package.json`**

```json
{
  "name": "@palettekit/components",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    "./command-palette": "./src/command-palette/index.ts"
  },
  "scripts": {
    "test": "vitest run",
    "lint": "tsc --noEmit"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "dependencies": {
    "framer-motion": "^11.11.0"
  }
}
```

- [ ] **Step 2: Create `packages/components/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "noEmit": true },
  "include": ["src"]
}
```

- [ ] **Step 3: Create a placeholder barrel `packages/components/src/command-palette/index.ts`**

```ts
// Barrel filled in by later tasks.
export {};
```

- [ ] **Step 4: Install (links workspace), verify typecheck runs**

Run: `pnpm install && pnpm --filter @palettekit/components lint`
Expected: install completes; `tsc --noEmit` exits 0 (no source yet).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add @palettekit/components package shell"
```

---

## Phase 1 — Component primitives (TDD)

### Task 1.1: Types

**Files:**
- Create: `packages/components/src/command-palette/types.ts`

- [ ] **Step 1: Write `types.ts`** (no test — pure declarations consumed by tested code)

```ts
import type { ReactNode } from "react";

/** A resolver returns child commands for a nested page. */
export type ChildResolver =
  | Command[]
  | ((query: string) => Promise<Command[]>);

export interface Command {
  id: string;
  label: string;
  /** Extra terms that should match fuzzy search but aren't shown. */
  keywords?: string[];
  /** Group id this command belongs to. Ungrouped if omitted. */
  group?: string;
  icon?: ReactNode;
  /** Invoked when the command is selected and has no children. */
  onSelect?: () => void | Promise<void>;
  /** If present, selecting pushes a nested page instead of running onSelect. */
  children?: ChildResolver;
}

export interface CommandGroup {
  id: string;
  label: string;
}

export type PaletteStatus =
  | "default"
  | "results"
  | "no-results"
  | "loading"
  | "error"
  | "empty";

/** One frame on the navigation stack (root or a nested page). */
export interface Page {
  /** null for the root page. */
  parentCommandId: string | null;
  title: string | null;
  /** Static commands for this page (root commands, or resolved children). */
  commands: Command[];
}

/** A group with its matched, ranked items, ready to render. */
export interface RenderGroup {
  id: string;
  label: string | null;
  items: RankedCommand[];
}

export interface RankedCommand {
  command: Command;
  /** Char indices in `label` that matched, for highlighting. */
  matchedIndices: number[];
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @palettekit/components lint`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: command palette types"
```

---

### Task 1.2: Fuzzy matcher

**Files:**
- Create: `packages/components/src/command-palette/__tests__/fuzzy.test.ts`
- Create: `packages/components/src/command-palette/fuzzy.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { fuzzyScore, rankCommands } from "../fuzzy";
import type { Command } from "../types";

describe("fuzzyScore", () => {
  it("returns null when characters are not a subsequence", () => {
    expect(fuzzyScore("xyz", "settings")).toBeNull();
  });

  it("matches a scattered subsequence and reports indices", () => {
    const res = fuzzyScore("stg", "settings");
    expect(res).not.toBeNull();
    expect(res!.indices).toEqual([0, 3, 6]); // s, t, g
  });

  it("is case-insensitive", () => {
    expect(fuzzyScore("SET", "settings")).not.toBeNull();
  });

  it("scores an exact match higher than a prefix match", () => {
    const exact = fuzzyScore("go", "go")!.score;
    const prefix = fuzzyScore("go", "google")!.score;
    expect(exact).toBeGreaterThan(prefix);
  });

  it("scores a prefix match higher than a word-boundary match", () => {
    const prefix = fuzzyScore("set", "settings")!.score;
    const wordBoundary = fuzzyScore("set", "reset toggle")!.score;
    expect(prefix).toBeGreaterThan(wordBoundary);
  });

  it("scores a word-boundary match higher than a scattered match", () => {
    const wordBoundary = fuzzyScore("nt", "new task")!.score; // n(ew) t(ask)
    const scattered = fuzzyScore("nt", "invent")!.score; // i-n-v-e-n-t
    expect(wordBoundary).toBeGreaterThan(scattered);
  });
});

describe("rankCommands", () => {
  const cmds: Command[] = [
    { id: "settings", label: "Settings" },
    { id: "new", label: "New File", keywords: ["create"] },
    { id: "search", label: "Search" },
  ];

  it("returns all commands (no ranking) for an empty query", () => {
    const ranked = rankCommands(cmds, "");
    expect(ranked.map((r) => r.command.id)).toEqual(["settings", "new", "search"]);
    expect(ranked[0]!.matchedIndices).toEqual([]);
  });

  it("filters out non-matches", () => {
    const ranked = rankCommands(cmds, "zzz");
    expect(ranked).toHaveLength(0);
  });

  it("matches against keywords as well as label", () => {
    const ranked = rankCommands(cmds, "create");
    expect(ranked.map((r) => r.command.id)).toEqual(["new"]);
  });

  it("orders better matches first", () => {
    const ranked = rankCommands(cmds, "se");
    // "Search" (prefix) should outrank "Settings" (also prefix but longer) — both prefix,
    // shorter target wins the tie-break.
    expect(ranked[0]!.command.id).toBe("search");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run packages/components/src/command-palette/__tests__/fuzzy.test.ts`
Expected: FAIL — cannot resolve `../fuzzy`.

- [ ] **Step 3: Implement `fuzzy.ts`**

```ts
import type { Command, RankedCommand } from "./types";

export interface FuzzyResult {
  score: number;
  /** Indices into the ORIGINAL target string that matched. */
  indices: number[];
}

const SCORE_EXACT = 1000;
const SCORE_PREFIX = 500;
const SCORE_WORD_BOUNDARY = 250;
const SCORE_SCATTERED = 100;

function isWordBoundary(target: string, i: number): boolean {
  if (i === 0) return true;
  const prev = target[i - 1]!;
  return prev === " " || prev === "-" || prev === "_" || prev === "/";
}

/**
 * Returns null if `query` is not a (case-insensitive) subsequence of `target`.
 * Otherwise returns a score (higher is better) plus matched indices.
 */
export function fuzzyScore(query: string, target: string): FuzzyResult | null {
  if (query === "") return { score: 0, indices: [] };

  const q = query.toLowerCase();
  const t = target.toLowerCase();

  // Exact / prefix fast paths.
  if (q === t) return { score: SCORE_EXACT, indices: range(target.length) };
  if (t.startsWith(q)) return { score: SCORE_PREFIX - target.length, indices: range(q.length) };

  // Greedy subsequence walk; track whether each matched char sat on a word boundary.
  const indices: number[] = [];
  let qi = 0;
  let boundaryHits = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      indices.push(ti);
      if (isWordBoundary(target, ti)) boundaryHits++;
      qi++;
    }
  }
  if (qi < q.length) return null; // not a subsequence

  // First matched char on a word boundary → treat as a word-boundary match.
  const base = boundaryHits > 0 ? SCORE_WORD_BOUNDARY : SCORE_SCATTERED;
  // Reward more boundary hits and penalize spread + target length.
  const spread = indices[indices.length - 1]! - indices[0]!;
  const score = base + boundaryHits * 10 - spread - target.length * 0.1;
  return { score, indices };
}

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

/**
 * Filters + ranks commands against a query. Empty query returns all commands
 * in their original order with no highlight indices.
 */
export function rankCommands(commands: Command[], query: string): RankedCommand[] {
  if (query === "") {
    return commands.map((command) => ({ command, matchedIndices: [] }));
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
    if (best) scored.push({ command, result: { ...best, indices: bestIndices } });
  }

  scored.sort((a, b) => b.result.score - a.result.score);
  return scored.map(({ command, result }) => ({
    command,
    matchedIndices: result.indices,
  }));
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run packages/components/src/command-palette/__tests__/fuzzy.test.ts`
Expected: all passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: fuzzy matcher with ranked subsequence scoring"
```

---

### Task 1.3: Motion constants

**Files:**
- Create: `packages/components/src/command-palette/motion.ts`

- [ ] **Step 1: Write `motion.ts`** (constants only; no test)

```ts
/** Durations in seconds (Framer Motion uses seconds). Fast & functional. */
export const DURATION = {
  overlay: 0.15,
  panel: 0.18,
  list: 0.15,
} as const;

export const EASING = {
  /** Standard ease-out for entrances. */
  out: [0.16, 1, 0.3, 1] as const,
  /** Symmetric ease for state cross-fades. */
  inOut: [0.4, 0, 0.2, 1] as const,
};

/** A responsive (not bouncy) spring for the panel. */
export const PANEL_SPRING = {
  type: "spring" as const,
  stiffness: 550,
  damping: 40,
  mass: 1,
};
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @palettekit/components lint`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: motion timing constants"
```

---

## Phase 2 — Headless hook (TDD, the core)

> The hook is the correctness core. It is built in slices: open/close → query+ranking+status → keyboard nav → nesting → async. Each slice adds tests and the minimal code to pass them.

### Task 2.1: Open/close + query state

**Files:**
- Create: `packages/components/src/command-palette/__tests__/use-command-palette.test.tsx`
- Create: `packages/components/src/command-palette/use-command-palette.ts`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCommandPalette } from "../use-command-palette";
import type { Command } from "../types";

const commands: Command[] = [
  { id: "new", label: "New File", group: "actions" },
  { id: "open", label: "Open File", group: "actions" },
  { id: "settings", label: "Settings", group: "nav" },
];
const groups = [
  { id: "actions", label: "Actions" },
  { id: "nav", label: "Navigation" },
];

describe("useCommandPalette: open/close + query", () => {
  it("starts closed with an empty query", () => {
    const { result } = renderHook(() => useCommandPalette({ commands, groups }));
    expect(result.current.open).toBe(false);
    expect(result.current.query).toBe("");
  });

  it("opens and closes", () => {
    const { result } = renderHook(() => useCommandPalette({ commands, groups }));
    act(() => result.current.setOpen(true));
    expect(result.current.open).toBe(true);
    act(() => result.current.setOpen(false));
    expect(result.current.open).toBe(false);
  });

  it("resets the query when closed", () => {
    const { result } = renderHook(() => useCommandPalette({ commands, groups }));
    act(() => result.current.setOpen(true));
    act(() => result.current.setQuery("set"));
    expect(result.current.query).toBe("set");
    act(() => result.current.setOpen(false));
    expect(result.current.query).toBe("");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run packages/components/src/command-palette/__tests__/use-command-palette.test.tsx`
Expected: FAIL — cannot resolve `../use-command-palette`.

- [ ] **Step 3: Implement the minimal hook (open/close + query only)**

```tsx
import { useCallback, useState } from "react";
import type { Command, CommandGroup } from "./types";

export interface UseCommandPaletteOptions {
  commands: Command[];
  groups?: CommandGroup[];
}

export function useCommandPalette(options: UseCommandPaletteOptions) {
  const [open, setOpenState] = useState(false);
  const [query, setQuery] = useState("");

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
    if (!next) setQuery(""); // reset on close
  }, []);

  return { open, setOpen, query, setQuery };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run packages/components/src/command-palette/__tests__/use-command-palette.test.tsx`
Expected: all passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: command palette hook — open/close + query state"
```

---

### Task 2.2: Ranked groups + derived status

**Files:**
- Modify: `packages/components/src/command-palette/use-command-palette.ts`
- Modify: `packages/components/src/command-palette/__tests__/use-command-palette.test.tsx`

- [ ] **Step 1: Add the failing tests** (append a new `describe` block to the test file)

```tsx
describe("useCommandPalette: groups + status", () => {
  it("status is 'default' when open with an empty query", () => {
    const { result } = renderHook(() => useCommandPalette({ commands, groups }));
    act(() => result.current.setOpen(true));
    expect(result.current.status).toBe("default");
  });

  it("groups all commands under their labels for an empty query", () => {
    const { result } = renderHook(() => useCommandPalette({ commands, groups }));
    act(() => result.current.setOpen(true));
    expect(result.current.groups.map((g) => g.id)).toEqual(["actions", "nav"]);
    expect(result.current.groups[0]!.items.map((i) => i.command.id)).toEqual([
      "new",
      "open",
    ]);
  });

  it("status is 'results' and groups filter when query matches", () => {
    const { result } = renderHook(() => useCommandPalette({ commands, groups }));
    act(() => result.current.setOpen(true));
    act(() => result.current.setQuery("set"));
    expect(result.current.status).toBe("results");
    const ids = result.current.groups.flatMap((g) => g.items.map((i) => i.command.id));
    expect(ids).toEqual(["settings"]);
  });

  it("hides groups that have no matches", () => {
    const { result } = renderHook(() => useCommandPalette({ commands, groups }));
    act(() => result.current.setOpen(true));
    act(() => result.current.setQuery("set"));
    expect(result.current.groups.map((g) => g.id)).toEqual(["nav"]);
  });

  it("status is 'no-results' when nothing matches", () => {
    const { result } = renderHook(() => useCommandPalette({ commands, groups }));
    act(() => result.current.setOpen(true));
    act(() => result.current.setQuery("zzzzz"));
    expect(result.current.status).toBe("no-results");
    expect(result.current.groups).toHaveLength(0);
  });

  it("status is 'empty' when there are no commands at all", () => {
    const { result } = renderHook(() => useCommandPalette({ commands: [], groups }));
    act(() => result.current.setOpen(true));
    expect(result.current.status).toBe("empty");
  });
});
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `pnpm vitest run packages/components/src/command-palette/__tests__/use-command-palette.test.tsx`
Expected: FAIL — `status`/`groups` undefined.

- [ ] **Step 3: Extend the hook** — replace the entire file with:

```tsx
import { useCallback, useMemo, useState } from "react";
import type {
  Command,
  CommandGroup,
  PaletteStatus,
  RenderGroup,
} from "./types";
import { rankCommands } from "./fuzzy";

export interface UseCommandPaletteOptions {
  commands: Command[];
  groups?: CommandGroup[];
}

export function useCommandPalette(options: UseCommandPaletteOptions) {
  const { commands, groups = [] } = options;
  const [open, setOpenState] = useState(false);
  const [query, setQuery] = useState("");

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
    if (!next) setQuery("");
  }, []);

  const renderGroups = useMemo<RenderGroup[]>(
    () => buildGroups(commands, groups, query),
    [commands, groups, query],
  );

  const status = useMemo<PaletteStatus>(() => {
    if (commands.length === 0) return "empty";
    const hasItems = renderGroups.some((g) => g.items.length > 0);
    if (query === "") return "default";
    return hasItems ? "results" : "no-results";
  }, [commands.length, renderGroups, query]);

  return { open, setOpen, query, setQuery, status, groups: renderGroups };
}

function buildGroups(
  commands: Command[],
  groupDefs: CommandGroup[],
  query: string,
): RenderGroup[] {
  const ranked = rankCommands(commands, query);

  // Bucket ranked commands by group id, preserving rank order within a bucket.
  const byGroup = new Map<string, RenderGroup>();
  const order: string[] = [];
  const ensure = (id: string, label: string | null) => {
    if (!byGroup.has(id)) {
      byGroup.set(id, { id, label, items: [] });
      order.push(id);
    }
    return byGroup.get(id)!;
  };

  // Seed defined groups first so they keep their declared order.
  for (const g of groupDefs) ensure(g.id, g.label);

  for (const item of ranked) {
    const gid = item.command.group ?? "__ungrouped";
    const label =
      groupDefs.find((g) => g.id === gid)?.label ??
      (gid === "__ungrouped" ? null : gid);
    ensure(gid, label).items.push(item);
  }

  return order
    .map((id) => byGroup.get(id)!)
    .filter((g) => g.items.length > 0);
}
```

- [ ] **Step 4: Run to verify all hook tests pass**

Run: `pnpm vitest run packages/components/src/command-palette/__tests__/use-command-palette.test.tsx`
Expected: all passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: command palette hook — ranked groups + derived status"
```

---

### Task 2.3: Keyboard navigation + active item

**Files:**
- Modify: `packages/components/src/command-palette/use-command-palette.ts`
- Modify: `packages/components/src/command-palette/__tests__/use-command-palette.test.tsx`

- [ ] **Step 1: Add the failing tests** (append a new `describe`)

```tsx
function key(k: string, extra: Partial<KeyboardEvent> = {}) {
  return {
    key: k,
    preventDefault: vi.fn(),
    ...extra,
  } as unknown as React.KeyboardEvent;
}

describe("useCommandPalette: keyboard nav", () => {
  it("activates the first visible item by default", () => {
    const { result } = renderHook(() => useCommandPalette({ commands, groups }));
    act(() => result.current.setOpen(true));
    expect(result.current.activeId).toBe("new");
  });

  it("ArrowDown moves to the next flat item across groups", () => {
    const { result } = renderHook(() => useCommandPalette({ commands, groups }));
    act(() => result.current.setOpen(true));
    act(() => result.current.onKeyDown(key("ArrowDown"))); // new -> open
    expect(result.current.activeId).toBe("open");
    act(() => result.current.onKeyDown(key("ArrowDown"))); // open -> settings
    expect(result.current.activeId).toBe("settings");
  });

  it("ArrowDown wraps from last to first", () => {
    const { result } = renderHook(() => useCommandPalette({ commands, groups }));
    act(() => result.current.setOpen(true));
    act(() => result.current.onKeyDown(key("ArrowDown")));
    act(() => result.current.onKeyDown(key("ArrowDown")));
    act(() => result.current.onKeyDown(key("ArrowDown"))); // wrap
    expect(result.current.activeId).toBe("new");
  });

  it("ArrowUp wraps from first to last", () => {
    const { result } = renderHook(() => useCommandPalette({ commands, groups }));
    act(() => result.current.setOpen(true));
    act(() => result.current.onKeyDown(key("ArrowUp")));
    expect(result.current.activeId).toBe("settings");
  });

  it("active item resets to first when the query changes", () => {
    const { result } = renderHook(() => useCommandPalette({ commands, groups }));
    act(() => result.current.setOpen(true));
    act(() => result.current.onKeyDown(key("ArrowDown")));
    act(() => result.current.setQuery("o")); // matches "New File"(o? no) -> "Open File"
    expect(result.current.activeId).toBe(result.current.groups[0]!.items[0]!.command.id);
  });

  it("Enter runs the active command's onSelect", () => {
    const onSelect = vi.fn();
    const cmds: Command[] = [{ id: "go", label: "Go", onSelect }];
    const { result } = renderHook(() => useCommandPalette({ commands: cmds }));
    act(() => result.current.setOpen(true));
    act(() => result.current.onKeyDown(key("Enter")));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("Escape closes the palette", () => {
    const { result } = renderHook(() => useCommandPalette({ commands, groups }));
    act(() => result.current.setOpen(true));
    act(() => result.current.onKeyDown(key("Escape")));
    expect(result.current.open).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `pnpm vitest run packages/components/src/command-palette/__tests__/use-command-palette.test.tsx`
Expected: FAIL — `activeId`/`onKeyDown` undefined.

- [ ] **Step 3: Extend the hook** — replace the file with the version below (adds a flat list of visible items, active index, and `onKeyDown`):

```tsx
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  Command,
  CommandGroup,
  PaletteStatus,
  RankedCommand,
  RenderGroup,
} from "./types";
import { rankCommands } from "./fuzzy";

export interface UseCommandPaletteOptions {
  commands: Command[];
  groups?: CommandGroup[];
}

export function useCommandPalette(options: UseCommandPaletteOptions) {
  const { commands, groups = [] } = options;
  const [open, setOpenState] = useState(false);
  const [query, setQueryState] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
    if (!next) {
      setQueryState("");
      setActiveIndex(0);
    }
  }, []);

  const setQuery = useCallback((q: string) => {
    setQueryState(q);
    setActiveIndex(0); // reset highlight whenever the query changes
  }, []);

  const renderGroups = useMemo<RenderGroup[]>(
    () => buildGroups(commands, groups, query),
    [commands, groups, query],
  );

  // Flat, ordered list of visible items for index-based navigation.
  const flat = useMemo<RankedCommand[]>(
    () => renderGroups.flatMap((g) => g.items),
    [renderGroups],
  );

  const status = useMemo<PaletteStatus>(() => {
    if (commands.length === 0) return "empty";
    if (query === "") return "default";
    return flat.length > 0 ? "results" : "no-results";
  }, [commands.length, flat.length, query]);

  const clampedIndex = flat.length === 0 ? -1 : Math.min(activeIndex, flat.length - 1);
  const activeId = clampedIndex >= 0 ? flat[clampedIndex]!.command.id : null;

  const select = useCallback(
    (id: string) => {
      const cmd = flat.find((i) => i.command.id === id)?.command;
      if (!cmd) return;
      void cmd.onSelect?.();
    },
    [flat],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (flat.length === 0 && e.key !== "Escape") return;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((i) => (i + 1) % flat.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((i) => (i - 1 + flat.length) % flat.length);
          break;
        case "Enter":
          e.preventDefault();
          if (activeId) select(activeId);
          break;
        case "Escape":
          e.preventDefault();
          setOpen(false);
          break;
      }
    },
    [flat.length, activeId, select, setOpen],
  );

  const setActiveId = useCallback(
    (id: string) => {
      const idx = flat.findIndex((i) => i.command.id === id);
      if (idx >= 0) setActiveIndex(idx);
    },
    [flat],
  );

  return {
    open,
    setOpen,
    query,
    setQuery,
    status,
    groups: renderGroups,
    activeId,
    setActiveId,
    onKeyDown,
    select,
  };
}

function buildGroups(
  commands: Command[],
  groupDefs: CommandGroup[],
  query: string,
): RenderGroup[] {
  const ranked = rankCommands(commands, query);
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

- [ ] **Step 4: Run to verify all hook tests pass**

Run: `pnpm vitest run packages/components/src/command-palette/__tests__/use-command-palette.test.tsx`
Expected: all passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: command palette hook — keyboard nav + active item"
```

---

### Task 2.4: Nested pages

**Files:**
- Modify: `packages/components/src/command-palette/use-command-palette.ts`
- Modify: `packages/components/src/command-palette/__tests__/use-command-palette.test.tsx`

- [ ] **Step 1: Add the failing tests** (append a new `describe`)

```tsx
describe("useCommandPalette: nested pages (static children)", () => {
  const nested: Command[] = [
    {
      id: "status",
      label: "Change status",
      children: [
        { id: "todo", label: "Todo" },
        { id: "done", label: "Done" },
      ],
    },
    { id: "rename", label: "Rename" },
  ];

  it("selecting a command with children pushes a page", () => {
    const { result } = renderHook(() => useCommandPalette({ commands: nested }));
    act(() => result.current.setOpen(true));
    act(() => result.current.select("status"));
    expect(result.current.pages).toHaveLength(2); // root + status
    const ids = result.current.groups.flatMap((g) => g.items.map((i) => i.command.id));
    expect(ids).toEqual(["todo", "done"]);
  });

  it("pushing a page clears the query and resets the active item", () => {
    const { result } = renderHook(() => useCommandPalette({ commands: nested }));
    act(() => result.current.setOpen(true));
    act(() => result.current.setQuery("stat"));
    act(() => result.current.select("status"));
    expect(result.current.query).toBe("");
    expect(result.current.activeId).toBe("todo");
  });

  it("popPage returns to the parent page", () => {
    const { result } = renderHook(() => useCommandPalette({ commands: nested }));
    act(() => result.current.setOpen(true));
    act(() => result.current.select("status"));
    act(() => result.current.popPage());
    expect(result.current.pages).toHaveLength(1);
    const ids = result.current.groups.flatMap((g) => g.items.map((i) => i.command.id));
    expect(ids).toEqual(["status", "rename"]);
  });

  it("Escape pops a nested page instead of closing, then closes at root", () => {
    const { result } = renderHook(() => useCommandPalette({ commands: nested }));
    act(() => result.current.setOpen(true));
    act(() => result.current.select("status"));
    act(() => result.current.onKeyDown(key("Escape"))); // pops
    expect(result.current.open).toBe(true);
    expect(result.current.pages).toHaveLength(1);
    act(() => result.current.onKeyDown(key("Escape"))); // closes
    expect(result.current.open).toBe(false);
  });

  it("closing resets the navigation stack to root", () => {
    const { result } = renderHook(() => useCommandPalette({ commands: nested }));
    act(() => result.current.setOpen(true));
    act(() => result.current.select("status"));
    act(() => result.current.setOpen(false));
    act(() => result.current.setOpen(true));
    expect(result.current.pages).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `pnpm vitest run packages/components/src/command-palette/__tests__/use-command-palette.test.tsx`
Expected: FAIL — `pages`/`popPage` undefined.

- [ ] **Step 3: Extend the hook** — replace the file with the version below (introduces a page stack; the *current* page's commands feed grouping):

```tsx
import { useCallback, useMemo, useState } from "react";
import type {
  Command,
  CommandGroup,
  Page,
  PaletteStatus,
  RankedCommand,
  RenderGroup,
} from "./types";
import { rankCommands } from "./fuzzy";

export interface UseCommandPaletteOptions {
  commands: Command[];
  groups?: CommandGroup[];
}

export function useCommandPalette(options: UseCommandPaletteOptions) {
  const { commands, groups = [] } = options;
  const rootPage = useMemo<Page>(
    () => ({ parentCommandId: null, title: null, commands }),
    [commands],
  );

  const [open, setOpenState] = useState(false);
  const [query, setQueryState] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [stack, setStack] = useState<Page[]>([rootPage]);

  const currentPage = stack[stack.length - 1] ?? rootPage;

  const resetToRoot = useCallback(() => {
    setQueryState("");
    setActiveIndex(0);
    setStack([rootPage]);
  }, [rootPage]);

  const setOpen = useCallback(
    (next: boolean) => {
      setOpenState(next);
      if (!next) resetToRoot();
    },
    [resetToRoot],
  );

  const setQuery = useCallback((q: string) => {
    setQueryState(q);
    setActiveIndex(0);
  }, []);

  const pushPage = useCallback((page: Page) => {
    setStack((s) => [...s, page]);
    setQueryState("");
    setActiveIndex(0);
  }, []);

  const popPage = useCallback(() => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
    setQueryState("");
    setActiveIndex(0);
  }, []);

  const renderGroups = useMemo<RenderGroup[]>(
    () => buildGroups(currentPage.commands, groups, query),
    [currentPage.commands, groups, query],
  );

  const flat = useMemo<RankedCommand[]>(
    () => renderGroups.flatMap((g) => g.items),
    [renderGroups],
  );

  const status = useMemo<PaletteStatus>(() => {
    if (currentPage.commands.length === 0) return "empty";
    if (query === "") return "default";
    return flat.length > 0 ? "results" : "no-results";
  }, [currentPage.commands.length, flat.length, query]);

  const clampedIndex = flat.length === 0 ? -1 : Math.min(activeIndex, flat.length - 1);
  const activeId = clampedIndex >= 0 ? flat[clampedIndex]!.command.id : null;

  const select = useCallback(
    (id: string) => {
      const cmd = flat.find((i) => i.command.id === id)?.command;
      if (!cmd) return;
      if (Array.isArray(cmd.children)) {
        pushPage({
          parentCommandId: cmd.id,
          title: cmd.label,
          commands: cmd.children,
        });
        return;
      }
      void cmd.onSelect?.();
    },
    [flat, pushPage],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          if (flat.length === 0) return;
          e.preventDefault();
          setActiveIndex((i) => (i + 1) % flat.length);
          break;
        case "ArrowUp":
          if (flat.length === 0) return;
          e.preventDefault();
          setActiveIndex((i) => (i - 1 + flat.length) % flat.length);
          break;
        case "Enter":
          e.preventDefault();
          if (activeId) select(activeId);
          break;
        case "Escape":
          e.preventDefault();
          if (stack.length > 1) popPage();
          else setOpen(false);
          break;
      }
    },
    [flat.length, activeId, select, stack.length, popPage, setOpen],
  );

  const setActiveId = useCallback(
    (id: string) => {
      const idx = flat.findIndex((i) => i.command.id === id);
      if (idx >= 0) setActiveIndex(idx);
    },
    [flat],
  );

  return {
    open,
    setOpen,
    query,
    setQuery,
    status,
    groups: renderGroups,
    activeId,
    setActiveId,
    onKeyDown,
    select,
    pages: stack,
    popPage,
  };
}

function buildGroups(
  commands: Command[],
  groupDefs: CommandGroup[],
  query: string,
): RenderGroup[] {
  const ranked = rankCommands(commands, query);
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

- [ ] **Step 4: Run to verify all hook tests pass**

Run: `pnpm vitest run packages/components/src/command-palette/__tests__/use-command-palette.test.tsx`
Expected: all passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: command palette hook — nested pages with stack navigation"
```

---

### Task 2.5: Async children with race cancellation + error/retry

**Files:**
- Modify: `packages/components/src/command-palette/use-command-palette.ts`
- Modify: `packages/components/src/command-palette/__tests__/use-command-palette.test.tsx`

- [ ] **Step 1: Add the failing tests** (append a new `describe`; uses `waitFor` and a deferred promise to force a race)

```tsx
import { waitFor } from "@testing-library/react";

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useCommandPalette: async children", () => {
  it("enters 'loading' while an async child resolver is pending", async () => {
    const d = deferred<Command[]>();
    const cmds: Command[] = [
      { id: "people", label: "Assign person", children: () => d.promise },
    ];
    const { result } = renderHook(() => useCommandPalette({ commands: cmds }));
    act(() => result.current.setOpen(true));
    act(() => result.current.select("people"));
    expect(result.current.status).toBe("loading");

    await act(async () => {
      d.resolve([{ id: "alice", label: "Alice" }]);
      await d.promise;
    });

    await waitFor(() => expect(result.current.status).toBe("results"));
    const ids = result.current.groups.flatMap((g) => g.items.map((i) => i.command.id));
    expect(ids).toEqual(["alice"]);
  });

  it("drops a stale async response when a newer request supersedes it", async () => {
    const first = deferred<Command[]>();
    const second = deferred<Command[]>();
    let call = 0;
    const cmds: Command[] = [
      {
        id: "people",
        label: "Assign person",
        children: () => (call++ === 0 ? first.promise : second.promise),
      },
    ];
    const { result } = renderHook(() => useCommandPalette({ commands: cmds }));
    act(() => result.current.setOpen(true));
    act(() => result.current.select("people")); // request #1 (pending)
    act(() => result.current.popPage());
    act(() => result.current.select("people")); // request #2 (pending)

    await act(async () => {
      second.resolve([{ id: "bob", label: "Bob" }]);
      first.resolve([{ id: "STALE", label: "Stale" }]); // resolves later, must be ignored
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.status).toBe("results"));
    const ids = result.current.groups.flatMap((g) => g.items.map((i) => i.command.id));
    expect(ids).toEqual(["bob"]);
  });

  it("enters 'error' when an async resolver rejects, and retry re-runs it", async () => {
    let call = 0;
    const ok = deferred<Command[]>();
    const cmds: Command[] = [
      {
        id: "people",
        label: "Assign person",
        children: () =>
          call++ === 0 ? Promise.reject(new Error("boom")) : ok.promise,
      },
    ];
    const { result } = renderHook(() => useCommandPalette({ commands: cmds }));
    act(() => result.current.setOpen(true));
    act(() => result.current.select("people"));

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error?.message).toBe("boom");

    act(() => result.current.retry());
    await act(async () => {
      ok.resolve([{ id: "carol", label: "Carol" }]);
      await ok.promise;
    });
    await waitFor(() => expect(result.current.status).toBe("results"));
  });
});
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `pnpm vitest run packages/components/src/command-palette/__tests__/use-command-palette.test.tsx`
Expected: FAIL — `loading`/`error`/`retry` not implemented.

- [ ] **Step 3: Extend the hook** — replace the file with the version below. Changes vs. Task 2.4: an async page resolves into a placeholder `Page` whose contents are filled by an effect; a monotonic request id drops stale responses; `error`/`retry` added; `status` and `Escape`/loading guards updated.

```tsx
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ChildResolver,
  Command,
  CommandGroup,
  Page,
  PaletteStatus,
  RankedCommand,
  RenderGroup,
} from "./types";
import { rankCommands } from "./fuzzy";

export interface UseCommandPaletteOptions {
  commands: Command[];
  groups?: CommandGroup[];
}

interface AsyncState {
  /** Request id this async page is waiting on, or null if not loading. */
  pendingReqId: number | null;
  error: Error | null;
  /** The resolver to (re)run for the current async page. */
  resolver: ChildResolver | null;
}

export function useCommandPalette(options: UseCommandPaletteOptions) {
  const { commands, groups = [] } = options;
  const rootPage = useMemo<Page>(
    () => ({ parentCommandId: null, title: null, commands }),
    [commands],
  );

  const [open, setOpenState] = useState(false);
  const [query, setQueryState] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [stack, setStack] = useState<Page[]>([rootPage]);
  const [async, setAsync] = useState<AsyncState>({
    pendingReqId: null,
    error: null,
    resolver: null,
  });

  // Monotonic request counter; ref so it survives renders without re-triggering effects.
  const reqCounter = useRef(0);

  const currentPage = stack[stack.length - 1] ?? rootPage;

  const resetToRoot = useCallback(() => {
    setQueryState("");
    setActiveIndex(0);
    setStack([rootPage]);
    setAsync({ pendingReqId: null, error: null, resolver: null });
  }, [rootPage]);

  const setOpen = useCallback(
    (next: boolean) => {
      setOpenState(next);
      if (!next) resetToRoot();
    },
    [resetToRoot],
  );

  const setQuery = useCallback((q: string) => {
    setQueryState(q);
    setActiveIndex(0);
  }, []);

  const popPage = useCallback(() => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
    setQueryState("");
    setActiveIndex(0);
    setAsync({ pendingReqId: null, error: null, resolver: null });
  }, []);

  /** Kick off (or re-run) an async resolver, registering a fresh request id. */
  const runResolver = useCallback((resolver: (q: string) => Promise<Command[]>) => {
    const reqId = ++reqCounter.current;
    setAsync({ pendingReqId: reqId, error: null, resolver });
    setStack((s) => [
      ...s,
      { parentCommandId: null, title: null, commands: [] },
    ]);
    setQueryState("");
    setActiveIndex(0);

    resolver("")
      .then((children) => {
        if (reqCounter.current !== reqId) return; // stale → ignore
        setAsync({ pendingReqId: null, error: null, resolver });
        setStack((s) => {
          const next = [...s];
          next[next.length - 1] = {
            parentCommandId: null,
            title: null,
            commands: children,
          };
          return next;
        });
      })
      .catch((err: unknown) => {
        if (reqCounter.current !== reqId) return; // stale → ignore
        setAsync({
          pendingReqId: null,
          error: err instanceof Error ? err : new Error(String(err)),
          resolver,
        });
      });
  }, []);

  const pushStaticPage = useCallback((page: Page) => {
    setStack((s) => [...s, page]);
    setQueryState("");
    setActiveIndex(0);
    setAsync({ pendingReqId: null, error: null, resolver: null });
  }, []);

  const renderGroups = useMemo<RenderGroup[]>(
    () => buildGroups(currentPage.commands, groups, query),
    [currentPage.commands, groups, query],
  );

  const flat = useMemo<RankedCommand[]>(
    () => renderGroups.flatMap((g) => g.items),
    [renderGroups],
  );

  const status = useMemo<PaletteStatus>(() => {
    if (async.pendingReqId !== null) return "loading";
    if (async.error) return "error";
    if (currentPage.commands.length === 0 && stack.length === 1) {
      // Only the root page being empty counts as the "empty" state.
      return commands.length === 0 ? "empty" : "default";
    }
    if (currentPage.commands.length === 0) return "empty";
    if (query === "") return "default";
    return flat.length > 0 ? "results" : "no-results";
  }, [async.pendingReqId, async.error, currentPage.commands.length, stack.length, commands.length, query, flat.length]);

  const clampedIndex = flat.length === 0 ? -1 : Math.min(activeIndex, flat.length - 1);
  const activeId = clampedIndex >= 0 ? flat[clampedIndex]!.command.id : null;

  const select = useCallback(
    (id: string) => {
      const cmd = flat.find((i) => i.command.id === id)?.command;
      if (!cmd) return;
      if (typeof cmd.children === "function") {
        runResolver(cmd.children);
        return;
      }
      if (Array.isArray(cmd.children)) {
        pushStaticPage({
          parentCommandId: cmd.id,
          title: cmd.label,
          commands: cmd.children,
        });
        return;
      }
      void cmd.onSelect?.();
    },
    [flat, runResolver, pushStaticPage],
  );

  const retry = useCallback(() => {
    if (typeof async.resolver === "function") {
      // Drop the failed placeholder page first, then re-run.
      setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
      runResolver(async.resolver);
    }
  }, [async.resolver, runResolver]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          if (flat.length === 0) return;
          e.preventDefault();
          setActiveIndex((i) => (i + 1) % flat.length);
          break;
        case "ArrowUp":
          if (flat.length === 0) return;
          e.preventDefault();
          setActiveIndex((i) => (i - 1 + flat.length) % flat.length);
          break;
        case "Enter":
          e.preventDefault();
          if (activeId) select(activeId);
          break;
        case "Escape":
          e.preventDefault();
          if (stack.length > 1) popPage();
          else setOpen(false);
          break;
      }
    },
    [flat.length, activeId, select, stack.length, popPage, setOpen],
  );

  const setActiveId = useCallback(
    (id: string) => {
      const idx = flat.findIndex((i) => i.command.id === id);
      if (idx >= 0) setActiveIndex(idx);
    },
    [flat],
  );

  return {
    open,
    setOpen,
    query,
    setQuery,
    status,
    groups: renderGroups,
    activeId,
    setActiveId,
    onKeyDown,
    select,
    pages: stack,
    popPage,
    error: async.error,
    retry,
  };
}

function buildGroups(
  commands: Command[],
  groupDefs: CommandGroup[],
  query: string,
): RenderGroup[] {
  const ranked = rankCommands(commands, query);
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

- [ ] **Step 4: Run the full hook + fuzzy suite**

Run: `pnpm vitest run packages/components/src/command-palette`
Expected: all passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: command palette hook — async children, race cancellation, error/retry"
```

---

## Phase 3 — Styled view + accessibility

### Task 3.1: The styled view component

**Files:**
- Create: `packages/components/src/command-palette/command-palette.tsx`
- Modify: `packages/components/src/command-palette/index.ts`

- [ ] **Step 1: Implement `command-palette.tsx`** (view that consumes the hook; controlled `open`/`onOpenChange` so the showcase can drive it)

```tsx
"use client";

import { useEffect, useId, useReducer, useRef } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import type { Command, CommandGroup } from "./types";
import { useCommandPalette } from "./use-command-palette";
import { DURATION, EASING, PANEL_SPRING } from "./motion";

export interface CommandPaletteProps {
  commands: Command[];
  groups?: CommandGroup[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeholder?: string;
  /** Disable the built-in ⌘K / Ctrl+K global shortcut (e.g. in demos). */
  disableShortcut?: boolean;
}

export function CommandPalette({
  commands,
  groups,
  open,
  onOpenChange,
  placeholder = "Type a command or search…",
  disableShortcut = false,
}: CommandPaletteProps) {
  const palette = useCommandPalette({ commands, groups });
  const reduceMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const listId = useId();

  // Keep the hook's internal open state in sync with the controlled prop.
  useEffect(() => {
    if (palette.open !== open) palette.setOpen(open);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Global ⌘K / Ctrl+K toggle.
  useEffect(() => {
    if (disableShortcut) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        triggerRef.current = document.activeElement as HTMLElement;
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange, disableShortcut]);

  // Focus the input on open; restore focus to the trigger on close.
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else {
      triggerRef.current?.focus?.();
    }
  }, [open]);

  const motionOff = reduceMotion ?? false;
  const fade = motionOff
    ? { initial: false, animate: {}, exit: {} }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: DURATION.overlay, ease: EASING.inOut },
      };
  const panel = motionOff
    ? { initial: false, animate: {}, exit: {} }
    : {
        initial: { opacity: 0, scale: 0.98, y: 8 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.98, y: 8 },
        transition: PANEL_SPRING,
      };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          {...fade}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[18vh] backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
          aria-hidden={false}
        >
          <motion.div
            {...panel}
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-haspopup="listbox"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
          >
            {palette.pages.length > 1 && (
              <button
                type="button"
                onClick={() => palette.popPage()}
                className="flex items-center gap-1 px-4 pt-3 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                ← Back
              </button>
            )}
            <input
              ref={inputRef}
              value={palette.query}
              onChange={(e) => palette.setQuery(e.target.value)}
              onKeyDown={palette.onKeyDown}
              placeholder={placeholder}
              role="textbox"
              aria-autocomplete="list"
              aria-controls={listId}
              aria-activedescendant={
                palette.activeId ? `${listId}-${palette.activeId}` : undefined
              }
              className="w-full border-b border-zinc-200 bg-transparent px-4 py-3.5 text-sm outline-none placeholder:text-zinc-400 dark:border-zinc-800"
            />
            <ul
              id={listId}
              role="listbox"
              className="max-h-80 overflow-y-auto p-2"
            >
              {palette.status === "loading" && (
                <li className="px-3 py-6 text-center text-sm text-zinc-400">
                  Loading…
                </li>
              )}
              {palette.status === "error" && (
                <li className="px-3 py-6 text-center text-sm text-red-500">
                  {palette.error?.message ?? "Something went wrong."}{" "}
                  <button
                    type="button"
                    onClick={() => palette.retry()}
                    className="underline"
                  >
                    Retry
                  </button>
                </li>
              )}
              {palette.status === "no-results" && (
                <li className="px-3 py-6 text-center text-sm text-zinc-400">
                  No results for “{palette.query}”.
                </li>
              )}
              {palette.status === "empty" && (
                <li className="px-3 py-6 text-center text-sm text-zinc-400">
                  Nothing here yet.
                </li>
              )}
              {(palette.status === "default" || palette.status === "results") &&
                palette.groups.map((group) => (
                  <li key={group.id} role="presentation">
                    {group.label && (
                      <div className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                        {group.label}
                      </div>
                    )}
                    <ul role="presentation">
                      {group.items.map((item) => {
                        const active = item.command.id === palette.activeId;
                        return (
                          <li
                            key={item.command.id}
                            id={`${listId}-${item.command.id}`}
                            role="option"
                            aria-selected={active}
                            onMouseEnter={() =>
                              palette.setActiveId(item.command.id)
                            }
                            onClick={() => palette.select(item.command.id)}
                            className={[
                              "flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm",
                              active
                                ? "bg-zinc-100 dark:bg-zinc-800"
                                : "text-zinc-700 dark:text-zinc-300",
                            ].join(" ")}
                          >
                            {item.command.icon}
                            <Highlight
                              text={item.command.label}
                              indices={item.matchedIndices}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Highlight({
  text,
  indices,
}: {
  text: string;
  indices: number[];
}) {
  if (indices.length === 0) return <span>{text}</span>;
  const set = new Set(indices);
  return (
    <span>
      {text.split("").map((ch, i) =>
        set.has(i) ? (
          <mark
            key={i}
            className="bg-transparent font-semibold text-zinc-900 dark:text-white"
          >
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

- [ ] **Step 2: Update the barrel `index.ts`**

```ts
export { CommandPalette } from "./command-palette";
export type { CommandPaletteProps } from "./command-palette";
export { useCommandPalette } from "./use-command-palette";
export type { UseCommandPaletteOptions } from "./use-command-palette";
export type {
  Command,
  CommandGroup,
  PaletteStatus,
  Page,
  RenderGroup,
  RankedCommand,
} from "./types";
export { rankCommands, fuzzyScore } from "./fuzzy";
export { DURATION, EASING, PANEL_SPRING } from "./motion";
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @palettekit/components lint`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: styled command palette view with motion + highlight"
```

---

### Task 3.2: View interaction + accessibility tests

**Files:**
- Create: `packages/components/src/command-palette/__tests__/command-palette.test.tsx`

- [ ] **Step 1: Write the tests** (render + interaction + axe + reduced-motion)

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { useState } from "react";
import { CommandPalette } from "../command-palette";
import type { Command, CommandGroup } from "../types";

const commands: Command[] = [
  { id: "new", label: "New File", group: "actions" },
  { id: "settings", label: "Settings", group: "nav" },
];
const groups: CommandGroup[] = [
  { id: "actions", label: "Actions" },
  { id: "nav", label: "Navigation" },
];

function Harness(props: { onSelect?: () => void }) {
  const [open, setOpen] = useState(true);
  const cmds = props.onSelect
    ? [{ id: "go", label: "Go", onSelect: props.onSelect }]
    : commands;
  return (
    <CommandPalette
      commands={cmds}
      groups={groups}
      open={open}
      onOpenChange={setOpen}
      disableShortcut
    />
  );
}

describe("CommandPalette view", () => {
  it("renders commands grouped under their labels", () => {
    render(<Harness />);
    expect(screen.getByText("New File")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("filters as the user types", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.keyboard("set");
    expect(screen.queryByText("New File")).not.toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("runs onSelect when an option is clicked", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSelect={onSelect} />);
    await user.click(screen.getByText("Go"));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("runs the active option on Enter", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSelect={onSelect} />);
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument(),
    );
  });

  it("exposes combobox/listbox/option roles", () => {
    render(<Harness />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getAllByRole("option").length).toBeGreaterThan(0);
  });

  it("has no axe violations when open", async () => {
    const { container } = render(<Harness />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Run to verify they pass**

Run: `pnpm vitest run packages/components/src/command-palette/__tests__/command-palette.test.tsx`
Expected: all passed. (If `userEvent.keyboard` doesn't target the input, the test harness opens with the input auto-focused — confirm focus before typing; the view focuses the input on open.)

- [ ] **Step 3: Run the entire component suite**

Run: `pnpm --filter @palettekit/components test`
Expected: all passed.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test: command palette view interaction + a11y (axe) tests"
```

---

## Phase 4 — Registry build + integrity

### Task 4.1: Registry build script

**Files:**
- Create: `packages/registry/package.json`
- Create: `packages/registry/tsconfig.json`
- Create: `packages/registry/build-registry.ts`

- [ ] **Step 1: Create `packages/registry/package.json`**

```json
{
  "name": "@palettekit/registry",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "registry": "tsx build-registry.ts",
    "test": "vitest run",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "tsx": "^4.19.0"
  }
}
```

- [ ] **Step 2: Create `packages/registry/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "noEmit": true, "types": ["node"] },
  "include": ["."]
}
```

- [ ] **Step 3: Create `build-registry.ts`** — walks each component folder, emits one shadcn-format JSON file into the showcase's `public/r/`

```ts
import { readFileSync, readdirSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const COMPONENTS_DIR = join(here, "..", "components", "src");
const OUT_DIR = join(here, "..", "..", "apps", "showcase", "public", "r");

/** Map a source filename to its shadcn registry file `type`. */
function fileType(name: string): string {
  if (name.startsWith("use-")) return "registry:hook";
  if (name.endsWith(".tsx")) return "registry:ui";
  return "registry:lib";
}

/** External runtime deps a component needs (kept explicit, not parsed). */
const DEPENDENCIES: Record<string, string[]> = {
  "command-palette": ["framer-motion"],
};

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => {
      const full = join(dir, f);
      if (!statSync(full).isFile()) return false;
      if (f === "index.ts") return false; // barrel is for the monorepo, not consumers
      return f.endsWith(".ts") || f.endsWith(".tsx");
    })
    .sort();
}

function buildComponent(name: string) {
  const dir = join(COMPONENTS_DIR, name);
  const files = listSourceFiles(dir).map((file) => ({
    path: `${name}/${file}`,
    content: readFileSync(join(dir, file), "utf8"),
    type: fileType(file),
    target: `components/${name}/${file}`,
  }));

  return {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name,
    type: "registry:ui",
    dependencies: DEPENDENCIES[name] ?? [],
    registryDependencies: [],
    files,
  };
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const components = readdirSync(COMPONENTS_DIR).filter((f) =>
    statSync(join(COMPONENTS_DIR, f)).isDirectory(),
  );
  for (const name of components) {
    const item = buildComponent(name);
    const outFile = join(OUT_DIR, `${name}.json`);
    writeFileSync(outFile, JSON.stringify(item, null, 2));
    console.log(`wrote ${relative(process.cwd(), outFile)} (${item.files.length} files)`);
  }
}

main();
```

- [ ] **Step 4: Add `@types/node` and install**

Run: `pnpm --filter @palettekit/registry add -D @types/node && pnpm install`
Expected: completes.

- [ ] **Step 5: Run the build** (the showcase app dir may not exist yet — create the output path)

Run: `pnpm --filter @palettekit/registry registry`
Expected: prints `wrote apps/showcase/public/r/command-palette.json (5 files)`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: shadcn-format registry build script"
```

---

### Task 4.2: Registry shape test

**Files:**
- Create: `packages/registry/__tests__/build-registry.test.ts`

- [ ] **Step 1: Refactor `build-registry.ts` to export `buildComponent`** — change its declaration line from `function buildComponent` to `export function buildComponent`, and guard `main()` so importing the module doesn't run it:

Replace the final `main();` call with:

```ts
// Only run when invoked directly (not when imported by tests).
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
```

- [ ] **Step 2: Write the test**

```ts
import { describe, it, expect } from "vitest";
import { buildComponent } from "../build-registry";

describe("buildComponent (command-palette)", () => {
  const item = buildComponent("command-palette");

  it("uses the shadcn registry-item schema", () => {
    expect(item.$schema).toContain("registry-item.json");
    expect(item.name).toBe("command-palette");
    expect(item.type).toBe("registry:ui");
  });

  it("declares framer-motion as a dependency", () => {
    expect(item.dependencies).toContain("framer-motion");
  });

  it("includes all five source files with targets, excluding the barrel", () => {
    const paths = item.files.map((f) => f.path).sort();
    expect(paths).toEqual([
      "command-palette/command-palette.tsx",
      "command-palette/fuzzy.ts",
      "command-palette/motion.ts",
      "command-palette/types.ts",
      "command-palette/use-command-palette.ts",
    ]);
    for (const f of item.files) {
      expect(f.target).toBe(`components/${f.path}`);
      expect(f.content.length).toBeGreaterThan(0);
    }
  });

  it("classifies the hook and view file types correctly", () => {
    const hook = item.files.find((f) => f.path.endsWith("use-command-palette.ts"));
    const view = item.files.find((f) => f.path.endsWith("command-palette.tsx"));
    expect(hook!.type).toBe("registry:hook");
    expect(view!.type).toBe("registry:ui");
  });
});
```

- [ ] **Step 3: Run the test**

Run: `pnpm vitest run packages/registry/__tests__/build-registry.test.ts`
Expected: all passed.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test: registry build output shape"
```

---

## Phase 5 — Showcase site

> The showcase is verified by build + smoke tests, not unit tests. It imports `@palettekit/components` as a workspace dependency.

### Task 5.1: Next.js app shell + Tailwind

**Files:**
- Create: `apps/showcase/package.json`
- Create: `apps/showcase/next.config.ts`
- Create: `apps/showcase/tsconfig.json`
- Create: `apps/showcase/postcss.config.mjs`
- Create: `apps/showcase/tailwind.config.ts`
- Create: `apps/showcase/src/app/globals.css`
- Create: `apps/showcase/src/app/layout.tsx`
- Create: `apps/showcase/src/app/page.tsx` (temporary placeholder)

- [ ] **Step 1: Create `apps/showcase/package.json`**

```json
{
  "name": "@palettekit/showcase",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@palettekit/components": "workspace:*",
    "framer-motion": "^11.11.0",
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0"
  }
}
```

- [ ] **Step 2: Create `apps/showcase/next.config.ts`** (transpile the workspace component package)

```ts
import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@palettekit/components"],
};

export default config;
```

- [ ] **Step 3: Create `apps/showcase/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create `apps/showcase/postcss.config.mjs`**

```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 5: Create `apps/showcase/tailwind.config.ts`** (scan the workspace component source too)

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/components/src/**/*.{ts,tsx}",
  ],
  theme: { extend: {} },
  plugins: [],
};

export default config;
```

- [ ] **Step 6: Create `apps/showcase/src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-white text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-50;
}
```

- [ ] **Step 7: Create `apps/showcase/src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PaletteKit — the command palette that doesn't suck",
  description:
    "A best-in-class, copy-paste command palette for React. Async, nested, accessible. Free.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: Create a temporary `apps/showcase/src/app/page.tsx`**

```tsx
export default function Home() {
  return <main className="p-10">PaletteKit — coming together.</main>;
}
```

- [ ] **Step 9: Install and build**

Run: `pnpm install && pnpm --filter @palettekit/showcase build`
Expected: Next.js build succeeds.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: showcase Next.js app shell with Tailwind"
```

---

### Task 5.2: Shared demo commands

**Files:**
- Create: `apps/showcase/src/lib/demo-commands.ts`

- [ ] **Step 1: Create `demo-commands.ts`** (realistic command set exercising groups, nesting, async)

```ts
import type { Command, CommandGroup } from "@palettekit/components/command-palette";

export const demoGroups: CommandGroup[] = [
  { id: "actions", label: "Actions" },
  { id: "navigation", label: "Navigation" },
  { id: "recent", label: "Recent" },
];

export const demoCommands: Command[] = [
  { id: "new-issue", label: "Create new issue", group: "actions", keywords: ["add", "task"] },
  {
    id: "status",
    label: "Change status…",
    group: "actions",
    children: [
      { id: "todo", label: "Todo" },
      { id: "in-progress", label: "In Progress" },
      { id: "done", label: "Done" },
    ],
  },
  {
    id: "assign",
    label: "Assign to…",
    group: "actions",
    // Async source: simulates a network fetch with a small delay.
    children: async (query: string) => {
      await new Promise((r) => setTimeout(r, 600));
      const people = ["Alice Wong", "Bob Singh", "Carol Diaz", "Dan Lee"];
      return people
        .filter((p) => p.toLowerCase().includes(query.toLowerCase()))
        .map((label) => ({ id: label, label }));
    },
  },
  { id: "go-inbox", label: "Go to Inbox", group: "navigation" },
  { id: "go-settings", label: "Go to Settings", group: "navigation" },
  { id: "recent-1", label: "Reopened: Login bug", group: "recent" },
];
```

- [ ] **Step 2: Typecheck via build later; for now commit**

```bash
git add -A
git commit -m "feat: shared demo command set for showcase"
```

---

### Task 5.3: Install-command button + homepage

**Files:**
- Create: `apps/showcase/src/components/install-command.tsx`
- Modify: `apps/showcase/src/app/page.tsx`

- [ ] **Step 1: Create `install-command.tsx`** (client component, copies the install line)

```tsx
"use client";

import { useState } from "react";

const INSTALL = "npx shadcn@latest add https://palettekit.dev/r/command-palette.json";

export function InstallCommand() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(INSTALL);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="group flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 font-mono text-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <span className="text-zinc-400">$</span>
      <span className="truncate">{INSTALL}</span>
      <span className="ml-auto text-xs text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300">
        {copied ? "Copied!" : "Copy"}
      </span>
    </button>
  );
}
```

- [ ] **Step 2: Replace `page.tsx`** with the homepage — live palette + proof points

```tsx
"use client";

import { useState } from "react";
import { CommandPalette } from "@palettekit/components/command-palette";
import { demoCommands, demoGroups } from "@/lib/demo-commands";
import { InstallCommand } from "@/components/install-command";

export default function Home() {
  const [open, setOpen] = useState(false);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center px-6 py-24 text-center">
      <h1 className="text-balance text-5xl font-semibold tracking-tight">
        The command palette that doesn&apos;t suck.
      </h1>
      <p className="mt-5 max-w-xl text-balance text-lg text-zinc-500">
        Fuzzy search, full keyboard nav, async sources, nested pages, and real
        accessibility — as copy-paste source you own. Free.
      </p>

      <div className="mt-10 flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg bg-zinc-900 px-5 py-3 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
        >
          Open the palette &nbsp;
          <kbd className="rounded bg-white/20 px-1.5 py-0.5 text-xs dark:bg-black/10">
            ⌘K
          </kbd>
        </button>
        <InstallCommand />
      </div>

      <section className="mt-20 grid w-full grid-cols-1 gap-4 text-left sm:grid-cols-3">
        <Proof title="Async sources" body="Type to fetch results. Stale responses are dropped automatically." />
        <Proof title="Nested pages" body="Drill into sub-actions with breadcrumbs and back navigation." />
        <Proof title="Accessible" body="Combobox semantics, focus management, and reduced-motion by default." />
      </section>

      <CommandPalette
        commands={demoCommands}
        groups={demoGroups}
        open={open}
        onOpenChange={setOpen}
      />
    </main>
  );
}

function Proof({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-zinc-500">{body}</p>
    </div>
  );
}
```

- [ ] **Step 3: Build to verify the workspace import + ⌘K wiring compile**

Run: `pnpm --filter @palettekit/showcase build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: homepage with live palette, install command, proof points"
```

---

### Task 5.4: State Explorer + playground page

**Files:**
- Create: `apps/showcase/src/components/state-explorer.tsx`
- Create: `apps/showcase/src/app/playground/page.tsx`

- [ ] **Step 1: Create `state-explorer.tsx`** — drives the palette into a chosen status and freezes it by feeding a tailored command set

```tsx
"use client";

import { useMemo, useState } from "react";
import { CommandPalette } from "@palettekit/components/command-palette";
import type { Command, PaletteStatus } from "@palettekit/components/command-palette";
import { demoGroups } from "@/lib/demo-commands";

const STATES: { id: Exclude<PaletteStatus, "loading" | "error">; label: string }[] = [
  { id: "default", label: "Default" },
  { id: "results", label: "Results" },
  { id: "no-results", label: "No results" },
  { id: "empty", label: "Empty" },
];

// A pending promise that never resolves → freezes the palette in "loading".
const NEVER: Command[] = [
  { id: "load", label: "Load people…", children: () => new Promise<Command[]>(() => {}) },
];
// A resolver that always rejects → freezes in "error" after select.
const FAILS: Command[] = [
  { id: "load", label: "Load people…", children: () => Promise.reject(new Error("Network error")) },
];

const STATIC: Command[] = [
  { id: "new-issue", label: "Create new issue", group: "actions" },
  { id: "go-settings", label: "Go to Settings", group: "navigation" },
];

export function StateExplorer() {
  const [status, setStatus] = useState<PaletteStatus>("default");
  const [open, setOpen] = useState(true);

  // Map the requested status to the command set + initial action that produces it.
  const { commands, note } = useMemo(() => {
    switch (status) {
      case "empty":
        return { commands: [] as Command[], note: "No commands available at all." };
      case "loading":
        return { commands: NEVER, note: "Select “Load people…” to see the loading state." };
      case "error":
        return { commands: FAILS, note: "Select “Load people…” to see the error + retry." };
      default:
        return { commands: STATIC, note: "" };
    }
  }, [status]);

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-[220px_1fr]">
      <aside className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          State
        </h2>
        <div className="flex flex-col gap-1.5">
          {[...STATES, { id: "loading" as const, label: "Loading" }, { id: "error" as const, label: "Error" }].map(
            (s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setStatus(s.id);
                  setOpen(true);
                }}
                className={[
                  "rounded-md px-3 py-2 text-left text-sm",
                  status === s.id
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
                ].join(" ")}
              >
                {s.label}
              </button>
            ),
          )}
        </div>
        {note && <p className="text-xs text-zinc-400">{note}</p>}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs text-zinc-500 underline"
        >
          Re-open palette
        </button>
      </aside>

      <div className="relative min-h-[420px] rounded-xl border border-zinc-200 dark:border-zinc-800">
        <CommandPalette
          key={status} /* remount on state change so async re-initializes */
          commands={status === "default" || status === "results" ? STATIC : commands}
          groups={demoGroups}
          open={open}
          onOpenChange={setOpen}
          disableShortcut
          placeholder={
            status === "results" ? "Try typing “set”…" : "Type a command or search…"
          }
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/showcase/src/app/playground/page.tsx`**

```tsx
import { StateExplorer } from "@/components/state-explorer";

export default function Playground() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight">Playground</h1>
      <p className="mt-3 max-w-xl text-zinc-500">
        Step through every state of the palette — including the ones that
        normally flash by too fast to see.
      </p>
      <div className="mt-12">
        <StateExplorer />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Build**

Run: `pnpm --filter @palettekit/showcase build`
Expected: build succeeds; `/playground` is generated.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: playground state explorer"
```

---

### Task 5.5: Docs page

**Files:**
- Create: `apps/showcase/src/app/docs/page.tsx`

- [ ] **Step 1: Create `docs/page.tsx`** — install line, props table, customize note

```tsx
import { InstallCommand } from "@/components/install-command";

const PROPS: { name: string; type: string; desc: string }[] = [
  { name: "commands", type: "Command[]", desc: "The commands to show. Each may have a group, keywords, icon, onSelect, or children." },
  { name: "groups", type: "CommandGroup[]?", desc: "Group definitions; controls section order and labels." },
  { name: "open", type: "boolean", desc: "Controlled open state." },
  { name: "onOpenChange", type: "(open: boolean) => void", desc: "Called when the palette wants to open or close." },
  { name: "placeholder", type: "string?", desc: "Input placeholder text." },
  { name: "disableShortcut", type: "boolean?", desc: "Disable the built-in ⌘K / Ctrl+K shortcut." },
];

export default function Docs() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight">Install</h1>
      <p className="mt-3 text-zinc-500">
        PaletteKit installs as source into your repo via the shadcn CLI. You own
        the files — edit the styling freely.
      </p>
      <div className="mt-6">
        <InstallCommand />
      </div>

      <h2 className="mt-16 text-2xl font-semibold tracking-tight">Props</h2>
      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-2 font-medium">Prop</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {PROPS.map((p) => (
              <tr key={p.name} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="px-4 py-2 font-mono text-xs">{p.name}</td>
                <td className="px-4 py-2 font-mono text-xs text-zinc-500">{p.type}</td>
                <td className="px-4 py-2 text-zinc-600 dark:text-zinc-300">{p.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-16 text-2xl font-semibold tracking-tight">Customizing</h2>
      <p className="mt-3 text-zinc-500">
        Because the source lives in your repo under{" "}
        <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm dark:bg-zinc-800">
          components/command-palette
        </code>
        , you can change Tailwind classes, swap motion timings in{" "}
        <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm dark:bg-zinc-800">
          motion.ts
        </code>
        , or extend the command types directly.
      </p>
    </main>
  );
}
```

- [ ] **Step 2: Build**

Run: `pnpm --filter @palettekit/showcase build`
Expected: build succeeds; `/docs` generated.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: docs page with install + props + customize guide"
```

---

### Task 5.6: Wire registry build into showcase + gitignore generated output

**Files:**
- Modify: `apps/showcase/package.json`
- Create: `apps/showcase/.gitignore`

- [ ] **Step 1: Add a `prebuild` hook** so the registry JSON is always fresh before a Next build. Update `apps/showcase/package.json` scripts:

```json
  "scripts": {
    "dev": "next dev",
    "prebuild": "pnpm --filter @palettekit/registry registry",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
```

- [ ] **Step 2: Create `apps/showcase/.gitignore`** (generated registry output + Next artifacts)

```
.next/
public/r/
next-env.d.ts
```

- [ ] **Step 3: Remove the already-committed generated JSON from git tracking** (it was committed in Task 4.1)

Run: `git rm --cached apps/showcase/public/r/command-palette.json 2>/dev/null; pnpm --filter @palettekit/showcase build`
Expected: build runs prebuild (regenerates the JSON), then succeeds.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: regenerate registry on showcase build; ignore generated output"
```

---

### Task 5.7: Registry integrity test (the one that matters)

**Files:**
- Create: `packages/registry/__tests__/registry-integrity.test.ts`

- [ ] **Step 1: Write the integrity test** — validates the emitted JSON is installable-shaped: every file has resolvable content, valid types, and targets that don't escape the project root. (A full `shadcn add` against a temp app requires network + a real shadcn project; this test asserts the contract that makes `add` succeed, and is the gate referenced in the spec.)

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..", "..");
const OUT = join(ROOT, "apps", "showcase", "public", "r", "command-palette.json");

describe("registry integrity: command-palette.json", () => {
  beforeAll(() => {
    // Regenerate to guarantee we test current source, not a stale artifact.
    execFileSync("pnpm", ["--filter", "@palettekit/registry", "registry"], {
      cwd: ROOT,
      stdio: "ignore",
    });
  });

  it("exists and is valid JSON", () => {
    expect(existsSync(OUT)).toBe(true);
    expect(() => JSON.parse(readFileSync(OUT, "utf8"))).not.toThrow();
  });

  it("matches the installable contract", () => {
    const item = JSON.parse(readFileSync(OUT, "utf8"));
    expect(item.name).toBe("command-palette");
    expect(Array.isArray(item.files)).toBe(true);
    const validTypes = new Set(["registry:ui", "registry:hook", "registry:lib"]);
    for (const f of item.files) {
      expect(typeof f.content).toBe("string");
      expect(f.content.length).toBeGreaterThan(0);
      expect(validTypes.has(f.type)).toBe(true);
      // targets must stay inside the consumer project (no path traversal).
      expect(f.target.startsWith("components/")).toBe(true);
      expect(f.target).not.toContain("..");
    }
  });

  it("ships every source file the component needs to compile", () => {
    const item = JSON.parse(readFileSync(OUT, "utf8"));
    const names = item.files.map((f: { path: string }) => f.path);
    for (const required of [
      "command-palette/types.ts",
      "command-palette/fuzzy.ts",
      "command-palette/motion.ts",
      "command-palette/use-command-palette.ts",
      "command-palette/command-palette.tsx",
    ]) {
      expect(names).toContain(required);
    }
  });

  it("does not ship the monorepo barrel (index.ts) to consumers", () => {
    const item = JSON.parse(readFileSync(OUT, "utf8"));
    const names = item.files.map((f: { path: string }) => f.path);
    expect(names).not.toContain("command-palette/index.ts");
  });
});
```

- [ ] **Step 2: Run it**

Run: `pnpm vitest run packages/registry/__tests__/registry-integrity.test.ts`
Expected: all passed.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test: registry integrity contract (installable shape)"
```

---

### Task 5.8: Full green + README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Run the entire suite from root**

Run: `pnpm test`
Expected: every package's tests pass (turbo runs `@palettekit/components` + `@palettekit/registry`).

- [ ] **Step 2: Build everything**

Run: `pnpm build`
Expected: components typecheck, registry emits JSON, showcase builds.

- [ ] **Step 3: Create `README.md`** mirroring the homepage pitch

```markdown
# PaletteKit

The command palette that doesn't suck. Fuzzy search, full keyboard nav, async
sources, nested pages, and real accessibility — as copy-paste React source you
own. Free.

## Install

```bash
npx shadcn@latest add https://palettekit.dev/r/command-palette.json
```

## Develop

```bash
pnpm install
pnpm test     # run all tests
pnpm build    # typecheck + build registry + build showcase
pnpm --filter @palettekit/showcase dev   # run the showcase locally
```

## Structure

- `packages/components/command-palette` — the component source (what users receive)
- `packages/registry` — emits the shadcn-format registry JSON
- `apps/showcase` — the marketing site, playground, and docs

Architecture is multi-component-ready: adding a second interaction is a new
folder under `packages/components/src`, not a re-architecture.
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: project README"
```

---

## Self-Review Notes (for the executor)

- **Spec coverage:** §3 architecture → Phase 0 + 4 + 5; §3.1 multi-component readiness → registry walks `components/*` (Task 4.1), barrel excluded from registry (4.2/5.7), README note (5.8); §4 component (fuzzy, keyboard, groups, async, nested, a11y, motion) → Phases 1–3; §4 six states → Tasks 2.2/2.5 (status) + 5.4 (explorer); §5 site (homepage/playground/docs/registry endpoint) → Tasks 5.3/5.4/5.5/5.1+5.6; §6 testing (hook unit, axe, view, registry integrity) → Tasks 2.x, 3.2, 4.2, 5.7; §7 success criteria → install contract (5.7), states in playground (5.4), axe (3.2), live demos (5.3), build green (5.8).
- **Known gap accepted:** Task 5.7 asserts the installable *contract* rather than running a live `shadcn add` (which needs network + an initialized shadcn project). Before public launch, do one manual `npx shadcn add` into a throwaway Next+Tailwind app — this is success criterion #1 and is the only step not fully automatable here. Flagged, not silently dropped.
- **Type consistency:** `useCommandPalette` return shape (`open/setOpen/query/setQuery/status/groups/activeId/setActiveId/onKeyDown/select/pages/popPage/error/retry`) is stable from Task 2.5 onward and matches the view's usage in 3.1 and the explorer in 5.4. `Command`/`CommandGroup`/`PaletteStatus`/`RenderGroup`/`RankedCommand`/`Page` defined once in 1.1 and imported everywhere.
- **Navigation:** the showcase has no shared nav/header in the MVP (homepage carries the weight per spec); `/playground` and `/docs` are reachable by direct URL. A nav bar is intentionally deferred — add only if needed at launch.
```
