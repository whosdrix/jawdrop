import { attach, type Destroy, defaults, type Effect, type Values } from './effects'
import { isCoarse, isReduced } from './motion'

/** One shared frame loop for everything the site animates on behalf of a preview. */
const tickers = new Set<(now: number) => void>()
let raf = 0
const tick = (now: number) => {
  for (const fn of tickers) fn(now)
  raf = tickers.size ? requestAnimationFrame(tick) : 0
}
function addTicker(fn: (now: number) => void): Destroy {
  tickers.add(fn)
  if (!raf) raf = requestAnimationFrame(tick)
  return () => tickers.delete(fn)
}

const GHOST = new Set([
  'dot-grid',
  'spotlight',
  'tilt-card',
  'magnetic',
  'trailing-ink',
  'parallax',
])
const NEEDS_MOUSE = new Set(['magnetic', 'trailing-ink', 'tilt-card'])
const REPLAY: Record<string, number> = { 'scramble-text': 4200, 'split-reveal': 4600 }

export type PreviewMode = 'card' | 'detail'

export interface Preview {
  readonly mounted: boolean
  values: Values
  mount(): void
  destroy(): void
  remount(): void
}

/** Options baked into the demo markup, e.g. a scroll range that suits a small frame. */
function demoOptions(effect: Effect): Values {
  const m = effect.demo.match(/data-options='([^']+)'/)
  if (!m?.[1]) return {}
  try {
    return JSON.parse(m[1]) as Values
  } catch {
    return {}
  }
}

export const initialValues = (effect: Effect): Values => ({
  ...defaults(effect),
  ...demoOptions(effect),
})

export function hintFor(effect: Effect): string {
  if (NEEDS_MOUSE.has(effect.slug) && isCoarse()) return 'Needs a mouse'
  if (effect.category === 'scroll' && effect.slug !== 'parallax') return 'Scroll inside the frame'
  if (effect.slug === 'parallax') return 'Scroll the page, move the cursor'
  if (effect.slug === 'marquee') return 'Scroll the page or hover'
  if (GHOST.has(effect.slug)) return 'Move your cursor here'
  return ''
}

/** Scrolls a demo's own scroll container back and forth until someone takes over. */
function autoScroll(root: HTMLElement, handOver: boolean): Destroy {
  let start = 0
  let stopped = false
  const stop = addTicker((now) => {
    if (stopped) return
    const max = root.scrollHeight - root.clientHeight
    if (max <= 0) return
    if (!start) start = now + 500
    const period = Math.max(5200, max * 14)
    const phase = Math.max(0, now - start) / period
    // dwell a little at both ends
    const wave = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2)
    const eased = Math.min(1, Math.max(0, (wave - 0.06) / 0.88))
    root.scrollTop = eased * max
  })
  const take = () => {
    stopped = true
  }
  const events = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const
  if (handOver) for (const e of events) root.addEventListener(e, take, { passive: true })
  return () => {
    stop()
    for (const e of events) root.removeEventListener(e, take)
  }
}

/** A fake pointer that wanders over the demo so cursor effects are never sitting still. */
function ghostPointer(stage: HTMLElement, fx: HTMLElement, slug: string): Destroy {
  const dot = document.createElement('i')
  dot.className = 'ghost'
  dot.setAttribute('aria-hidden', 'true')
  stage.append(dot)
  let real = false
  let t0 = 0
  const spread = slug === 'magnetic' ? 1.7 : slug === 'trailing-ink' ? 0.62 : 0.74
  const seed = (slug.length * 37) % 10

  const send = (type: string, x: number, y: number) =>
    fx.dispatchEvent(
      new PointerEvent(type, {
        clientX: x,
        clientY: y,
        bubbles: type === 'pointermove',
        pointerType: 'mouse',
      }),
    )

  const stop = addTicker((now) => {
    if (real || !fx.isConnected) return
    if (!t0) t0 = now
    const t = (now - t0) / 1000 + seed
    const box = stage.getBoundingClientRect()
    if (box.bottom < 0 || box.top > innerHeight) return
    const cx = fx.offsetLeft + fx.offsetWidth / 2
    const cy = fx.offsetTop + fx.offsetHeight / 2
    const ax = Math.min((fx.offsetWidth * spread) / 2, box.width / 2 - 14)
    const ay = Math.min((fx.offsetHeight * spread) / 2, box.height / 2 - 14)
    const x = cx + ax * Math.sin(t * 0.83)
    const y = cy + ay * Math.sin(t * 1.27 + 1.1)
    dot.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
    dot.style.opacity = '1'
    send('pointermove', box.left + x, box.top + y)
  })

  const enter = (e: PointerEvent) => {
    if (!e.isTrusted || e.pointerType === 'touch') return
    real = true
    dot.style.opacity = '0'
    send('pointerleave', -1, -1)
  }
  const leave = (e: PointerEvent) => {
    if (!e.isTrusted) return
    real = false
  }
  stage.addEventListener('pointerenter', enter)
  stage.addEventListener('pointerleave', leave)
  return () => {
    stop()
    stage.removeEventListener('pointerenter', enter)
    stage.removeEventListener('pointerleave', leave)
    dot.remove()
  }
}

export function createPreview(stage: HTMLElement, effect: Effect, mode: PreviewMode): Preview {
  let cleanup: Destroy[] = []
  let mounted = false

  const preview: Preview = {
    get mounted() {
      return mounted
    },
    values: initialValues(effect),
    mount() {
      if (mounted) return
      mounted = true
      stage.innerHTML = effect.demo
      const fx = stage.querySelector<HTMLElement>('[data-fx]')
      if (!fx) return
      const root = stage.querySelector<HTMLElement>('[data-root]')
      const options: Record<string, unknown> = { ...preview.values }
      if (root) options.root = root
      // the picker only gives solid colors, and a spotlight wants to be see-through
      if (effect.slug === 'spotlight' && typeof options.color === 'string') {
        if (options.color.length === 7) options.color = `${options.color}3d`
      }
      if (mode === 'card' && options.trigger === 'view') options.trigger = 'load'
      cleanup.push(attach(effect.slug, fx, options))

      if (isReduced()) return
      if (root) cleanup.push(autoScroll(root, mode === 'detail'))
      if (GHOST.has(effect.slug)) cleanup.push(ghostPointer(stage, fx, effect.slug))
      const every = REPLAY[effect.slug]
      if (mode === 'card' && every) {
        const timer = setInterval(() => {
          if (document.hidden) return
          const box = stage.getBoundingClientRect()
          if (box.bottom > 0 && box.top < innerHeight) preview.remount()
        }, every)
        cleanup.push(() => clearInterval(timer))
      }
    },
    destroy() {
      if (!mounted) return
      mounted = false
      for (const fn of cleanup.reverse()) fn()
      cleanup = []
      stage.replaceChildren()
    },
    remount() {
      preview.destroy()
      preview.mount()
    },
  }
  return preview
}
