"use client";

import { useState } from "react";

const INSTALL = "npx shadcn@latest add https://palettekit.dev/r/command-palette.json";

export function InstallCommand() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(INSTALL);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="group flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 font-mono text-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <span className="text-zinc-400">$</span>
      <span className="truncate">{INSTALL}</span>
      <span className="ml-auto text-xs text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300">
        {copied ? "Copied!" : "Copy"}
      </span>
    </button>
  );
}
