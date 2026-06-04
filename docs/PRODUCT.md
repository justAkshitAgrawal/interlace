# Product

## Register

brand

## Users

Developers evaluating a command-palette component for a React app — the person
who lands from the shadcn registry, Hacker News, or a tweet with one question in
mind: "why would I use this instead of cmdk or rolling my own?" They are
skeptical, fast-reading, and have seen a hundred command palettes that all look
identical. They decide in seconds whether the project is serious. The secondary
audience is the engineer who has already adopted it and wants to understand or
customize the behavior (playground, docs).

## Product Purpose

Interlace is a best-in-class, copy-paste command palette delivered as React
source you own (via the shadcn CLI). The engineering is the value: async sources
with race-condition cancellation, nested pages, fuzzy ranking, full keyboard
navigation, real combobox accessibility, and reduced-motion support.

The strategic problem: all of that is **invisible**. A landing visitor sees a
palette open and filter — indistinguishable from every competitor. The site's
job is therefore not to describe the engineering but to **dramatize it**: make
the invisible craft (the dropped stale request, the frozen loading/error states,
the exact motion timings) into something a visitor can watch, scrub, and inspect.
Success is the 10-second test: a skeptic should see, not be told, what this
palette does that a bad one doesn't — and want to share it.

## Brand Personality

Precise, fast, proof-driven. The voice of an engineer with taste who would
rather show you the dropped request than claim "robust async handling." Confident
without marketing fluff; every claim is demonstrable on the page. Three words:
**exacting, kinetic, candid.**

## Anti-references

- **cmdk's demo and every generic command-palette landing**: a single input that
  opens and filters, three feature bullets, done. The thing we must not be
  mistaken for.
- **SaaS-cream / warm-near-white editorial restraint**: the saturated AI-default
  brand look. This is a tool, not a magazine.
- **Devtool-cliché "dark mode + neon green terminal"** as costume. We are dark
  and technical, but warm and composed, not a hacker-aesthetic stage set.
- **Hero-metric template** (big number, small label, gradient accent) and
  identical icon-heading-text card grids.

## Design Principles

- **Make the invisible visible.** Every differentiator must be perceivable on the
  page — watched, scrubbed, or inspected — not asserted in prose. This is the
  whole strategy.
- **Show, don't tell.** Replace adjectives with demonstrations. "Drops stale
  requests" becomes a timeline where you watch the stale one get dropped.
- **Practice what you preach.** The site is fast, accessible, and reduced-motion
  aware — the same craft the component claims. The build is the proof.
- **The site has voice; the component stays neutral.** The showcase is opinionated
  and branded so it feels built by someone with taste. The embedded palette stays
  visually neutral, proving it drops into the visitor's app, not ours.
- **One signature, used with discipline.** A single warm accent marks the "live"
  truth (the winning request, the active state); everything else recedes. Color
  carries meaning, not decoration.

## Accessibility & Inclusion

WCAG 2.1 AA. Body text ≥ 4.5:1 against the warm-charcoal background; the amber
accent is reserved for large text, indicators, and fills with dark ink. Every
animation (including the race scrubber's autoplay and any reveals) has a
`prefers-reduced-motion: reduce` path: autoplay is suppressed, transitions
collapse to instant or crossfade, and all demos remain fully usable via the
scrubber and keyboard. Interactive demos are operable by keyboard and expose
state through text, not color alone.
