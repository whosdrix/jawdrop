import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { listEffects, readMeta } from './registry.ts'

// Run cardshot locally first: docker run -p 3000:3000 ghcr.io/whosdrix/cardshot
const CARDSHOT = process.env.CARDSHOT_URL ?? 'http://localhost:3000'
const OUT = join(import.meta.dirname, '../.github/assets')
const ACCENT = '5b8cff'

const effects = listEffects().map((slug) => ({ slug, ...readMeta(slug) }))
const titles: Record<string, string> = {
  text: 'Text that performs',
  backgrounds: 'Backgrounds with depth',
  scroll: 'Scroll that tells a story',
  cursor: 'Cursor and hover',
}

const cards: Record<string, Record<string, string>> = {
  repo: {
    template: 'repo',
    owner: 'whosdrix',
    name: 'jawdrop',
    description:
      'Copy-paste text, scroll, cursor and shader effects for React, Astro and plain HTML.',
    language: 'TypeScript',
    languageColor: '3178c6',
  },
  'social-preview': {
    template: 'basic',
    title: 'Effects that make people stop scrolling.',
    subtitle: `${effects.length} effects for React, Astro and plain HTML. Zero dependencies. Copy, paste, done.`,
    site: 'npx jawdrop add',
  },
}
for (const [category, title] of Object.entries(titles)) {
  const list = effects.filter((e) => e.category === category)
  cards[category] = {
    template: 'basic',
    title,
    subtitle: list.map((e) => e.name).join(' · '),
    site: `jawdrop / ${category} / ${list.length} effects`,
  }
}

mkdirSync(OUT, { recursive: true })
for (const [name, params] of Object.entries(cards)) {
  const url = `${CARDSHOT}/og?${new URLSearchParams({ accent: ACCENT, scale: '2', ...params })}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${name}: ${res.status} ${await res.text()}`)
  writeFileSync(join(OUT, `${name}.png`), Buffer.from(await res.arrayBuffer()))
  console.log(`  .github/assets/${name}.png`)
}
