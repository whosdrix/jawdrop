import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { EFFECTS_DIR } from './registry.ts'

const [slug, category = 'text'] = process.argv.slice(2)
if (!slug || !/^[a-z][a-z0-9-]*$/.test(slug)) {
  console.error('Usage: npm run new -- <kebab-case-name> [text|backgrounds|scroll|cursor]')
  process.exit(1)
}
const dir = join(EFFECTS_DIR, slug)
if (existsSync(dir)) {
  console.error(`effects/${slug} already exists`)
  process.exit(1)
}

const camel = slug.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())
const pascal = camel[0]?.toUpperCase() + camel.slice(1)
const iface = `${pascal}Options`

const files: Record<string, string> = {
  'core.ts': `import { type Destroy, all, loop, prefersReducedMotion, snapshot } from '../lib'

export interface ${iface} {
  /** Animation speed. */
  speed?: number
}

export function ${camel}(el: HTMLElement, options: ${iface} = {}): Destroy {
  const { speed = 1 } = options
  const restore = snapshot(el)
  if (prefersReducedMotion()) return restore

  const stop = loop(el, (time) => {
    el.style.transform = \`translateY(\${Math.sin((time / 1000) * speed) * 4}px)\`
  })
  return all(restore, stop)
}
`,
  'react.tsx': `'use client'
import { type HTMLAttributes, type ReactNode, useEffect, useRef } from 'react'
import { type ${iface}, ${camel} } from './core'

type Props = ${iface} &
  Omit<HTMLAttributes<HTMLElement>, keyof ${iface}> & {
    as?: 'div' | 'section' | 'span'
    children?: ReactNode
  }

export function ${pascal}({ as = 'div', speed, children, ...rest }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    return ${camel}(ref.current, { speed })
  }, [speed])
  const Tag = as as 'div'
  return (
    <Tag ref={ref} {...rest}>
      {children}
    </Tag>
  )
}
`,
  'astro.astro': `---
import type { ${iface} } from './core'

type Props = ${iface} & { as?: string; class?: string }
const { as: Tag = 'div', class: className, ...options } = Astro.props
---

<Tag class={className} data-jawdrop="${slug}" data-options={JSON.stringify(options)}><slot /></Tag>

<script>
  import { ${camel} } from './core'

  for (const el of document.querySelectorAll<HTMLElement>('[data-jawdrop="${slug}"]')) {
    ${camel}(el, JSON.parse(el.dataset.options ?? '{}'))
  }
</script>
`,
  'meta.json': `${JSON.stringify(
    {
      name: pascal.replace(/([a-z])([A-Z])/g, '$1 $2'),
      category,
      description: 'One sentence on what it does and why it looks good.',
      export: camel,
      component: pascal,
      budget: 2048,
      options: {
        speed: { type: 'number', default: 1, min: 0.1, max: 4, step: 0.1, label: 'Speed' },
      },
    },
    null,
    2,
  )}\n`,
  'demo.html': `<div data-fx class="demo-center">${pascal}</div>\n`,
}

mkdirSync(dir)
for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content)
console.log(`Created effects/${slug}. Run npm run dev and open #/${slug}.`)
