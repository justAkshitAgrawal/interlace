/** Durations in seconds (Framer Motion uses seconds). Fast & functional. */
export const DURATION = {
  overlay: 0.15,
  panel: 0.18,
  list: 0.15,
} as const;

export const EASING = {
  /** Standard ease-out for entrances. */
  out: [0.16, 1, 0.3, 1] as const,
  /** Symmetric ease for state cross-fades. */
  inOut: [0.4, 0, 0.2, 1] as const,
};

/** A responsive (not bouncy) spring for the panel. */
export const PANEL_SPRING = {
  type: "spring" as const,
  stiffness: 550,
  damping: 40,
  mass: 1,
};
