---

name: jawdrop
description: Add polished text, background, scroll and cursor effects to a React, Astro or plain HTML site with jawdrop. Use when the user asks for an animated headline, shader background, scroll animation, magnetic button, tilt card or similar.
---

# jawdrop

jawdrop is a set of copy-paste web effects. Each effect is one TypeScript file with no dependencies, plus thin React and Astro wrappers. Files are copied into the project, so they can be edited freely.

## Pick an effect

Run `npx jawdrop list` to see every effect with its size and a one-line description. Categories:

- **text**: scramble-text, split-reveal, gradient-sweep, marquee
- **backgrounds**: gradient-mesh, aurora, grain, dot-grid
- **scroll**: stacking-cards, parallax, draw-path, horizontal-scroll
- **cursor**: magnetic, spotlight, tilt-card, trailing-ink

## Install

```sh
npx jawdrop add <effect> [more effects]
```

The CLI detects React or Astro from package.json (override with `--flavour react|astro|vanilla`) and writes to `src/components/jawdrop/` (override with `--dir`). It never overwrites a file the user changed unless `--force` is passed.

For shadcn projects: `npx shadcn@latest add https://whosdrix.github.io/jawdrop/r/<effect>.json`.

## Use

React:

```tsx
import { ScrambleText } from '@/components/jawdrop/ScrambleText'

;<ScrambleText as="h1" duration={1400}>
  Decrypting the signal
</ScrambleText>
```

Astro:

```astro
---
import GradientMesh from '../components/jawdrop/GradientMesh.astro'
---
<GradientMesh class="hero" speed={0.8}><h1>Hello</h1></GradientMesh>
```

Plain TypeScript:

```ts
import { magnetic } from './components/jawdrop/magnetic'

const destroy = magnetic(document.querySelector('#cta')!, { strength: 0.4 })
```

## Rules worth knowing

- Every function is `effect(element, options) => destroy`. Call `destroy()` when the element goes away; it removes listeners, canvases and inline styles.
- Every effect respects `prefers-reduced-motion`. Setting `data-motion="reduce"` or `data-motion="full"` on `<html>` overrides the OS setting.
- Background effects (gradient-mesh, aurora, grain, dot-grid) draw behind the element's children. Give the element a size.
- Scroll effects accept a `root` option when they live inside a scroll container instead of the page.
- Text effects in React take the text as a string child. The element remounts when the text changes.
