# PaletteKit

The command palette that doesn't suck. Fuzzy search, full keyboard nav, async
sources, nested pages, and real accessibility — as copy-paste React source you
own. Free.

## Install

```bash
npx shadcn@latest add https://palettekit.dev/r/command-palette.json
```

## Develop

```bash
pnpm install
pnpm test     # run all tests
pnpm build    # typecheck + build registry + build showcase
pnpm --filter @palettekit/showcase dev   # run the showcase locally
```

## Structure

- `packages/components/command-palette` — the component source (what users receive)
- `packages/registry` — emits the shadcn-format registry JSON
- `apps/showcase` — the marketing site, playground, and docs

Architecture is multi-component-ready: adding a second interaction is a new
folder under `packages/components/src`, not a re-architecture.
