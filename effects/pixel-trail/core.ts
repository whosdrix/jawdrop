import {
  all,
  backdrop,
  type Destroy,
  fitCanvas,
  hexToRgb,
  lerp,
  loop,
  on,
  prefersReducedMotion,
} from '../lib'

export interface PixelTrailOptions {
  /** Size of one cell in CSS pixels, gap included. */
  size?: number
  /** Gap between cells in CSS pixels. */
  gap?: number
  /** How long a cell takes to go dark, in ms. */
  fade?: number
  /** Brush radius in cells. */
  radius?: number
  /** Color of a freshly lit cell. */
  color?: string
  /** Color cells cool down to before they go dark. */
  trailColor?: string
  /** Draws its own wandering trail while nobody is touching it. */
  idle?: boolean
}

const SHADES = 48

/** Moving lights cells along the path of the cursor, and a click or tap sends out a ring. */
export function pixelTrail(el: HTMLElement, options: PixelTrailOptions = {}): Destroy {
  const {
    size = 18,
    gap = 2,
    fade = 900,
    radius = 1.6,
    color = '#c9f5ff',
    trailColor = '#5b3df5',
    idle = true,
  } = options
  const canvas = document.createElement('canvas')
  const remove = backdrop(el, canvas)
  Object.assign(canvas.style, {
    backgroundImage: 'radial-gradient(rgba(128,128,128,.3) 1px,transparent 1.5px)',
    backgroundSize: `${size}px ${size}px`,
    backgroundPosition: 'center',
  })
  const ctx = canvas.getContext('2d')
  if (!ctx || prefersReducedMotion()) return remove

  const hot = hexToRgb(color)
  const cold = hexToRgb(trailColor)
  const shades = Array.from({ length: SHADES }, (_, i) => {
    const k = i / (SHADES - 1)
    const mix = k ** 1.5
    const c = [0, 1, 2].map((j) => Math.round(lerp(cold[j] as number, hot[j] as number, mix) * 255))
    return `rgba(${c},${Math.min(1, k * 2.2)})`
  })

  let w = 0
  let h = 0
  let dpr = 1
  let cols = 0
  let rows = 0
  let offX = 0
  let offY = 0
  let heat = new Float32Array(0)
  let rect: DOMRect | null = null
  let last: [number, number] | null = null
  let touched = -1e5
  let now = 0
  let dark = true
  let rings: [x: number, y: number, born: number][] = []
  let ghost: [number, number] | null = null

  const stopFit = fitCanvas(canvas, (width, height, ratio) => {
    w = width
    h = height
    dpr = ratio
    offX = ((w / 2 - size / 2) % size) - size
    offY = ((h / 2 - size / 2) % size) - size
    cols = Math.ceil((w - offX) / size)
    rows = Math.ceil((h - offY) / size)
    heat = new Float32Array(cols * rows)
    rect = null
  })

  const stamp = (x: number, y: number) => {
    const cx = (x - offX) / size
    const cy = (y - offY) / size
    const reach = Math.ceil(radius)
    for (let j = Math.floor(cy) - reach; j <= cy + reach; j++) {
      for (let i = Math.floor(cx) - reach; i <= cx + reach; i++) {
        if (i < 0 || j < 0 || i >= cols || j >= rows) continue
        const d = Math.hypot(i + 0.5 - cx, j + 0.5 - cy) / radius
        if (d < 1) heat[j * cols + i] = Math.max(heat[j * cols + i] as number, 1 - d * d * 0.7)
      }
    }
    dark = false
  }
  const line = (from: [number, number] | null, x: number, y: number): [number, number] => {
    const [fx, fy] = from ?? [x, y]
    const steps = Math.min(64, Math.ceil(Math.hypot(x - fx, y - fy) / (size / 2))) || 1
    for (let s = 1; s <= steps; s++) stamp(lerp(fx, x, s / steps), lerp(fy, y, s / steps))
    return [x, y]
  }

  const frame = (time: number, delta: number) => {
    now = time
    if (idle && time - touched > 1400) {
      const t = time / 1000
      ghost = line(
        ghost,
        w * (0.5 + 0.4 * Math.sin(t * 0.9) * Math.cos(t * 0.23)),
        h * (0.5 + 0.38 * Math.sin(t * 1.37 + 1)),
      )
    } else ghost = null
    if (dark && !rings.length) return

    rings = rings.filter((ring) => time - ring[2] < 1100)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    const cool = delta / fade
    let lit = 0
    for (let i = 0; i < heat.length; i++) {
      const x = offX + (i % cols) * size
      const y = offY + Math.floor(i / cols) * size
      let v = heat[i] as number
      let wake = 0
      for (const [rx, ry, born] of rings) {
        const age = time - born
        const off = Math.abs(Math.hypot(x + size / 2 - rx, y + size / 2 - ry) - age * 0.45) / size
        if (off < 0.8) wake = Math.max(wake, 1 - age / 1100)
      }
      heat[i] = Math.max(0, v - cool, wake * 0.5)
      v = Math.max(v, wake)
      if (v <= 0) continue
      lit++
      const side = (size - gap) * Math.min(1, 0.3 + v * 1.4)
      ctx.fillStyle = shades[Math.round(v * (SHADES - 1))] as string
      ctx.fillRect(x + (size - side) / 2, y + (size - side) / 2, side, side)
    }
    dark = !lit
  }

  const point = (e: PointerEvent): [number, number] => {
    rect ??= canvas.getBoundingClientRect()
    touched = now
    return [e.clientX - rect.left, e.clientY - rect.top]
  }
  const forget = () => {
    rect = null
  }

  return all(
    remove,
    stopFit,
    on(el, 'pointermove', (e) => {
      last = line(last, ...point(e))
    }),
    on(el, 'pointerleave', () => {
      last = null
    }),
    on(el, 'pointerdown', (e) => {
      rings.push([...point(e), now])
    }),
    on(window, 'scroll', forget, { capture: true, passive: true }),
    on(window, 'resize', forget),
    loop(el, frame),
  )
}
