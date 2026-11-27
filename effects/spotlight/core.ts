import { all, backdrop, type Destroy, on } from '../lib'

export interface SpotlightOptions {
  /** Diameter of the light in pixels. */
  size?: number
  /** Color of the light. Use some transparency, for example `#7aa2ff40`. */
  color?: string
  /** Also light up the border, for cards with a 1px border. */
  border?: boolean
}

export function spotlight(el: HTMLElement, options: SpotlightOptions = {}): Destroy {
  const { size = 420, color = '#7aa2ff33', border = true } = options
  const light = document.createElement('div')
  const remove = backdrop(el, light)
  el.style.setProperty('--jd-x', '-999px')
  el.style.setProperty('--jd-y', '-999px')
  const gradient = (c: string) =>
    `radial-gradient(${size / 2}px circle at var(--jd-x) var(--jd-y), ${c}, transparent 70%)`
  light.style.background = gradient(color)
  light.style.borderRadius = 'inherit'
  light.style.transition = 'opacity .3s'
  light.style.opacity = '0'

  let ring: HTMLDivElement | null = null
  if (border) {
    ring = document.createElement('div')
    Object.assign(ring.style, {
      position: 'absolute',
      inset: '0',
      borderRadius: 'inherit',
      padding: '1px',
      background: gradient(color.length === 9 ? color.slice(0, 7) : color),
      mask: 'linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)',
      webkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
      webkitMaskComposite: 'xor',
      pointerEvents: 'none',
    })
    ring.setAttribute('aria-hidden', 'true')
    light.append(ring)
  }

  const move = (e: PointerEvent) => {
    const r = el.getBoundingClientRect()
    el.style.setProperty('--jd-x', `${e.clientX - r.left}px`)
    el.style.setProperty('--jd-y', `${e.clientY - r.top}px`)
    light.style.opacity = '1'
  }
  const leave = () => {
    light.style.opacity = '0'
  }
  return all(remove, on(el, 'pointermove', move), on(el, 'pointerleave', leave))
}
