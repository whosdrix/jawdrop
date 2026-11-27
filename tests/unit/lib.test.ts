import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  all,
  clamp,
  hexToRgb,
  loop,
  prefersReducedMotion,
  scrollProgress,
  splitText,
} from '../../effects/lib.ts'
import { setMotion } from './helpers.ts'

afterEach(() => setMotion(undefined))

describe('lib', () => {
  it('clamps', () => {
    expect(clamp(2)).toBe(1)
    expect(clamp(-1)).toBe(0)
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it('parses hex colors', () => {
    expect(hexToRgb('#ffffff')).toEqual([1, 1, 1])
    expect(hexToRgb('#000')).toEqual([0, 0, 0])
    expect(hexToRgb('#ff0000')).toEqual([1, 0, 0])
    expect(hexToRgb('nope')).toEqual([1, 1, 1])
  })

  it('lets the page force reduced motion either way', () => {
    setMotion('reduce')
    expect(prefersReducedMotion()).toBe(true)
    setMotion('full')
    expect(prefersReducedMotion()).toBe(false)
  })

  it('runs cleanups once, in reverse order', () => {
    const calls: number[] = []
    const destroy = all(
      () => calls.push(1),
      () => calls.push(2),
    )
    destroy()
    destroy()
    expect(calls).toEqual([2, 1])
  })

  it('stops the loop while the tab is hidden and resumes after', async () => {
    const el = document.createElement('div')
    document.body.append(el)
    const frame = vi.fn()
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    const stop = loop(el, frame)
    await new Promise((r) => setTimeout(r, 60))
    expect(frame).not.toHaveBeenCalled()
    hidden.mockReturnValue(false)
    document.dispatchEvent(new Event('visibilitychange'))
    await new Promise((r) => setTimeout(r, 60))
    expect(frame).toHaveBeenCalled()
    stop()
    const count = frame.mock.calls.length
    await new Promise((r) => setTimeout(r, 60))
    expect(frame.mock.calls.length).toBe(count)
    hidden.mockRestore()
  })

  it('measures scroll progress through the viewport', () => {
    const el = document.createElement('div')
    const rect = (top: number) => ({ top, height: 100 }) as DOMRect
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(rect(innerHeight))
    expect(scrollProgress(el)).toBe(0)
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(rect(-100))
    expect(scrollProgress(el)).toBe(1)
  })

  it('splits text without losing whitespace between words', () => {
    const p = document.createElement('p')
    p.textContent = '  one   two '
    const { words, pieces } = splitText(p, 'char')
    expect(words).toHaveLength(2)
    expect(pieces).toHaveLength(6)
    expect(p.textContent).toBe('one two')
  })
})
