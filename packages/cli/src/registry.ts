import { readFileSync } from 'node:fs'
import type { Flavour } from './detect.ts'

export interface RegistryFile {
  path: string
  content: string
}

export interface RegistryEffect {
  slug: string
  name: string
  category: string
  description: string
  component: string
  export: string
  size: number
  files: Record<Flavour, RegistryFile[]>
}

export interface Registry {
  lib: RegistryFile
  effects: RegistryEffect[]
}

export function loadRegistry(url = new URL('../registry.json', import.meta.url)): Registry {
  return JSON.parse(readFileSync(url, 'utf8'))
}
