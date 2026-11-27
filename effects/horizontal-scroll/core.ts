import { all, clamp, type Destroy, onScroll, prefersReducedMotion, snapshot } from '../lib'

export interface HorizontalScrollOptions {
  /** Distance from the top of the viewport where the section pins, in pixels. */
  top?: number
  /** Scroll container, if the section is not scrolled by the page. */
  root?: HTMLElement | null
}

/**
 * Pins the section while vertical scrolling moves its first child (the track) sideways.
 * With reduced motion it becomes a normal horizontally scrollable row.
 */
export function horizontalScroll(el: HTMLElement, options: HorizontalScrollOptions = {}): Destroy {
  const { top = 0, root = null } = options
  const track = el.firstElementChild as HTMLElement | null
  if (!track) return () => {}
  const restoreEl = snapshot(el)
  const restoreTrack = snapshot(track)
  track.style.display = 'flex'
  track.style.width = 'max-content'

  if (prefersReducedMotion()) {
    el.style.overflowX = 'auto'
    return all(restoreTrack, restoreEl)
  }

  const pin = document.createElement('div')
  Object.assign(pin.style, { position: 'sticky', top: `${top}px`, overflow: 'hidden' })
  el.replaceChildren(pin)
  pin.append(track)
  track.style.willChange = 'transform'

  const viewH = () => (root ? root.clientHeight : innerHeight)
  let travel = 0
  const measure = () => {
    travel = Math.max(0, track.scrollWidth - pin.clientWidth)
    pin.style.height = `${viewH() - top}px`
    pin.style.display = 'flex'
    pin.style.alignItems = 'center'
    el.style.height = `${viewH() - top + travel}px`
  }
  const update = () => {
    measure()
    const viewTop = root ? root.getBoundingClientRect().top : 0
    const scrolled = viewTop + top - el.getBoundingClientRect().top
    track.style.transform = `translate3d(${-clamp(scrolled, 0, travel)}px,0,0)`
  }
  return all(restoreTrack, restoreEl, onScroll(update, root))
}
