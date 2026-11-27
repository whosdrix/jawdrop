// @vitest-environment node
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildRegistry } from '../../../scripts/registry.ts'
import { add, suggest } from '../src/add.ts'
import { detect } from '../src/detect.ts'

const registry = await buildRegistry()
let cwd: string

beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), 'jawdrop-'))
})

const pkg = (deps: Record<string, string>) =>
  writeFileSync(join(cwd, 'package.json'), JSON.stringify({ dependencies: deps }))

describe('detect', () => {
  it('picks astro over react when both are present', () => {
    pkg({ astro: '5', react: '19' })
    expect(detect(cwd).flavour).toBe('astro')
  })

  it('picks react', () => {
    pkg({ react: '19' })
    expect(detect(cwd).flavour).toBe('react')
  })

  it('falls back to vanilla without a package.json', () => {
    expect(detect(cwd)).toEqual({ flavour: 'vanilla', dir: 'components/jawdrop' })
  })

  it('uses src/components when there is a src folder', () => {
    mkdirSync(join(cwd, 'src'))
    expect(detect(cwd).dir).toBe('src/components/jawdrop')
  })
})

describe('add', () => {
  const opts = () => ({ cwd, dir: 'src/components/jawdrop', flavour: 'react' as const })

  it('writes the shared lib once plus each effect', () => {
    const result = add(registry, ['magnetic', 'spotlight'], opts())
    expect(result.written.sort()).toEqual(
      [
        'src/components/jawdrop/lib.ts',
        'src/components/jawdrop/magnetic.ts',
        'src/components/jawdrop/Magnetic.tsx',
        'src/components/jawdrop/spotlight.ts',
        'src/components/jawdrop/Spotlight.tsx',
      ].sort(),
    )
    const component = readFileSync(join(cwd, 'src/components/jawdrop/Magnetic.tsx'), 'utf8')
    expect(component).toContain(`from './magnetic'`)
  })

  it('does not overwrite files the user changed, unless forced', () => {
    add(registry, ['magnetic'], opts())
    const file = join(cwd, 'src/components/jawdrop/magnetic.ts')
    writeFileSync(file, '// mine')
    const second = add(registry, ['magnetic'], opts())
    expect(second.skipped).toContain('src/components/jawdrop/magnetic.ts')
    expect(readFileSync(file, 'utf8')).toBe('// mine')
    add(registry, ['magnetic'], { ...opts(), force: true })
    expect(readFileSync(file, 'utf8')).not.toBe('// mine')
  })

  it('reports unknown effects and suggests close names', () => {
    const result = add(registry, ['scramble'], opts())
    expect(result.unknown).toEqual(['scramble'])
    expect(result.written).toEqual([])
    expect(suggest(registry, 'scramble')).toContain('scramble-text')
    expect(suggest(registry, 'tilt-crad')).toEqual(['tilt-card'])
  })
})

describe('run', () => {
  it('prints help and the version', async () => {
    const { run } = await import('../src/index.ts')
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    expect(run(['--version'])).toBe(0)
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/^\d+\.\d+\.\d+$/))
    expect(run([])).toBe(0)
    log.mockRestore()
  })

  it('fails on unknown commands', async () => {
    const { run } = await import('../src/index.ts')
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(run(['explode'])).toBe(1)
    vi.restoreAllMocks()
  })
})
