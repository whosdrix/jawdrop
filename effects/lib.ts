export type Destroy = () => void

export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export function prefersReducedMotion(): boolean {
  if (typeof document !== 'undefined') {
    const forced = document.documentElement.dataset.motion
    if (forced === 'reduce') return true
    if (forced === 'full') return false
  }
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

export const isCoarsePointer = () =>
  typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches

export function on<K extends keyof HTMLElementEventMap>(
  target: EventTarget,
  type: K | (string & {}),
  handler: (e: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions,
): Destroy {
  const fn = handler as EventListener
  target.addEventListener(type, fn, options)
  return () => target.removeEventListener(type, fn, options)
}

export function all(...fns: Destroy[]): Destroy {
  let done = false
  return () => {
    if (done) return
    done = true
    for (const fn of fns.reverse()) fn()
  }
}

/**
 * Calls `frame` every animation frame while `el` is on screen and the tab is visible.
 * `time` only advances while running, so a paused effect resumes where it stopped.
 */
export function loop(el: Element, frame: (time: number, delta: number) => void): Destroy {
  let raf = 0
  let last = 0
  let time = 0
  let visible = typeof IntersectionObserver === 'undefined'
  let running = false
  let stopped = false

  const tick = (now: number) => {
    const delta = last ? Math.min(now - last, 50) : 16
    last = now
    time += delta
    frame(time, delta)
    raf = requestAnimationFrame(tick)
  }
  const sync = () => {
    const should = visible && !document.hidden && !stopped
    if (should && !running) {
      running = true
      last = 0
      raf = requestAnimationFrame(tick)
    } else if (!should && running) {
      running = false
      cancelAnimationFrame(raf)
    }
  }

  const io =
    typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver((entries) => {
          visible = entries.some((e) => e.isIntersecting)
          sync()
        })
  io?.observe(el)
  const offVisibility = on(document, 'visibilitychange', sync)
  sync()

  return () => {
    stopped = true
    io?.disconnect()
    offVisibility()
    cancelAnimationFrame(raf)
    running = false
  }
}

/** Runs `enter` when `el` scrolls into view. With `once`, it disconnects after the first time. */
export function inView(
  el: Element,
  enter: () => void,
  {
    once = true,
    threshold = 0.2,
    leave,
  }: { once?: boolean; threshold?: number; leave?: () => void } = {},
): Destroy {
  if (typeof IntersectionObserver === 'undefined') {
    enter()
    return () => {}
  }
  let stopped = false
  const io = new IntersectionObserver(
    (entries) => {
      if (stopped) return
      for (const e of entries) {
        if (e.isIntersecting) {
          enter()
          if (once) io.disconnect()
        } else {
          leave?.()
        }
      }
    },
    { threshold },
  )
  io.observe(el)
  return () => {
    stopped = true
    io.disconnect()
  }
}

/** Keeps the original children so they can be put back exactly, which keeps React happy. */
export function snapshot(el: HTMLElement): Destroy {
  const nodes = Array.from(el.childNodes)
  const style = el.getAttribute('style')
  const label = el.getAttribute('aria-label')
  return () => {
    el.replaceChildren(...nodes)
    if (style === null) el.removeAttribute('style')
    else el.setAttribute('style', style)
    if (label === null) el.removeAttribute('aria-label')
    else el.setAttribute('aria-label', label)
  }
}

/** Gives `el` its own stacking context and adds a full-size layer behind its content. */
export function backdrop<T extends HTMLElement>(el: HTMLElement, layer: T): Destroy {
  const restore = snapshot(el)
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative'
  el.style.isolation = 'isolate'
  Object.assign(layer.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    zIndex: '-1',
    pointerEvents: 'none',
  })
  layer.setAttribute('aria-hidden', 'true')
  el.prepend(layer)
  return () => {
    layer.remove()
    restore()
  }
}

/** Keeps a canvas sized to its parent at the device pixel ratio (capped at 2). */
export function fitCanvas(
  canvas: HTMLCanvasElement,
  onResize?: (w: number, h: number, dpr: number) => void,
): Destroy {
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2)
    const { width, height } = canvas.getBoundingClientRect()
    canvas.width = Math.max(1, Math.round(width * dpr))
    canvas.height = Math.max(1, Math.round(height * dpr))
    onResize?.(width, height, dpr)
  }
  resize()
  if (typeof ResizeObserver === 'undefined') return on(window, 'resize', resize)
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  return () => ro.disconnect()
}

/** Parses `#rgb` or `#rrggbb` into 0..1 floats. */
export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '').trim()
  if (h.length === 3) h = [...h].map((c) => c + c).join('')
  const n = Number.parseInt(h, 16)
  if (h.length !== 6 || Number.isNaN(n)) return [1, 1, 1]
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/** Progress (0..1) of `el` travelling through the viewport or a scroll container. */
export function scrollProgress(el: Element, root?: Element | null, start = 1, end = 0): number {
  const r = el.getBoundingClientRect()
  const top = root ? root.getBoundingClientRect().top : 0
  const height = root ? root.clientHeight : innerHeight
  const from = top + height * start
  const to = top + height * end - r.height
  return from === to ? 0 : clamp((from - r.top) / (from - to))
}

/** Calls `fn` (at most once per frame) when the page or `root` scrolls or resizes. */
export function onScroll(fn: () => void, root?: Element | null): Destroy {
  let queued = 0
  const run = () => {
    if (queued) return
    queued = requestAnimationFrame(() => {
      queued = 0
      fn()
    })
  }
  fn()
  return all(on(root ?? window, 'scroll', run, { passive: true }), on(window, 'resize', run), () =>
    cancelAnimationFrame(queued),
  )
}

export function createGL(
  canvas: HTMLCanvasElement,
  fragment: string,
): {
  gl: WebGLRenderingContext
  program: WebGLProgram
  uniform: (name: string) => WebGLUniformLocation | null
} | null {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: false, antialias: false })
  if (!gl) return null
  const shader = (type: number, src: string) => {
    const s = gl.createShader(type)
    if (!s) return null
    gl.shaderSource(s, src)
    gl.compileShader(s)
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null
  }
  const vs = shader(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}')
  const fs = shader(gl.FRAGMENT_SHADER, `precision highp float;${fragment}`)
  const program = gl.createProgram()
  if (!vs || !fs || !program) return null
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null
  gl.useProgram(program)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(program, 'p')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  return { gl, program, uniform: (name) => gl.getUniformLocation(program, name) }
}

export function releaseGL(gl: WebGLRenderingContext) {
  gl.getExtension('WEBGL_lose_context')?.loseContext()
}

/**
 * Wraps each word of `el` in a span, and each piece (the word itself, or each character) in an
 * inner span. The real text stays available to screen readers through `aria-label`.
 */
export function splitText(
  el: HTMLElement,
  by: 'word' | 'char' = 'word',
): { words: HTMLSpanElement[]; pieces: HTMLSpanElement[] } {
  const text = (el.textContent ?? '').trim()
  el.setAttribute('aria-label', text)
  el.textContent = ''
  const words: HTMLSpanElement[] = []
  const pieces: HTMLSpanElement[] = []
  text.split(/\s+/).forEach((word, i) => {
    if (i > 0) el.append(' ')
    const wordEl = document.createElement('span')
    wordEl.setAttribute('aria-hidden', 'true')
    wordEl.style.display = 'inline-block'
    wordEl.style.whiteSpace = 'nowrap'
    for (const chunk of by === 'char' ? [...word] : [word]) {
      const piece = document.createElement('span')
      piece.textContent = chunk
      piece.style.display = 'inline-block'
      wordEl.append(piece)
      pieces.push(piece)
    }
    words.push(wordEl)
    el.append(wordEl)
  })
  return { words, pieces }
}
