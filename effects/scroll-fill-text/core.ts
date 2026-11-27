import {
  all,
  clamp,
  type Destroy,
  onScroll,
  prefersReducedMotion,
  scrollProgress,
  snapshot,
  splitText,
} from '../lib'

export interface ScrollFillTextOptions {
  /** Opacity of the words that have not been reached yet, 0 to 1. */
  dim?: number
  /** Color of the soft sweep at the reading edge. */
  highlight?: string
  /** How many words are mid-fill at the same time. */
  spread?: number
  /** Viewport position (0 top, 1 bottom) of the paragraph's top when the first word lights up. */
  start?: number
  /** Viewport position of the paragraph's bottom when the last word is lit. */
  end?: number
  /** Scroll container, if the text is not scrolled by the page. */
  root?: HTMLElement | null
}

export function scrollFillText(el: HTMLElement, options: ScrollFillTextOptions = {}): Destroy {
  const {
    dim = 0.16,
    highlight = '#7aa2ff',
    spread = 4,
    start = 0.85,
    end = 0.45,
    root = null,
  } = options
  if (prefersReducedMotion()) return () => {}
  const restore = snapshot(el)
  const { pieces } = splitText(el, 'word')
  const faint = `color-mix(in srgb,currentColor ${dim * 100}%,transparent)`
  for (const piece of pieces) {
    piece.style.setProperty('-webkit-background-clip', 'text')
    piece.style.backgroundClip = 'text'
    piece.style.setProperty('-webkit-text-fill-color', 'transparent')
  }

  const shown = new Float32Array(pieces.length).fill(-1)
  const paint = (progress: number) => {
    const head = progress * (pieces.length + spread)
    pieces.forEach((piece, i) => {
      const p = clamp((head - i) / spread)
      if (p === shown[i]) return
      shown[i] = p
      const edge = p * 170 - 35
      piece.style.backgroundImage = `linear-gradient(90deg,currentColor ${edge - 35}%,${highlight} ${edge}%,${faint} ${edge + 35}%)`
    })
  }

  let current = -1
  let target = 0
  let raf = 0
  const tick = () => {
    current += (target - current) * 0.14
    if (Math.abs(target - current) < 0.0004) current = target
    paint(current)
    raf = current === target ? 0 : requestAnimationFrame(tick)
  }
  const stop = onScroll(() => {
    target = scrollProgress(el, root, start, end)
    if (current < 0) {
      current = target
      paint(current)
    } else if (!raf) raf = requestAnimationFrame(tick)
  }, root)

  return all(restore, stop, () => cancelAnimationFrame(raf))
}
