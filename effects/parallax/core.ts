import { all, type Destroy, on, onScroll, prefersReducedMotion, snapshot } from '../lib'

export interface ParallaxOptions {
  /** Maximum travel in pixels for a layer with depth 1. */
  distance?: number
  /** Also shift layers with the pointer. */
  pointer?: boolean
  /** Scroll container, if the scene is not scrolled by the page. */
  root?: HTMLElement | null
}

/** Moves every child with a `data-depth` attribute (-1 to 1) at its own speed. */
export function parallax(el: HTMLElement, options: ParallaxOptions = {}): Destroy {
  const { distance = 120, pointer = true, root = null } = options
  if (prefersReducedMotion()) return () => {}
  const layers = Array.from(el.querySelectorAll<HTMLElement>('[data-depth]'))
  const restores = layers.map(snapshot)
  const target = { x: 0, y: 0 }
  const current = { x: 0, y: 0 }
  let scrollShift = 0
  let raf = 0

  const apply = () => {
    current.x += (target.x - current.x) * 0.08
    current.y += (target.y - current.y) * 0.08
    for (const layer of layers) {
      const depth = Number(layer.dataset.depth) || 0
      const x = current.x * depth * distance * 0.25
      const y = scrollShift * depth * distance + current.y * depth * distance * 0.25
      layer.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`
    }
    if (Math.abs(target.x - current.x) + Math.abs(target.y - current.y) > 0.001) {
      raf = requestAnimationFrame(apply)
    } else raf = 0
  }
  const kick = () => {
    if (!raf) raf = requestAnimationFrame(apply)
  }

  const stopScroll = onScroll(() => {
    const r = el.getBoundingClientRect()
    const viewTop = root ? root.getBoundingClientRect().top : 0
    const viewH = root ? root.clientHeight : innerHeight
    const center = r.top - viewTop + r.height / 2
    scrollShift = (center - viewH / 2) / viewH
    apply()
  }, root)

  const move = (e: PointerEvent) => {
    const r = el.getBoundingClientRect()
    target.x = ((e.clientX - r.left) / r.width - 0.5) * 2
    target.y = ((e.clientY - r.top) / r.height - 0.5) * 2
    kick()
  }
  const leave = () => {
    target.x = target.y = 0
    kick()
  }
  const offs = pointer ? [on(el, 'pointermove', move), on(el, 'pointerleave', leave)] : []
  return all(...restores, stopScroll, ...offs, () => cancelAnimationFrame(raf))
}
