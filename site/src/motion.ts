const KEY = 'jawdrop:motion'
const listeners = new Set<() => void>()
const root = document.documentElement

export function isReduced(): boolean {
  const forced = root.dataset.motion
  if (forced === 'reduce') return true
  if (forced === 'full') return false
  return matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function setReduced(reduced: boolean) {
  root.dataset.motion = reduced ? 'reduce' : 'full'
  try {
    localStorage.setItem(KEY, root.dataset.motion)
  } catch {
    // private mode: the choice just lasts for this visit
  }
  for (const fn of listeners) fn()
}

export function onMotionChange(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function initMotion() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'reduce' || saved === 'full') root.dataset.motion = saved
  } catch {}
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => {
    if (!root.dataset.motion) for (const fn of listeners) fn()
  })
}

export const isCoarse = () => matchMedia('(pointer: coarse)').matches
