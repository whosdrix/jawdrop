import { all, type Destroy, loop, on, prefersReducedMotion, snapshot, splitText } from '../lib'

export interface VariableWaveOptions {
  /** Weight of letters far from the cursor. */
  minWeight?: number
  /** Weight of the letter right under the cursor. */
  maxWeight?: number
  /** Width axis (wdth) far from the cursor. Leave both widths equal for fonts without one. */
  minWidth?: number
  /** Width axis (wdth) right under the cursor. */
  maxWidth?: number
  /** Reach of the cursor, in ems. */
  radius?: number
  /** Keeps a slow wave running through the letters while the cursor is away. */
  idle?: boolean
  /** Speed of the idle wave. */
  speed?: number
}

/** Needs a variable font with a weight axis. The cursor is tracked across the whole window. */
export function variableWave(el: HTMLElement, options: VariableWaveOptions = {}): Destroy {
  const {
    minWeight = 300,
    maxWeight = 800,
    minWidth = 100,
    maxWidth = 100,
    radius = 1.2,
    idle = true,
    speed = 1,
  } = options
  if (prefersReducedMotion()) return () => {}
  const restore = snapshot(el)
  const { pieces } = splitText(el, 'char')
  const n = pieces.length
  const value = new Float32Array(n)
  const cx = new Float32Array(n)
  const cy = new Float32Array(n)
  const shown: string[] = []
  let reach = 1
  let stale = true
  let px = -1e5
  let py = 0
  let presence = 0
  let resting = false

  const stop = loop(el, (time) => {
    if (stale) {
      reach = radius * Number.parseFloat(getComputedStyle(el).fontSize)
      pieces.forEach((piece, i) => {
        const b = piece.getBoundingClientRect()
        cx[i] = b.left + b.width / 2
        cy[i] = b.top + b.height / 2
      })
      stale = false
    }
    if (resting) return
    let near = 0
    let motion = 0
    for (let i = 0; i < n; i++) {
      const dx = (cx[i] as number) - px
      const dy = (cy[i] as number) - py
      const pull = Math.exp(-(dx * dx + dy * dy) / (reach * reach))
      near = Math.max(near, pull)
      const wave = idle
        ? (0.5 + 0.5 * Math.sin((time / 520) * speed - i * 0.55)) ** 2 * (1 - presence) * 0.9
        : 0
      const v = (value[i] as number) + (Math.max(pull, wave) - (value[i] as number)) * 0.13
      motion += Math.abs(v - (value[i] as number))
      value[i] = v
    }
    presence += ((near > 0.04 ? 1 : 0) - presence) * 0.07
    for (let i = 0; i < n; i++) {
      const v = value[i] as number
      let css = `'wght' ${Math.round(minWeight + (maxWeight - minWeight) * v)}`
      if (minWidth !== maxWidth)
        css += `,'wdth' ${(minWidth + (maxWidth - minWidth) * v).toFixed(1)}`
      if (css !== shown[i]) {
        shown[i] = css
        ;(pieces[i] as HTMLElement).style.fontVariationSettings = css
      }
    }
    resting = !idle && motion < 0.001
  })

  const refresh = () => {
    stale = true
  }
  const away = () => {
    px = -1e5
    resting = false
  }
  return all(
    restore,
    stop,
    on(window, 'pointermove', (e) => {
      px = e.clientX
      py = e.clientY
      resting = false
    }),
    on(window, 'pointerup', (e) => e.pointerType !== 'mouse' && away()),
    on(document.documentElement, 'pointerleave', away),
    on(window, 'scroll', refresh, { capture: true, passive: true }),
    on(window, 'resize', refresh),
  )
}
