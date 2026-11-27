import { afterEach, describe, expect, it } from 'vitest'
import { demo, load, meta, setMotion, slugs, trackListeners } from './helpers.ts'

const CATEGORIES = ['text', 'backgrounds', 'scroll', 'cursor']

function mount(slug: string) {
  document.body.innerHTML = demo(slug)
  const el = document.querySelector<HTMLElement>('[data-fx]')
  const root = document.querySelector<HTMLElement>('[data-root]')
  if (!el) throw new Error(`${slug}/demo.html has no [data-fx] element`)
  return { el, root }
}

afterEach(() => {
  setMotion(undefined)
  document.body.innerHTML = ''
})

describe.each(slugs)('%s', (slug) => {
  it('has complete metadata', () => {
    const m = meta(slug)
    expect(m.name).toBeTruthy()
    expect(m.description.length).toBeGreaterThan(20)
    expect(CATEGORIES).toContain(m.category)
    expect(m.component).toMatch(/^[A-Z][A-Za-z]+$/)
    for (const [key, spec] of Object.entries(m.options)) {
      if (spec.type === 'number') {
        expect(spec.default, key).toBeGreaterThanOrEqual(spec.min as number)
        expect(spec.default, key).toBeLessThanOrEqual(spec.max as number)
      }
      if (spec.type === 'select') expect(spec.values, key).toContain(spec.default)
    }
  })

  for (const motion of ['full', 'reduce'] as const) {
    it(`mounts and cleans up completely (${motion} motion)`, async () => {
      setMotion(motion)
      const fx = await load(slug)
      const { el, root } = mount(slug)
      const before = document.body.innerHTML
      const listeners = trackListeners()
      try {
        const destroy = fx(el, root ? { root } : {})
        expect(typeof destroy).toBe('function')
        await new Promise((r) => setTimeout(r, 40))
        destroy()
        destroy()
        expect(listeners.live()).toBe(0)
      } finally {
        listeners.restore()
      }
      expect(document.body.innerHTML).toBe(before)
    })
  }
})
