# Contributing

The best contributions are new effects and bug reports with a browser, OS and a short recording.

## Setup

```sh
git clone https://github.com/whosdrix/jawdrop
cd jawdrop
npm install
npm run dev
```

The site runs at http://localhost:5173 and reloads when you edit an effect.

## Adding an effect

```sh
npm run new -- liquid-hover cursor
```

That creates `effects/liquid-hover/` with five files:

| File          | What it is                                                               |
| ------------- | ------------------------------------------------------------------------ |
| `core.ts`     | `effect(el, options) => destroy`. Plain TypeScript, no dependencies.     |
| `react.tsx`   | A component that calls the core in `useEffect`.                          |
| `astro.astro` | A component with a `<script>` that calls the core.                       |
| `meta.json`   | Name, category, description, size budget and the playground controls.    |
| `demo.html`   | Markup for the live preview. The element with `data-fx` gets the effect. |

An effect is ready when:

- `destroy()` puts the DOM back exactly as it was and removes every listener. The test suite checks this for every effect, with and without reduced motion.
- It has a reduced motion version: static, or a simple fade. Use `prefersReducedMotion()` from `lib.ts`.
- It stops work when off screen or when the tab is hidden. `loop()` from `lib.ts` does both.
- It stays under its gzip budget (`npm run size`). Most effects fit in 3 KB, shaders in 4 KB. Only a fluid simulation gets 6 KB.
- It runs smoothly on a mid-range phone.

## Before opening a pull request

```sh
npm run lint
npm run typecheck
npm test
npm run size
```

`npm run e2e` runs the site in Chromium and opens every effect. It needs `npx playwright install chromium` once.

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org) (`feat:`, `fix:`, `docs:`), because releases and the changelog are generated from them.
