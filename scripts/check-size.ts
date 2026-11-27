import { buildRegistry } from './registry.ts'

const { effects } = await buildRegistry()
const over = effects.filter((e) => e.size > e.budget)
for (const e of effects) {
  console.log(
    `${e.size > e.budget ? '✗' : '✓'} ${e.slug.padEnd(20)} ${e.size} B (budget ${e.budget} B)`,
  )
}
if (over.length) {
  console.error(`\n${over.length} effect(s) over their size budget`)
  process.exit(1)
}
