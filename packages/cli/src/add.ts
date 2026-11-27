import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { Flavour } from './detect.ts'
import type { Registry } from './registry.ts'

export interface AddOptions {
  cwd: string
  dir: string
  flavour: Flavour
  force?: boolean
}

export interface AddResult {
  written: string[]
  skipped: string[]
  unknown: string[]
}

export function add(registry: Registry, slugs: string[], opts: AddOptions): AddResult {
  const result: AddResult = { written: [], skipped: [], unknown: [] }
  const files = new Map<string, string>()
  for (const slug of slugs) {
    const effect = registry.effects.find((e) => e.slug === slug)
    if (!effect) {
      result.unknown.push(slug)
      continue
    }
    files.set(registry.lib.path, registry.lib.content)
    for (const f of effect.files[opts.flavour]) files.set(f.path, f.content)
  }
  for (const [path, content] of files) {
    const target = join(opts.cwd, opts.dir, path)
    const rel = join(opts.dir, path)
    if (existsSync(target) && !opts.force) {
      if (readFileSync(target, 'utf8') !== content) {
        result.skipped.push(rel)
        continue
      }
    }
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, content)
    result.written.push(rel)
  }
  return result
}

/** Closest slugs by edit distance, for "did you mean" hints. */
export function suggest(registry: Registry, input: string): string[] {
  const dist = (a: string, b: string) => {
    const row = Array.from({ length: b.length + 1 }, (_, i) => i)
    for (let i = 1; i <= a.length; i++) {
      let prev = row[0] as number
      row[0] = i
      for (let j = 1; j <= b.length; j++) {
        const tmp = row[j] as number
        row[j] = Math.min(
          (row[j] as number) + 1,
          (row[j - 1] as number) + 1,
          prev + (a[i - 1] === b[j - 1] ? 0 : 1),
        )
        prev = tmp
      }
    }
    return row[b.length] as number
  }
  return registry.effects
    .map((e) => ({ slug: e.slug, d: e.slug.includes(input) ? 0 : dist(input, e.slug) }))
    .filter((x) => x.d <= 3)
    .sort((a, b) => a.d - b.d)
    .slice(0, 3)
    .map((x) => x.slug)
}
