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
 * Max recency boost. Kept small (≤10) so it only flips near-ties — e.g. two
 * prefix matches of similar length, the realistic case ("se" → Settings vs
 * Search). It is NOT a hard tier guarantee: prefix scores decay with target
 * length (`SCORE_PREFIX - target.length`), so for pathological inputs (labels
 * hundreds of chars long) the base tiers already overlap before any boost.
 * For real command labels (tens of chars) a boost this small cannot cross a
 * tier; we deliberately don't promise more than that.
 */
const RECENCY_WEIGHT = 8;

/** Boost for a command id given the recents list (most-recent first). 0 if absent. */
function recencyBoost(id: string, recents?: string[]): number {
  if (!recents || recents.length === 0) return 0;
  const idx = recents.indexOf(id);
  if (idx < 0) return 0;
  return RECENCY_WEIGHT * (1 - idx / recents.length);
}

/**
 * Filters + ranks commands against a query. Empty query returns all commands
 * in their original order with no highlight indices — except recent commands
 * (if `recents` is given) sort to the front in recents order. For a non-empty
 * query, recency adds a sub-tier boost to each match's score.
 */
export function rankCommands(
  commands: Command[],
  query: string,
  recents?: string[],
): RankedCommand[] {
  if (query === "") {
    const base = commands.map((command) => ({ command, matchedIndices: [] }));
    if (!recents || recents.length === 0) return base;
    const inRecents = (id: string) => recents.indexOf(id);
    return [...base].sort((a, b) => {
      const ra = inRecents(a.command.id);
      const rb = inRecents(b.command.id);
      if (ra === -1 && rb === -1) return 0;
      if (ra === -1) return 1;
      if (rb === -1) return -1;
      return ra - rb;
    });
  }

  const scored: { command: Command; result: FuzzyResult }[] = [];
  for (const command of commands) {
    const labelRes = fuzzyScore(query, command.label);
    let best = labelRes;
    let bestIndices = labelRes?.indices ?? [];
    for (const kw of command.keywords ?? []) {
      const kwRes = fuzzyScore(query, kw);
      if (kwRes && (!best || kwRes.score > best.score)) {
        best = kwRes;
        bestIndices = labelRes?.indices ?? [];
      }
    }
    if (best) {
      const boosted = best.score + recencyBoost(command.id, recents);
      scored.push({ command, result: { score: boosted, indices: bestIndices } });
    }
  }

  scored.sort((a, b) => b.result.score - a.result.score);
  return scored.map(({ command, result }) => ({
    command,
    matchedIndices: result.indices,
  }));
}
