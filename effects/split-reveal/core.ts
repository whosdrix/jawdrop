import { all, type Destroy, inView, prefersReducedMotion, snapshot, splitText } from '../lib'

export interface SplitRevealOptions {
  /** Animate each word, or each character. */
  by?: 'word' | 'char'
  /** Delay between pieces in ms. */
  stagger?: number
  /** Duration of each piece in ms. */
  duration?: number
  /** Play again every time it scrolls back into view. */
  repeat?: boolean
}

export function splitReveal(el: HTMLElement, options: SplitRevealOptions = {}): Destroy {
  const { by = 'word', stagger = by === 'char' ? 18 : 60, duration = 900, repeat = false } = options
  const restore = snapshot(el)
  const { words, pieces } = splitText(el, by)
  const reduced = prefersReducedMotion()

  for (const word of words) {
    word.style.overflow = 'clip'
    word.style.paddingBottom = '0.12em'
    word.style.marginBottom = '-0.12em'
  }
  const hidden = reduced
    ? { opacity: '0' }
    : { transform: 'translateY(110%) rotate(4deg)', opacity: '0' }
  for (const p of pieces) Object.assign(p.style, hidden)

  let animations: Animation[] = []
  const show = () => {
    for (const a of animations) a.cancel()
    animations = pieces.map((p, i) => {
      const a = p.animate(
        reduced
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [
              { transform: 'translateY(110%) rotate(4deg)', opacity: 0 },
              { transform: 'none', opacity: 1 },
            ],
        {
          duration: reduced ? 400 : duration,
          delay: reduced ? 0 : i * stagger,
          easing: 'cubic-bezier(.2,.8,.2,1)',
          fill: 'forwards',
        },
      )
      return a
    })
  }
  const hide = () => {
    for (const a of animations) a.cancel()
    animations = []
  }

  const stop = inView(el, show, { once: !repeat, leave: repeat ? hide : undefined })
  return all(restore, stop, hide)
}
