"use client";

import { useState } from "react";

const INSTALL =
  "npx shadcn@latest add https://interlace.akshitagrawal.dev/r/command-palette.json";

export function InstallCommand() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(INSTALL);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Copy install command"
      className="group flex w-full max-w-md items-center gap-3 rounded-lg border border-line bg-bg px-4 py-3 font-mono text-sm transition-colors hover:border-line-strong"
    >
      <span className="text-accent">$</span>
      <span className="truncate text-ink">{INSTALL}</span>
      <span className="ml-auto shrink-0 text-xs text-faint transition-colors group-hover:text-muted">
        {copied ? "Copied!" : "Copy"}
      </span>
    </button>
  );
}
