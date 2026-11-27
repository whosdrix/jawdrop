import { all, clamp, type Destroy, inView, loop, on, prefersReducedMotion, snapshot } from '../lib'

export interface ParticleTextOptions {
  /** Particle color. Defaults to the color of the text. */
  color?: string
  /** Color particles take while they are in the air. */
  accent?: string
  /** Particle density. 1 is tuned to the font size, 2 packs twice as many per row. */
  density?: number
  /** Reach of the cursor, in ems. */
  radius?: number
  /** How hard the cursor blows. */
  force?: number
  /** Sends a gust through the text now and then while nobody is touching it. */
  idle?: boolean
}

const STRIDE = 8
const MAX = 9000

/**
 * The real text stays in the DOM, transparent but selectable and readable by screen readers.
 * With reduced motion or without canvas support it is left untouched.
 */
export function particleText(el: HTMLElement, options: ParticleTextOptions = {}): Destroy {
  const { accent = '#7aa2ff', density = 1, radius = 1.2, force = 1, idle = true } = options
  if (prefersReducedMotion()) return () => {}
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  if (!ctx || !probe) return () => {}

  const style = getComputedStyle(el)
  const color = options.color ?? style.color
  const restore = snapshot(el)
  if (style.position === 'static') el.style.position = 'relative'
  el.style.setProperty('-webkit-text-fill-color', 'transparent')
  canvas.setAttribute('aria-hidden', 'true')
  Object.assign(canvas.style, { position: 'absolute', pointerEvents: 'none', maxWidth: 'none' })
  el.append(canvas)

  let p = new Float32Array(0)
  let w = 0
  let h = 0
  let pad = 0
  let reach = 0
  let dot = 1
  let dpr = 1
  let now = 0
  let start = -1
  let settled = false
  let rect: DOMRect | null = null
  const pointer = { x: 0, y: 0, vx: 0, vy: 0, on: false }

  const build = () => {
    const box = el.getBoundingClientRect()
    if (!box.width) return
    const fontSize = Number.parseFloat(style.fontSize)
    reach = radius * fontSize
    pad = Math.ceil(reach)
    const page = document.documentElement.clientWidth
    const left = clamp(box.left, 0, pad)
    w = box.width + left + clamp(page - box.right, 0, pad)
    h = box.height + pad * 2
    dpr = Math.min(devicePixelRatio || 1, 2)
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    Object.assign(canvas.style, {
      left: `${-left}px`,
      top: `${-pad}px`,
      width: `${w}px`,
      height: `${h}px`,
    })
    rect = null

    let gap = clamp(fontSize / 48, 1.9, 4) / density
    const spots: number[] = []
    do {
      spots.length = 0
      const cols = Math.ceil(box.width / gap)
      const rows = Math.ceil(box.height / gap)
      probe.canvas.width = cols
      probe.canvas.height = rows
      probe.setTransform(1 / gap, 0, 0, 1 / gap, -box.left / gap, -box.top / gap)
      const walker = document.createTreeWalker(el, 4)
      const range = document.createRange()
      let node = walker.nextNode() as Text | null
      while (node) {
        const s = getComputedStyle(node.parentElement as Element)
        probe.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`
        probe.letterSpacing = '0px'
        probe.letterSpacing = s.letterSpacing
        const m = probe.measureText('M')
        const up = m.fontBoundingBoxAscent
        for (const word of node.data.matchAll(/\S+/g)) {
          range.setStart(node, word.index)
          range.setEnd(node, word.index + word[0].length)
          const b = range.getClientRects()[0]
          const text = s.textTransform === 'uppercase' ? word[0].toUpperCase() : word[0]
          if (b)
            probe.fillText(
              text,
              b.left,
              b.top + (b.height - up - m.fontBoundingBoxDescent) / 2 + up,
            )
        }
        node = walker.nextNode() as Text | null
      }
      const alpha = probe.getImageData(0, 0, cols, rows).data
      for (let i = 0; i < cols * rows; i++) {
        if ((alpha[i * 4 + 3] as number) > 96)
          spots.push(
            left + ((i % cols) + 0.25 + Math.random() * 0.5) * gap,
            pad + (Math.floor(i / cols) + 0.25 + Math.random() * 0.5) * gap,
          )
      }
      gap *= 1.15
    } while (spots.length > MAX * 2)
    dot = (gap / 1.15) * 0.9

    p = new Float32Array((spots.length / 2) * STRIDE)
    for (let i = 0, j = 0; i < p.length; i += STRIDE, j += 2) {
      const hx = spots[j] as number
      const hy = spots[j + 1] as number
      const landed = start >= 0 && now - start > 1600
      p[i] = landed ? hx : hx + (Math.random() - 0.5) * w * 0.7
      p[i + 1] = landed ? hy : hy + (Math.random() - 0.5) * h * 1.6
      p[i + 4] = hx
      p[i + 5] = hy
      p[i + 6] = (hx / w) * 500 + Math.random() * 500
      p[i + 7] = 0.35 + Math.random() * 1.3
    }
    settled = false
    draw()
  }

  const draw = () => {
    const calm = new Path2D()
    const flying = new Path2D()
    for (let i = 0; i < p.length; i += STRIDE) {
      const x = p[i] as number
      const y = p[i + 1] as number
      const away = Math.abs(x - (p[i + 4] as number)) + Math.abs(y - (p[i + 5] as number))
      ;(away > 2.5 ? flying : calm).rect(x - dot / 2, y - dot / 2, dot, dot)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = color
    ctx.fill(calm)
    ctx.fillStyle = accent
    ctx.fill(flying)
  }

  const step = (time: number) => {
    now = time
    if (start < 0) return
    const age = time - start
    let px = pointer.x
    let py = pointer.y
    let pvx = pointer.vx
    let pvy = pointer.vy
    let blowing = pointer.on
    const gust = (age - 2600) % 5200
    if (!blowing && idle && gust > 0 && gust < 1500) {
      blowing = true
      px = (gust / 1500) * (w + reach * 2) - reach
      py = h / 2 + Math.sin(gust / 190) * (h - pad * 2) * 0.3
      pvx = 9
      pvy = 0
    }
    if (!blowing && settled) return
    pointer.vx *= 0.85
    pointer.vy *= 0.85

    const r2 = reach * reach
    let motion = 0
    for (let i = 0; i < p.length; i += STRIDE) {
      let x = p[i] as number
      let y = p[i + 1] as number
      let vx = p[i + 2] as number
      let vy = p[i + 3] as number
      if (blowing) {
        const dx = x - px
        const dy = y - py
        const d2 = dx * dx + dy * dy
        if (d2 < r2) {
          const d = Math.sqrt(d2) || 1
          const f = (1 - d / reach) ** 2 * force * (p[i + 7] as number)
          vx += ((dx / d) * 2.6 - (dy / d) * 0.9 + pvx * 0.26 + Math.random() - 0.5) * f
          vy += ((dy / d) * 2.6 + (dx / d) * 0.9 + pvy * 0.26 + Math.random() - 0.5) * f
        }
      }
      const pull = (0.07 - 0.03 * (p[i + 7] as number)) * clamp((age - (p[i + 6] as number)) / 500)
      vx = (vx + ((p[i + 4] as number) - x) * pull) * 0.87
      vy = (vy + ((p[i + 5] as number) - y) * pull) * 0.87
      x += vx
      y += vy
      p[i] = x
      p[i + 1] = y
      p[i + 2] = vx
      p[i + 3] = vy
      motion += Math.abs(vx) + Math.abs(vy)
    }
    draw()
    settled = age > 1600 && motion < p.length * 0.0005
  }

  const move = (e: PointerEvent) => {
    rect ??= canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    if (pointer.on) {
      pointer.vx = clamp(x - pointer.x, -40, 40)
      pointer.vy = clamp(y - pointer.y, -40, 40)
    }
    pointer.x = x
    pointer.y = y
    pointer.on = true
    settled = false
  }
  const forget = () => {
    rect = null
  }

  build()
  let alive = true
  document.fonts?.ready.then(() => alive && build())
  const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(build)
  ro?.observe(el)

  return all(
    restore,
    () => {
      alive = false
      ro?.disconnect()
    },
    on(el, 'pointermove', move),
    on(el, 'pointerleave', () => {
      pointer.on = false
    }),
    on(window, 'scroll', forget, { capture: true, passive: true }),
    on(window, 'resize', forget),
    inView(el, () => {
      start = now
    }),
    loop(el, step),
  )
}
