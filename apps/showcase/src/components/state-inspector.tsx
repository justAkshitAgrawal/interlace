"use client";

import { useMemo, useState } from "react";
import { CommandPalette } from "@palettekit/components/command-palette";
import type {
  Command,
  PaletteStatus,
} from "@palettekit/components/command-palette";
import { demoGroups } from "@/lib/demo-commands";

/*
 * Every palette has these states. Most flash by in milliseconds, so nobody ever
 * designs them — they ship broken. This freezes each one so you can stare at it.
 */

const STATES: { id: PaletteStatus; label: string; note: string }[] = [
  {
    id: "default",
    label: "Default",
    note: "Open, no query yet. Grouped commands, first item active.",
  },
  {
    id: "results",
    label: "Results",
    note: "Fuzzy-ranked matches for a query — seeded here with “set”.",
  },
  {
    id: "no-results",
    label: "No results",
    note: "A query that matches nothing. No dead end, just a clear message.",
  },
  {
    id: "loading",
    label: "Loading",
    note: "An async source is in flight. Select “Load people…” and watch it resolve.",
  },
  {
    id: "error",
    label: "Error",
    note: "The fetch rejected. The retry path is built in; select “Load people…”.",
  },
  {
    id: "empty",
    label: "Empty",
    note: "No commands at all. The state most demos forget exists.",
  },
];

const PEOPLE: Command[] = [
  { id: "alice", label: "Alice Wong" },
  { id: "bob", label: "Bob Singh" },
  { id: "carol", label: "Carol Diaz" },
  { id: "dan", label: "Dan Lee" },
];
const LOADS: Command[] = [
  {
    id: "load",
    label: "Load people…",
    children: () =>
      new Promise<Command[]>((resolve) =>
        setTimeout(() => resolve(PEOPLE), 1100),
      ),
  },
];
const FAILS: Command[] = [
  {
    id: "load",
    label: "Load people…",
    children: () => Promise.reject(new Error("Network error")),
  },
];
const STATIC: Command[] = [
  { id: "new-issue", label: "Create new issue", group: "actions" },
  { id: "go-settings", label: "Go to Settings", group: "navigation" },
];

export function StateInspector() {
  const [status, setStatus] = useState<PaletteStatus>("default");
  const [open, setOpen] = useState(true);

  const commands = useMemo(() => {
    switch (status) {
      case "empty":
        return [] as Command[];
      case "loading":
        return LOADS;
      case "error":
        return FAILS;
      default:
        return STATIC;
    }
  }, [status]);

  // Seed a query so the results / no-results states are genuinely frozen on
  // selection, not just instructions to type something.
  const defaultQuery =
    status === "results" ? "set" : status === "no-results" ? "zzzz" : "";

  const active = STATES.find((s) => s.id === status)!;

  return (
    <div className="rounded-2xl border border-line bg-surface/60 p-4 sm:p-6">
      <div
        role="tablist"
        aria-label="Palette state"
        className="flex flex-wrap gap-1.5"
      >
        {STATES.map((s) => {
          const selected = s.id === status;
          return (
            <button
              key={s.id}
              role="tab"
              aria-selected={selected}
              type="button"
              onClick={() => {
                setStatus(s.id);
                setOpen(true);
              }}
              className={[
                "rounded-lg px-3 py-1.5 font-mono text-xs transition-colors",
                selected
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:bg-surface-2 hover:text-ink",
              ].join(" ")}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <p className="mt-4 min-h-[2.5rem] max-w-2xl text-pretty text-sm leading-relaxed text-muted">
        {active.note}
      </p>

      <div className="palette-frame relative mt-2 min-h-[440px] transform-gpu overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/60">
        <CommandPalette
          key={status}
          commands={commands}
          groups={demoGroups}
          open={open}
          onOpenChange={setOpen}
          disableShortcut
          defaultQuery={defaultQuery}
          placeholder="Type a command or search…"
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
