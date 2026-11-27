import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { EffectMeta } from '../../scripts/registry.ts'

export const effectsDir = join(import.meta.dirname, '../../effects')
export const slugs = readdirSync(effectsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort()

export const meta = (slug: string): EffectMeta =>
  JSON.parse(readFileSync(join(effectsDir, slug, 'meta.json'), 'utf8'))

export const demo = (slug: string) => readFileSync(join(effectsDir, slug, 'demo.html'), 'utf8')

type Fx = (el: HTMLElement, options?: Record<string, unknown>) => () => void

export async function load(slug: string): Promise<Fx> {
  const mod = await import(`../../effects/${slug}/core.ts`)
  return mod[meta(slug).export] as Fx
}

/** Counts listeners added and removed anywhere, so leaks show up as a non-zero balance. */
export function trackListeners() {
  const proto = EventTarget.prototype
  const add = proto.addEventListener
  const remove = proto.removeEventListener
  const live = new Set<string>()
  const ids = new WeakMap<object, number>()
  let next = 0
  const key = (target: object, type: string, fn: unknown) => {
    if (!ids.has(target)) ids.set(target, next++)
    if ((fn && typeof fn === 'object') || typeof fn === 'function') {
      if (!ids.has(fn as object)) ids.set(fn as object, next++)
    }
    return `${ids.get(target)}:${type}:${ids.get(fn as object)}`
  }
  proto.addEventListener = function (type: string, fn: never, opts?: never) {
    live.add(key(this, type, fn))
    return add.call(this, type, fn, opts)
  }
  proto.removeEventListener = function (type: string, fn: never, opts?: never) {
    live.delete(key(this, type, fn))
    return remove.call(this, type, fn, opts)
  }
  return {
    live: () => live.size,
    restore: () => {
      proto.addEventListener = add
      proto.removeEventListener = remove
    },
  }
}

export function setMotion(value: 'reduce' | 'full' | undefined) {
  if (value) document.documentElement.dataset.motion = value
  else delete document.documentElement.dataset.motion
}
