import type { Command, RankedCommand } from "./types";

export interface FuzzyResult {
  score: number;
  /** Indices into the ORIGINAL target string that matched. */
  indices: number[];
}

const SCORE_EXACT = 1000;
const SCORE_PREFIX = 500;
const SCORE_WORD_BOUNDARY = 250;
const SCORE_SCATTERED = 100;

function isWordBoundary(target: string, i: number): boolean {
  if (i === 0) return true;
  const prev = target[i - 1]!;
  return prev === " " || prev === "-" || prev === "_" || prev === "/";
}

/**
 * Returns null if `query` is not a (case-insensitive) subsequence of `target`.
 * Otherwise returns a score (higher is better) plus matched indices.
 */
export function fuzzyScore(query: string, target: string): FuzzyResult | null {
  if (query === "") return { score: 0, indices: [] };

  const q = query.toLowerCase();
  const t = target.toLowerCase();

  // Exact / prefix fast paths.
  if (q === t) return { score: SCORE_EXACT, indices: range(target.length) };
  if (t.startsWith(q)) return { score: SCORE_PREFIX - target.length, indices: range(q.length) };

  // Greedy subsequence walk; track whether each matched char sat on a word boundary.
  const indices: number[] = [];
  let qi = 0;
  let boundaryHits = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      indices.push(ti);
      if (isWordBoundary(target, ti)) boundaryHits++;
      qi++;
    }
  }
  if (qi < q.length) return null; // not a subsequence

  // First matched char on a word boundary → treat as a word-boundary match.
  const base = boundaryHits > 0 ? SCORE_WORD_BOUNDARY : SCORE_SCATTERED;
  // Reward more boundary hits and penalize spread + target length.
  const spread = indices[indices.length - 1]! - indices[0]!;
  const score = base + boundaryHits * 10 - spread - target.length * 0.1;
  return { score, indices };
}

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

/**
 * Filters + ranks commands against a query. Empty query returns all commands
 * in their original order with no highlight indices.
 */
export function rankCommands(commands: Command[], query: string): RankedCommand[] {
  if (query === "") {
    return commands.map((command) => ({ command, matchedIndices: [] }));
  }

  const scored: { command: Command; result: FuzzyResult }[] = [];
  for (const command of commands) {
    // Best score across label + keywords; indices only kept for the label.
    const labelRes = fuzzyScore(query, command.label);
    let best = labelRes;
    let bestIndices = labelRes?.indices ?? [];
    for (const kw of command.keywords ?? []) {
      const kwRes = fuzzyScore(query, kw);
      if (kwRes && (!best || kwRes.score > best.score)) {
        best = kwRes;
        bestIndices = labelRes?.indices ?? []; // never highlight keyword chars in the label
      }
    }
    if (best) scored.push({ command, result: { ...best, indices: bestIndices } });
  }

  scored.sort((a, b) => b.result.score - a.result.score);
  return scored.map(({ command, result }) => ({
    command,
    matchedIndices: result.indices,
  }));
}
