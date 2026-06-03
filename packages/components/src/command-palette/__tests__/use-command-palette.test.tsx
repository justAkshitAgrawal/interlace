import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
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
