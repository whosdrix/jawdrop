import { all, type Destroy, isCoarsePointer, on, prefersReducedMotion, snapshot } from '../lib'

export interface TiltCardOptions {
  /** Maximum tilt in degrees. */
  max?: number
  /** Scale while hovered. */
  scale?: number
  /** Show a moving glare highlight. */
  glare?: boolean
  /** Perspective in pixels. Lower is more dramatic. */
  perspective?: number
}

export function tiltCard(el: HTMLElement, options: TiltCardOptions = {}): Destroy {
  const { max = 10, scale = 1.03, glare = true, perspective = 900 } = options
  const reduced = prefersReducedMotion() || isCoarsePointer()
  const restore = snapshot(el)
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative'
  el.style.transformStyle = 'preserve-3d'
  el.style.transition = 'transform .5s cubic-bezier(.2,.8,.2,1)'

  let shine: HTMLDivElement | null = null
  if (glare) {
    shine = document.createElement('div')
    shine.setAttribute('aria-hidden', 'true')
    Object.assign(shine.style, {
      position: 'absolute',
      inset: '0',
      borderRadius: 'inherit',
      pointerEvents: 'none',
      opacity: '0',
      transition: 'opacity .4s',
      mixBlendMode: 'soft-light',
      background:
        'radial-gradient(circle at var(--jd-gx, 50%) var(--jd-gy, 50%), rgba(255,255,255,.75), transparent 55%)',
    })
    el.append(shine)
  }

  const move = (e: PointerEvent) => {
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    if (!reduced) {
      el.style.transition = 'transform .12s ease-out'
      el.style.transform = `perspective(${perspective}px) rotateX(${(0.5 - py) * max * 2}deg) rotateY(${(px - 0.5) * max * 2}deg) scale(${scale})`
    }
    if (shine) {
      shine.style.opacity = '1'
      shine.style.setProperty('--jd-gx', `${px * 100}%`)
      shine.style.setProperty('--jd-gy', `${py * 100}%`)
    }
  }
  const leave = () => {
    el.style.transition = 'transform .6s cubic-bezier(.2,.8,.2,1)'
    el.style.transform = ''
    if (shine) shine.style.opacity = '0'
  }

  return all(
    restore,
    () => shine?.remove(),
    on(el, 'pointermove', move),
    on(el, 'pointerleave', leave),
  )
}
