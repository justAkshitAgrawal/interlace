import { InstallCommand } from "@/components/install-command";

const PROPS: { name: string; type: string; desc: string }[] = [
  {
    name: "commands",
    type: "Command[]",
    desc: "The commands to show. Each may have a group, keywords, icon, onSelect, or children.",
  },
  {
    name: "groups",
    type: "CommandGroup[]?",
    desc: "Group definitions; controls section order and labels.",
  },
  { name: "open", type: "boolean", desc: "Controlled open state." },
  {
    name: "onOpenChange",
    type: "(open: boolean) => void",
    desc: "Called when the palette wants to open or close.",
  },
  { name: "placeholder", type: "string?", desc: "Input placeholder text." },
  {
    name: "disableShortcut",
    type: "boolean?",
    desc: "Disable the built-in ⌘K / Ctrl+K shortcut.",
  },
  {
    name: "defaultQuery",
    type: "string?",
    desc: "Open the palette pre-filtered with this query.",
  },
  {
    name: "recents",
    type: "string[]?",
    desc: "Recently-used command ids (most-recent first); boosts them in ranking.",
  },
  {
    name: "onSelectCommand",
    type: "(id, command) => void",
    desc: "Fires on every selection — use it to record usage for recents.",
  },
  {
    name: "rank",
    type: "RankFn?",
    desc: "Bring your own matcher. Defaults to the built-in fuzzy ranker.",
  },
  {
    name: "shortcut (per command)",
    type: "string[]?",
    desc: 'Display-only shortcut hint shown on the row, e.g. ["⌘","N"].',
  },
];

export default function Docs() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-20 sm:px-8">
      <p className="font-mono text-xs text-accent">Install</p>
      <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        One command, source you own
      </h1>
      <p className="mt-3 max-w-xl text-pretty leading-relaxed text-muted">
        PaletteKit installs as source into your repo via the shadcn CLI. You own
        the files and edit the styling freely.
      </p>
      <div className="mt-7">
        <InstallCommand />
      </div>

      <h2 className="mt-16 text-2xl font-semibold tracking-tight">Props</h2>
      <div className="mt-6 overflow-hidden rounded-xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface">
            <tr className="text-muted">
              <th className="px-4 py-2.5 font-medium">Prop</th>
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {PROPS.map((p) => (
              <tr key={p.name} className="border-t border-line">
                <td className="px-4 py-2.5 font-mono text-xs text-accent">
                  {p.name}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-faint">
                  {p.type}
                </td>
                <td className="px-4 py-2.5 text-muted">{p.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-16 text-2xl font-semibold tracking-tight">
        Customizing
      </h2>
      <p className="mt-3 max-w-xl text-pretty leading-relaxed text-muted">
        Because the source lives in your repo under{" "}
        <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[0.85em] text-ink">
          components/command-palette
        </code>
        , you can change Tailwind classes, swap motion timings in{" "}
        <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[0.85em] text-ink">
          motion.ts
        </code>
        , or extend the command types directly.
      </p>

      <h2 className="mt-16 text-2xl font-semibold tracking-tight">
        Bring your own matcher
      </h2>
      <p className="mt-3 max-w-xl text-pretty leading-relaxed text-muted">
        The built-in fuzzy ranker is the default. Pass{" "}
        <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[0.85em] text-ink">
          rank
        </code>{" "}
        to swap in your own — fuzzysort, command-score, or a server-side ranker:
      </p>
      <pre className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface p-4 font-mono text-xs leading-relaxed text-muted">
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
    </main>
  );
}
