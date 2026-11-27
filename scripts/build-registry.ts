import { mkdirSync, writeFileSync } from 'node:fs'
import { buildRegistry, shadcnIndex, shadcnItem } from './registry.ts'

const root = `${import.meta.dirname}/../`
const registry = await buildRegistry()

mkdirSync(`${root}site/public/r`, { recursive: true })
for (const effect of registry.effects) {
  writeFileSync(
    `${root}site/public/r/${effect.slug}.json`,
    `${JSON.stringify(shadcnItem(effect, registry.lib), null, 2)}\n`,
  )
}
writeFileSync(
  `${root}site/public/r/registry.json`,
  `${JSON.stringify(shadcnIndex(registry), null, 2)}\n`,
)
writeFileSync(`${root}packages/cli/registry.json`, JSON.stringify(registry))

console.log(`registry: ${registry.effects.length} effects`)
for (const e of registry.effects) {
  const flag = e.size > e.budget ? '  OVER BUDGET' : ''
  console.log(
    `  ${e.slug.padEnd(20)} ${(e.size / 1024).toFixed(2)} KB / ${(e.budget / 1024).toFixed(1)} KB${flag}`,
  )
}
