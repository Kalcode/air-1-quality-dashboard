# CLAUDE.md

Instructions for Claude Code when working in this repo. Also serves as a boilerplate reference for future Astro + Solid-JS + Cloudflare Workers projects.

## Tech Stack

- **Astro** — SSR web framework (`output: "server"` in `astro.config.mjs`)
- **Solid-JS** — Reactive UI components (via `@astrojs/solid-js` integration)
- **Cloudflare Workers** — Deployment target (via Wrangler)
- **Bun** — Package manager and runtime
- **Biome** — Lint + format (config in `biomes.json`)
- **Lefthook** — Pre-commit hooks (runs Biome on staged files)
- **commitlint** — Enforces conventional commits

## Commands

```bash
bun dev              # Start dev server at localhost:4321 (opens browser)
bun run build        # Build to ./dist (IMPORTANT: not `bun build` — that invokes Bun's bundler)
bun preview          # Build + run Wrangler dev server locally
bun deploy           # Build + deploy to Cloudflare Workers
```

## Project Structure

```
src/
├── components/
│   ├── Layout.astro              # HTML shell (head, meta, global.css import)
│   ├── Dashboard.tsx             # Main Solid-JS island (stateful, client:load)
│   ├── GaugeComponents.tsx       # Delta, GaugeBar, VocQualityBadge
│   ├── AnalysisComponents.tsx    # ParticleBreakdown, WHOBars, StatusPanel
│   ├── HistoryCard.tsx           # History entry with view/compare/delete
│   ├── thresholds.ts             # Constants, ESPHome parser, utilities, shared styles
│   ├── storage.ts                # localStorage persistence layer
│   └── types.ts                  # Shared TypeScript interfaces
├── pages/
│   ├── index.astro               # Home — imports Dashboard with client:load
│   └── 404.astro                 # 404 page
└── global.css                    # Minimal body reset (background, box-sizing)
```

## Solid-JS Patterns (Not React!)

These are critical differences from React — get them wrong and things silently break:

- **Signals, not state**: `createSignal()` returns `[getter, setter]` where getter is a function — call it: `count()` not `count`
- **Don't destructure props**: Use `props.name` always. Destructuring breaks reactivity.
- **`onInput` for text fields**: Solid's `onChange` fires on blur. Use `onInput` for real-time input.
- **`e.currentTarget`**: Not `e.target` — Solid types enforce this.
- **`<Show>` / `<For>`**: Use these instead of `&&` / `.map()`. They're not just idiomatic — `<For>` gives keyed reconciliation and `<Show>` avoids evaluating children when false.
- **Inline styles use kebab-case**: `"font-size"` not `fontSize`, `"border-radius"` not `borderRadius`
- **`onMount` for load-once effects**: Replaces React's `useEffect(() => {}, [])`

## Astro Patterns

- Components in `.astro` files use frontmatter between `---` fences for imports/logic
- Solid components become interactive "islands" via client directives: `<Component client:load />`
- `client:load` — hydrate immediately on page load (use for primary interactive content)
- `client:visible` — hydrate when scrolled into view (use for below-fold content)
- `client:only="solid-js"` — skip SSR entirely (use when component can't render server-side)

## Biome Gotchas

- **Never run `biome check --unsafe` on `.astro` files** — it strips frontmatter imports because Biome can't see template usage. The `noUnusedImports: "off"` override in `biomes.json` protects against `--write` but `--unsafe` overrides it.
- **Safe command**: `bunx @biomejs/biome check --write src/components/` (only `.ts`/`.tsx` files)
- **Risky command**: `bunx @biomejs/biome check --write --unsafe src/` (will nuke `.astro` imports)
- Layout.astro warnings about unused Props/title are false positives — ignore them.
- Lefthook pre-commit runs Biome automatically on staged `.ts`/`.tsx`/`.json` files (not `.astro`).

## Code Quality

- **Formatting**: Biome — single quotes, 2-space indent, 120 char width, trailing commas, semicolons
- **Commits**: Conventional commits enforced by commitlint
  - `feat: add particle size breakdown` / `fix: handle empty sensor data` / `refactor: extract storage layer`

## Workflow

1. **User runs the dev server** (`bun dev`) — don't start it yourself
2. **Visual review**: Use chrome-devtools MCP to take snapshots for feedback
3. **Iterate**: Fix issues based on snapshot feedback
4. **Lint**: `bunx @biomejs/biome check --write src/components/` (safe for .tsx/.ts)
5. **Build**: `bun run build` to verify compilation
6. **Branch & commit**: Feature branch, conventional commit message, push for review

## Scripts

All automation is in `scripts/` as Bun TypeScript (uses Bun Shell + fetch). Requires `GITEA_TOKEN` in `.env`.

```bash
bun scripts/create-pr.ts "Title" "Body" [base] [head]   # Create a Gitea PR
bun scripts/release.ts                                    # Tag + changelog + Gitea release
bun scripts/release.ts --dry-run                          # Preview version + notes, no changes
```

This repo uses self-hosted **Forgejo (Gitea)**, not GitHub. API base: `https://code.clausens.cloud/api/v1/repos/kalcode/<repo-name>`

## Deployment

- **Wrangler config**: `wrangler.jsonc` — set `name` and `routes[].pattern` for your custom domain
- **Custom domain pattern**: `<app-name>.junk-tools.com`
- **Build output**: `./dist/_worker.js/index.js` (server) + `./dist/_astro/` (client assets)

## Starting a New Project from This Boilerplate

1. Clone/copy the repo
2. Update `package.json` → `name`
3. Update `wrangler.jsonc` → `name` and `routes[].pattern` for the new custom domain
4. Update `Layout.astro` → default title
5. Replace components in `src/components/` with your app's components
6. Update `index.astro` to import your main component with `client:load`
7. `bun install && bun dev` to verify, `bun deploy` when ready

## Important Notes

- **Never start the dev server yourself** — user runs `bun dev`
- **Always use snapshots** for visual feedback via chrome-devtools MCP
- **Never commit secrets** — API keys, tokens go in `.env` (gitignored)
- **`bun run build`** not `bun build` — the latter invokes Bun's native bundler instead of Astro
