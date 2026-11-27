import {
  all,
  clamp,
  type Destroy,
  fitCanvas,
  onScroll,
  prefersReducedMotion,
  snapshot,
} from '../lib'

export interface ZoomThroughOptions {
  /** Color of the wall the text is cut out of. */
  color?: string
  /** How long the zoom lasts, in viewport heights of scrolling. */
  distance?: number
  /** How much of the width the text fills before the zoom starts, 0 to 1. */
  fit?: number
  /** Where along the text to fly through, 0 (left) to 1 (right). The nearest thick stroke wins. */
  focus?: number
  /** Distance from the top of the viewport where the section pins, in pixels. */
  top?: number
  /** Scroll container, if the section is not scrolled by the page. */
  root?: HTMLElement | null
}

/**
 * The first child is the text to fly through, the second is what waits behind it. The text stays
 * in the DOM for screen readers and is redrawn on a canvas as a hole in a solid wall. The element
 * gets a `--zoom` custom property (0 to 1) for anything else you want to tie to the flight.
 * With reduced motion or without canvas support nothing is changed.
 */
export function zoomThrough(el: HTMLElement, options: ZoomThroughOptions = {}): Destroy {
  const { color = '#08090c', distance = 2, fit = 0.84, focus = 0.5, top = 0, root = null } = options
  const title = el.firstElementChild as HTMLElement | null
  const behind = title?.nextElementSibling as HTMLElement | null
  if (!title || !behind || prefersReducedMotion()) return () => {}
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  if (!ctx || !probe) return () => {}

  const label = (title.textContent ?? '').trim()
  const style = getComputedStyle(title)
  const restore = all(snapshot(el), snapshot(title), snapshot(behind))
  const pin = document.createElement('div')
  Object.assign(pin.style, {
    position: 'sticky',
    top: `${top}px`,
    overflow: 'hidden',
    display: 'grid',
  })
  pin.append(...el.childNodes, canvas)
  el.append(pin)
  Object.assign(title.style, { position: 'absolute', opacity: '0', pointerEvents: 'none' })
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  })
  canvas.setAttribute('aria-hidden', 'true')
  behind.style.willChange = 'transform'

  let w = 0
  let h = 0
  let dpr = 1
  let base = 1
  let width = 1
  let lift = 0
  let fx = 0
  let fy = 0
  let deepest = 1
  let progress = 0
  let viewH = 0

  const setFont = (c: CanvasRenderingContext2D) => {
    c.font = `${style.fontStyle} ${style.fontWeight} 100px ${style.fontFamily}`
    c.letterSpacing = `${(Number.parseFloat(style.letterSpacing) / Number.parseFloat(style.fontSize)) * 100 || 0}px`
  }

  const measure = (cssW: number, cssH: number, ratio: number) => {
    w = cssW
    h = cssH
    dpr = ratio
    setFont(probe)
    const m = probe.measureText(label)
    width = m.width || 1
    base = (w * fit) / width
    lift = (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2

    const cols = 360
    const k = cols / width
    const up = m.fontBoundingBoxAscent
    const rows = Math.ceil((up + m.fontBoundingBoxDescent) * k)
    probe.canvas.width = cols
    probe.canvas.height = rows
    setFont(probe)
    probe.setTransform(k, 0, 0, k, 0, up * k)
    probe.fillText(label, 0, 0)
    const data = probe.getImageData(0, 0, cols, rows).data
    const depth = new Uint16Array(cols * rows)
    for (let i = 0; i < depth.length; i++) {
      if ((data[i * 4 + 3] as number) > 128)
        depth[i] = Math.min(i % cols ? (depth[i - 1] as number) : 0, depth[i - cols] ?? 0) + 1
    }
    let best = 0
    let score = -1e9
    for (let i = depth.length - 1; i >= 0; i--) {
      const d = Math.min(depth[i] as number, (depth[i + 1] ?? 0) + 1, (depth[i + cols] ?? 0) + 1)
      depth[i] = d
      const s = d - Math.abs((i % cols) - focus * cols) * 0.12
      if (s > score) {
        score = s
        best = i
      }
    }
    fx = ((best % cols) + 0.5) / k
    fy = (Math.floor(best / cols) + 0.5) / k - up
    deepest = (Math.hypot(w, h) * 1.2) / ((((depth[best] as number) * 0.6) / k) * base)
    draw()
  }

  const draw = () => {
    const eased = progress * progress * (3 - 2 * progress)
    const zoom = Math.exp(eased * Math.log(deepest))
    const aim = clamp(progress * 2.5)
    const x = w / 2 + (fx - width / 2) * base * (1 - aim)
    const y = h / 2 + (lift + fy) * base * (1 - aim)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, w, h)
    behind.style.transform = `scale(${1.3 - 0.3 * eased})`
    if (progress >= 1) return
    ctx.fillStyle = color
    ctx.fillRect(0, 0, w, h)
    ctx.globalCompositeOperation = 'destination-out'
    ctx.translate(x, y)
    ctx.scale(base * zoom, base * zoom)
    setFont(ctx)
    ctx.fillText(label, -fx, -fy)
  }

  const stopFit = fitCanvas(canvas, measure, 1.5)
  let alive = true
  document.fonts?.ready.then(() => alive && measure(w, h, dpr))

  const update = () => {
    const height = (root ? root.clientHeight : innerHeight) - top
    if (height !== viewH) {
      viewH = height
      pin.style.height = `${height}px`
      el.style.height = `${height * (1 + distance * 1.12)}px`
    }
    const viewTop = root ? root.getBoundingClientRect().top : 0
    const next = clamp((viewTop + top - el.getBoundingClientRect().top) / (height * distance))
    if (next === progress) return
    progress = next
    el.style.setProperty('--zoom', `${next}`)
    draw()
  }

  return all(restore, stopFit, onScroll(update, root), () => {
    alive = false
  })
}
