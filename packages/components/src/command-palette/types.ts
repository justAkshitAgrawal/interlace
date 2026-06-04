import type { ReactNode } from "react";

/** A resolver returns child commands for a nested page. */
export type ChildResolver =
  | Command[]
  | ((query: string) => Promise<Command[]>);

export interface Command {
  id: string;
  label: string;
  /** Extra terms that should match fuzzy search but aren't shown. */
  keywords?: string[];
  /** Shortcut hint shown right-aligned on the row. Display-only; not bound to keys. */
  shortcut?: string[];
  /** Group id this command belongs to. Ungrouped if omitted. */
  group?: string;
  icon?: ReactNode;
  /** Invoked when the command is selected and has no children. */
  onSelect?: () => void | Promise<void>;
  /** If present, selecting pushes a nested page instead of running onSelect. */
  children?: ChildResolver;
}

export interface CommandGroup {
  id: string;
  label: string;
}

export type PaletteStatus =
  | "default"
  | "results"
  | "no-results"
  | "loading"
  | "error"
  | "empty";

/** One frame on the navigation stack (root or a nested page). */
export interface Page {
  /** null for the root page. */
  parentCommandId: string | null;
  title: string | null;
  /** Static commands for this page (root commands, or resolved children). */
  commands: Command[];
}

/** A group with its matched, ranked items, ready to render. */
export interface RenderGroup {
  id: string;
  label: string | null;
  items: RankedCommand[];
}

export interface RankedCommand {
  command: Command;
  /** Char indices in `label` that matched, for highlighting. */
  matchedIndices: number[];
}

/** Filters + orders commands and reports match indices. The single ranking surface. */
export type RankFn = (
  commands: Command[],
  query: string,
  recents?: string[],
) => RankedCommand[];
