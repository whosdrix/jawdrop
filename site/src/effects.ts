export type Destroy = () => void
export type Category = 'text' | 'backgrounds' | 'scroll' | 'cursor'
export type Value = number | string | boolean
export type Values = Record<string, Value>

export type OptionSpec =
  | { type: 'number'; default: number; min: number; max: number; step: number; label: string }
  | { type: 'select'; default: string; values: string[]; label: string }
  | { type: 'boolean'; default: boolean; label: string }
  | { type: 'color'; default: string; label: string }

export interface Meta {
  name: string
  category: Category
  description: string
  export: string
  component: string
  budget: number
  options: Record<string, OptionSpec>
}

export interface Effect extends Meta {
  slug: string
  demo: string
}

type EffectFn = (el: HTMLElement, options?: Record<string, unknown>) => Destroy

const metas = import.meta.glob<Meta>('../../effects/*/meta.json', {
  eager: true,
  import: 'default',
})
const demos = import.meta.glob<string>('../../effects/*/demo.html', {
  eager: true,
  query: '?raw',
  import: 'default',
})
const cores = import.meta.glob<Record<string, unknown>>('../../effects/*/core.ts')

const slugOf = (path: string) => path.split('/').at(-2) ?? ''

/** Hand-picked order inside each category. Anything new lands at the end. */
const ORDER = [
  'particle-text',
  'text-morph',
  'split-reveal',
  'scramble-text',
  'glitch-text',
  'variable-wave',
  'gradient-sweep',
  'marquee',
  'metaballs',
  'gradient-mesh',
  'halftone-image',
  'aurora',
  'warp-starfield',
  'dot-grid',
  'grain',
  'zoom-through',
  'orbit-carousel',
  'scroll-fill-text',
  'stacking-cards',
  'horizontal-scroll',
  'draw-path',
  'parallax',
  'fluid-cursor',
  'liquid-image',
  'glass-lens',
  'chromatic-hover',
  'ripple-click',
  'pixel-trail',
  'spotlight',
  'tilt-card',
  'magnetic',
  'trailing-ink',
]
const rank = (slug: string) => {
  const i = ORDER.indexOf(slug)
  return i < 0 ? ORDER.length : i
}

export const effects: Effect[] = Object.entries(metas)
  .map(([path, meta]) => {
    const slug = slugOf(path)
    return { ...meta, slug, demo: demos[path.replace('meta.json', 'demo.html')] ?? '' }
  })
  .sort((a, b) => rank(a.slug) - rank(b.slug) || a.slug.localeCompare(b.slug))

export const bySlug = new Map(effects.map((e) => [e.slug, e]))

export const categories: { id: Category; title: string; blurb: string }[] = [
  { id: 'text', title: 'Text', blurb: 'Headlines that arrive instead of just being there.' },
  {
    id: 'backgrounds',
    title: 'Backgrounds',
    blurb: 'Canvas and shader layers that sit behind your content.',
  },
  { id: 'scroll', title: 'Scroll', blurb: 'Driven by scroll position, not by a timer.' },
  { id: 'cursor', title: 'Cursor', blurb: 'Things that notice the pointer.' },
]

export async function loadEffect(slug: string): Promise<EffectFn | null> {
  const effect = bySlug.get(slug)
  const load = cores[`../../effects/${slug}/core.ts`]
  if (!effect || !load) return null
  const mod = await load()
  const fn = mod[effect.export]
  return typeof fn === 'function' ? (fn as EffectFn) : null
}

/** Runs an effect as soon as its code arrives. The returned destroy is safe to call any time. */
export function attach(
  slug: string,
  el: HTMLElement,
  options: Record<string, unknown> = {},
): Destroy {
  let dead = false
  let destroy: Destroy | undefined
  loadEffect(slug)
    .then((fn) => {
      if (!dead && fn && el.isConnected) destroy = fn(el, options)
    })
    .catch((err) => console.error(`[jawdrop] ${slug} failed to load`, err))
  return () => {
    dead = true
    destroy?.()
    destroy = undefined
  }
}

export const defaults = (effect: Effect): Values =>
  Object.fromEntries(Object.entries(effect.options).map(([k, spec]) => [k, spec.default]))

export interface RegistryFile {
  path: string
  content: string
}
export interface RegistryEffect {
  slug: string
  size: number
  files: Record<'vanilla' | 'react' | 'astro', RegistryFile[]>
}
export interface Registry {
  lib: RegistryFile
  effects: RegistryEffect[]
}

let registry: Promise<Registry> | undefined
export const loadRegistry = (): Promise<Registry> => {
  registry ??= import('../../packages/cli/registry.json').then(
    (m) => m.default as unknown as Registry,
  )
  return registry
}

export const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`

export const REPO = 'https://github.com/whosdrix/jawdrop'
export const installCmd = (slug: string) => `npx jawdrop add ${slug}`
export const shadcnCmd = (slug: string) =>
  `npx shadcn@latest add https://whosdrix.github.io/jawdrop/r/${slug}.json`
