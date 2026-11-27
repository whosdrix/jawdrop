// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { transform } from '@astrojs/compiler'
import { describe, expect, it } from 'vitest'
import { buildRegistry, shadcnIndex, shadcnItem, toInstalled } from '../../scripts/registry.ts'
import { effectsDir, slugs } from './helpers.ts'

const registry = await buildRegistry()

describe('registry', () => {
  it('rewrites imports for the installed layout', () => {
    const src = `import { all } from '../lib'\nimport { fx } from './core'`
    expect(toInstalled(src, 'fx-name')).toBe(
      `import { all } from './lib'\nimport { fx } from './fx-name'`,
    )
  })

  it('includes every effect in every flavour', () => {
    expect(registry.effects.map((e) => e.slug)).toEqual(slugs)
    for (const e of registry.effects) {
      expect(e.files.vanilla.map((f) => f.path)).toEqual([`${e.slug}.ts`])
      expect(e.files.react.map((f) => f.path)).toEqual([`${e.slug}.ts`, `${e.component}.tsx`])
      expect(e.files.astro.map((f) => f.path)).toEqual([`${e.slug}.ts`, `${e.component}.astro`])
    }
  })

  it('leaves no repo-relative imports behind', () => {
    for (const e of registry.effects) {
      for (const f of Object.values(e.files).flat()) {
        expect(f.content, `${e.slug}/${f.path}`).not.toMatch(/from '\.\.\/|from '\.\/core'/)
      }
    }
  })

  it('keeps every effect within its size budget', () => {
    for (const e of registry.effects) expect(e.size, e.slug).toBeLessThanOrEqual(e.budget)
  })

  it('exports the function and component named in meta.json', () => {
    for (const e of registry.effects) {
      const [core, react] = e.files.react
      expect(core?.content).toContain(`export function ${e.export}(`)
      expect(react?.content).toContain(`export function ${e.component}(`)
    }
  })

  it('produces shadcn registry items', () => {
    const item = shadcnItem(registry.effects[0] as never, registry.lib)
    expect(item.name).toBe(slugs[0])
    expect(item.files.map((f) => f.path)).toContain('jawdrop/lib.ts')
    const index = shadcnIndex(registry)
    expect(index.items).toHaveLength(slugs.length)
    expect(index.items[0]).not.toHaveProperty('files.0.content')
  })

  it.each(slugs)('%s.astro compiles', async (slug) => {
    const source = readFileSync(join(effectsDir, slug, 'astro.astro'), 'utf8')
    const result = await transform(source, { filename: `${slug}.astro` })
    expect(result.diagnostics.filter((d) => d.severity === 1)).toEqual([])
  })
})
