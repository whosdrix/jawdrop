import type { Effect, Values } from './effects'

export type Flavour = 'react' | 'astro' | 'vanilla'

const INNER: Record<string, string[]> = {
  'scramble-text': ['Decrypting the signal'],
  'split-reveal': ['Make them stop and look twice'],
  'gradient-sweep': ['Chromatic'],
  marquee: ['<span>Ship it</span>', '<span>Break it</span>', '<span>Fix it</span>'],
  'stacking-cards': [
    '<article>Plan</article>',
    '<article>Build</article>',
    '<article>Ship</article>',
  ],
  parallax: [
    '<img data-depth="-0.3" src="/hills.png" alt="" />',
    '<h2 data-depth="0.5">Depth</h2>',
  ],
  'draw-path': [
    '<svg viewBox="0 0 300 160" fill="none" stroke="currentColor">',
    '  <path d="M10 130 C 60 20, 110 20, 150 80" />',
    '</svg>',
  ],
  'horizontal-scroll': [
    '<div>',
    '  <article>One</article>',
    '  <article>Two</article>',
    '  <article>Three</article>',
    '</div>',
  ],
  magnetic: ['<span>Get started</span>'],
  spotlight: ['<h3>Pro plan</h3>', '<p>$12 a month</p>'],
  'tilt-card': ['<h3>No. 014</h3>'],
  'particle-text': ['Made of sand'],
  'text-morph': ['liquid'],
  'variable-wave': ['Heavyweight'],
  'glitch-text': ['Signal lost'],
  'scroll-fill-text': ['Good motion tells you where to look. Every word gets its moment.'],
  'zoom-through': ['<h2>DIVE IN</h2>', '<div>What waits on the other side</div>'],
  'orbit-carousel': [
    '<article>Mercury</article>',
    '<article>Venus</article>',
    '<article>Terra</article>',
    '<article>Mars</article>',
    '<article>Jove</article>',
  ],
  'liquid-image': ['<img src="/photo.jpg" alt="" />'],
  'chromatic-hover': ['<img src="/photo.jpg" alt="" />'],
  'halftone-image': ['<img src="/photo.jpg" alt="" />'],
  'ripple-click': ['<img src="/photo.jpg" alt="" />'],
  'glass-lens': ['<img src="/photo.jpg" alt="" />'],
}

/** Options every snippet needs even at their defaults, as JS literals. */
const FIXED: Record<string, [string, string][]> = {
  'text-morph': [['words', "['liquid', 'magnetic', 'electric']"]],
}
const FALLBACK = ['<h1>Your content</h1>']

const TAG: Record<string, string> = {
  'scramble-text': 'h2',
  'split-reveal': 'h2',
  'gradient-sweep': 'h2',
  magnetic: 'button',
  'particle-text': 'h2',
  'variable-wave': 'h2',
  'glitch-text': 'h2',
  'text-morph': 'span',
  'scroll-fill-text': 'p',
  'zoom-through': 'section',
}

function changed(effect: Effect, values: Values): [string, string | number | boolean][] {
  return Object.entries(effect.options)
    .filter(([key, spec]) => key in values && values[key] !== spec.default)
    .map(([key]) => [key, values[key] as string | number | boolean])
}

const indent = (lines: string[], n: number) => lines.map((l) => ' '.repeat(n) + l)

export function usage(effect: Effect, flavour: Flavour, values: Values): string {
  const opts = changed(effect, values)
  const inner = INNER[effect.slug] ?? FALLBACK
  const fixed = FIXED[effect.slug] ?? []
  const props =
    fixed.map(([k, v]) => ` ${k}={${v}}`).join('') +
    opts
      .map(([k, v]) =>
        typeof v === 'string' ? ` ${k}="${v}"` : v === true ? ` ${k}` : ` ${k}={${v}}`,
      )
      .join('')

  if (flavour === 'react') {
    return [
      `import { ${effect.component} } from './jawdrop/${effect.component}'`,
      '',
      'export function Example() {',
      '  return (',
      `    <${effect.component}${props}>`,
      ...indent(inner, 6),
      `    </${effect.component}>`,
      '  )',
      '}',
    ].join('\n')
  }
  if (flavour === 'astro') {
    return [
      '---',
      `import ${effect.component} from './jawdrop/${effect.component}.astro'`,
      '---',
      '',
      `<${effect.component}${props}>`,
      ...indent(inner, 2),
      `</${effect.component}>`,
    ].join('\n')
  }
  const tag = TAG[effect.slug] ?? 'div'
  const pairs = [
    ...fixed.map(([k, v]) => `${k}: ${v}`),
    ...opts.map(([k, v]) => `${k}: ${typeof v === 'string' ? `'${v}'` : v}`),
  ]
  const object = pairs.length ? `, { ${pairs.join(', ')} }` : ''
  return [
    `<${tag} id="fx">`,
    ...indent(inner, 2),
    `</${tag}>`,
    '',
    '<script type="module">',
    `  import { ${effect.export} } from './jawdrop/${effect.slug}'`,
    '',
    `  const destroy = ${effect.export}(document.querySelector('#fx')${object})`,
    '  // call destroy() to put everything back',
    '</script>',
  ].join('\n')
}
