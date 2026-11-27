import { all, type Destroy, prefersReducedMotion, snapshot } from '../lib'

export interface GradientSweepOptions {
  /** Colors of the gradient, in order. The first one is repeated at the end for a seamless loop. */
  colors?: string[]
  /** Time for one full sweep in ms. */
  duration?: number
  /** Angle of the gradient in degrees. */
  angle?: number
}

export function gradientSweep(el: HTMLElement, options: GradientSweepOptions = {}): Destroy {
  const { colors = ['#7c5cff', '#22d3ee', '#f472b6'], duration = 4000, angle = 100 } = options
  const restore = snapshot(el)
  const stops = [...colors, colors[0]].join(', ')
  Object.assign(el.style, {
    backgroundImage: `linear-gradient(${angle}deg, ${stops})`,
    backgroundSize: '200% 100%',
    backgroundClip: 'text',
    webkitBackgroundClip: 'text',
    color: 'transparent',
    webkitTextFillColor: 'transparent',
  })
  if (prefersReducedMotion()) return restore

  const animation = el.animate(
    [{ backgroundPosition: '0% 50%' }, { backgroundPosition: '-200% 50%' }],
    { duration, iterations: Number.POSITIVE_INFINITY, easing: 'linear' },
  )
  return all(restore, () => animation.cancel())
}
