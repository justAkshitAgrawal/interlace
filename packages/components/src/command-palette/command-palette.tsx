"use client";

import { useEffect, useId, useRef } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import type { Command, CommandGroup } from "./types";
import { useCommandPalette } from "./use-command-palette";
import { DURATION, EASING, PANEL_SPRING } from "./motion";

export interface CommandPaletteProps {
  commands: Command[];
  groups?: CommandGroup[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeholder?: string;
  /** Disable the built-in ⌘K / Ctrl+K global shortcut (e.g. in demos). */
  disableShortcut?: boolean;
}

export function CommandPalette({
  commands,
  groups,
  open,
  onOpenChange,
  placeholder = "Type a command or search…",
  disableShortcut = false,
}: CommandPaletteProps) {
  const palette = useCommandPalette({ commands, groups, onOpenChange });
  const reduceMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const listId = useId();

  // Keep the hook's internal open state in sync with the controlled prop.
  useEffect(() => {
    if (palette.open !== open) palette.setOpen(open);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Global ⌘K / Ctrl+K toggle.
  useEffect(() => {
    if (disableShortcut) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        triggerRef.current = document.activeElement as HTMLElement;
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange, disableShortcut]);

  // Focus the input on open; restore focus to the trigger on close.
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else {
      triggerRef.current?.focus?.();
    }
  }, [open]);

  const motionOff = reduceMotion ?? false;
  const fade = motionOff
    ? { initial: false as const, animate: {}, exit: {} }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: DURATION.overlay, ease: EASING.inOut },
      };
  const panel = motionOff
    ? { initial: false as const, animate: {}, exit: {} }
    : {
        initial: { opacity: 0, scale: 0.98, y: 8 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.98, y: 8 },
        transition: PANEL_SPRING,
      };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          {...fade}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[18vh] backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
          aria-hidden={false}
        >
          <motion.div
            {...panel}
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-haspopup="listbox"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
          >
            {palette.pages.length > 1 && (
              <button
                type="button"
                onClick={() => palette.popPage()}
                className="flex items-center gap-1 px-4 pt-3 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                ← Back
              </button>
            )}
            <input
              ref={inputRef}
              value={palette.query}
              onChange={(e) => palette.setQuery(e.target.value)}
              onKeyDown={palette.onKeyDown}
              placeholder={placeholder}
              role="textbox"
              aria-autocomplete="list"
              aria-controls={listId}
              aria-activedescendant={
                palette.activeId ? `${listId}-${palette.activeId}` : undefined
              }
              className="w-full border-b border-zinc-200 bg-transparent px-4 py-3.5 text-sm outline-none placeholder:text-zinc-400 dark:border-zinc-800"
            />
            <ul
              id={listId}
              role="listbox"
              className="max-h-80 overflow-y-auto p-2"
            >
              {palette.status === "loading" && (
                <li className="px-3 py-6 text-center text-sm text-zinc-400">
                  Loading…
                </li>
              )}
              {palette.status === "error" && (
                <li className="px-3 py-6 text-center text-sm text-red-500">
                  {palette.error?.message ?? "Something went wrong."}{" "}
                  <button
                    type="button"
                    onClick={() => palette.retry()}
                    className="underline"
                  >
                    Retry
                  </button>
                </li>
              )}
              {palette.status === "no-results" && (
                <li className="px-3 py-6 text-center text-sm text-zinc-400">
                  No results for “{palette.query}”.
                </li>
              )}
              {palette.status === "empty" && (
                <li className="px-3 py-6 text-center text-sm text-zinc-400">
                  Nothing here yet.
                </li>
              )}
              {(palette.status === "default" || palette.status === "results") &&
                palette.groups.map((group) => (
                  <li key={group.id} role="presentation">
                    {group.label && (
                      <div className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                        {group.label}
                      </div>
                    )}
                    <ul role="presentation">
                      {group.items.map((item) => {
                        const active = item.command.id === palette.activeId;
                        return (
                          <li
                            key={item.command.id}
                            id={`${listId}-${item.command.id}`}
                            role="option"
                            aria-selected={active}
                            onMouseEnter={() =>
                              palette.setActiveId(item.command.id)
                            }
                            onClick={() => palette.select(item.command.id)}
                            className={[
                              "flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm",
                              active
                                ? "bg-zinc-100 dark:bg-zinc-800"
                                : "text-zinc-700 dark:text-zinc-300",
                            ].join(" ")}
                          >
                            {item.command.icon}
                            <Highlight
                              text={item.command.label}
                              indices={item.matchedIndices}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Highlight({
  text,
  indices,
}: {
  text: string;
  indices: number[];
}) {
  if (indices.length === 0) return <span>{text}</span>;
  const set = new Set(indices);
  return (
    <span>
      {text.split("").map((ch, i) =>
        set.has(i) ? (
          <mark
            key={i}
            className="bg-transparent font-semibold text-zinc-900 dark:text-white"
          >
            {ch}
          </mark>
        ) : (
          <span key={i}>{ch}</span>
        ),
      )}
    </span>
  );
}
