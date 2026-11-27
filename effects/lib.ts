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

/**
 * Keeps a canvas sized to its parent at the device pixel ratio, capped at `maxRatio` pixels per
 * CSS pixel. Soft shaders look the same at a fraction of the pixels, so they pass a lower cap.
 */
export function fitCanvas(
  canvas: HTMLCanvasElement,
  onResize?: (w: number, h: number, dpr: number) => void,
  maxRatio = 2,
): Destroy {
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, maxRatio)
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

/** Tracks the pointer over `el` as 0..1 coordinates from the top left, measuring `el` only when needed. */
export function pointer(
  el: HTMLElement,
  move: (x: number, y: number, e: PointerEvent) => void,
  leave?: () => void,
): Destroy {
  let rect: DOMRect | null = null
  const forget = () => {
    rect = null
  }
  const at = (e: PointerEvent) => {
    rect ??= el.getBoundingClientRect()
    move((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height, e)
  }
  return all(
    on(el, 'pointermove', at),
    on(el, 'pointerdown', at),
    on(el, 'pointerenter', forget),
    on(el, 'pointerleave', () => leave?.()),
    on(window, 'scroll', forget, { passive: true, capture: true }),
    on(window, 'resize', forget),
  )
}

/** Compiles one more fragment shader on a context made by `createGL`. */
export function addProgram(gl: WebGLRenderingContext, fragment: string): WebGLProgram | null {
  const program = gl.createProgram()
  if (!program) return null
  const sources = [
    'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}',
    `precision highp float;${fragment}`,
  ]
  sources.forEach((src, i) => {
    const s = gl.createShader(i ? gl.FRAGMENT_SHADER : gl.VERTEX_SHADER)
    if (!s) return
    gl.shaderSource(s, src)
    gl.compileShader(s)
    gl.attachShader(program, s)
  })
  gl.bindAttribLocation(program, 0, 'p')
  gl.linkProgram(program)
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null
}

export interface Target {
  tex: WebGLTexture | null
  fbo: WebGLFramebuffer | null
  w: number
  h: number
}

export type UniformValue = number | number[] | Float32Array | WebGLTexture | null

/** Draws one full-screen pass: sets the uniforms, then renders to `to`, or to the canvas. */
export type Pass = (uniforms: Record<string, UniformValue>, to?: Target | null) => void

/**
 * Turns a program into a function that draws with it. Numbers become floats, arrays of 2 to 4
 * become vectors, a Float32Array becomes a vec3 array and textures are bound in order.
 */
export function pass(gl: WebGLRenderingContext, program: WebGLProgram | null): Pass | null {
  if (!program) return null
  const locations: Record<string, WebGLUniformLocation | null> = {}
  return (uniforms, to) => {
    gl.useProgram(program)
    let unit = 0
    for (const name in uniforms) {
      const v = uniforms[name] as UniformValue
      locations[name] ??= gl.getUniformLocation(program, name)
      const loc = locations[name]
      if (typeof v === 'number') gl.uniform1f(loc, v)
      else if (v instanceof Float32Array) gl.uniform3fv(loc, v)
      else if (Array.isArray(v)) {
        if (v.length === 2) gl.uniform2fv(loc, v)
        else if (v.length === 3) gl.uniform3fv(loc, v)
        else gl.uniform4fv(loc, v)
      } else {
        gl.activeTexture(gl.TEXTURE0 + unit)
        gl.bindTexture(gl.TEXTURE_2D, v)
        gl.uniform1i(loc, unit++)
      }
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, to?.fbo ?? null)
    gl.viewport(0, 0, to?.w ?? gl.drawingBufferWidth, to?.h ?? gl.drawingBufferHeight)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
}

function texture(gl: WebGLRenderingContext, filter: number) {
  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  return tex
}

/** A texture you can render into. */
export function createTarget(
  gl: WebGLRenderingContext,
  w: number,
  h: number,
  type: number = gl.UNSIGNED_BYTE,
  filter: number = gl.LINEAR,
): Target {
  const tex = texture(gl, filter)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, type, null)
  const fbo = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
  return { tex, fbo, w, h }
}

/** Two targets that trade places, for simulations that read their own last frame. */
export function createSwap(
  gl: WebGLRenderingContext,
  w: number,
  h: number,
  type?: number,
  filter?: number,
) {
  const pair = [createTarget(gl, w, h, type, filter), createTarget(gl, w, h, type, filter)]
  return {
    get read() {
      return pair[0] as Target
    },
    get write() {
      return pair[1] as Target
    },
    swap: () => {
      pair.reverse()
    },
    free: () => {
      for (const t of pair) {
        gl.deleteTexture(t.tex)
        gl.deleteFramebuffer(t.fbo)
      }
    },
  }
}

/**
 * The float texture type this GPU can render into and the best filter it has for it, or null.
 * Half floats come first: they are enough for a simulation and phones support them more often.
 */
export function floatType(gl: WebGLRenderingContext): [type: number, filter: number] | null {
  gl.getExtension('EXT_color_buffer_half_float')
  gl.getExtension('WEBGL_color_buffer_float')
  for (const name of ['OES_texture_half_float', 'OES_texture_float']) {
    const ext = gl.getExtension(name)
    if (!ext) continue
    const type: number = ext.HALF_FLOAT_OES ?? gl.FLOAT
    const filter = gl.getExtension(`${name}_linear`) ? gl.LINEAR : gl.NEAREST
    const probe = createTarget(gl, 4, 4, type, filter)
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE
    gl.deleteTexture(probe.tex)
    gl.deleteFramebuffer(probe.fbo)
    if (ok) return [type, filter]
  }
  return null
}

export interface ImageGL {
  gl: WebGLRenderingContext
  /** Draws the shader over the element. `r`, `m` and the image `u` are already set. */
  draw: (uniforms?: Record<string, UniformValue>) => void
  /** Element size in CSS pixels. */
  w: number
  h: number
  /** Called after every resize. Draw a frame here if nothing else is animating. */
  onResize?: () => void
}

/**
 * Runs a fragment shader over an image: the first `<img>` inside `el`, or `src`. The canvas sits
 * behind the content of `el` and the `<img>` stays in the DOM, invisible, for screen readers.
 * The shader gets `img(uv)` (the image, fitted like `object-fit: cover`), `UV` (0..1 from the
 * top left) and `r` (canvas size). If WebGL or the image is unavailable, nothing changes.
 */
export function imageGL(
  el: HTMLElement,
  fragment: string,
  resolution: number,
  ready: (ctx: ImageGL) => Destroy,
  src?: string,
): Destroy {
  const img = el.querySelector('img')
  if (!img && !src) return () => {}
  const canvas = document.createElement('canvas')
  const remove = backdrop(el, canvas)
  const made = createGL(
    canvas,
    `uniform sampler2D u;uniform vec2 r,m;
#define UV vec2(gl_FragCoord.x,r.y-gl_FragCoord.y)/r
vec4 img(vec2 p){return texture2D(u,(p-.5)*m+.5);}${fragment}`,
  )
  const base = made && pass(made.gl, made.program)
  if (!made || !base) {
    remove()
    return () => {}
  }
  const { gl } = made
  const source = src ? new Image() : (img as HTMLImageElement)
  if (src) {
    source.crossOrigin = 'anonymous'
    source.src = src
  }
  const style = img?.getAttribute('style')
  let stop: Destroy = () => {}
  let dead = false
  const start = () => {
    const { naturalWidth: iw, naturalHeight: ih } = source
    if (dead || !iw) return
    const tex = texture(gl, gl.LINEAR)
    let pixels: TexImageSource = source
    const k = 2048 / Math.max(iw, ih)
    if (k < 1) {
      const small = document.createElement('canvas')
      small.width = iw * k
      small.height = ih * k
      small.getContext('2d')?.drawImage(source, 0, 0, small.width, small.height)
      pixels = small
    }
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
    } catch {
      return
    }
    let cover = [1, 1]
    const ctx: ImageGL = {
      gl,
      w: 1,
      h: 1,
      draw: (uniforms) => base({ u: tex, r: [canvas.width, canvas.height], m: cover, ...uniforms }),
    }
    const stopReady = ready(ctx)
    const stopFit = fitCanvas(
      canvas,
      (w, h) => {
        ctx.w = w
        ctx.h = h
        const k = w / h / (iw / ih)
        cover = k > 1 ? [1, 1 / k] : [k, 1]
        ctx.onResize?.()
      },
      resolution,
    )
    if (!src && img) img.style.opacity = '0'
    stop = all(stopReady, stopFit)
  }
  source.decode().then(start, start)
  return () => {
    if (dead) return
    dead = true
    stop()
    if (img && !src) {
      if (style == null) img.removeAttribute('style')
      else img.setAttribute('style', style)
    }
    remove()
    releaseGL(gl)
  }
}
