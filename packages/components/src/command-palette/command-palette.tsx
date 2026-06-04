"use client";

import { useEffect, useId, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Command, CommandGroup, RankFn } from "./types";
import { useCommandPalette } from "./use-command-palette";
import { CommandList } from "./command-list";
import { DURATION, EASING, PANEL_SPRING } from "./motion";

/** Scrollable status-message container; thin themed scrollbar to match the list. */
const SCROLL_AREA =
  "max-h-80 overflow-y-auto p-2 " +
  "[scrollbar-width:thin] [scrollbar-color:theme(colors.zinc.300)_transparent] " +
  "dark:[scrollbar-color:theme(colors.zinc.700)_transparent] " +
  "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent " +
  "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300 " +
  "dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700";

export interface CommandPaletteProps {
  commands: Command[];
  groups?: CommandGroup[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeholder?: string;
  /** Disable the built-in ⌘K / Ctrl+K global shortcut (e.g. in demos). */
  disableShortcut?: boolean;
  /** Opens the palette pre-filtered with this query. */
  defaultQuery?: string;
  /** Ordered ids, most-recent-first. Boosts these in ranking. */
  recents?: string[];
  /** Fired for every command selection. */
  onSelectCommand?: (id: string, command: Command) => void;
  /** Override the ranking function. Defaults to the built-in matcher. */
  rank?: RankFn;
}

export function CommandPalette({
  commands,
  groups,
  open,
  onOpenChange,
  placeholder = "Type a command or search…",
  disableShortcut = false,
  defaultQuery,
  recents,
  onSelectCommand,
  rank,
}: CommandPaletteProps) {
  const palette = useCommandPalette({
    commands,
    groups,
    onOpenChange,
    defaultQuery,
    recents,
    onSelectCommand,
    rank,
  });
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
  // preventScroll: the overlay is fixed + centered, so focusing must not yank
  // the page (e.g. a palette that opens on mount would otherwise scroll to it).
  useEffect(() => {
    if (open) {
      inputRef.current?.focus({ preventScroll: true });
    } else {
      triggerRef.current?.focus?.({ preventScroll: true });
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
            {palette.status === "loading" && (
              <ul
                id={listId}
                role="listbox"
                className={SCROLL_AREA}
              >
                <li className="px-3 py-6 text-center text-sm text-zinc-400">
                  Loading…
                </li>
              </ul>
            )}
            {palette.status === "error" && (
              <ul
                id={listId}
                role="listbox"
                className={SCROLL_AREA}
              >
                <li className="flex flex-col items-center gap-3 px-3 py-8 text-center">
                  <span className="text-sm text-red-500 dark:text-red-400">
                    {palette.error?.message ?? "Something went wrong."}
                  </span>
                  <button
                    type="button"
                    onClick={() => palette.retry()}
                    className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Retry
                  </button>
                </li>
              </ul>
            )}
            {palette.status === "no-results" && (
              <ul
                id={listId}
                role="listbox"
                className={SCROLL_AREA}
              >
                <li className="px-3 py-6 text-center text-sm text-zinc-400">
                  No results for “{palette.query}”.
                </li>
              </ul>
            )}
            {palette.status === "empty" && (
              <ul
                id={listId}
                role="listbox"
                className={SCROLL_AREA}
              >
                <li className="px-3 py-6 text-center text-sm text-zinc-400">
                  Nothing here yet.
                </li>
              </ul>
            )}
            {(palette.status === "default" || palette.status === "results") && (
              <CommandList
                listId={listId}
                groups={palette.groups}
                activeId={palette.activeId}
                onActivate={palette.setActiveId}
                onSelect={palette.select}
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
