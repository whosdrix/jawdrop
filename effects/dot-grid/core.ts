import {
  all,
  backdrop,
  type Destroy,
  fitCanvas,
  hexToRgb,
  loop,
  on,
  prefersReducedMotion,
} from '../lib'

export interface DotGridOptions {
  /** Distance between dots in CSS pixels. */
  gap?: number
  /** Dot radius in CSS pixels. */
  size?: number
  /** Resting dot color. */
  color?: string
  /** Color of dots near the cursor. */
  activeColor?: string
  /** Radius around the cursor that pushes dots, in CSS pixels. */
  radius?: number
  /** How far dots get pushed away. */
  strength?: number
}

export function dotGrid(el: HTMLElement, options: DotGridOptions = {}): Destroy {
  const {
    gap = 28,
    size = 1.6,
    color = '#3a4466',
    activeColor = '#7aa2ff',
    radius = 140,
    strength = 18,
  } = options
  const canvas = document.createElement('canvas')
  const remove = backdrop(el, canvas)
  const ctx = canvas.getContext('2d')
  if (!ctx) return remove

  const [r0, g0, b0] = hexToRgb(color)
  const [r1, g1, b1] = hexToRgb(activeColor)
  let w = 0
  let h = 0
  let dpr = 1
  let dots: {
    x: number
    y: number
    ox: number
    oy: number
    vx: number
    vy: number
    heat: number
  }[] = []
  const pointer = { x: -9999, y: -9999 }

  const build = (width: number, height: number, ratio: number) => {
    w = width
    h = height
    dpr = ratio
    dots = []
    const cols = Math.ceil(w / gap) + 1
    const rows = Math.ceil(h / gap) + 1
    const offX = (w - (cols - 1) * gap) / 2
    const offY = (h - (rows - 1) * gap) / 2
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const px = offX + x * gap
        const py = offY + y * gap
        dots.push({ x: px, y: py, ox: px, oy: py, vx: 0, vy: 0, heat: 0 })
      }
    }
    draw()
  }

  const draw = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    for (const d of dots) {
      const k = d.heat
      ctx.fillStyle = `rgb(${(r0 + (r1 - r0) * k) * 255},${(g0 + (g1 - g0) * k) * 255},${(b0 + (b1 - b0) * k) * 255})`
      ctx.beginPath()
      ctx.arc(d.x, d.y, size * (1 + k * 0.9), 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const stopFit = fitCanvas(canvas, build)
  if (prefersReducedMotion()) return all(remove, stopFit)

  const step = () => {
    for (const d of dots) {
      const dx = d.ox - pointer.x
      const dy = d.oy - pointer.y
      const dist = Math.hypot(dx, dy)
      const f = dist < radius ? (1 - dist / radius) ** 2 : 0
      const tx = d.ox + (dist ? (dx / dist) * f * strength : 0)
      const ty = d.oy + (dist ? (dy / dist) * f * strength : 0)
      d.vx = (d.vx + (tx - d.x) * 0.12) * 0.78
      d.vy = (d.vy + (ty - d.y) * 0.12) * 0.78
      d.x += d.vx
      d.y += d.vy
      d.heat += (f - d.heat) * 0.15
    }
    draw()
  }

  const move = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect()
    pointer.x = e.clientX - rect.left
    pointer.y = e.clientY - rect.top
  }
  const leave = () => {
    pointer.x = pointer.y = -9999
  }

  return all(
    remove,
    stopFit,
    on(el, 'pointermove', move),
    on(el, 'pointerleave', leave),
    loop(el, step),
  )
}
