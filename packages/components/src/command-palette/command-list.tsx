"use client";

import { useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { RenderGroup } from "./types";

/** Scrollable list container styling, incl. a thin, themed scrollbar so the
 *  default chunky browser chrome doesn't clash with the palette. Firefox uses
 *  `scrollbar-*`; Chromium/WebKit use the `::-webkit-scrollbar` pseudo-elements. */
const SCROLL_AREA =
  "max-h-80 overflow-y-auto p-2 " +
  "[scrollbar-width:thin] [scrollbar-color:theme(colors.zinc.300)_transparent] " +
  "dark:[scrollbar-color:theme(colors.zinc.700)_transparent] " +
  "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent " +
  "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300 " +
  "dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700 " +
  "[&::-webkit-scrollbar-thumb]:hover:bg-zinc-400 dark:[&::-webkit-scrollbar-thumb]:hover:bg-zinc-600";

/** Above this many flat rows (headers + items), switch to virtualization. */
const VIRTUALIZE_THRESHOLD = 100;
/** Estimated row height (px) for the virtualizer; matches the py-2 option rows. */
const ROW_HEIGHT = 36;
/** Viewport height (px) used to size the window; matches the list's `max-h-80`. */
const VIEWPORT_HEIGHT = 320;

export interface CommandListProps {
  listId: string;
  groups: RenderGroup[];
  activeId: string | null;
  onActivate: (id: string) => void;
  onSelect: (id: string) => void;
}

type Row =
  | { kind: "header"; key: string; label: string }
  | {
      kind: "item";
      key: string;
      id: string;
      label: string;
      icon: React.ReactNode;
      shortcut?: string[];
      matchedIndices: number[];
    };

function flattenRows(groups: RenderGroup[]): Row[] {
  const rows: Row[] = [];
  for (const group of groups) {
    if (group.label) {
      rows.push({ kind: "header", key: `h-${group.id}`, label: group.label });
    }
    for (const item of group.items) {
      rows.push({
        kind: "item",
        key: item.command.id,
        id: item.command.id,
        label: item.command.label,
        icon: item.command.icon,
        shortcut: item.command.shortcut,
        matchedIndices: item.matchedIndices,
      });
    }
  }
  return rows;
}

export function CommandList({
  listId,
  groups,
  activeId,
  onActivate,
  onSelect,
}: CommandListProps) {
  const rows = flattenRows(groups);
  if (rows.length > VIRTUALIZE_THRESHOLD) {
    return (
      <VirtualList
        listId={listId}
        rows={rows}
        activeId={activeId}
        onActivate={onActivate}
        onSelect={onSelect}
      />
    );
  }
  return (
    <ul id={listId} role="listbox" className={SCROLL_AREA}>
      {rows.map((row) =>
        row.kind === "header" ? (
          <li
            key={row.key}
            role="presentation"
            className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400"
          >
            {row.label}
          </li>
        ) : (
          <Item
            key={row.key}
            listId={listId}
            row={row}
            active={row.id === activeId}
            onActivate={onActivate}
            onSelect={onSelect}
          />
        ),
      )}
    </ul>
  );
}

function VirtualList({
  listId,
  rows,
  activeId,
  onActivate,
  onSelect,
}: {
  listId: string;
  rows: Row[];
  activeId: string | null;
  onActivate: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
    initialRect: { width: 320, height: VIEWPORT_HEIGHT },
    // The list is capped at `max-h-80` (320px). Some environments (and any
    // layout-less DOM) report a 0px measured height, which would collapse the
    // window to nothing; clamp to the known viewport so a sensible range is
    // always computed. Real browsers report their true size and are unaffected.
    observeElementRect: (instance, cb) => {
      const element = instance.scrollElement;
      if (!element) return;
      const win = instance.targetWindow;
      const emit = () => {
        const rect = element.getBoundingClientRect();
        cb({
          width: Math.round(rect.width) || 320,
          height: Math.round(rect.height) || VIEWPORT_HEIGHT,
        });
      };
      emit();
      if (!win?.ResizeObserver) return;
      const observer = new win.ResizeObserver(() => emit());
      observer.observe(element);
      return () => observer.unobserve(element);
    },
  });

  const activeIndex = rows.findIndex((r) => r.kind === "item" && r.id === activeId);
  // Keep the active row scrolled into view (effect, not during render).
  useEffect(() => {
    if (activeIndex >= 0) virtualizer.scrollToIndex(activeIndex);
  }, [activeIndex, virtualizer]);

  // The virtualized rows are absolutely positioned inside a sized spacer, so
  // this path uses role-annotated <div>s rather than <ul>/<li> — a <div> spacer
  // is not a valid child of <ul>, and the option <div>s carry role="option".
  return (
    <div
      ref={parentRef}
      id={listId}
      role="listbox"
      className={SCROLL_AREA}
    >
      <div
        role="presentation"
        style={{ height: virtualizer.getTotalSize(), position: "relative" }}
      >
        {virtualizer.getVirtualItems().map((vi) => {
          const row = rows[vi.index]!;
          const style: React.CSSProperties = {
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            transform: `translateY(${vi.start}px)`,
          };
          return row.kind === "header" ? (
            <div
              key={row.key}
              role="presentation"
              style={style}
              className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400"
            >
              {row.label}
            </div>
          ) : (
            <Item
              key={row.key}
              as="div"
              listId={listId}
              row={row}
              active={row.id === activeId}
              onActivate={onActivate}
              onSelect={onSelect}
              style={style}
            />
          );
        })}
      </div>
    </div>
  );
}

function Item({
  as: Tag = "li",
  listId,
  row,
  active,
  onActivate,
  onSelect,
  style,
}: {
  /** Element to render as. Plain list uses <li>; the virtualized list uses
   *  <div> so the absolutely-positioned rows are valid children of a
   *  role="listbox" container (a <div> is not a valid child of <ul>). */
  as?: "li" | "div";
  listId: string;
  row: Extract<Row, { kind: "item" }>;
  active: boolean;
  onActivate: (id: string) => void;
  onSelect: (id: string) => void;
  style?: React.CSSProperties;
}) {
  return (
    <Tag
      id={`${listId}-${row.id}`}
      role="option"
      aria-selected={active}
      style={style}
      onMouseEnter={() => onActivate(row.id)}
      onClick={() => onSelect(row.id)}
      className={[
        "flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm",
        active ? "bg-zinc-100 dark:bg-zinc-800" : "text-zinc-700 dark:text-zinc-300",
      ].join(" ")}
    >
      {row.icon}
      <Highlight text={row.label} indices={row.matchedIndices} />
      {row.shortcut && (
        <span className="ml-auto flex items-center gap-1">
          {row.shortcut.map((token, i) => (
            <kbd
              key={i}
              className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
            >
              {token}
            </kbd>
          ))}
        </span>
      )}
    </Tag>
  );
}

function Highlight({ text, indices }: { text: string; indices: number[] }) {
  if (indices.length === 0) return <span>{text}</span>;
  const set = new Set(indices);
  return (
    <span>
      {text.split("").map((ch, i) =>
        set.has(i) ? (
          <mark key={i} className="bg-transparent font-semibold text-zinc-900 dark:text-white">
            {ch}
          </mark>
        ) : (
          <span key={i}>{ch}</span>
        ),
      )}
    </span>
  );
}
