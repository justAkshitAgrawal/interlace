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
