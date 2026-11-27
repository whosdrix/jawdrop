import { all, type Destroy, loop, on, prefersReducedMotion, snapshot } from '../lib'

export interface MarqueeOptions {
  /** Base speed in pixels per second. */
  speed?: number
  /** 1 moves right, -1 moves left. */
  direction?: 1 | -1
  /** Scrolling the page speeds the marquee up and flips it with the scroll direction. */
  scrollBoost?: boolean
  /** Slow down to a stop while hovered. */
  pauseOnHover?: boolean
}

export function marquee(el: HTMLElement, options: MarqueeOptions = {}): Destroy {
  const { speed = 80, direction = -1, scrollBoost = true, pauseOnHover = true } = options
  const restore = snapshot(el)
  const track = document.createElement('div')
  const first = document.createElement('div')
  first.append(...Array.from(el.childNodes))
  track.append(first)
  el.append(track)
  el.style.overflow = 'hidden'
  Object.assign(track.style, { display: 'flex', width: 'max-content', willChange: 'transform' })
  first.style.display = 'flex'
  first.style.flexShrink = '0'

  if (prefersReducedMotion()) return restore

  const copies = Math.max(1, Math.ceil((el.clientWidth * 2) / Math.max(1, first.offsetWidth)))
  for (let i = 0; i < copies; i++) {
    const clone = first.cloneNode(true) as HTMLElement
    clone.setAttribute('aria-hidden', 'true')
    clone.inert = true
    track.append(clone)
  }

  let x = 0
  let dir: number = direction
  let boost = 0
  let hoverFactor = 1
  let hovered = false
  let lastScroll = scrollY

  const offs: Destroy[] = []
  if (scrollBoost) {
    offs.push(
      on(
        window,
        'scroll',
        () => {
          const dy = scrollY - lastScroll
          lastScroll = scrollY
          boost = Math.min(boost + Math.abs(dy) * 0.15, 12)
          if (dy !== 0) dir = dy > 0 ? direction : -direction
        },
        { passive: true },
      ),
    )
  }
  if (pauseOnHover) {
    offs.push(
      on(el, 'pointerenter', () => {
        hovered = true
      }),
      on(el, 'pointerleave', () => {
        hovered = false
      }),
    )
  }

  const stop = loop(el, (_, dt) => {
    const width = first.offsetWidth
    if (!width) return
    hoverFactor += ((hovered ? 0 : 1) - hoverFactor) * 0.08
    boost *= 0.92
    x -= (dir * speed * (1 + boost) * hoverFactor * dt) / 1000
    x = ((x % width) + width) % width
    track.style.transform = `translate3d(${-x}px,0,0)`
  })

  return all(restore, stop, ...offs)
}
