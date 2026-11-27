import './style.css'
import './demo.css'
import { renderDetail } from './detail'
import {
  attach,
  bySlug,
  categories,
  type Destroy,
  type Effect,
  effects,
  installCmd,
  kb,
  loadEffect,
  loadRegistry,
} from './effects'
import { esc } from './highlight'
import { initMotion, isReduced, onMotionChange, setReduced } from './motion'
import { createPreview, type Preview } from './preview'

initMotion()

const $ = <T extends HTMLElement>(sel: string, root: ParentNode = document) =>
  root.querySelector<T>(sel) as T
const home = $('[data-home]')
const detailHost = $('[data-detail-host]')
const TITLE = document.title

const gallery = $('[data-gallery]')
gallery.innerHTML = categories
  .map((cat, ci) => {
    const list = effects.filter((e) => e.category === cat.id)
    return `
    <section class="cat" aria-labelledby="cat-${cat.id}">
      <header class="cat-head">
        <p class="eyebrow">${String(ci + 1).padStart(2, '0')} <i>/</i> ${list.length} effects</p>
        <h2 id="cat-${cat.id}">${cat.title}</h2>
        <p class="cat-blurb">${cat.blurb}</p>
      </header>
      <div class="cards">${list.map(card).join('')}</div>
    </section>`
  })
  .join('')

function card(e: Effect): string {
  return `
  <article class="card" data-effect="${e.slug}">
    <div class="stage" data-stage></div>
    <div class="card-body">
      <div class="card-head">
        <h3><a href="#/${e.slug}">${esc(e.name)}</a></h3>
        <span class="badge" data-size="${e.slug}" title="Size of the installed source, gzipped">· KB</span>
      </div>
      <p>${esc(e.description)}</p>
      <button type="button" class="cmd" data-copy="${installCmd(e.slug)}" aria-label="Copy install command for ${esc(e.name)}">
        <code><i>$</i> ${installCmd(e.slug)}</code><span class="cmd-copy">Copy</span>
      </button>
    </div>
  </article>`
}

const previews = new Map<Element, Preview>()
for (const el of gallery.querySelectorAll<HTMLElement>('.card')) {
  const effect = bySlug.get(el.dataset.effect ?? '')
  if (effect) previews.set(el, createPreview($('[data-stage]', el), effect, 'card'))
}

// Mount a preview a little before it scrolls in, destroy it once it is well gone.
// Keeps the number of live canvases (and WebGL contexts) small.
const cardObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      const preview = previews.get(entry.target)
      if (!preview) continue
      if (entry.isIntersecting && !home.hidden) preview.mount()
      else preview.destroy()
    }
  },
  { rootMargin: '30% 0px' },
)

gallery.addEventListener('click', (e) => {
  const target = e.target as HTMLElement
  if (target.closest('[data-copy], a')) return
  const slug = target.closest<HTMLElement>('.card')?.dataset.effect
  if (slug) location.hash = `#/${slug}`
})

loadRegistry()
  .then((registry) => {
    for (const entry of registry.effects) {
      for (const el of gallery.querySelectorAll(`[data-size="${entry.slug}"]`)) {
        el.textContent = kb(entry.size)
      }
    }
  })
  .catch((err) => console.error('[jawdrop] registry failed to load', err))

let homeFx: Destroy[] = []
let homeTimers: number[] = []

function mountHome() {
  const names = effects.map((e) => `<span>${esc(e.name)}</span><i>✦</i>`).join('')
  const ticker = $('[data-ticker]')
  ticker.innerHTML = names

  homeFx = [
    attach('aurora', $('[data-hero-sky]'), {
      colors: ['#5b8cff', '#35d0ba', '#3d4fe0'],
      speed: 1.2,
      intensity: 1.15,
    }),
    attach('scramble-text', $('[data-hero-eyebrow]'), { trigger: 'load', duration: 1400 }),
    attach('gradient-sweep', $('[data-hero-sweep]'), {
      colors: ['#5b8cff', '#edebe5', '#9db8ff', '#edebe5'],
      duration: 6000,
      angle: 95,
    }),
    attach('marquee', ticker, { speed: 60 }),
    attach('dot-grid', $('[data-outro]'), { gap: 30, color: '#1c2030', activeColor: '#5b8cff' }),
    ...Array.from(document.querySelectorAll<HTMLElement>('[data-magnetic]'), (el) =>
      attach('magnetic', el, { strength: 0.3, reach: 40 }),
    ),
  ]
  document.querySelectorAll<HTMLElement>('[data-hero-line]').forEach((el, i) => {
    const run = () => homeFx.push(attach('split-reveal', el, { stagger: 70, duration: 1000 }))
    if (i === 0) run()
    else homeTimers.push(window.setTimeout(run, 140 * i))
  })
  for (const el of previews.keys()) cardObserver.observe(el)
}

function destroyHome() {
  for (const t of homeTimers) clearTimeout(t)
  homeTimers = []
  cardObserver.disconnect()
  for (const preview of previews.values()) preview.destroy()
  for (const fn of homeFx.reverse()) fn()
  homeFx = []
}

let detail: { destroy: Destroy; remount: Destroy } | null = null
let homeScroll = 0
let view: 'none' | 'home' | 'detail' = 'none'

function route() {
  const hash = location.hash
  const effect = hash.startsWith('#/') ? bySlug.get(hash.slice(2)) : undefined

  detail?.destroy()
  detail = null

  if (effect) {
    if (view === 'home') {
      homeScroll = scrollY
      destroyHome()
    }
    view = 'detail'
    home.hidden = true
    detailHost.hidden = false
    detail = renderDetail(detailHost, effect)
    document.title = `${effect.name} · jawdrop`
    scrollTo(0, 0)
    return
  }

  const wasDetail = view === 'detail'
  detailHost.hidden = true
  home.hidden = false
  document.title = TITLE
  if (view !== 'home') {
    view = 'home'
    mountHome()
  }
  const anchor =
    hash.length > 1 && !hash.startsWith('#/') ? document.getElementById(hash.slice(1)) : null
  if (wasDetail && homeScroll > 0) scrollTo(0, homeScroll)
  else if (anchor) anchor.scrollIntoView()
  else if (wasDetail) scrollTo(0, 0)
}
addEventListener('hashchange', route)
$('.wordmark').addEventListener('click', () => {
  homeScroll = 0
  if (view === 'home') scrollTo({ top: 0, behavior: isReduced() ? 'auto' : 'smooth' })
})

const toggle = $('[data-motion-toggle]')
function syncToggle() {
  const reduced = isReduced()
  toggle.setAttribute('aria-pressed', String(reduced))
  toggle.title = reduced
    ? 'Reduced motion is on. Click to play effects.'
    : 'Click to reduce motion.'
  $('[data-motion-label]', toggle).textContent = reduced ? 'Motion off' : 'Motion on'
}
toggle.addEventListener('click', () => setReduced(!isReduced()))
onMotionChange(() => {
  syncToggle()
  if (view === 'home') {
    destroyHome()
    mountHome()
  } else detail?.remount()
})
syncToggle()

const toast = $('[data-toast]')
let toastTimer = 0
async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    area.style.cssText = 'position:fixed;opacity:0'
    document.body.append(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  }
}
document.addEventListener('click', async (e) => {
  const button = (e.target as HTMLElement).closest<HTMLElement>('[data-copy]')
  if (!button?.dataset.copy) return
  const ok = await copy(button.dataset.copy)
  button.dataset.copied = ok ? 'yes' : 'no'
  const label = button.matches('.chip') ? button : button.querySelector('.cmd-copy')
  const before = label?.textContent ?? ''
  if (label) label.textContent = ok ? 'Copied' : 'Press Ctrl+C'
  toast.textContent = ok ? 'Copied to clipboard' : 'Could not copy'
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    if (label) label.textContent = before === 'Copied' ? 'Copy' : before
    delete button.dataset.copied
    toast.textContent = ''
  }, 1400)
})

const nav = $('.nav')
const onPageScroll = () => nav.classList.toggle('nav-solid', scrollY > 24)
addEventListener('scroll', onPageScroll, { passive: true })
onPageScroll()

// Text effects measure glyphs, so give the web fonts a moment to land first.
const fonts = Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))])
const heroCode = ['aurora', 'scramble-text', 'split-reveal', 'gradient-sweep', 'magnetic'].map(
  loadEffect,
)
Promise.allSettled([fonts, ...heroCode]).then(() => {
  document.documentElement.classList.add('ready')
  route()
})
