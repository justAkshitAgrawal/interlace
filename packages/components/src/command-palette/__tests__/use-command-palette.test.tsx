import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCommandPalette } from "../use-command-palette";
import type { Command } from "../types";

const commands: Command[] = [
  { id: "new", label: "New File", group: "actions" },
  { id: "open", label: "Open File", group: "actions" },
  { id: "settings", label: "Settings", group: "nav" },
];
const groups = [
  { id: "actions", label: "Actions" },
  { id: "nav", label: "Navigation" },
];

describe("useCommandPalette: open/close + query", () => {
  it("starts closed with an empty query", () => {
    const { result } = renderHook(() => useCommandPalette({ commands, groups }));
    expect(result.current.open).toBe(false);
    expect(result.current.query).toBe("");
  });

  it("opens and closes", () => {
    const { result } = renderHook(() => useCommandPalette({ commands, groups }));
    act(() => result.current.setOpen(true));
    expect(result.current.open).toBe(true);
    act(() => result.current.setOpen(false));
    expect(result.current.open).toBe(false);
  });

  it("resets the query when closed", () => {
    const { result } = renderHook(() => useCommandPalette({ commands, groups }));
    act(() => result.current.setOpen(true));
    act(() => result.current.setQuery("set"));
    expect(result.current.query).toBe("set");
    act(() => result.current.setOpen(false));
    expect(result.current.query).toBe("");
  });
});

describe("useCommandPalette: groups + status", () => {
  it("status is 'default' when open with an empty query", () => {
    const { result } = renderHook(() => useCommandPalette({ commands, groups }));
    act(() => result.current.setOpen(true));
    expect(result.current.status).toBe("default");
  });

  it("groups all commands under their labels for an empty query", () => {
    const { result } = renderHook(() => useCommandPalette({ commands, groups }));
    act(() => result.current.setOpen(true));
    expect(result.current.groups.map((g) => g.id)).toEqual(["actions", "nav"]);
    expect(result.current.groups[0]!.items.map((i) => i.command.id)).toEqual([
      "new",
      "open",
    ]);
  });

  it("status is 'results' and groups filter when query matches", () => {
    const { result } = renderHook(() => useCommandPalette({ commands, groups }));
    act(() => result.current.setOpen(true));
    act(() => result.current.setQuery("set"));
    expect(result.current.status).toBe("results");
    const ids = result.current.groups.flatMap((g) => g.items.map((i) => i.command.id));
    expect(ids).toEqual(["settings"]);
  });

  it("hides groups that have no matches", () => {
    const { result } = renderHook(() => useCommandPalette({ commands, groups }));
    act(() => result.current.setOpen(true));
    act(() => result.current.setQuery("set"));
    expect(result.current.groups.map((g) => g.id)).toEqual(["nav"]);
  });

  it("status is 'no-results' when nothing matches", () => {
    const { result } = renderHook(() => useCommandPalette({ commands, groups }));
    act(() => result.current.setOpen(true));
    act(() => result.current.setQuery("zzzzz"));
    expect(result.current.status).toBe("no-results");
    expect(result.current.groups).toHaveLength(0);
  });

  it("status is 'empty' when there are no commands at all", () => {
    const { result } = renderHook(() => useCommandPalette({ commands: [], groups }));
    act(() => result.current.setOpen(true));
    expect(result.current.status).toBe("empty");
  });
});

function key(k: string, extra: Partial<KeyboardEvent> = {}) {
  return {
    key: k,
    preventDefault: vi.fn(),
    ...extra,
  } as unknown as React.KeyboardEvent;
}

describe("useCommandPalette: keyboard nav", () => {
  it("activates the first visible item by default", () => {
    const { result } = renderHook(() => useCommandPalette({ commands, groups }));
    act(() => result.current.setOpen(true));
    expect(result.current.activeId).toBe("new");
  });

  it("ArrowDown moves to the next flat item across groups", () => {
    const { result } = renderHook(() => useCommandPalette({ commands, groups }));
    act(() => result.current.setOpen(true));
    act(() => result.current.onKeyDown(key("ArrowDown"))); // new -> open
    expect(result.current.activeId).toBe("open");
    act(() => result.current.onKeyDown(key("ArrowDown"))); // open -> settings
    expect(result.current.activeId).toBe("settings");
  });

  it("ArrowDown wraps from last to first", () => {
    const { result } = renderHook(() => useCommandPalette({ commands, groups }));
    act(() => result.current.setOpen(true));
    act(() => result.current.onKeyDown(key("ArrowDown")));
    act(() => result.current.onKeyDown(key("ArrowDown")));
    act(() => result.current.onKeyDown(key("ArrowDown"))); // wrap
    expect(result.current.activeId).toBe("new");
  });

  it("ArrowUp wraps from first to last", () => {
    const { result } = renderHook(() => useCommandPalette({ commands, groups }));
    act(() => result.current.setOpen(true));
    act(() => result.current.onKeyDown(key("ArrowUp")));
    expect(result.current.activeId).toBe("settings");
  });

  it("active item resets to first when the query changes", () => {
    const { result } = renderHook(() => useCommandPalette({ commands, groups }));
    act(() => result.current.setOpen(true));
    act(() => result.current.onKeyDown(key("ArrowDown")));
    act(() => result.current.setQuery("o")); // matches "New File"(o? no) -> "Open File"
    expect(result.current.activeId).toBe(result.current.groups[0]!.items[0]!.command.id);
  });

  it("Enter runs the active command's onSelect", () => {
    const onSelect = vi.fn();
    const cmds: Command[] = [{ id: "go", label: "Go", onSelect }];
    const { result } = renderHook(() => useCommandPalette({ commands: cmds }));
    act(() => result.current.setOpen(true));
    act(() => result.current.onKeyDown(key("Enter")));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("Escape closes the palette", () => {
    const { result } = renderHook(() => useCommandPalette({ commands, groups }));
    act(() => result.current.setOpen(true));
    act(() => result.current.onKeyDown(key("Escape")));
    expect(result.current.open).toBe(false);
  });
});

describe("useCommandPalette: nested pages (static children)", () => {
  const nested: Command[] = [
    {
      id: "status",
      label: "Change status",
      children: [
        { id: "todo", label: "Todo" },
        { id: "done", label: "Done" },
      ],
    },
    { id: "rename", label: "Rename" },
  ];

  it("selecting a command with children pushes a page", () => {
    const { result } = renderHook(() => useCommandPalette({ commands: nested }));
    act(() => result.current.setOpen(true));
    act(() => result.current.select("status"));
    expect(result.current.pages).toHaveLength(2); // root + status
    const ids = result.current.groups.flatMap((g) => g.items.map((i) => i.command.id));
    expect(ids).toEqual(["todo", "done"]);
  });

  it("pushing a page clears the query and resets the active item", () => {
    const { result } = renderHook(() => useCommandPalette({ commands: nested }));
    act(() => result.current.setOpen(true));
    act(() => result.current.setQuery("stat"));
    act(() => result.current.select("status"));
    expect(result.current.query).toBe("");
    expect(result.current.activeId).toBe("todo");
  });

  it("popPage returns to the parent page", () => {
    const { result } = renderHook(() => useCommandPalette({ commands: nested }));
    act(() => result.current.setOpen(true));
    act(() => result.current.select("status"));
    act(() => result.current.popPage());
    expect(result.current.pages).toHaveLength(1);
    const ids = result.current.groups.flatMap((g) => g.items.map((i) => i.command.id));
    expect(ids).toEqual(["status", "rename"]);
  });

  it("Escape pops a nested page instead of closing, then closes at root", () => {
    const { result } = renderHook(() => useCommandPalette({ commands: nested }));
    act(() => result.current.setOpen(true));
    act(() => result.current.select("status"));
    act(() => result.current.onKeyDown(key("Escape"))); // pops
    expect(result.current.open).toBe(true);
    expect(result.current.pages).toHaveLength(1);
    act(() => result.current.onKeyDown(key("Escape"))); // closes
    expect(result.current.open).toBe(false);
  });

  it("closing resets the navigation stack to root", () => {
    const { result } = renderHook(() => useCommandPalette({ commands: nested }));
    act(() => result.current.setOpen(true));
    act(() => result.current.select("status"));
    act(() => result.current.setOpen(false));
    act(() => result.current.setOpen(true));
    expect(result.current.pages).toHaveLength(1);
  });
});

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useCommandPalette: async children", () => {
  it("enters 'loading' while an async child resolver is pending", async () => {
    const d = deferred<Command[]>();
    const cmds: Command[] = [
      { id: "people", label: "Assign person", children: () => d.promise },
    ];
    const { result } = renderHook(() => useCommandPalette({ commands: cmds }));
    act(() => result.current.setOpen(true));
    act(() => result.current.select("people"));
    expect(result.current.status).toBe("loading");

    await act(async () => {
      d.resolve([{ id: "alice", label: "Alice" }]);
      await d.promise;
    });

    await waitFor(() => expect(result.current.status).toBe("results"));
    const ids = result.current.groups.flatMap((g) => g.items.map((i) => i.command.id));
    expect(ids).toEqual(["alice"]);
  });

  it("drops a stale async response when a newer request supersedes it", async () => {
    const first = deferred<Command[]>();
    const second = deferred<Command[]>();
    let call = 0;
    const cmds: Command[] = [
      {
        id: "people",
        label: "Assign person",
        children: () => (call++ === 0 ? first.promise : second.promise),
      },
    ];
    const { result } = renderHook(() => useCommandPalette({ commands: cmds }));
    act(() => result.current.setOpen(true));
    act(() => result.current.select("people")); // request #1 (pending)
    act(() => result.current.popPage());
    act(() => result.current.select("people")); // request #2 (pending)

    await act(async () => {
      second.resolve([{ id: "bob", label: "Bob" }]);
      first.resolve([{ id: "STALE", label: "Stale" }]); // resolves later, must be ignored
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.status).toBe("results"));
    const ids = result.current.groups.flatMap((g) => g.items.map((i) => i.command.id));
    expect(ids).toEqual(["bob"]);
  });

  it("enters 'error' when an async resolver rejects, and retry re-runs it", async () => {
    let call = 0;
    const ok = deferred<Command[]>();
    const cmds: Command[] = [
      {
        id: "people",
        label: "Assign person",
        children: () =>
          call++ === 0 ? Promise.reject(new Error("boom")) : ok.promise,
      },
    ];
    const { result } = renderHook(() => useCommandPalette({ commands: cmds }));
    act(() => result.current.setOpen(true));
    act(() => result.current.select("people"));

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error?.message).toBe("boom");

    act(() => result.current.retry());
    await act(async () => {
      ok.resolve([{ id: "carol", label: "Carol" }]);
      await ok.promise;
    });
    await waitFor(() => expect(result.current.status).toBe("results"));
  });

  it("ignores a pending async response after the palette is closed", async () => {
    const d = deferred<Command[]>();
    const cmds: Command[] = [
      { id: "root-a", label: "Root A" },
      { id: "people", label: "Assign person", children: () => d.promise },
    ];
    const { result } = renderHook(() => useCommandPalette({ commands: cmds }));
    act(() => result.current.setOpen(true));
    act(() => result.current.select("people")); // async request in flight
    expect(result.current.status).toBe("loading");

    act(() => result.current.setOpen(false)); // close while pending

    // The stale resolution arrives after close — it must be ignored.
    await act(async () => {
      d.resolve([{ id: "STALE", label: "Stale" }]);
      await d.promise;
    });

    // Reopen: root page must be intact, not overwritten by the stale children.
    act(() => result.current.setOpen(true));
    const ids = result.current.groups.flatMap((g) => g.items.map((i) => i.command.id));
    expect(ids).toEqual(["root-a", "people"]);
    expect(result.current.status).toBe("default");
  });

  it("ignores a pending async response after popPage", async () => {
    const d = deferred<Command[]>();
    const cmds: Command[] = [
      { id: "root-a", label: "Root A" },
      { id: "people", label: "Assign person", children: () => d.promise },
    ];
    const { result } = renderHook(() => useCommandPalette({ commands: cmds }));
    act(() => result.current.setOpen(true));
    act(() => result.current.select("people")); // async request in flight (pushes placeholder)
    act(() => result.current.popPage()); // abandon it, back to root

    await act(async () => {
      d.resolve([{ id: "STALE", label: "Stale" }]);
      await d.promise;
    });

    const ids = result.current.groups.flatMap((g) => g.items.map((i) => i.command.id));
    expect(ids).toEqual(["root-a", "people"]);
    expect(result.current.status).toBe("default");
  });
});
