import {
  categories,
  type Destroy,
  type Effect,
  effects,
  installCmd,
  kb,
  loadRegistry,
  type OptionSpec,
  type RegistryFile,
  shadcnCmd,
  type Value,
} from './effects'
import { esc, highlight } from './highlight'
import { createPreview, hintFor, initialValues } from './preview'
import { type Flavour, usage } from './usage'

const FLAVOURS: { id: Flavour; label: string }[] = [
  { id: 'react', label: 'React' },
  { id: 'astro', label: 'Astro' },
  { id: 'vanilla', label: 'HTML' },
]

function control(key: string, spec: OptionSpec, value: Value): string {
  const id = `opt-${key}`
  if (spec.type === 'number') {
    return `<div class="ctl"><label for="${id}">${esc(spec.label)}</label><output data-out="${key}">${value}</output>
      <input id="${id}" type="range" data-opt="${key}" min="${spec.min}" max="${spec.max}" step="${spec.step}" value="${value}"></div>`
  }
  if (spec.type === 'select') {
    return `<div class="ctl"><span class="ctl-label" id="${id}">${esc(spec.label)}</span>
      <div class="seg" role="group" aria-labelledby="${id}">${spec.values
        .map(
          (v) =>
            `<button type="button" data-opt="${key}" data-value="${esc(v)}" aria-pressed="${v === value}">${esc(v)}</button>`,
        )
        .join('')}</div></div>`
  }
  if (spec.type === 'boolean') {
    return `<div class="ctl ctl-row"><label for="${id}">${esc(spec.label)}</label>
      <input id="${id}" class="switch" type="checkbox" role="switch" data-opt="${key}" ${value ? 'checked' : ''}></div>`
  }
  return `<div class="ctl ctl-row"><label for="${id}">${esc(spec.label)}</label>
    <span class="swatch"><output data-out="${key}">${value}</output><input id="${id}" type="color" data-opt="${key}" value="${value}"></span></div>`
}

const cmdRow = (label: string, cmd: string) =>
  `<div class="install-row"><span class="install-label">${label}</span>
    <button type="button" class="cmd" data-copy="${esc(cmd)}"><code><i>$</i> ${esc(cmd)}</code><span class="cmd-copy">Copy</span></button></div>`

export function renderDetail(
  host: HTMLElement,
  effect: Effect,
): { destroy: Destroy; remount: Destroy } {
  const index = effects.indexOf(effect)
  const prev = effects[(index - 1 + effects.length) % effects.length] as Effect
  const next = effects[(index + 1) % effects.length] as Effect
  const category = categories.find((c) => c.id === effect.category)
  const hasOptions = Object.keys(effect.options).length > 0
  const hint = hintFor(effect)

  host.innerHTML = `
  <article class="detail" data-detail="${effect.slug}">
    <a class="back" href="#effects"><span aria-hidden="true">←</span> All effects</a>
    <header class="detail-head">
      <p class="eyebrow">${esc(category?.title ?? effect.category)} <i>/</i> ${String(index + 1).padStart(2, '0')} of ${effects.length}</p>
      <h1>${esc(effect.name)}</h1>
      <p class="detail-desc">${esc(effect.description)}</p>
      <ul class="facts">
        <li><b data-size="${effect.slug}">…</b> gzipped</li>
        <li><b>0</b> dependencies</li>
        <li><b>${esc(effect.export)}</b>(el, options)</li>
      </ul>
    </header>

    <section class="play">
      <div class="play-stage">
        <div class="stage stage-lg" data-stage></div>
        <div class="stage-bar">
          <span class="stage-hint">${esc(hint)}</span>
          <button type="button" class="chip" data-replay><svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M12.5 1.5v3h-3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>Replay</button>
        </div>
      </div>
      <aside class="panel" aria-label="Options">
        <div class="panel-head"><h2>Options</h2><button type="button" class="link" data-reset>Reset</button></div>
        ${
          hasOptions
            ? Object.entries(effect.options)
                .map(([k, spec]) => control(k, spec, initialValues(effect)[k] ?? spec.default))
                .join('')
            : '<p class="muted">Nothing to tune on this one.</p>'
        }
        <p class="panel-note">Every change tears the effect down and mounts it again, the same way your app would.</p>
      </aside>
    </section>

    <section class="install">
      <h2>Install</h2>
      ${cmdRow('jawdrop CLI', installCmd(effect.slug))}
      ${cmdRow('shadcn', shadcnCmd(effect.slug))}
      <p class="muted">Either one copies the source into your project. There is no package to keep up to date.</p>
    </section>

    <section class="code">
      <div class="code-head">
        <h2>Code</h2>
        <div class="tabs" role="tablist" aria-label="Framework">${FLAVOURS.map(
          (f, i) =>
            `<button type="button" role="tab" data-flavour="${f.id}" aria-selected="${i === 0}">${f.label}</button>`,
        ).join('')}</div>
      </div>
      <div class="code-box">
        <div class="files" data-files></div>
        <button type="button" class="chip code-copy" data-copy-code>Copy</button>
        <pre tabindex="0"><code data-code>Loading source…</code></pre>
      </div>
    </section>

    <nav class="pager" aria-label="More effects">
      <a href="#/${prev.slug}"><small>← Previous</small><span>${esc(prev.name)}</span></a>
      <a href="#/${next.slug}"><small>Next →</small><span>${esc(next.name)}</span></a>
    </nav>
  </article>`

  const $ = <T extends HTMLElement>(sel: string) => host.querySelector<T>(sel) as T
  const preview = createPreview($('[data-stage]'), effect, 'detail')
  preview.mount()

  let flavour: Flavour = 'react'
  let file = 'usage'
  let files: Record<Flavour, RegistryFile[]> | null = null
  let lib: RegistryFile | null = null
  let current = ''
  const codeEl = $('[data-code]')
  const filesEl = $('[data-files]')

  const renderCode = () => {
    const list: RegistryFile[] = [
      { path: 'usage', content: usage(effect, flavour, preview.values) },
      ...(files ? [...files[flavour]].reverse() : []),
      ...(lib ? [lib] : []),
    ]
    const active = list.find((f) => f.path === file) ?? (list[0] as RegistryFile)
    file = active.path
    current = active.content
    filesEl.innerHTML = list
      .map(
        (f) =>
          `<button type="button" data-file="${esc(f.path)}" aria-pressed="${f.path === file}">${f.path === 'usage' ? 'Usage' : esc(f.path)}</button>`,
      )
      .join('')
    codeEl.innerHTML = highlight(active.content)
  }
  renderCode()

  let alive = true
  loadRegistry()
    .then((registry) => {
      if (!alive) return
      const entry = registry.effects.find((e) => e.slug === effect.slug)
      if (!entry) return
      files = entry.files
      lib = registry.lib
      const size = host.querySelector('[data-size]')
      if (size) size.textContent = kb(entry.size)
      renderCode()
    })
    .catch(() => {
      // the usage tab still works without the registry
    })

  let timer = 0
  const apply = () => {
    clearTimeout(timer)
    timer = window.setTimeout(() => preview.remount(), 70)
    if (file === 'usage') renderCode()
  }
  const setValue = (key: string, value: Value) => {
    preview.values[key] = value
    for (const out of host.querySelectorAll<HTMLElement>(`[data-out="${key}"]`)) {
      out.textContent = String(value)
    }
    for (const b of host.querySelectorAll<HTMLElement>(`button[data-opt="${key}"]`)) {
      b.setAttribute('aria-pressed', String(b.dataset.value === value))
    }
  }

  const onInput = (e: Event) => {
    const t = e.target as HTMLInputElement
    const key = t.dataset?.opt
    if (!key || t.tagName !== 'INPUT') return
    setValue(
      key,
      t.type === 'checkbox' ? t.checked : t.type === 'range' ? Number(t.value) : t.value,
    )
    apply()
  }
  const onClick = (e: Event) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('button')
    if (!t) return
    if (t.dataset.opt && t.dataset.value !== undefined) {
      setValue(t.dataset.opt, t.dataset.value)
      apply()
    } else if (t.matches('[data-replay]')) {
      preview.remount()
    } else if (t.matches('[data-reset]')) {
      const start = initialValues(effect)
      for (const [key, value] of Object.entries(start)) {
        setValue(key, value)
        const input = host.querySelector<HTMLInputElement>(`input[data-opt="${key}"]`)
        if (input) {
          if (input.type === 'checkbox') input.checked = Boolean(value)
          else input.value = String(value)
        }
      }
      apply()
    } else if (t.dataset.flavour) {
      flavour = t.dataset.flavour as Flavour
      if (file !== 'usage' && file !== 'lib.ts') file = 'usage'
      for (const tab of host.querySelectorAll('[data-flavour]')) {
        tab.setAttribute('aria-selected', String(tab === t))
      }
      renderCode()
    } else if (t.dataset.file) {
      file = t.dataset.file
      renderCode()
    } else if (t.matches('[data-copy-code]')) {
      t.dataset.copy = current
    }
  }
  host.addEventListener('input', onInput)
  host.addEventListener('click', onClick, true)

  return {
    remount: () => preview.remount(),
    destroy: () => {
      alive = false
      clearTimeout(timer)
      host.removeEventListener('input', onInput)
      host.removeEventListener('click', onClick, true)
      preview.destroy()
      host.replaceChildren()
    },
  }
}
