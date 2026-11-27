import {
  all,
  clamp,
  type Destroy,
  loop,
  on,
  onScroll,
  prefersReducedMotion,
  snapshot,
} from '../lib'

export interface OrbitCarouselOptions {
  /** Full turns the ring makes while the section is pinned. */
  turns?: number
  /** How long the section stays pinned, in viewport heights of scrolling. */
  distance?: number
  /** Radius of the ring as a multiple of the card width. It never gets so small that cards touch. */
  radius?: number
  /** CSS perspective in pixels. Lower is more dramatic. */
  perspective?: number
  /** How far the back of the ring is lifted, in degrees, as if seen from slightly above. */
  tilt?: number
  /** Lets people spin the ring by dragging sideways. */
  drag?: boolean
  /** Distance from the top of the viewport where the section pins, in pixels. */
  top?: number
  /** Scroll container, if the section is not scrolled by the page. */
  root?: HTMLElement | null
}

/**
 * Every child becomes a card on the ring. Cards on the far side are turned to face the viewer,
 * so nothing is ever mirrored. With reduced motion it becomes a row you scroll sideways.
 */
export function orbitCarousel(el: HTMLElement, options: OrbitCarouselOptions = {}): Destroy {
  const {
    turns = 1,
    distance = 2,
    radius: size = 1.5,
    perspective = 1100,
    tilt = 12,
    drag = true,
    top = 0,
    root = null,
  } = options
  const cards = Array.from(el.children) as HTMLElement[]
  const n = cards.length
  if (!n) return () => {}
  const restore = all(snapshot(el), ...cards.map(snapshot))
  if (prefersReducedMotion()) {
    Object.assign(el.style, { display: 'flex', gap: '24px', overflowX: 'auto' })
    for (const card of cards) card.style.flex = 'none'
    return restore
  }

  const pin = document.createElement('div')
  Object.assign(pin.style, {
    position: 'sticky',
    top: `${top}px`,
    overflow: 'hidden',
    display: 'grid',
    placeItems: 'center',
    perspective: `${perspective}px`,
    touchAction: 'pan-y',
    userSelect: 'none',
    cursor: drag ? 'grab' : '',
  })
  el.replaceChildren(pin)
  pin.append(...cards)
  for (const card of cards) {
    card.style.gridArea = '1/1'
    card.style.willChange = 'transform'
  }

  let viewH = 0
  let radius = 1
  let target = 0
  let angle = 0
  let spin = 0
  let velocity = 0
  let grabbed = false
  let lastX = 0
  let resting = false

  const update = () => {
    const height = (root ? root.clientHeight : innerHeight) - top
    if (height !== viewH) {
      viewH = height
      pin.style.height = `${height}px`
      el.style.height = `${height * (1 + distance)}px`
    }
    const width = (cards[0] as HTMLElement).offsetWidth
    radius = Math.max(width / 1.8 / Math.tan(Math.PI / n), width * size)
    const viewTop = root ? root.getBoundingClientRect().top : 0
    const scrolled = (viewTop + top - el.getBoundingClientRect().top) / (height * distance)
    target = clamp(scrolled) * turns * Math.PI * 2
    resting = false
  }

  const rise = Math.sin((tilt * Math.PI) / 180)
  const frame = () => {
    if (resting) return
    angle += (target - angle) * 0.09
    if (!grabbed) {
      spin += velocity
      velocity *= 0.95
    }
    cards.forEach((card, i) => {
      const a = (i / n) * Math.PI * 2 - angle - spin
      const front = Math.cos(a)
      const z = (front - 1) * radius
      const near = (front + 1) / 2
      card.style.transform = `translate3d(${Math.sin(a) * radius}px,${z * rise}px,${z}px) rotateY(${front < 0 ? a + Math.PI : a}rad)`
      card.style.opacity = `${0.28 + 0.72 * near ** 1.6}`
      card.style.zIndex = `${Math.round(near * 100)}`
    })
    resting = !grabbed && Math.abs(velocity) < 1e-4 && Math.abs(target - angle) < 1e-4
  }

  const release = () => {
    grabbed = false
    pin.style.cursor = 'grab'
  }
  const stopDrag = drag
    ? all(
        on(pin, 'pointerdown', (e) => {
          grabbed = true
          resting = false
          velocity = 0
          lastX = e.clientX
          pin.style.cursor = 'grabbing'
        }),
        on(window, 'pointermove', (e) => {
          if (!grabbed) return
          const step = (e.clientX - lastX) / radius
          lastX = e.clientX
          spin -= step
          velocity = velocity * 0.5 - step * 0.5
        }),
        on(window, 'pointerup', release),
        on(window, 'pointercancel', release),
      )
    : () => {}

  return all(restore, onScroll(update, root), loop(el, frame), stopDrag)
}
