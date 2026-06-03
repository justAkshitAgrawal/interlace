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
