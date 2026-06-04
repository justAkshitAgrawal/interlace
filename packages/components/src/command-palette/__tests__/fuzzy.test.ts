import { describe, it, expect } from "vitest";
import { fuzzyScore, rankCommands } from "../fuzzy";
import type { Command } from "../types";

describe("fuzzyScore", () => {
  it("returns null when characters are not a subsequence", () => {
    expect(fuzzyScore("xyz", "settings")).toBeNull();
  });

  it("matches a scattered subsequence and reports indices", () => {
    const res = fuzzyScore("stg", "settings");
    expect(res).not.toBeNull();
    expect(res!.indices).toEqual([0, 2, 6]); // s, t, g (greedy: first occurrence)
  });

  it("is case-insensitive", () => {
    expect(fuzzyScore("SET", "settings")).not.toBeNull();
  });

  it("scores an exact match higher than a prefix match", () => {
    const exact = fuzzyScore("go", "go")!.score;
    const prefix = fuzzyScore("go", "google")!.score;
    expect(exact).toBeGreaterThan(prefix);
  });

  it("scores a prefix match higher than a word-boundary match", () => {
    const prefix = fuzzyScore("set", "settings")!.score;
    const wordBoundary = fuzzyScore("set", "reset toggle")!.score;
    expect(prefix).toBeGreaterThan(wordBoundary);
  });

  it("scores a word-boundary match higher than a scattered match", () => {
    const wordBoundary = fuzzyScore("nt", "new task")!.score; // n(ew) t(ask)
    const scattered = fuzzyScore("nt", "invent")!.score; // i-n-v-e-n-t
    expect(wordBoundary).toBeGreaterThan(scattered);
  });
});

describe("rankCommands", () => {
  const cmds: Command[] = [
    { id: "settings", label: "Settings" },
    { id: "new", label: "New File", keywords: ["create"] },
    { id: "search", label: "Search" },
  ];

  it("returns all commands (no ranking) for an empty query", () => {
    const ranked = rankCommands(cmds, "");
    expect(ranked.map((r) => r.command.id)).toEqual(["settings", "new", "search"]);
    expect(ranked[0]!.matchedIndices).toEqual([]);
  });

  it("filters out non-matches", () => {
    const ranked = rankCommands(cmds, "zzz");
    expect(ranked).toHaveLength(0);
  });

  it("matches against keywords as well as label", () => {
    const ranked = rankCommands(cmds, "create");
    expect(ranked.map((r) => r.command.id)).toEqual(["new"]);
  });

  it("orders better matches first", () => {
    const ranked = rankCommands(cmds, "se");
    // "Search" (prefix) should outrank "Settings" (also prefix but longer) — both prefix,
    // shorter target wins the tie-break.
    expect(ranked[0]!.command.id).toBe("search");
  });
});

describe("rankCommands: recents boost", () => {
  const cmds: Command[] = [
    { id: "settings", label: "Settings" },
    { id: "search", label: "Search" },
  ];

  it("floats a recent command above an equal-ish-scoring peer", () => {
    const base = rankCommands(cmds, "se");
    expect(base[0]!.command.id).toBe("search");
    const boosted = rankCommands(cmds, "se", ["settings"]);
    expect(boosted[0]!.command.id).toBe("settings");
  });

  it("does not let a recent scattered match beat a fresh exact match", () => {
    const items: Command[] = [
      { id: "go", label: "Go" },
      { id: "dialog", label: "Open dialog" },
    ];
    const ranked = rankCommands(items, "go", ["dialog"]);
    expect(ranked[0]!.command.id).toBe("go");
  });

  it("does not let a recent word-boundary match beat a fresh prefix match (realistic labels)", () => {
    const items: Command[] = [
      { id: "settings", label: "Settings" }, // prefix match for "set"
      { id: "reset", label: "Reset toggle" }, // word-boundary match for "set"
    ];
    const ranked = rankCommands(items, "set", ["reset"]);
    expect(ranked[0]!.command.id).toBe("settings"); // boost can't cross the tier for normal labels
  });

  it("orders recents first on an empty query, rest keep original order", () => {
    const items: Command[] = [
      { id: "a", label: "Alpha" },
      { id: "b", label: "Bravo" },
      { id: "c", label: "Charlie" },
    ];
    const ranked = rankCommands(items, "", ["c", "a"]);
    expect(ranked.map((r) => r.command.id)).toEqual(["c", "a", "b"]);
    expect(ranked[0]!.matchedIndices).toEqual([]);
  });

  it("is identical to no-recents when recents is undefined or empty", () => {
    const a = rankCommands(cmds, "se");
    const b = rankCommands(cmds, "se", []);
    const c = rankCommands(cmds, "se", undefined);
    expect(b.map((r) => r.command.id)).toEqual(a.map((r) => r.command.id));
    expect(c.map((r) => r.command.id)).toEqual(a.map((r) => r.command.id));
  });
});
