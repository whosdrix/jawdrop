import { all, type Destroy, inView, on, prefersReducedMotion, snapshot } from '../lib'

export interface GlitchTextOptions {
  /** When bursts happen: on a timer, on hover, or both. */
  trigger?: 'both' | 'auto' | 'hover'
  /** Average time between automatic bursts, in ms. */
  interval?: number
  /** Length of one burst, in ms. */
  duration?: number
  /** How far slices and color channels travel, 0 to 1. */
  intensity?: number
  /** Swaps a few characters for other glyphs during a burst. */
  swap?: boolean
  /** First channel color. */
  colorA?: string
  /** Second channel color. */
  colorB?: string
}

const GLYPHS = '#%&/\\<>[]{}=+*01'

/** Between bursts the text is untouched, so the glitch costs nothing while it rests. */
export function glitchText(el: HTMLElement, options: GlitchTextOptions = {}): Destroy {
  const {
    trigger = 'both',
    interval = 2600,
    duration = 420,
    intensity = 0.5,
    swap = true,
    colorA = '#ff2a6d',
    colorB = '#05d9e8',
  } = options
  if (prefersReducedMotion()) return () => {}
  const text = (el.textContent ?? '').trim()
  const restore = snapshot(el)
  el.setAttribute('aria-label', text)

  const wrap = document.createElement('span')
  wrap.setAttribute('aria-hidden', 'true')
  Object.assign(wrap.style, { display: 'inline-block', position: 'relative' })
  const layers = [0, 1, 2].map((i) => {
    const layer = document.createElement('span')
    layer.textContent = text
    layer.style.display = 'block'
    if (i) Object.assign(layer.style, { position: 'absolute', inset: '0', visibility: 'hidden' })
    wrap.append(layer)
    return layer
  })
  const [main, ...slices] = layers as [HTMLElement, HTMLElement, HTMLElement]
  el.replaceChildren(wrap)

  const rand = (min: number, max: number) => min + Math.random() * (max - min)
  let timer = 0
  let next = 0
  let until = 0

  const calm = () => {
    wrap.style.textShadow = wrap.style.transform = main.style.clipPath = ''
    for (const layer of layers) {
      if (layer.textContent !== text) layer.textContent = text
      if (layer !== main) layer.style.visibility = 'hidden'
    }
  }

  const frame = () => {
    if (performance.now() > until) {
      calm()
      timer = 0
      return
    }
    timer = window.setTimeout(frame, rand(35, 95))
    if (Math.random() < 0.22) return calm()

    const a = rand(4, 50)
    const b = a + rand(6, 22)
    const c = b + rand(4, 96 - b - 4)
    const d = Math.min(c + rand(4, 16), 100)
    const split = rand(0.02, 0.07) * intensity
    wrap.style.textShadow = `${split}em 0 ${colorA},${-split}em 0 ${colorB}`
    wrap.style.transform = Math.random() < 0.3 ? `skewX(${rand(-8, 8) * intensity}deg)` : ''
    main.style.clipPath = `polygon(-20% -20%,120% -20%,120% ${a}%,-20% ${a}%,-20% ${b}%,120% ${b}%,120% ${c}%,-20% ${c}%,-20% ${d}%,120% ${d}%,120% 120%,-20% 120%)`
    ;[
      [a, b],
      [c, d],
    ].forEach(([from, to], i) => {
      const s = (slices[i] as HTMLElement).style
      s.visibility = ''
      s.clipPath = `inset(${from}% -20% ${100 - (to as number)}%)`
      s.transform = `translateX(${rand(0.08, 0.5) * intensity * (Math.random() < 0.5 ? -1 : 1)}em)`
    })

    let out = text
    if (swap && Math.random() < 0.5) {
      const chars = [...text]
      for (let k = 0; k < 2; k++) {
        const at = Math.floor(Math.random() * chars.length)
        if ((chars[at] as string).trim())
          chars[at] = GLYPHS[Math.floor(Math.random() * GLYPHS.length)] as string
      }
      out = chars.join('')
    }
    for (const layer of layers) if (layer.textContent !== out) layer.textContent = out
  }

  const burst = () => {
    until = performance.now() + duration * rand(0.7, 1.3)
    if (!timer) frame()
  }
  const auto = () => {
    next = window.setTimeout(() => {
      if (!document.hidden) burst()
      auto()
    }, interval * rand(0.5, 1.5))
  }
  const pause = () => {
    clearTimeout(next)
    clearTimeout(timer)
    timer = 0
    calm()
  }

  return all(
    restore,
    pause,
    trigger === 'auto' ? () => {} : on(el, 'pointerenter', burst),
    trigger === 'hover'
      ? () => {}
      : inView(
          el,
          () => {
            next = window.setTimeout(() => {
              burst()
              auto()
            }, 500)
          },
          { once: false, leave: pause },
        ),
  )
}
