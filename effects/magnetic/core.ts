import { all, type Destroy, isCoarsePointer, on, prefersReducedMotion, snapshot } from '../lib'

export interface MagneticOptions {
  /** How far the element follows the cursor, 0 to 1. */
  strength?: number
  /** Extra distance around the element where the pull starts, in pixels. */
  reach?: number
  /** The first child moves further than the element itself, for a layered feel. */
  inner?: boolean
}

export function magnetic(el: HTMLElement, options: MagneticOptions = {}): Destroy {
  const { strength = 0.4, reach = 60, inner = true } = options
  if (prefersReducedMotion() || isCoarsePointer()) return () => {}
  const child = inner ? (el.firstElementChild as HTMLElement | null) : null
  const restore = snapshot(el)
  const restoreChild = child ? snapshot(child) : () => {}
  const target = { x: 0, y: 0 }
  const pos = { x: 0, y: 0 }
  const vel = { x: 0, y: 0 }
  let raf = 0

  const step = () => {
    vel.x = (vel.x + (target.x - pos.x) * 0.16) * 0.72
    vel.y = (vel.y + (target.y - pos.y) * 0.16) * 0.72
    pos.x += vel.x
    pos.y += vel.y
    el.style.transform = `translate3d(${pos.x.toFixed(2)}px, ${pos.y.toFixed(2)}px, 0)`
    if (child)
      child.style.transform = `translate3d(${(pos.x * 0.5).toFixed(2)}px, ${(pos.y * 0.5).toFixed(2)}px, 0)`
    const moving =
      Math.abs(vel.x) + Math.abs(vel.y) + Math.abs(target.x - pos.x) + Math.abs(target.y - pos.y)
    raf = moving > 0.01 ? requestAnimationFrame(step) : 0
  }
  const kick = () => {
    if (!raf) raf = requestAnimationFrame(step)
  }

  const move = (e: PointerEvent) => {
    const r = el.getBoundingClientRect()
    const cx = r.left - pos.x + r.width / 2
    const cy = r.top - pos.y + r.height / 2
    const dx = e.clientX - cx
    const dy = e.clientY - cy
    const inside = Math.abs(dx) < r.width / 2 + reach && Math.abs(dy) < r.height / 2 + reach
    target.x = inside ? dx * strength : 0
    target.y = inside ? dy * strength : 0
    kick()
  }

  return all(restore, restoreChild, on(window, 'pointermove', move), () =>
    cancelAnimationFrame(raf),
  )
}
