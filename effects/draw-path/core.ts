import { all, type Destroy, onScroll, prefersReducedMotion } from '../lib'

export interface DrawPathOptions {
  /** Where drawing starts: 1 means when the element's top enters at the bottom of the viewport. */
  start?: number
  /** Where drawing finishes: 0 means when the element's bottom reaches the top. */
  end?: number
  /** Scroll container, if the drawing is not scrolled by the page. */
  root?: HTMLElement | null
}

type Stroke = SVGGeometryElement & { style: CSSStyleDeclaration }

/** Draws every stroked SVG shape inside `el` as it scrolls through the viewport. */
export function drawPath(el: Element, options: DrawPathOptions = {}): Destroy {
  const { start = 0.9, end = 0.35, root = null } = options
  const shapes = Array.from(
    el.querySelectorAll<Stroke>('path, line, polyline, polygon, circle, ellipse, rect'),
  )
  if (prefersReducedMotion() || shapes.length === 0) return () => {}
  const saved = shapes.map((s) => [s.style.strokeDasharray, s.style.strokeDashoffset] as const)
  const lengths = shapes.map((s) => {
    const len = typeof s.getTotalLength === 'function' ? s.getTotalLength() : 0
    s.style.strokeDasharray = `${len} ${len}`
    s.style.strokeDashoffset = String(len)
    return len
  })

  const update = () => {
    const r = el.getBoundingClientRect()
    const viewTop = root ? root.getBoundingClientRect().top : 0
    const viewH = root ? root.clientHeight : innerHeight
    const from = viewTop + viewH * start
    const to = viewTop + viewH * end - r.height
    const p = Math.min(1, Math.max(0, (from - r.top) / (from - to || 1)))
    shapes.forEach((s, i) => {
      const len = lengths[i] as number
      s.style.strokeDashoffset = String(len * (1 - p))
    })
  }
  return all(onScroll(update, root), () =>
    shapes.forEach((s, i) => {
      const [dash, off] = saved[i] as readonly [string, string]
      s.style.strokeDasharray = dash
      s.style.strokeDashoffset = off
    }),
  )
}
