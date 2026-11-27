import { readFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { add, suggest } from './add.ts'
import { detect, type Flavour } from './detect.ts'
import { loadRegistry } from './registry.ts'

const VERSION: string = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
).version
const bold = (s: string) => (process.stdout.isTTY ? `\x1b[1m${s}\x1b[22m` : s)
const dim = (s: string) => (process.stdout.isTTY ? `\x1b[2m${s}\x1b[22m` : s)

const HELP = `jawdrop ${VERSION}

Usage
  npx jawdrop add <effect...>   copy effects into your project
  npx jawdrop list              show every effect

Options
  --flavour <react|astro|vanilla>   default: detected from package.json
  --dir <path>                      default: src/components/jawdrop
  --force                           overwrite files you have changed
  -h, --help
  -v, --version

Browse them live at https://whosdrix.github.io/jawdrop`

export function run(argv: string[], cwd = process.cwd()): number {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      flavour: { type: 'string' },
      dir: { type: 'string' },
      force: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
  })
  const [command, ...rest] = positionals

  if (values.version) {
    console.log(VERSION)
    return 0
  }
  if (values.help || !command) {
    console.log(HELP)
    return 0
  }

  const registry = loadRegistry()

  if (command === 'list' || command === 'ls') {
    const categories = [...new Set(registry.effects.map((e) => e.category))]
    for (const category of categories) {
      const effects = registry.effects.filter((e) => e.category === category)
      console.log(`\n${bold(category)}`)
      for (const e of effects) {
        console.log(
          `  ${e.slug.padEnd(20)} ${dim(`${(e.size / 1024).toFixed(1)} KB`)}  ${e.description}`,
        )
      }
    }
    console.log()
    return 0
  }

  if (command === 'add') {
    if (rest.length === 0) {
      console.error('Name at least one effect, for example: npx jawdrop add scramble-text')
      return 1
    }
    const project = detect(cwd)
    const flavour = (values.flavour ?? project.flavour) as Flavour
    if (!['react', 'astro', 'vanilla'].includes(flavour)) {
      console.error(`Unknown flavour "${flavour}". Use react, astro or vanilla.`)
      return 1
    }
    const dir = values.dir ?? project.dir
    const result = add(registry, rest, { cwd, dir, flavour, force: values.force })

    for (const slug of result.unknown) {
      const close = suggest(registry, slug)
      console.error(
        `No effect called "${slug}".${close.length ? ` Did you mean ${close.join(', ')}?` : ''}`,
      )
    }
    for (const file of result.written) console.log(`  ${bold('+')} ${file}`)
    for (const file of result.skipped)
      console.log(`  ${dim('skipped')} ${file} ${dim('(changed locally, use --force)')}`)
    if (result.written.length)
      console.log(
        dim(
          `\n${flavour} flavour. Every effect returns a destroy function and respects reduced motion.`,
        ),
      )
    return result.unknown.length ? 1 : 0
  }

  console.error(`Unknown command "${command}".\n`)
  console.log(HELP)
  return 1
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('/jawdrop')) {
  process.exitCode = run(process.argv.slice(2))
}
