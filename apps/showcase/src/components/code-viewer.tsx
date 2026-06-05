"use client";

import { useState } from "react";

export interface SourceFile {
  path: string;
  content: string;
}

/*
 * Tabbed viewer for the component's real source — the exact files `shadcn add`
 * drops into your repo. Fed straight from the registry artifact so docs can't
 * drift from what ships. Each file is copyable on its own.
 */
export function CodeViewer({ files }: { files: SourceFile[] }) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const file = files[active];

  if (!file) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <div
        role="tablist"
        aria-label="Source files"
        className="flex items-center gap-1 overflow-x-auto border-b border-line bg-surface px-2 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {files.map((f, i) => {
          const name = f.path.split("/").pop() ?? f.path;
          const selected = i === active;
          return (
            <button
              key={f.path}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => {
                setActive(i);
                setCopied(false);
              }}
              className={[
                "whitespace-nowrap rounded-md px-3 py-1.5 font-mono text-xs transition-colors",
                selected
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:bg-surface-2 hover:text-ink",
              ].join(" ")}
            >
              {name}
            </button>
          );
        })}
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={handleCopy}
          className={[
            "absolute right-3 top-3 z-10 rounded-md border px-2.5 py-1 font-mono text-xs transition-colors",
            copied
              ? "border-accent-soft text-accent"
              : "border-line bg-bg/80 text-faint backdrop-blur hover:text-ink",
          ].join(" ")}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
        <pre className="max-h-[480px] overflow-auto bg-bg p-4 font-mono text-xs leading-relaxed text-muted">
          <code>{file.content}</code>
        </pre>
      </div>
    </div>
  );
}
