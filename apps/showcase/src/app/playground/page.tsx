import { StateExplorer } from "@/components/state-explorer";

export default function Playground() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight">Playground</h1>
      <p className="mt-3 max-w-xl text-zinc-500">
        Step through every state of the palette — including the ones that
        normally flash by too fast to see.
      </p>
      <div className="mt-12">
        <StateExplorer />
      </div>
    </main>
  );
}
