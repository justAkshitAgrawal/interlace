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
