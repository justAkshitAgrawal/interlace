import { ImageResponse } from "next/og";

export const alt =
  "Interlace — watch what a great command palette does that a bad one doesn't.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/*
 * Share card. The product thesis is "show, don't tell", so the card stages the
 * signature moment: one request wins (LIVE, amber) while the stale one is
 * dropped. Warm charcoal + a single amber accent, matching site identity.
 * Token colors are inlined as hex (Satori renders outside the app's CSS), and
 * the command mark is drawn as SVG so no glyph font has to be fetched.
 */
const C = {
  bg: "#1b1714",
  surface: "#241f1b",
  line: "#3a3530",
  ink: "#f4f0e9",
  muted: "#b8b0a3",
  faint: "#a39a8c",
  accent: "#efab43",
  accentInk: "#271f15",
  stale: "#a39a8c",
};

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: C.bg,
        color: C.ink,
        padding: 72,
      }}
    >
      {/* Wordmark */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <svg
          width="34"
          height="34"
          viewBox="0 0 24 24"
          fill="none"
          stroke={C.accent}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
        </svg>
        <span style={{ marginLeft: 16, fontSize: 30, fontWeight: 700 }}>
          Interlace
        </span>
      </div>

      {/* Headline */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          maxWidth: 960,
          fontSize: 62,
          lineHeight: 1.1,
          fontWeight: 600,
          letterSpacing: -1,
        }}
      >
        <span>
          Watch what a great command palette does that a bad one&nbsp;
        </span>
        <span style={{ color: C.accent }}>doesn&apos;t.</span>
      </div>

      {/* The signature moment: one wins, one is dropped. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Lane
          label={'fetch("as")'}
          state="LIVE"
          bar={C.accent}
          ink={C.accentInk}
          width={520}
        />
        <Lane
          label={'fetch("a")'}
          state="DROPPED"
          bar={C.surface}
          ink={C.stale}
          width={680}
        />
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 24,
          color: C.faint,
          borderTop: `1px solid ${C.line}`,
          paddingTop: 28,
        }}
      >
        <span>npx shadcn add · React source you own</span>
        <span style={{ color: C.muted }}>Free · MIT</span>
      </div>
    </div>,
    { ...size },
  );
}

function Lane({
  label,
  state,
  bar,
  ink,
  width,
}: {
  label: string;
  state: string;
  bar: string;
  ink: string;
  width: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <span style={{ fontSize: 22, color: C.muted, width: 220 }}>{label}</span>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: 44,
          width,
          borderRadius: 8,
          backgroundColor: bar,
          paddingLeft: 18,
        }}
      >
        <span style={{ fontSize: 20, fontWeight: 700, color: ink }}>
          {state}
        </span>
      </div>
    </div>
  );
}
