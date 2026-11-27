import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { build } from 'esbuild'

export const EFFECTS_DIR = join(import.meta.dirname, '../effects')
export const SITE_URL = 'https://whosdrix.github.io/jawdrop'

export type Category = 'text' | 'backgrounds' | 'scroll' | 'cursor'
export type Flavour = 'vanilla' | 'react' | 'astro'

export interface OptionSpec {
  type: 'number' | 'select' | 'boolean' | 'color'
  default: number | string | boolean
  label: string
  min?: number
  max?: number
  step?: number
  values?: string[]
}

export interface EffectMeta {
  name: string
  category: Category
  description: string
  export: string
  component: string
  budget: number
  options: Record<string, OptionSpec>
}

export interface RegistryFile {
  path: string
  content: string
}

export interface RegistryEffect extends Omit<EffectMeta, 'options'> {
  slug: string
  size: number
  files: Record<Flavour, RegistryFile[]>
}

export interface Registry {
  lib: RegistryFile
  effects: RegistryEffect[]
}

export function listEffects(dir = EFFECTS_DIR): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
}

export function readMeta(slug: string, dir = EFFECTS_DIR): EffectMeta {
  return JSON.parse(readFileSync(join(dir, slug, 'meta.json'), 'utf8'))
}

/** Rewrites repo-relative imports into the flat layout used once an effect is installed. */
export function toInstalled(source: string, slug: string): string {
  return source
    .replaceAll(`from '../lib'`, `from './lib'`)
    .replaceAll(`from './core'`, `from './${slug}'`)
}

export async function gzipSize(entry: string): Promise<number> {
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    minify: true,
    format: 'esm',
    write: false,
    target: 'es2022',
    logLevel: 'silent',
  })
  const code = result.outputFiles[0]?.contents ?? new Uint8Array()
  return gzipSync(code, { level: 9 }).length
}

export async function buildRegistry(dir = EFFECTS_DIR): Promise<Registry> {
  const lib = { path: 'lib.ts', content: readFileSync(join(dir, 'lib.ts'), 'utf8') }
  const effects: RegistryEffect[] = []
  for (const slug of listEffects(dir)) {
    const { options: _options, ...meta } = readMeta(slug, dir)
    const read = (file: string) => toInstalled(readFileSync(join(dir, slug, file), 'utf8'), slug)
    const core = { path: `${slug}.ts`, content: read('core.ts') }
    effects.push({
      ...meta,
      slug,
      size: await gzipSize(join(dir, slug, 'core.ts')),
      files: {
        vanilla: [core],
        react: [core, { path: `${meta.component}.tsx`, content: read('react.tsx') }],
        astro: [core, { path: `${meta.component}.astro`, content: read('astro.astro') }],
      },
    })
  }
  return { lib, effects }
}

/** A registry item in the format the shadcn CLI understands. */
export function shadcnItem(effect: RegistryEffect, lib: RegistryFile) {
  return {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    name: effect.slug,
    type: 'registry:component',
    title: effect.name,
    description: effect.description,
    categories: [effect.category],
    files: [lib, ...effect.files.react].map((f) => ({
      path: `jawdrop/${f.path}`,
      type: 'registry:component',
      target: `components/jawdrop/${f.path}`,
      content: f.content,
    })),
  }
}

export function shadcnIndex(registry: Registry) {
  return {
    $schema: 'https://ui.shadcn.com/schema/registry.json',
    name: 'jawdrop',
    homepage: SITE_URL,
    items: registry.effects.map((e) => {
      const { files: _files, ...rest } = shadcnItem(e, registry.lib)
      return {
        ...rest,
        files: [registry.lib, ...e.files.react].map((f) => ({
          path: `jawdrop/${f.path}`,
          type: 'registry:component',
        })),
      }
    }),
  }
}
