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
