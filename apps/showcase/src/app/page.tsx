"use client";

import { useState } from "react";
import { CommandPalette } from "@interlace/components/command-palette";
import { demoCommands, demoGroups } from "@/lib/demo-commands";
import { InstallCommand } from "@/components/install-command";
import { RaceTimeline } from "@/components/race-timeline";
import { NestingDemo } from "@/components/nesting-demo";
import { RecentsDemo } from "@/components/recents-demo";
import { StateInspector } from "@/components/state-inspector";
import { MotionReadout } from "@/components/motion-readout";
import { ScaleDemo } from "@/components/scale-demo";

export default function Home() {
  const [open, setOpen] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);

  return (
    <main>
      {/* Hero — the differentiator leads, the inspector IS the hero. */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="bg-grid pointer-events-none absolute inset-0 h-[420px]" />
        <div className="relative mx-auto max-w-6xl px-5 pb-4 pt-20 sm:px-8 sm:pt-28">
          <h1 className="max-w-3xl text-balance font-semibold tracking-tight [font-size:clamp(2rem,6vw,3.75rem)] [line-height:1.04]">
            Watch what a great command palette does that a bad one{" "}
            <span className="text-accent">doesn&apos;t.</span>
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted">
            Async with race cancellation, every frozen state, the exact motion
            timings. Most palettes hide this craft behind a pretty input. This one
            puts it on the table so you can scrub it, break it, and inspect it.
          </p>

          <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-accent-ink transition-transform hover:-translate-y-px active:translate-y-0"
            >
              Open the palette
              <kbd className="rounded bg-black/15 px-1.5 py-0.5 font-mono text-xs">⌘K</kbd>
            </button>
            <InstallCommand />
          </div>
          <p className="mt-4 font-mono text-xs text-faint">
            Free. Copy-paste React source you own, via the shadcn CLI.
          </p>
        </div>
      </section>

      {/* The signature artifact. */}
      <section id="studio" className="mx-auto max-w-6xl scroll-mt-20 px-5 pt-12 sm:px-8">
        <SectionLabel
          kicker="Live demo · scrub it"
          title="The async race, in slow motion"
          body="Type fast and two requests overlap. Scrub the timeline, then flip to a naive palette to watch the stale one win."
        />
        <div className="mt-7">
          <RaceTimeline />
        </div>
      </section>

      {/* Nested pages — the thing cmdk makes you hand-roll. */}
      <section className="mx-auto max-w-6xl px-5 pt-24 sm:px-8">
        <SectionLabel
          kicker="Nested pages · walk the stack"
          title="Drill into sub-actions without leaving the keyboard"
          body="Select a command with children to push a sub-page; Escape pops it. A real navigation stack with breadcrumbs — most palettes make you build this yourself."
        />
        <div className="mt-7">
          <NestingDemo />
        </div>
      </section>

      {/* Recents + shortcut hints. */}
      <section id="recents" className="mx-auto max-w-6xl scroll-mt-20 px-5 pt-24 sm:px-8">
        <SectionLabel
          kicker="Recents · shortcut hints"
          title="Remembers what you use, and shows the keys"
          body="Recently-used commands float to the top; shortcut hints render inline. Two conveniences every great palette has — and ours gives you for free."
        />
        <div className="mt-7">
          <RecentsDemo />
        </div>
      </section>

      {/* Frozen states. */}
      <section id="states" className="mx-auto max-w-6xl scroll-mt-20 px-5 pt-24 sm:px-8">
        <SectionLabel
          kicker="6 states · frozen"
          title="The states that flash by too fast to see"
          body="Loading, empty, error, no-results. Every palette has them; almost none are designed. Freeze each one and stare."
        />
        <div className="mt-7">
          <StateInspector />
        </div>
      </section>

      {/* Motion tokens. */}
      <section className="mx-auto max-w-6xl px-5 pt-24 sm:px-8">
        <SectionLabel
          kicker="Straight from motion.ts"
          title="The timings you normally only feel"
          body="See each easing curve, then replay it. Invisible craft, made into a feature you can read and edit."
        />
        <div className="mt-7">
          <MotionReadout />
        </div>
      </section>

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

      {/* Closing install. */}
      <section className="mx-auto mt-28 max-w-6xl px-5 sm:px-8">
        <div className="rounded-2xl border border-line bg-surface/60 px-6 py-12 text-center sm:py-16">
          <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
            Drop it in. Own the source.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-pretty text-muted">
            One command installs the palette as files in your repo. Yours to read,
            edit, and ship.
          </p>
          <div className="mt-7 flex justify-center">
            <InstallCommand />
          </div>
        </div>
      </section>

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
    </main>
  );
}

function SectionLabel({
  kicker,
  title,
  body,
}: {
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <div className="max-w-2xl border-t border-line pt-7">
      <p className="font-mono text-xs text-accent">{kicker}</p>
      <h2 className="mt-3 text-balance text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
        {title}
      </h2>
      <p className="mt-2 text-pretty leading-relaxed text-muted">{body}</p>
    </div>
  );
}
