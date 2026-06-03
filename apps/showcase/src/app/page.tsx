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
