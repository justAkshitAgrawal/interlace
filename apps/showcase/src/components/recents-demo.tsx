"use client";

import { useState } from "react";
import { CommandPalette } from "@palettekit/components/command-palette";
import type { Command, CommandGroup } from "@palettekit/components/command-palette";

/*
 * Two conveniences most palettes skip: shortcut hints (display-only, right of
 * the row) and recents (consumer-owned usage history that boosts ranking).
 * Run a few commands, then reopen — recently-used float to the top of their
 * group. Recents are tracked in memory here, so they reset on refresh.
 */

const groups: CommandGroup[] = [
  { id: "actions", label: "Actions" },
  { id: "navigation", label: "Navigation" },
];

const commands: Command[] = [
  { id: "new-issue", label: "Create new issue", group: "actions", shortcut: ["⌘", "⇧", "I"] },
  { id: "new-doc", label: "Create document", group: "actions", shortcut: ["⌘", "E"] },
  { id: "search", label: "Search everything", group: "actions", shortcut: ["/"] },
  { id: "go-inbox", label: "Go to Inbox", group: "navigation", shortcut: ["G", "I"] },
  { id: "go-settings", label: "Go to Settings", group: "navigation", shortcut: ["G", "S"] },
  { id: "go-projects", label: "Go to Projects", group: "navigation", shortcut: ["G", "P"] },
];

const LABELS = new Map(commands.map((c) => [c.id, c.label]));

export function RecentsDemo() {
  const [open, setOpen] = useState(true);
  const [recents, setRecents] = useState<string[]>([]);

  return (
    <div className="rounded-2xl border border-line bg-surface/60 p-4 sm:p-6">
      <p className="mb-3 text-pretty text-sm leading-relaxed text-muted">
        Shortcut hints sit on the right of each row. Run a few commands, then{" "}
        <span className="text-ink">reopen the palette</span> — recently-used
        commands float to the top of their group.
      </p>
      <p className="mb-3 text-pretty text-xs leading-relaxed text-faint">
        Hints are display-only — your app wires the actual keys (just like cmdk).
        The built-in <kbd className="rounded border border-line bg-surface-2 px-1 font-mono">⌘K</kbd>{" "}
        to open is the one shortcut the palette owns.
      </p>

      <p className="mb-3 flex flex-wrap items-center gap-2 font-mono text-xs">
        <span className="text-faint">recents:</span>
        {recents.length === 0 ? (
          <span className="text-faint">— none yet, pick something</span>
        ) : (
          recents.map((id, i) => (
            <span
              key={id}
              className="rounded bg-accent/15 px-2 py-0.5 text-accent"
            >
              {i + 1}. {LABELS.get(id) ?? id}
            </span>
          ))
        )}
      </p>

      <div className="palette-frame relative min-h-[440px] transform-gpu overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/60">
        <CommandPalette
          commands={commands}
          groups={groups}
          open={open}
          onOpenChange={setOpen}
          disableShortcut
          recents={recents}
          onSelectCommand={(id) =>
            setRecents((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, 4))
          }
          placeholder="Pick a command, then reopen…"
        />
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="absolute inset-0 grid place-items-center text-sm text-muted hover:text-ink"
          >
            Reopen palette
          </button>
        )}
      </div>
    </div>
  );
}
