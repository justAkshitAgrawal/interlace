import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  Command,
  CommandGroup,
  PaletteStatus,
  RankedCommand,
  RenderGroup,
} from "./types";
import { rankCommands } from "./fuzzy";

export interface UseCommandPaletteOptions {
  commands: Command[];
  groups?: CommandGroup[];
}

export function useCommandPalette(options: UseCommandPaletteOptions) {
  const { commands, groups = [] } = options;
  const [open, setOpenState] = useState(false);
  const [query, setQueryState] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
    if (!next) {
      setQueryState("");
      setActiveIndex(0);
    }
  }, []);

  const setQuery = useCallback((q: string) => {
    setQueryState(q);
    setActiveIndex(0); // reset highlight whenever the query changes
  }, []);

  const renderGroups = useMemo<RenderGroup[]>(
    () => buildGroups(commands, groups, query),
    [commands, groups, query],
  );

  // Flat, ordered list of visible items for index-based navigation.
  const flat = useMemo<RankedCommand[]>(
    () => renderGroups.flatMap((g) => g.items),
    [renderGroups],
  );

  const status = useMemo<PaletteStatus>(() => {
    if (commands.length === 0) return "empty";
    if (query === "") return "default";
    return flat.length > 0 ? "results" : "no-results";
  }, [commands.length, flat.length, query]);

  const clampedIndex = flat.length === 0 ? -1 : Math.min(activeIndex, flat.length - 1);
  const activeId = clampedIndex >= 0 ? flat[clampedIndex]!.command.id : null;

  const select = useCallback(
    (id: string) => {
      const cmd = flat.find((i) => i.command.id === id)?.command;
      if (!cmd) return;
      void cmd.onSelect?.();
    },
    [flat],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (flat.length === 0 && e.key !== "Escape") return;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((i) => (i + 1) % flat.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((i) => (i - 1 + flat.length) % flat.length);
          break;
        case "Enter":
          e.preventDefault();
          if (activeId) select(activeId);
          break;
        case "Escape":
          e.preventDefault();
          setOpen(false);
          break;
      }
    },
    [flat.length, activeId, select, setOpen],
  );

  const setActiveId = useCallback(
    (id: string) => {
      const idx = flat.findIndex((i) => i.command.id === id);
      if (idx >= 0) setActiveIndex(idx);
    },
    [flat],
  );

  return {
    open,
    setOpen,
    query,
    setQuery,
    status,
    groups: renderGroups,
    activeId,
    setActiveId,
    onKeyDown,
    select,
  };
}

function buildGroups(
  commands: Command[],
  groupDefs: CommandGroup[],
  query: string,
): RenderGroup[] {
  const ranked = rankCommands(commands, query);
  const byGroup = new Map<string, RenderGroup>();
  const order: string[] = [];
  const ensure = (id: string, label: string | null) => {
    if (!byGroup.has(id)) {
      byGroup.set(id, { id, label, items: [] });
      order.push(id);
    }
    return byGroup.get(id)!;
  };

  for (const g of groupDefs) ensure(g.id, g.label);

  for (const item of ranked) {
    const gid = item.command.group ?? "__ungrouped";
    const label =
      groupDefs.find((g) => g.id === gid)?.label ??
      (gid === "__ungrouped" ? null : gid);
    ensure(gid, label).items.push(item);
  }

  return order.map((id) => byGroup.get(id)!).filter((g) => g.items.length > 0);
}
