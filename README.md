# Interlace

Drop-in interactions for real software — copy-paste React source you own,
installed via the shadcn CLI. Not marketing-page eye candy; the actual
interactions SaaS products are built from.

The first component is a best-in-class **command palette**: fuzzy search, full
keyboard navigation, nested pages, async sources with race cancellation,
recents, virtualization, and a real accessible dialog/combobox.

## Install

```bash
npx shadcn@latest add https://interlace.akshitagrawal.dev/r/command-palette.json
```

Requires **React 19** and **Tailwind CSS**. See
[`packages/components/README.md`](packages/components/README.md) for component
docs and the full prop reference.

## Develop

```bash
pnpm install
pnpm test     # run all tests
pnpm build    # typecheck + build registry + build showcase
pnpm --filter @interlace/showcase dev   # run the showcase locally
```

## Structure

- `packages/components` — component source (what users receive); `command-palette` is the first
- `packages/registry` — emits the shadcn-format registry JSON
- `apps/showcase` — the marketing site, playground, and docs

Architecture is multi-component-ready: adding a second interaction is a new
folder under `packages/components/src`, not a re-architecture.

## License

MIT — see [LICENSE](LICENSE).
