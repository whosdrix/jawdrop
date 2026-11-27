import {
  all,
  backdrop,
  type Destroy,
  fitCanvas,
  isCoarsePointer,
  loop,
  on,
  prefersReducedMotion,
} from '../lib'

export interface TrailingInkOptions {
  /** Ink color. */
  color?: string
  /** Width of the stroke at the cursor, in pixels. */
  width?: number
  /** How long the trail lasts, in ms. */
  life?: number
  /** Draw above the content instead of behind it. */
  overlay?: boolean
}

export function trailingInk(el: HTMLElement, options: TrailingInkOptions = {}): Destroy {
  const { color = '#7aa2ff', width = 14, life = 600, overlay = false } = options
  if (prefersReducedMotion() || isCoarsePointer()) return () => {}
  const canvas = document.createElement('canvas')
  const remove = backdrop(el, canvas)
  if (overlay) canvas.style.zIndex = '1'
  const ctx = canvas.getContext('2d')
  if (!ctx) return remove

  let dpr = 1
  let now = 0
  const points: { x: number; y: number; t: number }[] = []
  const stopFit = fitCanvas(canvas, (_w, _h, ratio) => {
    dpr = ratio
  })

  const move = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect()
    points.push({ x: e.clientX - r.left, y: e.clientY - r.top, t: now })
  }

  const draw = (time: number) => {
    now = time
    while (points.length && now - (points[0] as { t: number }).t > life) points.shift()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (points.length < 2) return
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = color
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1] as { x: number; y: number; t: number }
      const b = points[i] as { x: number; y: number; t: number }
      const k = 1 - (now - b.t) / life
      ctx.globalAlpha = k * 0.9
      ctx.lineWidth = Math.max(0.5, width * k)
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      const mx = (a.x + b.x) / 2
      const my = (a.y + b.y) / 2
      ctx.quadraticCurveTo(a.x, a.y, mx, my)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  return all(remove, stopFit, on(el, 'pointermove', move), loop(el, draw))
}
