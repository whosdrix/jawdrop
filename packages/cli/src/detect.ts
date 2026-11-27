import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export type Flavour = 'vanilla' | 'react' | 'astro'

export interface Project {
  flavour: Flavour
  dir: string
}

/** Picks the flavour and install folder from the project's package.json and layout. */
export function detect(cwd: string): Project {
  let deps: Record<string, string> = {}
  try {
    const pkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'))
    deps = { ...pkg.dependencies, ...pkg.devDependencies }
  } catch {}
  const flavour: Flavour = 'astro' in deps ? 'astro' : 'react' in deps ? 'react' : 'vanilla'
  const base = existsSync(join(cwd, 'src')) ? 'src/components' : 'components'
  return { flavour, dir: `${base}/jawdrop` }
}
