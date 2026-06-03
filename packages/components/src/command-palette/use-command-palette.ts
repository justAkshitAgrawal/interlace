import { useCallback, useMemo, useState } from "react";
import type {
  Command,
  CommandGroup,
  PaletteStatus,
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
  const [query, setQuery] = useState("");

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
    if (!next) setQuery("");
  }, []);

  const renderGroups = useMemo<RenderGroup[]>(
    () => buildGroups(commands, groups, query),
    [commands, groups, query],
  );

  const status = useMemo<PaletteStatus>(() => {
    if (commands.length === 0) return "empty";
    const hasItems = renderGroups.some((g) => g.items.length > 0);
    if (query === "") return "default";
    return hasItems ? "results" : "no-results";
  }, [commands.length, renderGroups, query]);

  return { open, setOpen, query, setQuery, status, groups: renderGroups };
}

function buildGroups(
  commands: Command[],
  groupDefs: CommandGroup[],
  query: string,
): RenderGroup[] {
  const ranked = rankCommands(commands, query);

  // Bucket ranked commands by group id, preserving rank order within a bucket.
  const byGroup = new Map<string, RenderGroup>();
  const order: string[] = [];
  const ensure = (id: string, label: string | null) => {
    if (!byGroup.has(id)) {
      byGroup.set(id, { id, label, items: [] });
      order.push(id);
    }
    return byGroup.get(id)!;
  };

  // Seed defined groups first so they keep their declared order.
  for (const g of groupDefs) ensure(g.id, g.label);

  for (const item of ranked) {
    const gid = item.command.group ?? "__ungrouped";
    const label =
      groupDefs.find((g) => g.id === gid)?.label ??
      (gid === "__ungrouped" ? null : gid);
    ensure(gid, label).items.push(item);
  }

  return order
    .map((id) => byGroup.get(id)!)
    .filter((g) => g.items.length > 0);
}
