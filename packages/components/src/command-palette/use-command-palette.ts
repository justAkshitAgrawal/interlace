import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ChildResolver,
  Command,
  CommandGroup,
  Page,
  PaletteStatus,
  RankedCommand,
  RankFn,
  RenderGroup,
} from "./types";
import { rankCommands } from "./fuzzy";

export interface UseCommandPaletteOptions {
  commands: Command[];
  groups?: CommandGroup[];
  /** Notified whenever the hook changes its open state (e.g. Escape at root). */
  onOpenChange?: (open: boolean) => void;
  /** Opens the palette pre-filtered with this query. */
  defaultQuery?: string;
  /** Ordered ids, most-recent-first. Boosts these in the built-in ranking. */
  recents?: string[];
  /** Fired for every command selection (top-level, nested, async, page-push). */
  onSelectCommand?: (id: string, command: Command) => void;
  /** Override the ranking function. Defaults to the built-in rankCommands. */
  rank?: RankFn;
}

interface AsyncState {
  /** Request id this async page is waiting on, or null if not loading. */
  pendingReqId: number | null;
  error: Error | null;
  /** The resolver to (re)run for the current async page. */
  resolver: ChildResolver | null;
  /** True once an async resolver has successfully filled the current page. */
  resolved: boolean;
}

export function useCommandPalette(options: UseCommandPaletteOptions) {
  const { commands, groups = [], onOpenChange, defaultQuery, recents, onSelectCommand, rank } = options;
  const rootPage = useMemo<Page>(
    () => ({ parentCommandId: null, title: null, commands }),
    [commands],
  );

  const [open, setOpenState] = useState(false);
  const [query, setQueryState] = useState(defaultQuery ?? "");
  const [activeIndex, setActiveIndex] = useState(0);
  const [stack, setStack] = useState<Page[]>([rootPage]);
  const [asyncState, setAsyncState] = useState<AsyncState>({
    pendingReqId: null,
    error: null,
    resolver: null,
    resolved: false,
  });

  // Monotonic request counter; ref so it survives renders without re-triggering effects.
  const reqCounter = useRef(0);

  const currentPage = stack[stack.length - 1] ?? rootPage;

  const resetToRoot = useCallback(() => {
    reqCounter.current++;
    setQueryState(defaultQuery ?? "");
    setActiveIndex(0);
    setStack([rootPage]);
    setAsyncState({ pendingReqId: null, error: null, resolver: null, resolved: false });
  }, [rootPage, defaultQuery]);

  const setOpen = useCallback(
    (next: boolean) => {
      setOpenState(next);
      if (!next) resetToRoot();
      onOpenChange?.(next);
    },
    [resetToRoot, onOpenChange],
  );

  const setQuery = useCallback((q: string) => {
    setQueryState(q);
    setActiveIndex(0);
  }, []);

  const popPage = useCallback(() => {
    reqCounter.current++;
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
    setQueryState("");
    setActiveIndex(0);
    setAsyncState({ pendingReqId: null, error: null, resolver: null, resolved: false });
  }, []);

  /** Kick off (or re-run) an async resolver, registering a fresh request id. */
  const runResolver = useCallback((resolver: (q: string) => Promise<Command[]>) => {
    const reqId = ++reqCounter.current;
    setAsyncState({ pendingReqId: reqId, error: null, resolver, resolved: false });
    setStack((s) => [
      ...s,
      { parentCommandId: null, title: null, commands: [] },
    ]);
    setQueryState("");
    setActiveIndex(0);

    resolver("")
      .then((children) => {
        if (reqCounter.current !== reqId) return; // stale → ignore
        setAsyncState({ pendingReqId: null, error: null, resolver, resolved: true });
        setStack((s) => {
          const next = [...s];
          next[next.length - 1] = {
            parentCommandId: null,
            title: null,
            commands: children,
          };
          return next;
        });
      })
      .catch((err: unknown) => {
        if (reqCounter.current !== reqId) return; // stale → ignore
        setAsyncState({
          pendingReqId: null,
          error: err instanceof Error ? err : new Error(String(err)),
          resolver,
          resolved: false,
        });
      });
  }, []);

  const pushStaticPage = useCallback((page: Page) => {
    setStack((s) => [...s, page]);
    setQueryState("");
    setActiveIndex(0);
    setAsyncState({ pendingReqId: null, error: null, resolver: null, resolved: false });
  }, []);

  const renderGroups = useMemo<RenderGroup[]>(
    () => buildGroups(currentPage.commands, groups, query, recents, rank),
    [currentPage.commands, groups, query, recents, rank],
  );

  const flat = useMemo<RankedCommand[]>(
    () => renderGroups.flatMap((g) => g.items),
    [renderGroups],
  );

  const status = useMemo<PaletteStatus>(() => {
    if (asyncState.pendingReqId !== null) return "loading";
    if (asyncState.error) return "error";
    if (currentPage.commands.length === 0 && stack.length === 1) {
      // Only the root page being empty counts as the "empty" state.
      return commands.length === 0 ? "empty" : "default";
    }
    if (currentPage.commands.length === 0) return "empty";
    // A freshly-resolved async page reports results even with an empty query.
    if (asyncState.resolved && flat.length > 0) return "results";
    if (query === "") return "default";
    return flat.length > 0 ? "results" : "no-results";
  }, [asyncState.pendingReqId, asyncState.error, asyncState.resolved, currentPage.commands.length, stack.length, commands.length, query, flat.length]);

  const clampedIndex = flat.length === 0 ? -1 : Math.min(activeIndex, flat.length - 1);
  const activeId = clampedIndex >= 0 ? flat[clampedIndex]!.command.id : null;

  const select = useCallback(
    (id: string) => {
      const cmd = flat.find((i) => i.command.id === id)?.command;
      if (!cmd) return;
      onSelectCommand?.(id, cmd);
      if (typeof cmd.children === "function") {
        runResolver(cmd.children);
        return;
      }
      if (Array.isArray(cmd.children)) {
        pushStaticPage({
          parentCommandId: cmd.id,
          title: cmd.label,
          commands: cmd.children,
        });
        return;
      }
      void cmd.onSelect?.();
    },
    [flat, runResolver, pushStaticPage, onSelectCommand],
  );

  const retry = useCallback(() => {
    if (typeof asyncState.resolver === "function") {
      // Drop the failed placeholder page first, then re-run.
      setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
      runResolver(asyncState.resolver);
    }
  }, [asyncState.resolver, runResolver]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          if (flat.length === 0) return;
          e.preventDefault();
          setActiveIndex((i) => (i + 1) % flat.length);
          break;
        case "ArrowUp":
          if (flat.length === 0) return;
          e.preventDefault();
          setActiveIndex((i) => (i - 1 + flat.length) % flat.length);
          break;
        case "Enter":
          e.preventDefault();
          if (activeId) select(activeId);
          break;
        case "Escape":
          e.preventDefault();
          if (stack.length > 1) popPage();
          else setOpen(false);
          break;
      }
    },
    [flat.length, activeId, select, stack.length, popPage, setOpen],
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
    pages: stack,
    popPage,
    error: asyncState.error,
    retry,
  };
}

function buildGroups(
  commands: Command[],
  groupDefs: CommandGroup[],
  query: string,
  recents: string[] | undefined,
  rank: RankFn | undefined,
): RenderGroup[] {
  const ranker = rank ?? rankCommands;
  const ranked = ranker(commands, query, recents);
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
