"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  DURATION,
  EASING,
  PANEL_SPRING,
} from "@palettekit/components/command-palette";

/*
 * The palette's timings live in motion.ts as real exported tokens. This reads
 * them straight from the package and lets you replay each one — the easing math
 * you normally only feel becomes something you can see and inspect.
 */

type Token =
  | {
      kind: "bezier";
      id: string;
      name: string;
      duration: number;
      curve: readonly [number, number, number, number];
      desc: string;
    }
  | {
      kind: "spring";
      id: string;
      name: string;
      stiffness: number;
      damping: number;
      mass: number;
      desc: string;
    };

const TOKENS: Token[] = [
  {
    kind: "bezier",
    id: "overlay",
    name: "Overlay fade",
    duration: DURATION.overlay,
    curve: EASING.inOut,
    desc: "The backdrop crossfades in and out. Symmetric ease, fast enough to feel instant.",
  },
  {
    kind: "spring",
    id: "panel",
    name: "Panel entrance",
    stiffness: PANEL_SPRING.stiffness,
    damping: PANEL_SPRING.damping,
    mass: PANEL_SPRING.mass,
    desc: "The panel springs up and scales in. Responsive, not bouncy: high stiffness, heavy damping.",
  },
  {
    kind: "bezier",
    id: "list",
    name: "List transition",
    duration: DURATION.list,
    curve: EASING.out,
    desc: "Results swap with an ease-out exponential: decelerates into place, never overshoots.",
  },
];

export function MotionReadout() {
  const [activeId, setActiveId] = useState("panel");
  const [runKey, setRunKey] = useState(0);
  const reduceMotion = useReducedMotion();
  const active = TOKENS.find((t) => t.id === activeId)!;

  return (
    <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-[1fr_1.1fr]">
      <div className="bg-surface/60 p-4 sm:p-6">
        <ul className="space-y-1.5">
          {TOKENS.map((t) => {
            const selected = t.id === activeId;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveId(t.id);
                    setRunKey((k) => k + 1);
                  }}
                  className={[
                    "flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors",
                    selected
                      ? "border-accent-soft bg-accent/10"
                      : "border-transparent hover:bg-surface-2",
                  ].join(" ")}
                >
                  <span className={selected ? "text-ink" : "text-muted"}>
                    {t.name}
                  </span>
                  <span className="font-mono text-xs text-faint">
                    {t.kind === "bezier"
                      ? `${Math.round(t.duration * 1000)}ms`
                      : "spring"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-pretty text-sm leading-relaxed text-muted">
          {active.desc}
        </p>
      </div>

      <div className="flex flex-col bg-surface/60 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-wider text-faint">
            motion.ts
          </span>
          <button
            type="button"
            onClick={() => setRunKey((k) => k + 1)}
            className="rounded-md border border-line px-3 py-1 text-xs text-ink transition-colors hover:border-line-strong hover:bg-surface-2"
          >
            ▶ Replay
          </button>
        </div>

        <div className="mt-4 grid flex-1 grid-cols-1 items-center gap-5 sm:grid-cols-[120px_1fr]">
          {active.kind === "bezier" ? (
            <BezierPlot curve={active.curve} />
          ) : (
            <SpringPlot
              stiffness={active.stiffness}
              damping={active.damping}
              mass={active.mass}
            />
          )}

          <div className="space-y-3">
            <CodeReadout token={active} />
            <Sample
              token={active}
              runKey={runKey}
              reduceMotion={reduceMotion ?? false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function CodeReadout({ token }: { token: Token }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-line bg-bg p-3 font-mono text-xs leading-relaxed text-muted">
      {token.kind === "bezier" ? (
        <code>
          <span className="text-faint">duration:</span>{" "}
          <span className="text-accent">{token.duration}</span>s{"\n"}
          <span className="text-faint">ease:</span> [{token.curve.join(", ")}]
        </code>
      ) : (
        <code>
          <span className="text-faint">type:</span>{" "}
          <span className="text-accent">&quot;spring&quot;</span>
          {"\n"}
          <span className="text-faint">stiffness:</span>{" "}
          <span className="text-accent">{token.stiffness}</span>
          {"\n"}
          <span className="text-faint">damping:</span>{" "}
          <span className="text-accent">{token.damping}</span>
          {"\n"}
          <span className="text-faint">mass:</span>{" "}
          <span className="text-accent">{token.mass}</span>
        </code>
      )}
    </pre>
  );
}

function Sample({
  token,
  runKey,
  reduceMotion,
}: {
  token: Token;
  runKey: number;
  reduceMotion: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [travel, setTravel] = useState(0);

  // Travel distance in px (track width minus the box and a small end gap), so the
  // box glides the full width. Transform percentages are box-relative, not track-
  // relative, so we measure instead.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const BOX = 28; // h-7 / w-7
    const PADDING = 8; // px-1 on each side
    const measure = () => setTravel(Math.max(0, el.clientWidth - BOX - PADDING));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const transition =
    token.kind === "bezier"
      ? reduceMotion
        ? { duration: 0 }
        : { duration: token.duration, ease: token.curve }
      : reduceMotion
        ? { duration: 0 }
        : {
            type: "spring" as const,
            stiffness: token.stiffness,
            damping: token.damping,
            mass: token.mass,
          };

  return (
    <div
      ref={trackRef}
      className="relative flex h-10 items-center overflow-hidden rounded-lg border border-line bg-bg px-1"
    >
      <motion.div
        key={runKey}
        initial={{ x: 0, opacity: 0.3, scale: 0.85 }}
        animate={{ x: travel, opacity: 1, scale: 1 }}
        transition={transition}
        className="h-7 w-7 shrink-0 rounded-md bg-accent"
      />
    </div>
  );
}

function BezierPlot({
  curve,
}: {
  curve: readonly [number, number, number, number];
}) {
  const [x1, y1, x2, y2] = curve;
  // Plot in a 100x100 box, y inverted (0 at bottom).
  const px = (x: number) => 4 + x * 92;
  const py = (y: number) => 96 - y * 92;
  const path = `M ${px(0)} ${py(0)} C ${px(x1)} ${py(y1)}, ${px(x2)} ${py(y2)}, ${px(1)} ${py(1)}`;
  return (
    <svg viewBox="0 0 100 100" className="h-28 w-full" aria-hidden>
      <line
        x1={4}
        y1={96}
        x2={96}
        y2={96}
        stroke="var(--line)"
        strokeWidth={0.6}
      />
      <line
        x1={4}
        y1={4}
        x2={4}
        y2={96}
        stroke="var(--line)"
        strokeWidth={0.6}
      />
      <line
        x1={4}
        y1={4}
        x2={96}
        y2={4}
        stroke="var(--line)"
        strokeWidth={0.4}
        strokeDasharray="2 2"
      />
      <path
        d={path}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <circle cx={px(0)} cy={py(0)} r={2} fill="var(--accent)" />
      <circle cx={px(1)} cy={py(1)} r={2} fill="var(--accent)" />
    </svg>
  );
}

function SpringPlot({
  stiffness,
  damping,
  mass,
}: {
  stiffness: number;
  damping: number;
  mass: number;
}) {
  // Sample the spring (semi-implicit Euler) so the drawn curve is the real motion.
  const points: { t: number; v: number }[] = [];
  let x = 0;
  let v = 0;
  const dt = 1 / 240;
  const steps = 240; // 1s window
  for (let i = 0; i <= steps; i++) {
    const f = -stiffness * (x - 1) - damping * v;
    const a = f / mass;
    v += a * dt;
    x += v * dt;
    points.push({ t: i / steps, v: x });
  }
  const px = (t: number) => 4 + t * 92;
  const py = (val: number) => 96 - val * 60; // 1 maps to ~36, leaving headroom for overshoot
  const d = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${px(p.t).toFixed(2)} ${py(p.v).toFixed(2)}`,
    )
    .join(" ");
  return (
    <svg viewBox="0 0 100 100" className="h-28 w-full" aria-hidden>
      <line
        x1={4}
        y1={96}
        x2={96}
        y2={96}
        stroke="var(--line)"
        strokeWidth={0.6}
      />
      <line
        x1={4}
        y1={py(1)}
        x2={96}
        y2={py(1)}
        stroke="var(--line)"
        strokeWidth={0.4}
        strokeDasharray="2 2"
      />
      <path
        d={d}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
