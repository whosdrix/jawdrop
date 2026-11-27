import { all, clamp, type Destroy, onScroll, prefersReducedMotion, snapshot } from '../lib'

export interface StackingCardsOptions {
  /** Distance from the top of the viewport where cards stick, in pixels. */
  top?: number
  /** Extra offset per card so the edges of earlier cards peek out, in pixels. */
  offset?: number
  /** How much a card shrinks once fully covered, 0 to 0.3. */
  shrink?: number
  /** Scroll container, if the cards are not scrolled by the page. */
  root?: HTMLElement | null
}

export function stackingCards(el: HTMLElement, options: StackingCardsOptions = {}): Destroy {
  const { top = 80, offset = 14, shrink = 0.08, root = null } = options
  const cards = Array.from(el.children) as HTMLElement[]
  const restores = cards.map(snapshot)
  cards.forEach((card, i) => {
    card.style.position = 'sticky'
    card.style.top = `${top + i * offset}px`
    card.style.transformOrigin = '50% 0'
    card.style.willChange = 'transform'
  })
  if (prefersReducedMotion()) return all(...restores)

  const update = () => {
    const viewTop = root ? root.getBoundingClientRect().top : 0
    cards.forEach((card, i) => {
      const next = cards[i + 1]
      if (!next) return
      const stuckAt = viewTop + top + i * offset
      const nextTop = next.getBoundingClientRect().top
      const covered = clamp(1 - (nextTop - stuckAt - offset) / card.offsetHeight)
      const scale = 1 - covered * shrink * ((cards.length - i) / cards.length)
      card.style.transform = `scale(${scale})`
      card.style.filter = `brightness(${1 - covered * 0.35})`
    })
  }
  return all(...restores, onScroll(update, root))
}
