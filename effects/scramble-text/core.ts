import { all, type Destroy, inView, on, prefersReducedMotion, snapshot } from '../lib'

export interface ScrambleTextOptions {
  /** Text to resolve to. Defaults to the element's own text. */
  text?: string
  /** Total time in ms for the last character to settle. */
  duration?: number
  /** Glyphs used while scrambling. */
  chars?: string
  /** When to play: on mount, when scrolled into view, or on every hover. */
  trigger?: 'load' | 'view' | 'hover'
}

export function scrambleText(el: HTMLElement, options: ScrambleTextOptions = {}): Destroy {
  const {
    text = el.textContent?.trim() ?? '',
    duration = 1200,
    chars = '!<>-_\\/[]{}=+*^?#ABCDEFGHJKLMNPQRSTUVWXYZ0123456789',
    trigger = 'view',
  } = options
  const restore = snapshot(el)
  el.setAttribute('aria-label', text)
  const visual = document.createElement('span')
  visual.setAttribute('aria-hidden', 'true')
  visual.style.whiteSpace = 'pre-wrap'
  visual.textContent = text
  el.replaceChildren(visual)

  if (prefersReducedMotion()) return restore

  const glyphs = [...text]
  let raf = 0
  const play = () => {
    cancelAnimationFrame(raf)
    const start = performance.now()
    const settle = glyphs.map(
      (_, i) =>
        (duration * 0.35 * i) / Math.max(1, glyphs.length - 1) + duration * 0.65 * Math.random(),
    )
    const frame = (now: number) => {
      const t = now - start
      let done = true
      let out = ''
      for (let i = 0; i < glyphs.length; i++) {
        const g = glyphs[i] as string
        if (t >= (settle[i] as number) || g.trim() === '') out += g
        else {
          done = false
          out += chars[Math.floor(Math.random() * chars.length)]
        }
      }
      visual.textContent = out
      if (!done) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
  }

  let stop: Destroy = () => {}
  if (trigger === 'hover') stop = on(el, 'pointerenter', play)
  else if (trigger === 'view') stop = inView(el, play)
  else play()

  return all(restore, stop, () => cancelAnimationFrame(raf))
}
