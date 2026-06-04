"use client";

import { useState } from "react";
import { CommandPalette } from "@palettekit/components/command-palette";
import type { Command } from "@palettekit/components/command-palette";
import { demoGroups } from "@/lib/demo-commands";

/*
 * Nested pages are the thing cmdk makes you hand-roll. Selecting a command with
 * `children` pushes a sub-page; Escape (or the Back button) pops it. This drives
 * the real component so you can walk the stack yourself.
 */

const COMMANDS: Command[] = [
  {
    id: "status",
    label: "Change status…",
    group: "actions",
    children: [
      { id: "todo", label: "Todo" },
      { id: "in-progress", label: "In Progress" },
      { id: "done", label: "Done" },
      { id: "canceled", label: "Canceled" },
    ],
  },
  {
    id: "priority",
    label: "Set priority…",
    group: "actions",
    children: [
      { id: "urgent", label: "Urgent" },
      { id: "high", label: "High" },
      { id: "medium", label: "Medium" },
      { id: "low", label: "Low" },
    ],
  },
  { id: "new-issue", label: "Create new issue", group: "actions" },
  { id: "go-settings", label: "Go to Settings", group: "navigation" },
];

const STEPS = [
  "Select a command ending in “…” to push a sub-page.",
  "Arrow keys and fuzzy search work on every level.",
  "Escape or “← Back” pops one page; Escape at the root closes.",
];

export function NestingDemo() {
  const [open, setOpen] = useState(true);

  return (
    <div className="grid gap-6 rounded-2xl border border-line bg-surface/60 p-4 sm:p-6 md:grid-cols-[1fr_240px]">
      <div className="palette-frame relative order-2 min-h-[440px] transform-gpu overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/60 md:order-1">
        <CommandPalette
          commands={COMMANDS}
          groups={demoGroups}
          open={open}
          onOpenChange={setOpen}
          disableShortcut
          placeholder="Try “Change status…”"
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

      <ol className="order-1 flex flex-col gap-3 md:order-2">
        {STEPS.map((step, i) => (
          <li key={i} className="flex gap-3 text-sm leading-relaxed text-muted">
            <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-accent/15 font-mono text-[11px] text-accent">
              {i + 1}
            </span>
            <span className="text-pretty">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
