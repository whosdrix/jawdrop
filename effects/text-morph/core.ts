import { all, type Destroy, hexToRgb, lerp, loop, prefersReducedMotion, snapshot } from '../lib'

export interface TextMorphOptions {
  /** Words to cycle through. The element's own text is the first one shown. */
  words?: string[]
  /** Time each word stays readable, in ms. */
  hold?: number
  /** Time one morph takes, in ms. */
  duration?: number
  /** How far the letters melt into each other, as a fraction of the font size. */
  blur?: number
  /** Hex color the liquid picks up halfway through a morph. Defaults to the text color. */
  accent?: string
}

type Field = [sharp: Uint8Array, soft: Uint8Array]

/**
 * Between morphs the word is real, crisp DOM text. During a morph a canvas blends the sharp and
 * blurred shapes of both words and cuts the result off at a threshold, which reads as liquid.
 */
export function textMorph(el: HTMLElement, options: TextMorphOptions = {}): Destroy {
  const { hold = 1600, duration = 1100, blur = 0.07, accent } = options
  const first = (el.textContent ?? '').trim()
  const words = options.words?.length ? options.words : [first]
  if (prefersReducedMotion() || (words.length < 2 && words[0] === first)) return () => {}
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  if (!ctx || !probe) return () => {}

  const style = getComputedStyle(el)
  const restore = snapshot(el)
  el.setAttribute('aria-label', first)
  if (style.position === 'static') el.style.position = 'relative'
  const visual = document.createElement('span')
  visual.setAttribute('aria-hidden', 'true')
  visual.textContent = first
  canvas.setAttribute('aria-hidden', 'true')
  Object.assign(canvas.style, { position: 'absolute', pointerEvents: 'none', maxWidth: 'none' })
  el.replaceChildren(visual, canvas)

  const fields = new Map<string, Field>()
  let key = ''
  let cw = 0
  let ch = 0
  let scale = 1
  let pad = 0
  let drift = 0
  let margin = 0
  let widest = 0
  let anchor = 0
  let ascent = 0
  let image: ImageData | null = null
  let ink: number[] = []
  let glow: number[] = []

  const setFont = (c: CanvasRenderingContext2D) => {
    c.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
    c.letterSpacing = '0px'
    c.letterSpacing = style.letterSpacing
  }

  const measure = () => {
    const fontSize = Number.parseFloat(style.fontSize)
    setFont(probe)
    const m = probe.measureText('M')
    ascent = m.fontBoundingBoxAscent
    widest = Math.max(...words.map((word) => probe.measureText(word).width))
    drift = fontSize * 0.34
    pad = Math.ceil(fontSize * blur * 2.5 + drift) + 2
    const w = widest + pad * 2
    const h = ascent + m.fontBoundingBoxDescent + pad * 2
    const align = style.textAlign
    anchor = align === 'center' ? 0.5 : align === 'right' || align === 'end' ? 1 : 0
    const box = el.getBoundingClientRect()
    const now = visual.getBoundingClientRect()
    scale = Math.min(devicePixelRatio || 1, 2, Math.sqrt(240000 / (w * h)))
    Object.assign(canvas.style, {
      left: `${now.left - box.left + anchor * (now.width - widest) - pad}px`,
      top: `${now.top - box.top + (now.height - h) / 2}px`,
      width: `${w}px`,
      height: `${h}px`,
    })
    ink = (style.color.match(/[\d.]+/g) ?? []).map(Number)
    glow = accent ? hexToRgb(accent).map((v) => v * 255) : ink
    const next = `${probe.font}${w}|${h}|${scale}`
    if (next === key) return
    key = next
    fields.clear()
    cw = canvas.width = probe.canvas.width = Math.ceil(w * scale)
    margin = Math.round(drift * scale) * cw
    ch = canvas.height = probe.canvas.height = Math.ceil(h * scale)
    image = ctx.createImageData(cw, ch)
  }

  const field = (word: string): Field => {
    const cached = fields.get(word)
    if (cached) return cached
    const fontSize = Number.parseFloat(style.fontSize)
    const x = pad + anchor * (widest - probe.measureText(word).width)
    const grab = (soft: boolean) => {
      probe.setTransform(scale, 0, 0, scale, 0, 0)
      probe.clearRect(0, 0, cw, ch)
      setFont(probe)
      probe.shadowColor = soft ? '#000' : 'transparent'
      probe.shadowBlur = fontSize * blur * scale * 2
      probe.shadowOffsetX = cw * 2
      probe.fillText(word, soft ? x - (cw * 2) / scale : x, pad + ascent)
      const data = probe.getImageData(0, 0, cw, ch).data
      const out = new Uint8Array(cw * ch + margin * 2)
      for (let i = 0; i < cw * ch; i++) out[margin + i] = data[i * 4 + 3] as number
      return out
    }
    const made: Field = [grab(false), grab(true)]
    fields.set(word, made)
    return made
  }

  const render = (from: Field, to: Field, t: number) => {
    if (!image) return
    const melt = Math.sin(Math.PI * t)
    const mix = t * t * (3 - 2 * t)
    const a0 = (1 - melt) * (1 - mix)
    const a1 = melt * (1 - mix)
    const b0 = (1 - melt) * mix
    const b1 = melt * mix
    const cut = 127 - 50 * melt
    const gain = 1 + melt * 7
    const [r, g, b] = [0, 1, 2].map((c) => lerp(ink[c] ?? 0, glow[c] ?? 0, melt))
    const tint = ((b as number) << 16) | ((g as number) << 8) | (r as number)
    const px = new Uint32Array(image.data.buffer)
    const [sa, ba] = from
    const [sb, bb] = to
    const up = margin + Math.round(mix * drift * scale) * cw
    const down = up - margin
    for (let i = 0; i < px.length; i++) {
      const f =
        (sa[i + up] as number) * a0 +
        (ba[i + up] as number) * a1 +
        (sb[i + down] as number) * b0 +
        (bb[i + down] as number) * b1
      const a = f ? (f - cut) * gain + 127 : 0
      px[i] = a > 0 ? ((Math.min(a, 255) << 24) | tint) >>> 0 : 0
    }
    ctx.putImageData(image, 0, 0)
  }

  let index = words.indexOf(first)
  let since = 0
  let pair: [Field, Field] | null = null
  const stop = loop(el, (time) => {
    since ||= time
    const t = (time - since - hold) / duration
    if (t < 0) return
    const next = words[(index + 1) % words.length] as string
    if (!pair) {
      measure()
      pair = [field(visual.textContent ?? ''), field(next)]
      visual.style.opacity = '0'
    }
    render(pair[0], pair[1], Math.min(t, 1))
    if (t >= 1) {
      visual.textContent = next
      visual.style.opacity = ''
      ctx.clearRect(0, 0, cw, ch)
      index++
      pair = null
      since = time
    }
  })

  return all(restore, stop)
}
