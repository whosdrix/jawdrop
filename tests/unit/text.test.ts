import { afterEach, describe, expect, it, vi } from 'vitest'
import { gradientSweep } from '../../effects/gradient-sweep/core.ts'
import { scrambleText } from '../../effects/scramble-text/core.ts'
import { splitReveal } from '../../effects/split-reveal/core.ts'
import { setMotion } from './helpers.ts'

const el = (html: string) => {
  document.body.innerHTML = html
  return document.body.firstElementChild as HTMLElement
}

afterEach(() => {
  setMotion(undefined)
  vi.useRealTimers()
})

describe('scrambleText', () => {
  it('keeps the real text available to screen readers', () => {
    const h = el('<h1>Hello world</h1>')
    const destroy = scrambleText(h, { trigger: 'load' })
    expect(h.getAttribute('aria-label')).toBe('Hello world')
    expect(h.firstElementChild?.getAttribute('aria-hidden')).toBe('true')
    destroy()
    expect(h.outerHTML).toBe('<h1>Hello world</h1>')
  })

  it('settles on the final text', async () => {
    const h = el('<h1>Signal</h1>')
    const destroy = scrambleText(h, { trigger: 'load', duration: 50 })
    await new Promise((r) => setTimeout(r, 200))
    expect(h.textContent).toBe('Signal')
    destroy()
  })

  it('can resolve to a different text than the element holds', () => {
    const h = el('<h1>old</h1>')
    scrambleText(h, { text: 'new text', trigger: 'hover' })
    expect(h.textContent).toBe('new text')
  })

  it('shows the final text at once with reduced motion', () => {
    setMotion('reduce')
    const h = el('<h1>Calm</h1>')
    scrambleText(h, { trigger: 'load' })
    expect(h.textContent).toBe('Calm')
  })
})

describe('splitReveal', () => {
  it('splits into words with the sentence kept in aria-label', () => {
    const p = el('<p>Make them look twice</p>')
    splitReveal(p)
    expect(p.getAttribute('aria-label')).toBe('Make them look twice')
    expect(p.querySelectorAll('[aria-hidden="true"]')).toHaveLength(4)
    expect(p.textContent).toBe('Make them look twice')
  })

  it('splits into characters', () => {
    const p = el('<p>ab cd</p>')
    splitReveal(p, { by: 'char' })
    expect(p.querySelectorAll('[aria-hidden="true"] > span')).toHaveLength(4)
  })
})

describe('gradientSweep', () => {
  it('clips a looping gradient to the text', () => {
    const h = el('<h2>Chromatic</h2>')
    const destroy = gradientSweep(h, { colors: ['#000', '#fff'] })
    expect(h.style.backgroundImage).toContain('#000, #fff, #000')
    expect(h.getAnimations()).toHaveLength(1)
    destroy()
    expect(h.getAnimations()).toHaveLength(0)
    expect(h.getAttribute('style')).toBeNull()
  })
})
