import {
  all,
  backdrop,
  type Destroy,
  fitCanvas,
  hexToRgb,
  loop,
  on,
  pointer,
  prefersReducedMotion,
} from '../lib'

export interface WarpStarfieldOptions {
  /** How many stars, relative to the size of the element. */
  density?: number
  /** Cruising speed. */
  speed?: number
  /** How much faster the jump to warp is. */
  boost?: number
  /** Tint of the streaks and the glow at warp speed. */
  color?: string
  /** Jump to warp while the pointer is held down, or whenever it is over the element. */
  trigger?: 'hold' | 'hover'
}

export function warpStarfield(el: HTMLElement, options: WarpStarfieldOptions = {}): Destroy {
  const { density = 1, speed = 1, boost = 1, color = '#8fb8ff', trigger = 'hold' } = options
  const canvas = document.createElement('canvas')
  const remove = backdrop(el, canvas)
  const ctx = canvas.getContext('2d')
  if (!ctx) return remove

  const tints = ['#fff', color, '#ffe3c2']
  const glow = hexToRgb(color)
    .map((v) => Math.round(v * 255))
    .join()
  let w = 0
  let h = 0
  let dpr = 1
  let stars = new Float32Array(0)
  let warp = 0
  let engaged = false
  let aimX = 0.5
  let aimY = 0.5
  let eyeX = 0.5
  let eyeY = 0.5

  const seed = (i: number, z: number) => {
    const k = (2.3 * z) / Math.max(w, h, 1)
    stars[i] = (Math.random() - 0.5) * w * k
    stars[i + 1] = (Math.random() - 0.5) * h * k
    stars[i + 2] = z
  }

  const draw = (delta: number) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    const f = Math.max(w, h) * 0.5 * (1 + warp * 0.3)
    const cx = w * (0.5 + (eyeX - 0.5) * 0.35)
    const cy = h * (0.5 + (eyeY - 0.5) * 0.35)
    const v = speed * (0.045 + warp * warp * 1.9 * boost)
    const dz = (v * delta) / 1000
    const tail = v * (0.012 + 0.07 * warp)
    if (warp > 0.01) {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, f * 0.9)
      g.addColorStop(0, `rgba(${glow},${0.45 * warp})`)
      g.addColorStop(0.15, `rgba(${glow},${0.2 * warp})`)
      g.addColorStop(0.5, `rgba(${glow},${0.05 * warp})`)
      g.addColorStop(1, `rgba(${glow},0)`)
      ctx.globalAlpha = 1
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
    }
    ctx.lineCap = 'round'
    for (let tint = 0; tint < 3; tint++) {
      ctx.strokeStyle = tints[warp > 0.6 && tint === 2 ? 1 : tint] as string
      for (let i = tint * 3; i < stars.length; i += 9) {
        let z = (stars[i + 2] as number) - dz
        if (z < 0.02) {
          z = 1
          seed(i, z)
        }
        stars[i + 2] = z
        const x = cx + ((stars[i] as number) * f) / z
        const y = cy + ((stars[i + 1] as number) * f) / z
        if (x < -40 || x > w + 40 || y < -40 || y > h + 40) {
          seed(i, 1)
          continue
        }
        const far = f / (z + tail)
        const near = 1 - z
        ctx.globalAlpha = Math.min(1, near * 8) * Math.min(1, 0.35 + 0.65 * near + warp)
        ctx.lineWidth = 0.7 + near * near * 2.2 * (1 + warp * 0.6)
        ctx.beginPath()
        ctx.moveTo(cx + (stars[i] as number) * far, cy + (stars[i + 1] as number) * far)
        ctx.lineTo(x, y)
        ctx.stroke()
      }
    }
  }

  const stopFit = fitCanvas(canvas, (width, height, ratio) => {
    w = width
    h = height
    dpr = ratio
    const count = Math.round(Math.min(1100, Math.max(120, (w * h * density) / 700)))
    stars = new Float32Array(count * 3)
    for (let i = 0; i < stars.length; i += 3) seed(i, 0.05 + Math.random() * 0.95)
    draw(0)
  })
  if (prefersReducedMotion()) return all(remove, stopFit)

  const release = () => {
    engaged = false
  }
  return all(
    remove,
    stopFit,
    pointer(
      el,
      (x, y, e) => {
        aimX = x
        aimY = y
        if (trigger === 'hover' || e.type === 'pointerdown') engaged = true
      },
      () => {
        aimX = aimY = 0.5
        if (trigger === 'hover') release()
      },
    ),
    on(window, 'pointerup', release),
    on(window, 'pointercancel', release),
    loop(el, (_time, delta) => {
      warp += ((engaged ? 1 : 0) - warp) * (engaged ? 0.035 : 0.022) * (delta / 16)
      eyeX += (aimX - eyeX) * 0.04
      eyeY += (aimY - eyeY) * 0.04
      draw(delta)
    }),
  )
}
