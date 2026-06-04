"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/*
 * The signature demo. The user types fast, two requests overlap, and the SLOW
 * one resolves last. A naive palette lets that stale response clobber the fresh
 * one; PaletteKit drops it (monotonic reqId in use-command-palette.ts). You can
 * scrub the whole race and toggle between the two behaviors to watch the bug.
 */

const TOTAL = 1500; // ms

type Mode = "palettekit" | "naive";

interface Req {
  id: string;
  query: string;
  fire: number;
  resolve: number;
  results: string[];
}

// Request A is older (fired first) but SLOWER, so it resolves last — the trap.
const REQ_A: Req = {
  id: "a",
  query: "a",
  fire: 0,
  resolve: 1150,
  results: ["Archive issue", "Assign to…", "Add label", "Ask AI"],
};
// Request B is newer and faster — the response the user actually wants.
const REQ_B: Req = {
  id: "as",
  query: "as",
  fire: 380,
  resolve: 850,
  results: ["Assign to…", "Ask AI"],
};

type Phase =
  | "idle"
  | "inflight"
  | "live"
  | "dropped"
  | "stale-applied"
  | "overwritten";

const reqPhase = (req: Req, other: Req, t: number, mode: Mode): Phase => {
  if (t < req.fire) return "idle";
  if (t < req.resolve) return "inflight";
  // Resolved. Decide what happened to it.
  const isNewerFired = req.fire >= other.fire;
  if (mode === "palettekit") {
    // Last write only wins if no newer request was fired before it resolved.
    const newerExists = other.fire > req.fire;
    return newerExists ? "dropped" : "live";
  }
  // Naive: whatever resolves last wins, correctness be damned.
  const otherResolvedLater =
    t < other.resolve ? false : other.resolve > req.resolve;
  if (otherResolvedLater) return "overwritten";
  return isNewerFired ? "live" : "stale-applied";
};

interface PanelState {
  searching: boolean;
  shownQuery: string;
  results: string[];
  banner: "dropped" | "stale" | null;
}

const panelState = (t: number, mode: Mode): PanelState => {
  const inputQuery = t < REQ_B.fire ? "a" : "as";
  const bResolved = t >= REQ_B.resolve;
  const aResolved = t >= REQ_A.resolve;

  if (!bResolved && !aResolved) {
    return {
      searching: true,
      shownQuery: inputQuery,
      results: [],
      banner: null,
    };
  }
  if (mode === "palettekit") {
    // B always wins; A's late resolve is dropped.
    const banner = aResolved && t < REQ_A.resolve + 320 ? "dropped" : null;
    return {
      searching: false,
      shownQuery: "as",
      results: REQ_B.results,
      banner,
    };
  }
  // Naive: B shows first, then A clobbers it with stale "a" results.
  if (!aResolved) {
    return {
      searching: false,
      shownQuery: "as",
      results: REQ_B.results,
      banner: null,
    };
  }
  return {
    searching: false,
    shownQuery: "as",
    results: REQ_A.results,
    banner: "stale",
  };
};

const pct = (ms: number) => `${(ms / TOTAL) * 100}%`;

export function RaceTimeline() {
  const reduceMotion = useReducedMotion();
  const [t, setT] = useState(reduceMotion ? 1280 : 0);
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState<Mode>("palettekit");
  const raf = useRef<number | null>(null);
  const last = useRef<number | null>(null);

  const tick = useCallback((now: number) => {
    if (last.current === null) last.current = now;
    const dt = now - last.current;
    last.current = now;
    let done = false;
    setT((prev) => {
      const next = prev + dt;
      if (next >= TOTAL) {
        done = true;
        return TOTAL; // stop at the end so the result stays inspectable
      }
      return next;
    });
    if (done) {
      setPlaying(false);
      return;
    }
    raf.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (!playing) return;
    last.current = null;
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [playing, tick]);

  const atEnd = t >= TOTAL;

  const handlePlay = () => {
    if (atEnd) {
      setT(0);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  };

  const handleScrub = (value: number) => {
    setPlaying(false);
    setT(value);
  };

  const panel = panelState(t, mode);
  const phaseA = reqPhase(REQ_A, REQ_B, t, mode);
  const phaseB = reqPhase(REQ_B, REQ_A, t, mode);

  return (
    <div className="rounded-2xl border border-line bg-surface/60 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ModeToggle mode={mode} onChange={setMode} />
        <div className="font-mono text-xs text-faint">
          t ={" "}
          <span className="text-ink">
            {(Math.min(t, TOTAL) / 1000).toFixed(2)}s
          </span>
        </div>
      </div>

      {/* What the user sees — the embedded "product", kept neutral. */}
      <ResultPanel panel={panel} mode={mode} />

      {/* The instrumentation — the site's voice, in amber. */}
      <div className="mt-6 space-y-3">
        <RequestLane req={REQ_A} phase={phaseA} />
        <RequestLane req={REQ_B} phase={phaseB} />
        <Playhead t={t} />
      </div>

      <div className="mt-5 flex items-center gap-4">
        <button
          type="button"
          onClick={handlePlay}
          className="flex h-9 w-24 items-center justify-center gap-2 rounded-lg bg-accent text-sm font-semibold text-accent-ink transition-transform hover:-translate-y-px active:translate-y-0"
          aria-label={
            playing
              ? "Pause the race"
              : atEnd
                ? "Replay the race"
                : "Play the race"
          }
        >
          {playing ? "❚❚ Pause" : atEnd ? "↻ Replay" : "▶ Play"}
        </button>
        <input
          type="range"
          min={0}
          max={TOTAL}
          value={Math.min(t, TOTAL)}
          onChange={(e) => handleScrub(Number(e.target.value))}
          aria-label="Scrub the request timeline"
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-2 accent-accent [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent"
        />
      </div>

      <p className="mt-5 text-pretty text-sm leading-relaxed text-muted">
        {mode === "palettekit" ? (
          <>
            <span className="text-ink">The slow request loses.</span> When the
            faster <code className="font-mono text-accent">&quot;as&quot;</code>{" "}
            response arrives, Interlace advances a monotonic request id. The
            older <code className="font-mono text-stale">&quot;a&quot;</code>{" "}
            response resolves later, sees its id is stale, and is dropped before
            it can touch the UI.
          </>
        ) : (
          <>
            <span className="text-danger">Watch it break.</span> A naive palette
            applies whatever resolves last. The slow{" "}
            <code className="font-mono text-danger">&quot;a&quot;</code>{" "}
            response lands after{" "}
            <code className="font-mono">&quot;as&quot;</code> and clobbers it:
            the list now shows results for a query the user already moved past.
            Flip back to Interlace to watch the same race resolve correctly.
          </>
        )}
      </p>
    </div>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  const options: { id: Mode; label: string }[] = [
    { id: "palettekit", label: "Interlace" },
    { id: "naive", label: "Naive palette" },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Palette behavior"
      className="inline-flex rounded-lg border border-line bg-bg p-1"
    >
      {options.map((o) => {
        const selected = mode === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.id)}
            className={[
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              selected
                ? o.id === "naive"
                  ? "bg-danger/15 text-danger"
                  : "bg-accent/15 text-accent"
                : "text-muted hover:text-ink",
            ].join(" ")}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ResultPanel({ panel, mode }: { panel: PanelState; mode: Mode }) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
        <span className="font-mono text-xs text-zinc-500">search</span>
        <span className="font-mono text-sm text-zinc-100">
          {panel.shownQuery}
          <span className="ml-px inline-block h-4 w-px translate-y-0.5 animate-pulse bg-accent align-middle" />
        </span>
      </div>
      <ul className="min-h-[132px] p-2">
        {panel.searching ? (
          <li className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-500">
            <Spinner /> Searching…
          </li>
        ) : (
          panel.results.map((r) => {
            const matchesQuery = r
              .toLowerCase()
              .includes(panel.shownQuery.toLowerCase());
            const wrong =
              mode === "naive" && panel.banner === "stale" && !matchesQuery;
            return (
              <li
                key={r}
                className={[
                  "rounded-md px-3 py-2 text-sm",
                  wrong ? "text-danger" : "text-zinc-200",
                ].join(" ")}
              >
                {r}
              </li>
            );
          })
        )}
      </ul>
      {panel.banner === "dropped" && (
        <div className="border-t border-zinc-800 px-4 py-2 font-mono text-xs text-accent">
          ✓ stale response for &quot;a&quot; dropped. UI untouched.
        </div>
      )}
      {panel.banner === "stale" && (
        <div className="border-t border-zinc-800 px-4 py-2 font-mono text-xs text-danger">
          ✗ showing stale results for &quot;a&quot;. Input says &quot;as&quot;.
        </div>
      )}
    </div>
  );
}

const LANE_PHASE: Record<Phase, { label: string; bar: string; ink: string }> = {
  idle: { label: "queued", bar: "bg-surface-2", ink: "text-faint" },
  inflight: { label: "in flight…", bar: "bg-line-strong", ink: "text-ink" },
  live: { label: "LIVE", bar: "bg-accent", ink: "text-accent-ink" },
  dropped: { label: "DROPPED", bar: "bg-stale/35", ink: "text-ink/80" },
  "stale-applied": {
    label: "STALE → APPLIED",
    bar: "bg-danger",
    ink: "text-accent-ink",
  },
  overwritten: { label: "OVERWRITTEN", bar: "bg-stale/25", ink: "text-ink/70" },
};

function RequestLane({ req, phase }: { req: Req; phase: Phase }) {
  const meta = LANE_PHASE[phase];
  const showBar = phase !== "idle";
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 shrink-0 font-mono text-xs text-muted">
        fetch(<span className="text-ink">&quot;{req.query}&quot;</span>)
      </div>
      <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-bg">
        {showBar && (
          <div
            className={[
              "absolute inset-y-0 flex items-center rounded-md px-2 transition-colors duration-200",
              meta.bar,
            ].join(" ")}
            style={{ left: pct(req.fire), width: pct(req.resolve - req.fire) }}
          >
            <span
              className={[
                "whitespace-nowrap font-mono text-[10px] font-semibold",
                meta.ink,
              ].join(" ")}
            >
              {meta.label}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function Playhead({ t }: { t: number }) {
  return (
    <div className="relative ml-[7.75rem] h-3">
      <div
        className="absolute top-0 h-3 w-px bg-accent"
        style={{ left: pct(Math.min(t, TOTAL)) }}
      >
        <div className="absolute -left-[3px] -top-1 h-1.5 w-1.5 rounded-full bg-accent" />
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
  );
}
