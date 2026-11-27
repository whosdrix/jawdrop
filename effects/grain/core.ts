import { all, backdrop, type Destroy, loop, prefersReducedMotion } from '../lib'

export interface GrainOptions {
  /** Strength of the grain, 0 to 1. */
  opacity?: number
  /** How often the grain changes, in frames per second. Film is about 24. */
  fps?: number
  /** Size of one grain in CSS pixels. */
  scale?: number
  /** Put the grain above the content instead of behind it. */
  overlay?: boolean
}

function noiseTile(size: number): string {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  const img = ctx.createImageData(size, size)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v
    img.data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL()
}

export function grain(el: HTMLElement, options: GrainOptions = {}): Destroy {
  const { opacity = 0.14, fps = 18, scale = 1, overlay = true } = options
  const layer = document.createElement('div')
  const remove = backdrop(el, layer)
  const tile = 160
  Object.assign(layer.style, {
    backgroundImage: `url(${noiseTile(tile)})`,
    backgroundSize: `${tile * scale}px`,
    opacity: String(opacity),
    mixBlendMode: 'overlay',
    inset: '-50%',
    width: '200%',
    height: '200%',
  })
  el.style.overflow = 'hidden'
  if (overlay) {
    layer.style.zIndex = '1'
    el.append(layer)
  }
  if (prefersReducedMotion()) return remove

  let last = 0
  const stop = loop(el, (time) => {
    if (time - last < 1000 / fps) return
    last = time
    const x = Math.floor(Math.random() * tile * scale)
    const y = Math.floor(Math.random() * tile * scale)
    layer.style.transform = `translate(${x}px, ${y}px)`
  })
  return all(remove, stop)
}
