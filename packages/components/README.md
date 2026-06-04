# @interlace/components

The component source behind [Interlace](https://interlace.akshitagrawal.dev) —
drop-in interactions for real software, installed as source you own via the
shadcn CLI.

The first component is a best-in-class **command palette**: fuzzy search, full
keyboard navigation, grouped + ranked results, nested pages, async sources with
race cancellation, recents, optional virtualization, and a real accessible
dialog/combobox.

## Install

```bash
npx shadcn@latest add https://interlace.akshitagrawal.dev/r/command-palette.json
```

This copies the source into `components/command-palette/` in your repo. You own
the files — edit them freely.

## Requirements

These are hard requirements; the component will not work without them:

- **React 19+** (uses `useId` and current hook semantics).
- **Tailwind CSS** — the component is styled with Tailwind utility classes
  (`zinc-*`, dark-mode variants). It is **not** unstyled/headless. On a project
  without Tailwind it will render unstyled. Make sure your Tailwind `content`
  globs include the copied files.
- **Runtime dependencies** (installed automatically by the shadcn CLI):
  - [`framer-motion`](https://www.framer.com/motion/) — open/close + list motion.
  - [`@tanstack/react-virtual`](https://tanstack.com/virtual) — windowing for
    large command lists.

## Usage

```tsx
"use client";
import { useState } from "react";
import { CommandPalette } from "@/components/command-palette";

const commands = [
  { id: "new", label: "Create new issue", group: "actions", shortcut: ["⌘", "⇧", "I"] },
  { id: "settings", label: "Go to Settings", group: "nav" },
];
const groups = [
  { id: "actions", label: "Actions" },
  { id: "nav", label: "Navigation" },
];

export function Example() {
  const [open, setOpen] = useState(false);
  return (
    <CommandPalette
      commands={commands}
      groups={groups}
      open={open}
      onOpenChange={setOpen}
    />
  );
}
```

`⌘K` / `Ctrl+K` to open is built in (disable with `disableShortcut`). Per-command
`shortcut` hints are **display-only** — your app binds the actual keys, the same
model as cmdk.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `commands` | `Command[]` | Commands to show. Each may have `group`, `keywords`, `icon`, `shortcut`, `onSelect`, or `children`. |
| `groups` | `CommandGroup[]?` | Group definitions; controls section order and labels. |
| `open` | `boolean` | Controlled open state. |
| `onOpenChange` | `(open: boolean) => void` | Called when the palette wants to open or close. |
| `placeholder` | `string?` | Input placeholder. |
| `disableShortcut` | `boolean?` | Disable the built-in ⌘K / Ctrl+K shortcut. |
| `defaultQuery` | `string?` | Open pre-filtered with this query. |
| `recents` | `string[]?` | Recently-used command ids (most-recent first); boosts them in ranking. |
| `onSelectCommand` | `(id, command) => void` | Fires on every selection — use it to record usage for `recents`. |
| `rank` | `RankFn?` | Bring your own matcher. Defaults to the built-in fuzzy ranker. |

## License

MIT
