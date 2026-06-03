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
